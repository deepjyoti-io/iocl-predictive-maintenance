from datetime import datetime, timedelta
import random
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

# Load ML Pipeline using memory mapping to prevent Out Of Memory (OOM) errors on cloud hosts
model_path = "pump_rf_pipeline.pkl"
if os.path.exists(model_path):
    try:
        # mmap_mode='r' reads model from disk on-demand instead of clogging RAM
        model = joblib.load(model_path, mmap_mode='r')
    except Exception as e:
        print(f"Error loading model with mmap: {e}")
        model = None
else:
    model = None

# CSV Audit Log File setup (safely handled for cloud read-only filesystems)
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

@app.get("/api/pump/status")
def get_pump_status():
    # Simulated telemetry variations
    base_rul = 338.3
    time_offset = random.uniform(-2.0, 2.0)
    predicted_rul = round(base_rul + time_offset, 1)
    actual_rul = round(predicted_rul + random.uniform(-1.5, 1.5), 1)
    efficiency = round(81.1 + random.uniform(-1.0, 1.0), 1)
    
    vibration = round(1.01 + random.uniform(-0.1, 0.15), 2)
    bearing_temp = round(50.3 + random.uniform(-0.5, 0.8), 1)
    inlet_pressure = round(48.3 + random.uniform(-0.6, 0.6), 1)

    status = "Maintenance Required" if predicted_rul < 250 else "All Good"
    alert_message = "Routine bearing lubrication and vibration check advised." if status == "Maintenance Required" else "Pump operating under normal parameters."

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