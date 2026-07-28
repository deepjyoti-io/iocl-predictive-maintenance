import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { Activity, Thermometer, Gauge, AlertTriangle, Clock, ShieldCheck, AlertOctagon, Menu, X, FileText, Settings2, Database, Download, BellRing, CheckSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { jsPDF } from "jspdf";

// --- Custom Semi-Circle Gauge Component (Enlarged Gauge Arc) ---
const SemiCircleGauge = ({ value, max, color, unit, label, icon: Icon }) => {
  const percentage = Math.min(value / max, 1);
  const data = [
    { name: 'Value', value: percentage },
    { name: 'Empty', value: 1 - percentage }
  ];
  return (
    <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
      <div className="w-full flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: color }} />
        <p className="text-xs text-slate-400 font-medium">{label}</p>
      </div>
      <div className="w-full h-36 relative mt-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="75%"
              outerRadius="115%"
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={color} />
              <Cell fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-2 w-full flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white leading-none tracking-tight">{value.toFixed(1)}</span>
          <span className="text-xs text-slate-400 font-medium mt-1">{unit}</span>
        </div>
      </div>
    </div>
  );
};

// --- Available Sensors for Simulation ---
const SENSOR_OPTIONS = [
  { id: 'vibration', label: 'Vibration (mm/s)', optimal: 1.0, step: "0.01" },
  { id: 'temperature', label: 'Temperature (°C)', optimal: 45.0, step: "0.1" },
  { id: 'pressure', label: 'Pressure (PSI)', optimal: 50.0, step: "0.1" },
  { id: 'flow_rate', label: 'Flow Rate (m³/h)', optimal: 120.0, step: "1" },
  { id: 'motor_current', label: 'Motor Current (A)', optimal: 25.0, step: "0.1" },
  { id: 'oil_level', label: 'Oil Level (%)', optimal: 85.0, step: "1" }
];

const App = () => {
  const [equipment, setEquipment] = useState("pump"); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Simulation Modal States
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulationStep, setSimulationStep] = useState(1);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  
  // New States for Alerts & Checklists
  const [alerts, setAlerts] = useState([]);
  const [checkedTasks, setCheckedTasks] = useState({});
  
  const [machineData, setMachineData] = useState({
    predicted_rul_hours: 0,
    calculated_efficiency: 0,
    suggested_servicing_date: "Loading...",
    vibration_velocity: 0,
    bearing_temp: 0,
    inlet_pressure: 0,
    status: "OPERATIONAL",
    alert_level: "green",
  });
  
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const menuRef = useRef(null);

  // Close menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Live Data Logic
  useEffect(() => {
    setHistory([]); 
    setAlerts([]);
    setCheckedTasks({});

    const fetchStatus = async () => {
      try {
        const response = await fetch(`https://iocl-predictive-maintenance.onrender.com/api/${equipment}/status`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        setMachineData(data);
        setError(null);

        setHistory(prev => {
          const newPoint = { 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
            rul: data.predicted_rul_hours, 
            vibration: data.vibration_velocity,
            temperature: data.bearing_temp,
            pressure: data.inlet_pressure,
            efficiency: data.calculated_efficiency
          };
          return [...prev, newPoint].slice(-20); 
        });

        if (data.status !== "OPERATIONAL") {
          setAlerts(prev => {
            const timestamp = new Date().toLocaleTimeString();
            if (prev.length > 0 && prev[0].time === timestamp) return prev;
            
            const newAlert = {
              time: timestamp,
              msg: `${data.status}: Anomaly detected on ${equipment.toUpperCase()} (Vib: ${data.vibration_velocity} mm/s, Temp: ${data.bearing_temp}°C)`,
              level: data.alert_level
            };
            return [newAlert, ...prev].slice(0, 8);
          });
        }
      } catch (err) {
        console.error("Backend offline:", err);
        setError("Cannot connect to backend server. Make sure server is running!");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [equipment]); 

  const getKpiTextColor = (status) => {
    if (status === "OPERATIONAL") return "text-emerald-400";
    if (status === "CRITICAL RISK") return "text-rose-400";
    return "text-amber-400";
  };
  const kpiColorClass = getKpiTextColor(machineData.status);

  const displayName = equipment === "pump" ? "Industrial Pump" : "Gas Compressor";
  const displayAsset = equipment === "pump" ? "CENTRIFUGAL_PUMP_01" : "RECIPROCATING_COMPRESSOR_01";

  const maintenanceTasks = equipment === "pump" 
    ? ["Check coupling alignment", "Replace mechanical seals", "Inspect bearing lubrication oil", "Verify suction strainer"]
    : ["Inspect suction/discharge valves", "Check cylinder lube rate", "Monitor intercooler pressure", "Drain knockout drums"];

  const toggleTask = (idx) => {
    setCheckedTasks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleExportCSV = () => {
    if (history.length === 0) return alert("No telemetry data available to export yet.");
    const headers = ["Timestamp", "Predicted RUL (hrs)", "Efficiency (%)", "Vibration (mm/s)", "Temperature (C)", "Pressure (PSI)"];
    const rows = history.map(h => `${h.time},${h.rul},${h.efficiency},${h.vibration},${h.temperature},${h.pressure}`);
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${equipment}_live_audit_log_${new Date().getTime()}.csv`;
    link.click();
    setIsMenuOpen(false);
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedEquipment = formData.get("equipment") || equipment;
    const fromDate = formData.get("fromDate");
    const toDate = formData.get("toDate");

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("IOCL Predictive Maintenance Report", 20, 20);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Generated : ${new Date().toLocaleString()}`, 20, 35);
    doc.text(`Equipment        : ${selectedEquipment === 'pump' ? 'CENTRIFUGAL PUMP 01' : 'GAS COMPRESSOR 01'}`, 20, 42);
    doc.text(`Date Range       : ${fromDate} to ${toDate}`, 20, 49);
    doc.setFont("helvetica", "bold");
    doc.text("CURRENT TELEMETRY SUMMARY", 20, 65);
    doc.setLineWidth(0.2);
    doc.line(20, 68, 100, 68);
    doc.setFont("helvetica", "normal");
    doc.text(`Equipment Status       : ${machineData.status}`, 20, 78);
    doc.text(`Predicted RUL          : ${machineData.predicted_rul_hours} Hours`, 20, 85);
    doc.text(`Hydraulic Efficiency   : ${machineData.calculated_efficiency}%`, 20, 92);
    doc.text(`Vibration Velocity     : ${machineData.vibration_velocity} mm/s`, 20, 99);
    doc.text(`Bearing Temperature    : ${machineData.bearing_temp} °C`, 20, 106);
    doc.text(`Inlet Pressure         : ${machineData.inlet_pressure} PSI`, 20, 113);
    doc.save(`${selectedEquipment}_Report_${fromDate}_to_${toDate}.pdf`);
    setIsReportModalOpen(false);
  };

  // --- Multi-Step Simulation Logic ---
  const openSimulateModal = () => {
    setSimulationStep(1);
    setSelectedSensors([]);
    setSimulationResult(null);
    setIsSimulateModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleSensorToggle = (id) => {
    setSelectedSensors(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSimulateData = async (e) => {
    e.preventDefault();
    setSimulationResult(null); 
    const formData = new FormData(e.target);
    const targetEquipment = formData.get("equipment") || equipment;
    
    // Construct payload using inputs for selected sensors, and optimal baseline for unselected
    const payload = {
      vibration: selectedSensors.includes('vibration') ? parseFloat(formData.get("vibration")) : SENSOR_OPTIONS.find(s=>s.id==='vibration').optimal,
      temperature: selectedSensors.includes('temperature') ? parseFloat(formData.get("temperature")) : SENSOR_OPTIONS.find(s=>s.id==='temperature').optimal,
      pressure: selectedSensors.includes('pressure') ? parseFloat(formData.get("pressure")) : SENSOR_OPTIONS.find(s=>s.id==='pressure').optimal
    };

    try {
      const response = await fetch(`https://iocl-predictive-maintenance.onrender.com/api/${targetEquipment}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Simulation request failed");
      const data = await response.json();
      setSimulationResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to reach simulation engine. Make sure server is running.");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-10 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-6 relative">

        {/* --- Header --- */}
        <header className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative z-20">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-wide">{displayName} Predictive Monitor</h1>
              <p className="text-xs text-cyan-400 mt-1 font-mono font-medium">Asset: {displayAsset} | Unit: Guwahati Refinery</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {machineData.status === "OPERATIONAL" && (
              <div className="px-4 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>OPERATIONAL</span>
              </div>
            )}
            {machineData.status === "MAINTENANCE REQUIRED" && (
              <div className="px-4 py-2 rounded-lg border border-amber-500/50 bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>MAINTENANCE REQUIRED</span>
              </div>
            )}
            {(machineData.status === "CRITICAL RISK" || !["OPERATIONAL", "MAINTENANCE REQUIRED"].includes(machineData.status)) && (
              <div className="px-4 py-2 rounded-lg border border-rose-500/80 bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>CRITICAL RISK</span>
              </div>
            )}

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors">
              {isMenuOpen ? <X className="w-5 h-5 text-slate-300" /> : <Menu className="w-5 h-5 text-slate-300" />}
            </button>
          </div>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div ref={menuRef} className="absolute top-20 right-6 w-64 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-slate-700/50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Equipments</p>
                <div className="space-y-1">
                  <button onClick={() => { setEquipment('pump'); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${equipment === 'pump' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                    <Settings2 className="w-4 h-4" /> Centrifugal Pump
                  </button>
                  <button onClick={() => { setEquipment('compressor'); setIsMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${equipment === 'compressor' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                    <Settings2 className="w-4 h-4" /> Gas Compressor
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actions</p>
                <button onClick={() => { setIsReportModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" /> Generate PDF Report
                </button>
                <button onClick={handleExportCSV} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" /> Export Live Audit (CSV)
                </button>
                <button onClick={openSimulateModal} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" /> Simulate Sensor Data
                </button>
              </div>
            </div>
          )}
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 p-4 rounded-xl text-sm font-mono">
            ⚠️ CONNECTION ERROR: {error}
          </div>
        )}

        {/* --- Top Row: Key Performance Indicators --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Predicted RUL</p>
            <div className="flex items-baseline gap-2 mt-4">
              <span className={`text-5xl font-extrabold tracking-tight ${kpiColorClass}`}>
                {machineData.predicted_rul_hours ? machineData.predicted_rul_hours.toFixed(1) : "0.0"}
              </span>
              <span className="text-slate-400 font-semibold text-sm">hrs</span>
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Suggested Servicing Date</p>
            <p className="text-2xl font-bold text-white mt-4">{machineData.suggested_servicing_date}</p>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hydraulic Efficiency</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className={`text-4xl font-extrabold tracking-tight ${kpiColorClass}`}>
                  {machineData.calculated_efficiency ? machineData.calculated_efficiency.toFixed(1) : "0.0"}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Calculated via Live Thermodynamic Engine</p>
            </div>
          </div>
        </div>

        {/* --- 1.b Middle Row: Radial Gauge Sensor Telemetry --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <SemiCircleGauge 
            label="Vibration Velocity" 
            value={machineData.vibration_velocity || 0} 
            max={8} 
            color="#06b6d4" 
            unit="mm/s" 
            icon={Activity} 
          />
          <SemiCircleGauge 
            label="Bearing Temperature" 
            value={machineData.bearing_temp || 0} 
            max={120} 
            color="#f59e0b" 
            unit="°C" 
            icon={Thermometer} 
          />
          <SemiCircleGauge 
            label="Inlet Pressure" 
            value={machineData.inlet_pressure || 0} 
            max={100} 
            color="#3b82f6" 
            unit="PSI" 
            icon={Gauge} 
          />
        </div>

        {/* --- Bottom Row: Real-time Charts --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
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
                  <ReferenceLine y={4.5} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Critical (4.5)', fill: '#f43f5e', fontSize: 10 }} />
                  <ReferenceLine y={2.5} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Warning (2.5)', fill: '#f59e0b', fontSize: 10 }} />
                  <Line type="monotone" dataKey="vibration" stroke="#eab308" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* --- Alerts and Checklist Row --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md h-64 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <BellRing className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-slate-200">Active Alert Log</h2>
            </div>
            <div className="overflow-y-auto space-y-2 pr-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500 italic mt-4">No recent anomalies detected.</p>
              ) : (
                alerts.map((alert, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-xs flex gap-3 ${
                    alert.level === 'red' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    <span className="font-mono text-[10px] opacity-70 mt-0.5 whitespace-nowrap">[{alert.time}]</span>
                    <span>{alert.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md h-64 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">Recommended Action Plan</h2>
            </div>
            {machineData.status === "OPERATIONAL" ? (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-xl">
                <p className="text-sm text-slate-500 text-center px-4">System is operating normally.<br/>No immediate maintenance required.</p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-2 flex-1">
                {maintenanceTasks.map((task, idx) => (
                  <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checkedTasks[idx] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through opacity-60' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="mt-0.5 w-4 h-4 accent-emerald-500 bg-slate-900 border-slate-700 rounded"
                      checked={!!checkedTasks[idx]}
                      onChange={() => toggleTask(idx)}
                    />
                    <span className="text-sm">{task}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Generate Report Modal --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsReportModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400"/> Generate Report</h2>
            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Equipment</label>
                <select name="equipment" defaultValue={equipment} className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500">
                  <option value="pump">Centrifugal Pump 01</option>
                  <option value="compressor">Gas Compressor 01</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">From Date</label>
                  <input type="date" name="fromDate" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">To Date</label>
                  <input type="date" name="toDate" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors">
                  Generate PDF Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Multi-Step Simulate Data Modal --- */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsSimulateModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Database className="w-5 h-5 text-cyan-400"/> Simulate Sensor Data</h2>
            <p className="text-xs text-slate-400 mb-6">Unselected sensors will be processed at optimal baseline conditions.</p>
            
            {/* Step 1: Select Sensors */}
            {simulationStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">1. Select Target Equipment</label>
                  <select name="equipment_select" id="equipment_select" defaultValue={equipment} className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500">
                    <option value="pump">Centrifugal Pump</option>
                    <option value="compressor">Gas Compressor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                    <span>2. Select at least 3 sensors</span>
                    <span className={selectedSensors.length >= 3 ? "text-emerald-400" : "text-amber-400"}>{selectedSensors.length} Selected</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                    {SENSOR_OPTIONS.map(sensor => (
                      <label key={sensor.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSensors.includes(sensor.id) ? 'bg-cyan-900/40 border-cyan-700 text-cyan-100' : 'bg-[#1e293b] border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-cyan-500 rounded bg-slate-900 border-slate-700" 
                          checked={selectedSensors.includes(sensor.id)}
                          onChange={() => handleSensorToggle(sensor.id)}
                        />
                        <span className="text-xs">{sensor.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => setSimulationStep(2)} 
                    disabled={selectedSensors.length < 3}
                    className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-lg transition-colors ${
                      selectedSensors.length >= 3 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Proceed to Input Values <ArrowRight className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Input Values & Result */}
            {simulationStep === 2 && (
              <form onSubmit={handleSimulateData} className="space-y-4">
                <input type="hidden" name="equipment" value={document.getElementById('equipment_select')?.value || equipment} />
                
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={() => {setSimulationStep(1); setSimulationResult(null);}} className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3"/> Back to Selection
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 max-h-56 overflow-y-auto pr-2">
                  {SENSOR_OPTIONS.filter(s => selectedSensors.includes(s.id)).map(sensor => (
                    <div key={sensor.id}>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{sensor.label}</label>
                      <input 
                        type="number" 
                        step={sensor.step} 
                        name={sensor.id} 
                        required 
                        defaultValue={sensor.optimal}
                        className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500" 
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors">
                    Run ML Prediction
                  </button>
                </div>

                {/* Display Simulation Results */}
                {simulationResult && (
                  <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Simulation Output</h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-slate-300">Predicted RUL:</span>
                      <span className={`text-lg font-bold ${simulationResult.alert_level === 'green' ? 'text-emerald-400' : simulationResult.alert_level === 'yellow' ? 'text-amber-400' : 'text-rose-400'}`}>
                        {simulationResult.simulated_rul} hrs
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-slate-300">Est. Efficiency:</span>
                      <span className="text-lg font-bold text-cyan-400">{simulationResult.simulated_efficiency}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">System Status:</span>
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                        simulationResult.alert_level === 'green' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                        simulationResult.alert_level === 'yellow' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                        'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
                      }`}>
                        {simulationResult.status}
                      </span>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer ML Data */}
      <div className="max-w-7xl mx-auto mt-8 pb-8 text-center border-t border-slate-800/50 pt-4">
        <p className="text-[10px] text-slate-500 font-mono">
          Engine: Scikit-Learn | Architecture: Random Forest Regressor | Telemetry Rate: 5000ms
        </p>
      </div>

    </div>
  );
};

export default App;