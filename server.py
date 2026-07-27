from datetime import datetime, timedelta
import json
import os
import csv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd

app = FastAPI()

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global index tracker to step through test_stream.json sequentially
stream_index = 0

# Load ML Pipeline using memory mapping
model_path = "pump_rf_pipeline.pkl"
if os.path.exists(model_path):
    try:
        model = joblib.load(model_path, mmap_mode='r')
    except Exception as e:
        print(f"Error loading model with mmap: {e}")
        model = None
else:
    model = None

# CSV Audit Log File setup
CSV_LOG_FILE = "pump_monitoring_log.csv"
try:
    if not os.path.exists(CSV_LOG_FILE):
        with open(CSV_LOG_FILE, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp", "predicted_rul_hours", "actual_rul_hours", 
                "calculated_efficiency", "vibration_velocity", "bearing_temp", 
                "inlet_pressure", "status"
            ])
except Exception as e:
    print(f"CSV log file creation skipped/failed: {e}")


def load_stream_data():
    """Helper to load test_stream.json safely."""
    stream_file = "test_stream.json"
    if os.path.exists(stream_file):
        try:
            with open(stream_file, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading {stream_file}: {e}")
    return []


@app.get("/")
def read_root():
    return {"status": "IOCL Pump Telemetry API is Live!"}


@app.get("/api/pump/status")
def get_pump_status():
    global stream_index
    
    stream_data = load_stream_data()
    
    if stream_data:
        # Loop back to the beginning if we reach the end of the JSON array
        current_sample = stream_data[stream_index % len(stream_data)]
        stream_index += 1
        
        # Extract features from JSON (handles both direct key names and sensor names)
        vibration = round(current_sample.get("vibration_velocity", current_sample.get("vibration", 1.01)), 2)
        bearing_temp = round(current_sample.get("bearing_temp", current_sample.get("temperature", 50.3)), 1)
        inlet_pressure = round(current_sample.get("inlet_pressure", current_sample.get("pressure", 48.3)), 1)
        
        # Run ML Prediction if model exists, otherwise extract or calculate fallback
        if model is not None:
            try:
                # Prepare DataFrame for model input
                input_df = pd.DataFrame([{
                    "vibration_velocity": vibration,
                    "bearing_temp": bearing_temp,
                    "inlet_pressure": inlet_pressure
                }])
                predicted_rul = round(float(model.predict(input_df)[0]), 1)
            except Exception as e:
                print(f"Prediction error: {e}")
                predicted_rul = round(current_sample.get("predicted_rul_hours", current_sample.get("rul", 338.3)), 1)
        else:
            predicted_rul = round(current_sample.get("predicted_rul_hours", current_sample.get("rul", 338.3)), 1)
            
        actual_rul = round(current_sample.get("actual_rul_hours", predicted_rul), 1)
        efficiency = round(current_sample.get("calculated_efficiency", current_sample.get("efficiency", 81.1)), 1)

    else:
        # Fallback if test_stream.json is missing or empty
        predicted_rul = 338.3
        actual_rul = 338.3
        efficiency = 81.1
        vibration = 1.01
        bearing_temp = 50.3
        inlet_pressure = 48.3

    # Dynamic status evaluation based on prediction threshold
    status = "Maintenance Required" if predicted_rul < 350 else "All Good"
    alert_message = (
        "Routine bearing lubrication and vibration check advised." 
        if status == "Maintenance Required" 
        else "Pump operating under normal parameters."
    )

    servicing_date = (datetime.now() + timedelta(days=12)).strftime("%B %d, %Y")
    breakdown_time = (datetime.now() + timedelta(days=15)).strftime("%B %d, %Y")

    data = {
        "predicted_rul_hours": predicted_rul,
        "actual_rul_hours": actual_rul,
        "calculated_efficiency": efficiency,
        "vibration_velocity": vibration,
        "bearing_temp": bearing_temp,
        "inlet_pressure": inlet_pressure,
        "suggested_servicing_date": servicing_date,
        "estimated_breakdown_time": breakdown_time,
        "status": status,
        "alert_message": alert_message
    }

    # Log telemetry to CSV audit file safely
    try:
        with open(CSV_LOG_FILE, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(), predicted_rul, actual_rul, 
                efficiency, vibration, bearing_temp, inlet_pressure, status
            ])
    except Exception as e:
        print(f"Error logging to CSV: {e}")

    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)