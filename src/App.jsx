import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";

import { EQUIPMENT_SENSORS } from './constants/equipmentConfigs';
import { SemiCircleGauge } from './components/SemiCircleGauge';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { RealTimeCharts } from './components/RealTimeCharts';
import { AllSensorsModal } from './components/AllSensorsModal';
import { ReportModal } from './components/ReportModal';
import { SimulatorModal } from './components/SimulatorModal';

const App = () => {
  const [equipment, setEquipment] = useState("pump"); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [selectedGauges] = useState(['vibration', 'temperature', 'pressure']);
  const [selectedGraph] = useState('vibration');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShowAllOpen, setIsShowAllOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  const [selectedSimEquipment, setSelectedSimEquipment] = useState("pump");
  const [simulationStep, setSimulationStep] = useState(1);
  const [selectedSimSensors, setSelectedSimSensors] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  
  const [histories, setHistories] = useState({ pump: [], compressor: [] });
  const [alerts, setAlerts] = useState([]);
  
  const [machineData, setMachineData] = useState({
    predicted_rul_hours: 0,
    calculated_efficiency: 0,
    suggested_servicing_date: "Loading...",
    status: "OPERATIONAL",
    alert_level: "green",
  });
  
  const [error, setError] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setAlerts([]);

    const fetchStatus = async () => {
      try {
        const response = await fetch(`https://iocl-predictive-maintenance.onrender.com/api/${equipment}/status`);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        setMachineData(data);
        setError(null);

        setHistories(prev => {
          const currentEquipHistory = prev[equipment] || [];
          
          // Pure JSON stream mapping without Math.random()
          const newPoint = { 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
            rul: data.predicted_rul_hours, 
            efficiency: data.calculated_efficiency,
            vibration: data.vibration_velocity,
            temperature: data.bearing_temp,
            pressure: data.inlet_pressure,
            
            // Sensor values derived directly from endpoint response or baseline config constants
            flow_rate: data.flow_rate ?? (EQUIPMENT_SENSORS.pump.find(s => s.id === 'flow_rate')?.optimal || 120.0),
            motor_current: data.motor_current ?? (EQUIPMENT_SENSORS.pump.find(s => s.id === 'motor_current')?.optimal || 25.0),
            seal_oil_level: data.seal_oil_level ?? (EQUIPMENT_SENSORS.pump.find(s => s.id === 'seal_oil_level')?.optimal || 90.0),
            crosshead_temp: data.crosshead_temp ?? (EQUIPMENT_SENSORS.compressor.find(s => s.id === 'crosshead_temp')?.optimal || 65.0),
            lube_box_level: data.lube_box_level ?? (EQUIPMENT_SENSORS.compressor.find(s => s.id === 'lube_box_level')?.optimal || 85.0),
            rod_drop: data.rod_drop ?? (EQUIPMENT_SENSORS.compressor.find(s => s.id === 'rod_drop')?.optimal || 0.05),
          };
          return { ...prev, [equipment]: [...currentEquipHistory, newPoint].slice(-50) };
        });

        if (data.status !== "OPERATIONAL") {
          setAlerts(prev => {
            const timestamp = new Date().toLocaleTimeString();
            if (prev.length > 0 && prev[0].time === timestamp) return prev;
            const newAlert = {
              time: timestamp,
              msg: `${data.status}: Anomaly detected on ${equipment.toUpperCase()} (Vib: ${data.vibration_velocity} mm/s)`,
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

  const currentHistory = histories[equipment] || [];
  const currentData = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : {};
  const activeConfig = EQUIPMENT_SENSORS[equipment];
  const graphConfig = activeConfig.find(s => s.id === selectedGraph) || activeConfig[0];

  const getKpiTextColor = (status) => {
    if (status === "OPERATIONAL") return "text-emerald-400";
    if (status === "CRITICAL RISK") return "text-rose-400";
    return "text-amber-400";
  };
  const kpiColorClass = getKpiTextColor(machineData.status);

  const displayName = equipment === "pump" ? "Industrial Pump" : "Gas Compressor";
  const displayAsset = equipment === "pump" ? "CENTRIFUGAL_PUMP_01" : "RECIPROCATING_COMPRESSOR_01";

  const handleSimSensorToggle = (id) => {
    setSelectedSimSensors(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedEquip = formData.get("equipment") || equipment;
    const fromDate = formData.get("fromDate");
    const fromTime = formData.get("fromTime") || "00:00";
    const toDate = formData.get("toDate");
    const toTime = formData.get("toTime") || "23:59";

    const targetConfig = EQUIPMENT_SENSORS[selectedEquip];
    const equipTitle = selectedEquip === 'pump' ? 'CENTRIFUGAL PUMP 01' : 'GAS COMPRESSOR 01';

    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("IOCL Predictive Maintenance Report", 20, 20);
    doc.setLineWidth(0.5);
    doc.line(20, 24, 190, 24);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated On : ${new Date().toLocaleString()}`, 20, 32);
    doc.text(`Target Asset : ${equipTitle}`, 20, 38);
    doc.text(`Time Window  : ${fromDate} [${fromTime}] to ${toDate} [${toTime}]`, 20, 44);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. CURRENT ASSET HEALTH SUMMARY", 20, 56);
    doc.setLineWidth(0.2);
    doc.line(20, 58, 190, 58);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Status               : ${machineData.status}`, 20, 66);
    doc.text(`Predicted RUL        : ${machineData.predicted_rul_hours} Hours`, 20, 72);
    doc.text(`Efficiency           : ${machineData.calculated_efficiency}%`, 20, 78);
    doc.text(`Servicing Target     : ${machineData.suggested_servicing_date}`, 20, 84);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. FULL SENSOR ARRAY AUDIT LOG", 20, 96);
    doc.setLineWidth(0.2);
    doc.line(20, 98, 190, 98);

    doc.setFontSize(9);
    let yPos = 106;
    
    targetConfig.forEach((sensor) => {
      const val = currentData[sensor.id] !== undefined ? currentData[sensor.id].toFixed(2) : sensor.optimal;
      doc.setFont("helvetica", "bold");
      doc.text(`${sensor.fullLabel}:`, 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`${val} ${sensor.unit} (Optimal Baseline: ${sensor.optimal} ${sensor.unit})`, 90, yPos);
      yPos += 7;
    });

    yPos += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. HISTORICAL ANOMALY & ALERT LOGS", 20, yPos);
    doc.setLineWidth(0.2);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;

    doc.setFontSize(9);
    if (alerts.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.text("No anomalies or alerts logged during this window.", 25, yPos);
    } else {
      doc.setFont("helvetica", "normal");
      alerts.forEach(alt => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`[${alt.time}] ${alt.msg}`, 25, yPos);
        yPos += 6;
      });
    }

    doc.save(`${selectedEquip}_Audit_Report_${fromDate}_to_${toDate}.pdf`);
    setIsReportModalOpen(false);
  };

  const openSimulateModal = () => {
    setSimulationStep(1);
    setSelectedSimEquipment(equipment);
    setSelectedSimSensors([]);
    setSimulationResult(null);
    setIsSimulateModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleSimulateData = async (e) => {
    e.preventDefault();
    setSimulationResult(null); 
    const formData = new FormData(e.target);
    const availableSensors = EQUIPMENT_SENSORS[selectedSimEquipment];
    
    const payload = {
      vibration: selectedSimSensors.includes('vibration') ? parseFloat(formData.get("vibration")) : availableSensors.find(s => s.id === 'vibration').optimal,
      temperature: selectedSimSensors.includes('temperature') ? parseFloat(formData.get("temperature")) : availableSensors.find(s => s.id === 'temperature').optimal,
      pressure: selectedSimSensors.includes('pressure') ? parseFloat(formData.get("pressure")) : availableSensors.find(s => s.id === 'pressure').optimal,
      
      crosshead_temp: selectedSimSensors.includes('crosshead_temp') ? parseFloat(formData.get("crosshead_temp")) : (availableSensors.find(s => s.id === 'crosshead_temp')?.optimal || 65.0),
      lube_box_level: selectedSimSensors.includes('lube_box_level') ? parseFloat(formData.get("lube_box_level")) : (availableSensors.find(s => s.id === 'lube_box_level')?.optimal || 85.0),
      rod_drop: selectedSimSensors.includes('rod_drop') ? parseFloat(formData.get("rod_drop")) : (availableSensors.find(s => s.id === 'rod_drop')?.optimal || 0.05),

      flow_rate: selectedSimSensors.includes('flow_rate') ? parseFloat(formData.get("flow_rate")) : (availableSensors.find(s => s.id === 'flow_rate')?.optimal || 120.0),
      motor_current: selectedSimSensors.includes('motor_current') ? parseFloat(formData.get("motor_current")) : (availableSensors.find(s => s.id === 'motor_current')?.optimal || 25.0),
      seal_oil_level: selectedSimSensors.includes('seal_oil_level') ? parseFloat(formData.get("seal_oil_level")) : (availableSensors.find(s => s.id === 'seal_oil_level')?.optimal || 90.0)
    };

    try {
      const response = await fetch(`https://iocl-predictive-maintenance.onrender.com/api/${selectedSimEquipment}/simulate`, {
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
        <Header 
          displayName={displayName}
          displayAsset={displayAsset}
          machineData={machineData}
          equipment={equipment}
          setEquipment={setEquipment}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          setIsShowAllOpen={setIsShowAllOpen}
          setIsReportModalOpen={setIsReportModalOpen}
          openSimulateModal={openSimulateModal}
          menuRef={menuRef}
        />

        {error && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 p-4 rounded-xl text-sm font-mono">
            ⚠️ CONNECTION ERROR: {error}
          </div>
        )}

        <KpiCards machineData={machineData} kpiColorClass={kpiColorClass} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {selectedGauges.map(sensorId => {
            const config = activeConfig.find(s => s.id === sensorId);
            if (!config) return null;
            return (
              <SemiCircleGauge 
                key={sensorId}
                label={config.fullLabel} 
                value={currentData[sensorId]} 
                max={config.max} 
                color={config.color} 
                unit={config.unit} 
                icon={config.icon} 
              />
            );
          })}
        </div>

        <RealTimeCharts 
          currentHistory={currentHistory} 
          selectedGraph={selectedGraph} 
          graphConfig={graphConfig} 
        />
      </div>

      <AllSensorsModal 
        isShowAllOpen={isShowAllOpen}
        setIsShowAllOpen={setIsShowAllOpen}
        equipment={equipment}
        activeConfig={activeConfig}
        currentData={currentData}
      />

      <ReportModal 
        isReportModalOpen={isReportModalOpen}
        setIsReportModalOpen={setIsReportModalOpen}
        equipment={equipment}
        handleGenerateReport={handleGenerateReport}
      />

      <SimulatorModal 
        isSimulateModalOpen={isSimulateModalOpen}
        setIsSimulateModalOpen={setIsSimulateModalOpen}
        simulationStep={simulationStep}
        setSimulationStep={setSimulationStep}
        selectedSimEquipment={selectedSimEquipment}
        setSelectedSimEquipment={setSelectedSimEquipment}
        selectedSimSensors={selectedSimSensors}
        setSelectedSimSensors={setSelectedSimSensors}
        handleSimSensorToggle={handleSimSensorToggle}
        handleSimulateData={handleSimulateData}
        simulationResult={simulationResult}
        setSimulationResult={setSimulationResult}
      />
    </div>
  );
};

export default App;