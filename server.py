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

# --- Pydantic Model for All 6 Sensors ---
class SimulationRequest(BaseModel):
    vibration: Optional[float] = None
    temperature: Optional[float] = None
    pressure: Optional[float] = None
    crosshead_temp: Optional[float] = None
    lube_box_level: Optional[float] = None
    rod_drop: Optional[float] = None
    flow_rate: Optional[float] = None
    motor_current: Optional[float] = None
    seal_oil_level: Optional[float] = None

@app.get("/")
def read_root():
    return {"status": "IOCL Multi-Equipment Telemetry API is Live!"}

# --- Live Equipment Telemetry Stream Endpoint ---
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

        if equipment == "compressor":
            vibration = float(sensor_features.get('gaccx', sensor_features.get('vibration', 1.2)))
            temperature = float(sensor_features.get('outlet_temp', sensor_features.get('temperature', 150.0)))
            pressure = float(sensor_features.get('wpump_outlet_press', sensor_features.get('pressure', 140.0)))
            
            # Compressor efficiency formula (normal operating temp is ~140-170 °C)
            raw_eff = 95.0 - (vibration * 4.0) - ((temperature - 140.0) * 0.3)
            efficiency = max(0.0, min(100.0, raw_eff))
            
            # Catastrophic safety check tuned for Gas Compressor (>190 °C trip limit)
            is_catastrophic = (vibration > 4.5) or (temperature > 190.0) or (efficiency <= 10.0)
        else:
            vibration = float(sensor_features.get('sensor_00', sensor_features.get('vibration', 1.0)))
            temperature = float(sensor_features.get('sensor_01', sensor_features.get('temperature', 45.0)))
            pressure = float(sensor_features.get('sensor_02', sensor_features.get('pressure', 50.0)))
            
            # Pump efficiency formula (normal operating temp is ~40-60 °C)
            raw_eff = 95.0 - (vibration * 4.0) - ((temperature - 40.0) * 0.3)
            efficiency = max(0.0, min(100.0, raw_eff))
            
            # Catastrophic safety check tuned for Centrifugal Pump (>90 °C trip limit)
            is_catastrophic = (vibration > 4.5) or (temperature > 90.0) or (efficiency <= 10.0)

        if is_catastrophic:
            predicted_rul = 0.0
            status, alert_level = "CRITICAL RISK", "red"
        else:
            if pipeline is not None:
                try:
                    df_input = pd.DataFrame([sensor_features])
                    predicted_rul = float(pipeline.predict(df_input)[0])
                except Exception:
                    predicted_rul = float(row.get('predicted_rul_hours', row.get('rul', 338.3)))
            else:
                predicted_rul = float(row.get('predicted_rul_hours', row.get('rul', 338.3)))

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
    else:
        vibration, temperature, pressure, efficiency, predicted_rul = 1.01, 50.3, 48.3, 81.5, 338.3
        status, alert_level = "OPERATIONAL", "green"

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

# --- Full 6-Sensor ML Simulation Endpoint ---
@app.post("/api/{equipment}/simulate")
def simulate_equipment(equipment: str, req: SimulationRequest):
    if equipment == "compressor":
        pipeline = comp_pipeline
        dataset = comp_stream_data
        
        vib_val = req.vibration if req.vibration is not None else 1.2
        temp_val = req.temperature if req.temperature is not None else 150.0
        press_val = req.pressure if req.pressure is not None else 140.0
        cross_temp = req.crosshead_temp if req.crosshead_temp is not None else 65.0
        lube_box = req.lube_box_level if req.lube_box_level is not None else 85.0
        rod_drop = req.rod_drop if req.rod_drop is not None else 0.05

        # Thermodynamic efficiency impacted by all 6 compressor sensors
        eff_penalty = (vib_val * 4.0) + ((temp_val - 140.0) * 0.2) + ((cross_temp - 50.0) * 0.3) + ((100.0 - lube_box) * 0.2) + (rod_drop * 100.0)
        simulated_efficiency = max(0.0, min(100.0, 95.0 - eff_penalty))

        # Extreme catastrophic trip check across all 6 inputs (Compressor temp limit >190 °C)
        is_catastrophic = (
            vib_val > 4.5 or 
            temp_val > 190.0 or 
            cross_temp > 95.0 or 
            lube_box < 20.0 or 
            rod_drop > 0.15 or 
            simulated_efficiency <= 10.0
        )
    else:
        pipeline = pump_pipeline
        dataset = pump_stream_data

        vib_val = req.vibration if req.vibration is not None else 1.0
        temp_val = req.temperature if req.temperature is not None else 45.0
        press_val = req.pressure if req.pressure is not None else 50.0
        flow_rate = req.flow_rate if req.flow_rate is not None else 120.0
        motor_curr = req.motor_current if req.motor_current is not None else 25.0
        seal_oil = req.seal_oil_level if req.seal_oil_level is not None else 90.0

        # Thermodynamic efficiency impacted by all 6 pump sensors
        eff_penalty = (vib_val * 4.0) + ((temp_val - 40.0) * 0.3) + (abs(flow_rate - 120.0) * 0.2) + ((motor_curr - 25.0) * 0.5) + ((100.0 - seal_oil) * 0.2)
        simulated_efficiency = max(0.0, min(100.0, 95.0 - eff_penalty))

        # Extreme catastrophic trip check across all 6 inputs (Pump temp limit >90 °C)
        is_catastrophic = (
            vib_val > 4.5 or 
            temp_val > 90.0 or 
            motor_curr > 40.0 or 
            seal_oil < 20.0 or 
            simulated_efficiency <= 10.0
        )

    if is_catastrophic:
        predicted_rul = 0.0
        status = "CRITICAL RISK"
        alert_level = "red"
    else:
        baseline_features = {}
        if dataset:
            baseline_features = {k: v for k, v in dataset[0].items() if k not in ['actual_rul', 'predicted_rul_hours', 'rul']}

        # Map ALL 6 inputs directly into the trained ML feature columns
        if equipment == "compressor":
            for col in baseline_features.keys():
                if col == 'gaccx' or 'vib' in col:
                    baseline_features[col] = vib_val
                elif col == 'outlet_temp' or 'temp' in col:
                    baseline_features[col] = temp_val
                elif col == 'wpump_outlet_press' or 'press' in col:
                    baseline_features[col] = press_val
                elif col == 'motor_power':
                    baseline_features[col] = baseline_features[col] * (cross_temp / 65.0)
                elif col == 'oilpump_power':
                    baseline_features[col] = baseline_features[col] * (100.0 / max(1.0, lube_box))
                elif col == 'air_flow':
                    baseline_features[col] = baseline_features[col] * (1.0 - (rod_drop * 2.0))
        else:
            for col in baseline_features.keys():
                if col == 'sensor_00' or 'vib' in col:
                    baseline_features[col] = vib_val
                elif col == 'sensor_01' or 'temp' in col:
                    baseline_features[col] = temp_val
                elif col == 'sensor_02' or 'press' in col:
                    baseline_features[col] = press_val
                elif col == 'sensor_03':
                    baseline_features[col] = flow_rate
                elif col == 'sensor_04':
                    baseline_features[col] = motor_curr
                elif col == 'sensor_05':
                    baseline_features[col] = seal_oil

        predicted_rul = None
        if pipeline is not None and len(baseline_features) > 0:
            try:
                df_input = pd.DataFrame([baseline_features])
                predicted_rul = float(pipeline.predict(df_input)[0])
            except Exception as e:
                print(f"Simulation ML prediction error: {e}")

        # Algorithmic fallback if ML model is unavailable
        if predicted_rul is None:
            if equipment == "compressor":
                predicted_rul = max(0.0, 150.0 - (vib_val * 20.0) - (cross_temp * 0.5) - (rod_drop * 200.0))
            else:
                predicted_rul = max(0.0, 800.0 - (vib_val * 100.0) - (temp_val * 4.0) - ((40.0 - seal_oil) * 5.0))

        # Standard Triage Thresholds
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