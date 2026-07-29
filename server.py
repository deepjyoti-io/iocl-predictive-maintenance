from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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
    allow_methods=["GET", "POST", "OPTIONS"],
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
    try:
        with open(PUMP_DATA_PATH, 'r') as f:
            pump_stream_data = json.load(f)
    except Exception as e:
        print(f"Error reading pump stream json: {e}")

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
    try:
        with open(COMP_DATA_PATH, 'r') as f:
            comp_stream_data = json.load(f)
    except Exception as e:
        print(f"Error reading compressor stream json: {e}")

stream_indexes = {"pump": 0, "compressor": 0}

# --- Flexible Pydantic Model ---
class SimulationRequest(BaseModel):
    vibration: Optional[float] = 1.0
    temperature: Optional[float] = 50.0
    pressure: Optional[float] = 48.0
    crosshead_temp: Optional[float] = 65.0
    lube_box_level: Optional[float] = 85.0
    rod_drop: Optional[float] = 0.05
    flow_rate: Optional[float] = 120.0
    motor_current: Optional[float] = 25.0
    seal_oil_level: Optional[float] = 90.0

@app.get("/")
def read_root():
    return {"status": "IOCL Multi-Equipment Telemetry API is Live!"}

@app.get("/api/{equipment}/status")
def get_equipment_status(equipment: str):
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

    if equipment == "compressor":
        if predicted_rul > 80:
            status, alert_level = "OPERATIONAL", "green"
        elif 40 <= predicted_rul <= 80:
            status, alert_level = "MAINTENANCE REQUIRED", "yellow"
        else:
            status, alert_level = "CRITICAL RISK", "red"
    else:
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

@app.post("/api/{equipment}/simulate")
def simulate_equipment(equipment: str, req: SimulationRequest):
    if equipment == "compressor":
        pipeline = comp_pipeline
        dataset = comp_stream_data
    else:
        pipeline = pump_pipeline
        dataset = pump_stream_data

    baseline_features = {}
    if dataset:
        baseline_features = {k: v for k, v in dataset[0].items() if k not in ['actual_rul', 'predicted_rul_hours', 'rul']}

    vib_val = req.vibration if req.vibration is not None else 1.0
    temp_val = req.temperature if req.temperature is not None else 50.0
    press_val = req.pressure if req.pressure is not None else 48.0

    # Overlay user values onto baseline dataset
    for col in baseline_features.keys():
        if 'vib' in col or 'sensor_00' in col:
            baseline_features[col] = vib_val
        elif 'temp' in col or 'sensor_01' in col:
            baseline_features[col] = temp_val
        elif 'press' in col or 'sensor_02' in col:
            baseline_features[col] = press_val

    predicted_rul = None
    if pipeline is not None and len(baseline_features) > 0:
        try:
            df_input = pd.DataFrame([baseline_features])
            predicted_rul = float(pipeline.predict(df_input)[0])
        except Exception as e:
            print(f"Simulation ML prediction error: {e}")

    if predicted_rul is None:
        if equipment == "compressor":
            predicted_rul = max(0.0, 150.0 - (vib_val * 30) - (temp_val * 0.5))
        else:
            predicted_rul = max(0.0, 800.0 - (vib_val * 120) - (temp_val * 2))

    simulated_efficiency = max(0.0, min(100.0, 95.0 - (vib_val * 4) - ((temp_val - 40) * 0.3)))

    if equipment == "compressor":
        if predicted_rul > 80:
            status, alert_level = "OPERATIONAL", "green"
        elif 40 <= predicted_rul <= 80:
            status, alert_level = "MAINTENANCE REQUIRED", "yellow"
        else:
            status, alert_level = "CRITICAL RISK", "red"
    else:
        if predicted_rul > 720:
            status, alert_level = "OPERATIONAL", "green"
        elif 168 <= predicted_rul <= 720:
            status, alert_level = "MAINTENANCE REQUIRED", "yellow"
        else:
            status, alert_level = "CRITICAL RISK", "red"

    return {
        "simulated_rul": round(predicted_rul, 1),
        "simulated_efficiency": round(simulated_efficiency, 1),
        "status": status,
        "alert_level": alert_level
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)