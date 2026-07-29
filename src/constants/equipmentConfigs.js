import { Activity, Thermometer, Gauge } from 'lucide-react';

export const EQUIPMENT_SENSORS = {
  pump: [
    { id: 'vibration', label: 'Vibration', fullLabel: 'Vibration Velocity', unit: 'mm/s', optimal: 1.0, max: 8, color: '#06b6d4', icon: Activity, step: "0.01" },
    { id: 'temperature', label: 'Temperature', fullLabel: 'Bearing Temp', unit: '°C', optimal: 45.0, max: 120, color: '#f59e0b', icon: Thermometer, step: "0.1" },
    { id: 'pressure', label: 'Pressure', fullLabel: 'Suction Pressure', unit: 'PSI', optimal: 50.0, max: 100, color: '#3b82f6', icon: Gauge, step: "0.1" },
    { id: 'flow_rate', label: 'Flow Rate', fullLabel: 'Discharge Flow', unit: 'm³/h', optimal: 120.0, max: 200, color: '#8b5cf6', icon: Activity, step: "1" },
    { id: 'motor_current', label: 'Motor Current', fullLabel: 'Motor Current', unit: 'A', optimal: 25.0, max: 50, color: '#ec4899', icon: Activity, step: "0.1" },
    { id: 'seal_oil_level', label: 'Seal Oil', fullLabel: 'Seal Oil Level', unit: '%', optimal: 90.0, max: 100, color: '#10b981', icon: Gauge, step: "1" }
  ],
  compressor: [
    { id: 'vibration', label: 'Vibration', fullLabel: 'Frame Vibration', unit: 'mm/s', optimal: 1.2, max: 8, color: '#06b6d4', icon: Activity, step: "0.01" },
    { id: 'temperature', label: 'Temperature', fullLabel: 'Discharge Temp', unit: '°C', optimal: 85.0, max: 150, color: '#f59e0b', icon: Thermometer, step: "0.1" },
    { id: 'pressure', label: 'Pressure', fullLabel: 'Interstage Pressure', unit: 'PSI', optimal: 140.0, max: 200, color: '#3b82f6', icon: Gauge, step: "0.1" },
    { id: 'crosshead_temp', label: 'Crosshead Temp', fullLabel: 'Crosshead Pin Temp', unit: '°C', optimal: 65.0, max: 120, color: '#ef4444', icon: Thermometer, step: "0.1" },
    { id: 'lube_box_level', label: 'Lube Box', fullLabel: 'Lube Box Level', unit: '%', optimal: 85.0, max: 100, color: '#10b981', icon: Gauge, step: "1" },
    { id: 'rod_drop', label: 'Rod Drop', fullLabel: 'Rod Wear Drop', unit: 'mm', optimal: 0.05, max: 0.2, color: '#8b5cf6', icon: Activity, step: "0.01" }
  ]
};