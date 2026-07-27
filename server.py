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

# Load ML Pipeline (Random Forest model) if it exists
model_path = "pump_rf_pipeline.pkl"
if os.path.exists(model_path):
    model = joblib.load(model_path)
else:
    model = None

# CSV Audit Log File setup
CSV_LOG_FILE = "pump_monitoring_log.csv"
if not os.path.exists(CSV_LOG_FILE):
    with open(CSV_LOG_FILE, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp", "predicted_rul_hours", "actual_rul_hours", 
            "calculated_efficiency", "vibration_velocity", "bearing_temp", 
            "inlet_pressure", "status"
        ])

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

    # Log telemetry to CSV audit file
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