import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity, Thermometer, Gauge, AlertTriangle, Clock, ShieldCheck, AlertOctagon, Menu, X, FileText, Settings2, Database } from 'lucide-react';
import { jsPDF } from "jspdf";

const App = () => {
  const [equipment, setEquipment] = useState("pump"); // "pump" or "compressor"
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
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

  // Fetch Data Logic (Depends on selected equipment)
  useEffect(() => {
    // Clear history when switching equipment so charts don't look weird
    setHistory([]); 

    const fetchStatus = async () => {
      try {
        // Dynamic fetch URL based on state
        const response = await fetch(`https://iocl-predictive-maintenance.onrender.com/api/${equipment}/status`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        setMachineData(data);
        setError(null);

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

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [equipment]); // Re-run effect if equipment changes

  const getKpiTextColor = (status) => {
    if (status === "OPERATIONAL") return "text-emerald-400";
    if (status === "CRITICAL RISK") return "text-rose-400";
    return "text-amber-400";
  };
  const kpiColorClass = getKpiTextColor(machineData.status);

  // UI Strings based on equipment
  const displayName = equipment === "pump" ? "Industrial Pump" : "Gas Compressor";
  const displayAsset = equipment === "pump" ? "CENTRIFUGAL_PUMP_01" : "RECIPROCATING_COMPRESSOR_01";

  // Handle Report Form Submit (Generates and downloads PDF)
  const handleGenerateReport = (e) => {
    e.preventDefault();
    
    // Extract values from the form using the 'name' attributes
    const formData = new FormData(e.target);
    const selectedEquipment = formData.get("equipment") || equipment;
    const fromDate = formData.get("fromDate");
    const toDate = formData.get("toDate");

    // Initialize PDF document
    const doc = new jsPDF();
    
    // Add Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("IOCL Predictive Maintenance Report", 20, 20);
    
    // Add Sub-header lines
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    // Add Data
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
    doc.text(`Suggested Servicing    : ${machineData.suggested_servicing_date}`, 20, 120);

    // Save and trigger download
    doc.save(`${selectedEquipment}_Report_${fromDate}_to_${toDate}.pdf`);
    
    // Close modal
    setIsReportModalOpen(false);
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
              <p className="text-xs text-cyan-400 mt-1 font-mono font-medium">Asset: {displayAsset}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Badge */}
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

            {/* Hamburger Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
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
                  <FileText className="w-4 h-4" /> Generate Report
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-slate-500 rounded-lg flex items-center gap-2 cursor-not-allowed">
                  <Database className="w-4 h-4" /> Simulate Data (Locked)
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
              <span className={`text-4xl font-extrabold tracking-tight ${kpiColorClass}`}>
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
            <div className="bg-slate-800/80 p-2.5 rounded-lg text-cyan-400 border border-slate-700/50">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* --- Middle Row: Live Sensor Telemetry --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex items-center gap-4">
            <div className="bg-cyan-950/60 border border-cyan-800/40 p-3 rounded-xl text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Vibration Velocity</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {machineData.vibration_velocity ? machineData.vibration_velocity.toFixed(2) : "0.00"} <span className="text-xs text-slate-400 font-normal">mm/s</span>
              </p>
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex items-center gap-4">
            <div className="bg-amber-950/60 border border-amber-800/40 p-3 rounded-xl text-amber-500">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Bearing Temperature</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {machineData.bearing_temp ? machineData.bearing_temp.toFixed(1) : "0.0"} <span className="text-xs text-slate-400 font-normal">°C</span>
              </p>
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex items-center gap-4">
            <div className="bg-blue-950/60 border border-blue-800/40 p-3 rounded-xl text-blue-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Inlet Pressure</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {machineData.inlet_pressure ? machineData.inlet_pressure.toFixed(1) : "0.0"} <span className="text-xs text-slate-400 font-normal">PSI</span>
              </p>
            </div>
          </div>
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
                  <Line type="monotone" dataKey="vibration" stroke="#eab308" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400"/> Generate Equipment Report</h2>
            
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

    </div>
  );
};

export default App;