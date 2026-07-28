from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import json
import os
from datetime import datetime, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Load Pump Assets ---
PUMP_MODEL_PATH = os.path.join(BASE_DIR, 'pump_rf_pipeline.pkl')
PUMP_DATA_PATH = os.path.join(BASE_DIR, 'test_stream.json')

pump_pipeline = None
if os.path.exists(PUMP_MODEL_PATH):
    try:
        pump_pipeline = joblib.load(PUMP_MODEL_PATH, mmap_mode='r')
    except Exception as e:
        print(f"Error loading pump model: {e}")

pump_stream_data = []
if os.path.exists(PUMP_DATA_PATH):
    with open(PUMP_DATA_PATH, 'r') as f:
        pump_stream_data = json.load(f)

# --- Load Compressor Assets ---
COMP_MODEL_PATH = os.path.join(BASE_DIR, 'compressor_rul_pipeline.pkl')
COMP_DATA_PATH = os.path.join(BASE_DIR, 'compressor_test_stream.json')

comp_pipeline = None
if os.path.exists(COMP_MODEL_PATH):
    try:
        comp_pipeline = joblib.load(COMP_MODEL_PATH, mmap_mode='r')
    except Exception as e:
        print(f"Error loading compressor model: {e}")

comp_stream_data = []
if os.path.exists(COMP_DATA_PATH):
    with open(COMP_DATA_PATH, 'r') as f:
        comp_stream_data = json.load(f)

# Separate indexes to track where each equipment is in its simulation loop
stream_indexes = {"pump": 0, "compressor": 0}

@app.get("/")
def read_root():
    return {"status": "IOCL Multi-Equipment Telemetry API is Live!"}

@app.get("/api/{equipment}/status")
def get_equipment_status(equipment: str):
    
    # Select data and model based on the URL parameter
    if equipment == "compressor":
        dataset = comp_stream_data
        pipeline = comp_pipeline
    else:
        dataset = pump_stream_data
        pipeline = pump_pipeline

    if dataset:
        idx = stream_indexes.get(equipment, 0)
        row = dataset[idx]
        stream_indexes[equipment] = (idx + 1) % len(dataset)

        sensor_features = {k: v for k, v in row.items() if k not in ['actual_rul', 'predicted_rul_hours', 'rul']}

        if pipeline is not None:
            try:
                df_input = pd.DataFrame([sensor_features])
                predicted_rul = float(pipeline.predict(df_input)[0])
            except Exception:
                predicted_rul = float(row.get('predicted_rul_hours', row.get('rul', 338.3)))
        else:
            predicted_rul = float(row.get('predicted_rul_hours', row.get('rul', 338.3)))

        vibration = float(sensor_features.get('sensor_00', sensor_features.get('vibration_velocity', sensor_features.get('vibration', 1.01))))
        temperature = float(sensor_features.get('sensor_01', sensor_features.get('bearing_temp', sensor_features.get('temperature', 50.3))))
        pressure = float(sensor_features.get('sensor_02', sensor_features.get('inlet_pressure', sensor_features.get('pressure', 48.3))))
        efficiency = float(sensor_features.get('efficiency', sensor_features.get('calculated_efficiency', 81.5)))
    else:
        predicted_rul = 338.3
        vibration = 1.01
        temperature = 50.3
        pressure = 48.3
        efficiency = 81.5

    if predicted_rul > 720:
        status, alert_level = "OPERATIONAL", "green"
    elif 168 <= predicted_rul <= 720:
        status, alert_level = "MAINTENANCE REQUIRED", "yellow"
    else:
        status, alert_level = "CRITICAL RISK", "red"

    servicing_date = datetime.now() + timedelta(hours=max(0, predicted_rul - 48))

    return {
        "vibration_velocity": round(vibration, 2),
        "bearing_temp": round(temperature, 1),
        "inlet_pressure": round(pressure, 1),
        "calculated_efficiency": round(efficiency, 1),
        "predicted_rul_hours": round(predicted_rul, 1),
        "status": status,
        "alert_level": alert_level,
        "suggested_servicing_date": servicing_date.strftime("%B %d, %Y")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)