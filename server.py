from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import json
import os
from datetime import datetime, timedelta

app = FastAPI()

# Allow React Frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safely locate files using absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'pump_rf_pipeline.pkl')
DATA_PATH = os.path.join(BASE_DIR, 'test_stream.json')

# Safely load the ML model
pipeline = None
if os.path.exists(MODEL_PATH):
    try:
        pipeline = joblib.load(MODEL_PATH, mmap_mode='r')
    except Exception as e:
        print(f"Error loading model: {e}")

# Safely load the stream dataset
test_stream_data = []
if os.path.exists(DATA_PATH):
    try:
        with open(DATA_PATH, 'r') as f:
            test_stream_data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON stream data: {e}")

stream_index = 0

@app.get("/")
def read_root():
    return {
        "status": "IOCL Pump Telemetry API is Live!",
        "stream_samples_loaded": len(test_stream_data),
        "model_loaded": pipeline is not None
    }

@app.get("/api/pump/status")
def get_pump_status():
    global stream_index

    # Check if stream data is available
    if test_stream_data:
        row = test_stream_data[stream_index]
        stream_index = (stream_index + 1) % len(test_stream_data)

        # Separate sensor inputs from target/RUL field
        sensor_features = {k: v for k, v in row.items() if k not in ['actual_rul', 'predicted_rul_hours', 'rul']}

        # Predict RUL using loaded model or fallback to JSON field
        if pipeline is not None:
            try:
                df_input = pd.DataFrame([sensor_features])
                predicted_rul = float(pipeline.predict(df_input)[0])
            except Exception as e:
                print(f"Prediction error: {e}")
                predicted_rul = float(row.get('predicted_rul_hours', row.get('rul', 338.3)))
        else:
            predicted_rul = float(row.get('predicted_rul_hours', row.get('rul', 338.3)))

        # Extract telemetry parameters safely
        vibration = float(sensor_features.get('sensor_00', sensor_features.get('vibration_velocity', sensor_features.get('vibration', 1.01))))
        temperature = float(sensor_features.get('sensor_01', sensor_features.get('bearing_temp', sensor_features.get('temperature', 50.3))))
        pressure = float(sensor_features.get('sensor_02', sensor_features.get('inlet_pressure', sensor_features.get('pressure', 48.3))))
        efficiency = float(sensor_features.get('efficiency', sensor_features.get('calculated_efficiency', 81.5)))
    
    else:
        # Fallback values if dataset is missing
        predicted_rul = 338.3
        vibration = 1.01
        temperature = 50.3
        pressure = 48.3
        efficiency = 81.5

    # Safety Triage Logic
    if predicted_rul > 720:
        status, alert_level = "OPERATIONAL", "green"
    elif 168 <= predicted_rul <= 720:
        status, alert_level = "MAINTENANCE REQUIRED", "yellow"
    else:
        status, alert_level = "CRITICAL RISK", "red"

    # Servicing calculation
    servicing_date = datetime.now() + timedelta(hours=max(0, predicted_rul - 48))

    # The keys here MUST match what React is expecting!
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