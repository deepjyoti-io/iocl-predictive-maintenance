import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity, Thermometer, Gauge, AlertTriangle, Clock, ShieldCheck, AlertOctagon } from 'lucide-react';

const App = () => {
  const [pumpData, setPumpData] = useState({
    predicted_rul_hours: 269.1,
    actual_rul_hours: 338.6,
    calculated_efficiency: 79.1,
    suggested_servicing_date: "August 04, 2026",
    estimated_breakdown_time: "August 10, 2026",
    vibration_velocity: 2.44,
    bearing_temp: 46.0,
    inlet_pressure: 50.2,
    status: "MAINTENANCE REQUIRED",
    alert_level: "yellow",
    alert_message: "High vibration levels detected."
  });
  
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  // --- Data Fetching Logic ---
  useEffect(() => {
    const fetchPumpStatus = async () => {
      try {
        const response = await fetch('https://iocl-predictive-maintenance.onrender.com/api/pump/status');
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        setPumpData(data);
        setError(null);

        // Update history for trendline (keep last 20 points)
        setHistory(prev => {
          const newPoint = { 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
            rul: data.predicted_rul_hours, 
            vibration: data.vibration_velocity 
          };
          const newHistory = [...prev, newPoint];
          return newHistory.slice(-20); 
        });

      } catch (err) {
        console.error("Backend offline:", err);
        setError("Cannot connect to backend server. Make sure server is running!");
      }
    };

    fetchPumpStatus();
    const interval = setInterval(fetchPumpStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Helper for Status Colors (Badge & Icons) ---
  const getStatusTheme = (status, alertLevel) => {
    // Priority check on status string or alert_level
    if (status === "OPERATIONAL" || alertLevel === "green") {
      return {
        badge: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
        text: "text-emerald-400",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />
      };
    } else if (status === "CRITICAL RISK" || alertLevel === "red") {
      return {
        badge: "bg-rose-500/15 border-rose-500/50 text-rose-400 animate-pulse",
        text: "text-rose-400",
        icon: <AlertOctagon className="w-4 h-4 text-rose-400" />
      };
    } else {
      // Default to MAINTENANCE REQUIRED / Yellow
      return {
        badge: "bg-amber-500/10 border-amber-500/40 text-amber-400",
        text: "text-amber-400",
        icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
      };
    }
  };

  const theme = getStatusTheme(pumpData.status, pumpData.alert_level);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* --- Header --- */}
        <header className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-wide">Industrial Pump Predictive Monitor</h1>
              <p className="text-xs text-cyan-400 mt-1 font-mono font-medium">Asset: CENTRIFUGAL_PUMP_01</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${theme.badge}`}>
              {theme.icon}
              <span>{pumpData.status}</span>
            </div>
          </div>
        </header>

        {/* --- Connection Error --- */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 p-4 rounded-xl text-sm font-mono">
            ⚠️ CONNECTION ERROR: {error}
          </div>
        )}

        {/* --- Top Row: Key Performance Indicators --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Predicted RUL */}
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Predicted RUL</p>
            <div className="flex items-baseline gap-2 mt-4">
              <span className={`text-4xl font-extrabold tracking-tight ${theme.text}`}>
                {pumpData.predicted_rul_hours ? pumpData.predicted_rul_hours.toFixed(1) : "0.0"}
              </span>
              <span className="text-slate-400 font-semibold text-sm">hrs</span>
            </div>
          </div>

          {/* Card 2: Suggested Servicing Date */}
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Suggested Servicing Date</p>
            <p className="text-2xl font-bold text-white mt-4">{pumpData.suggested_servicing_date}</p>
          </div>

          {/* Card 3: Hydraulic Efficiency */}
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hydraulic Efficiency</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className={`text-4xl font-extrabold tracking-tight ${theme.text}`}>
                  {pumpData.calculated_efficiency ? pumpData.calculated_efficiency.toFixed(1) : "0.0"}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Calculated via Live Thermodynamic Engine</p>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-lg text-cyan-400 border border-slate-700/50">
              <Activity className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* --- Middle Row: Live Sensor Telemetry --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Vibration Velocity */}
          <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex items-center gap-4">
            <div className="bg-cyan-950/60 border border-cyan-800/40 p-3 rounded-xl text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Vibration Velocity</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {pumpData.vibration_velocity ? pumpData.vibration_velocity.toFixed(2) : "0.00"}{' '}
                <span className="text-xs text-slate-400 font-normal">mm/s</span>
              </p>
            </div>
          </div>

          {/* Bearing Temperature */}
          <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex items-center gap-4">
            <div className="bg-amber-950/60 border border-amber-800/40 p-3 rounded-xl text-amber-500">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Bearing Temperature</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {pumpData.bearing_temp ? pumpData.bearing_temp.toFixed(1) : "0.0"}{' '}
                <span className="text-xs text-slate-400 font-normal">°C</span>
              </p>
            </div>
          </div>

          {/* Inlet Pressure */}
          <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex items-center gap-4">
            <div className="bg-blue-950/60 border border-blue-800/40 p-3 rounded-xl text-blue-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Inlet Pressure</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {pumpData.inlet_pressure ? pumpData.inlet_pressure.toFixed(1) : "0.0"}{' '}
                <span className="text-xs text-slate-400 font-normal">PSI</span>
              </p>
            </div>
          </div>

        </div>

        {/* --- Bottom Row: Real-time Charts --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 1: RUL Trend */}
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">RUL Degradation Trend</h2>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                  <Line type="monotone" dataKey="rul" stroke="#06b6d4" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Live Vibration */}
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">Live Vibration Telemetry</h2>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 'dataMax + 0.5']} />
                  <Line type="monotone" dataKey="vibration" stroke="#eab308" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;