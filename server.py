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

# Base directory path to avoid file location issues on Render
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Global stream tracker
stream_index = 0
stream_data_cache = []

# Load test_stream.json cleanly at startup
stream_file_path = os.path.join(BASE_DIR, "test_stream.json")
if os.path.exists(stream_file_path):
    try:
        with open(stream_file_path, "r") as f:
            stream_data_cache = json.load(f)
            print(f"Successfully loaded {len(stream_data_cache)} telemetry frames.")
    except Exception as e:
        print(f"Error reading {stream_file_path}: {e}")
else:
    print(f"WARNING: {stream_file_path} not found!")

# Load ML Pipeline using memory mapping
model_path = os.path.join(BASE_DIR, "pump_rf_pipeline.pkl")
model = None
if os.path.exists(model_path):
    try:
        model = joblib.load(model_path, mmap_mode='r')
    except Exception as e:
        print(f"Error loading model with mmap: {e}")

# CSV Audit Log File setup
CSV_LOG_FILE = os.path.join(BASE_DIR, "pump_monitoring_log.csv")
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
    print(f"CSV log file creation skipped: {e}")


@app.get("/")
def read_root():
    return {
        "status": "IOCL Pump Telemetry API is Live!",
        "stream_samples_loaded": len(stream_data_cache)
    }


@app.get("/api/pump/status")
def get_pump_status():
    global stream_index
    
    if stream_data_cache:
        # Step to next sample in array
        current_sample = stream_data_cache[stream_index % len(stream_data_cache)]
        stream_index += 1
        
        # Extract features (flexible key lookup)
        vibration = round(float(current_sample.get("vibration_velocity", current_sample.get("vibration", 1.01))), 2)
        bearing_temp = round(float(current_sample.get("bearing_temp", current_sample.get("temperature", 50.3))), 1)
        inlet_pressure = round(float(current_sample.get("inlet_pressure", current_sample.get("pressure", 48.3))), 1)
        
        # Predict using ML model if available
        if model is not None:
            try:
                input_df = pd.DataFrame([{
                    "vibration_velocity": vibration,
                    "bearing_temp": bearing_temp,
                    "inlet_pressure": inlet_pressure
                }])
                predicted_rul = round(float(model.predict(input_df)[0]), 1)
            except Exception as e:
                print(f"Prediction error: {e}")
                predicted_rul = round(float(current_sample.get("predicted_rul_hours", current_sample.get("rul", 338.3))), 1)
        else:
            predicted_rul = round(float(current_sample.get("predicted_rul_hours", current_sample.get("rul", 338.3))), 1)
            
        actual_rul = round(float(current_sample.get("actual_rul_hours", predicted_rul)), 1)
        efficiency = round(float(current_sample.get("calculated_efficiency", current_sample.get("efficiency", 81.1))), 1)

    else:
        # Static fallback if JSON file is missing
        predicted_rul = 338.3
        actual_rul = 338.3
        efficiency = 81.1
        vibration = 1.01
        bearing_temp = 50.3
        inlet_pressure = 48.3

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

    # Log telemetry to CSV
    try:
        with open(CSV_LOG_FILE, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                datetime.now().isoformat(), predicted_rul, actual_rul, 
                efficiency, vibration, bearing_temp, inlet_pressure, status
            ])
    except Exception as e:
        pass

    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)