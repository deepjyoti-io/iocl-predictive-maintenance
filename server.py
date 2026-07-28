from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

stream_indexes = {"pump": 0, "compressor": 0}

# --- Pydantic Model for Simulation Request ---
class SimulationRequest(BaseModel):
    vibration: float
    temperature: float
    pressure: float

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

    # Triage thresholds specific to equipment
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

# --- NEW: Simulation Endpoint ---
@app.post("/api/{equipment}/simulate")
def simulate_equipment(equipment: str, req: SimulationRequest):
    pipeline = comp_pipeline if equipment == "compressor" else pump_pipeline
    
    # Attempt ML Prediction. If missing columns cause an error, fallback to algorithmic calculation
    try:
        # Map user input to both possible key formats the model might expect
        df_input = pd.DataFrame([{
            "vibration_velocity": req.vibration, "sensor_00": req.vibration,
            "bearing_temp": req.temperature, "sensor_01": req.temperature,
            "inlet_pressure": req.pressure, "sensor_02": req.pressure
        }])
        predicted_rul = float(pipeline.predict(df_input)[0])
    except Exception as e:
        print(f"Simulation ML fallback triggered: {e}")
        # Algorithmic fallback if model expects 50+ features and we only gave 3
        if equipment == "compressor":
            predicted_rul = max(0.0, 150.0 - (req.vibration * 30) - (req.temperature * 0.5))
        else:
            predicted_rul = max(0.0, 800.0 - (req.vibration * 120) - (req.temperature * 2))

    # Calculate simulated efficiency based on vibration and temperature
    simulated_efficiency = max(0.0, min(100.0, 95.0 - (req.vibration * 4) - ((req.temperature - 40) * 0.3)))

    # Apply Triage Logic
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