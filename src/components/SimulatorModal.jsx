import React from 'react';
import { X, Database, ArrowRight, ArrowLeft } from 'lucide-react';
import { EQUIPMENT_SENSORS } from '../constants/equipmentConfigs';

export const SimulatorModal = ({
  isSimulateModalOpen,
  setIsSimulateModalOpen,
  simulationStep,
  setSimulationStep,
  selectedSimEquipment,
  setSelectedSimEquipment,
  selectedSimSensors,
  setSelectedSimSensors,
  handleSimSensorToggle,
  handleSimulateData,
  simulationResult,
  setSimulationResult
}) => {
  if (!isSimulateModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button 
          type="button" 
          onClick={() => setIsSimulateModalOpen(false)} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400"/> Simulator
        </h2>
        
        {simulationStep === 1 && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                1. Target Architecture
              </label>
              <select 
                value={selectedSimEquipment} 
                onChange={(e) => {
                  setSelectedSimEquipment(e.target.value); 
                  setSelectedSimSensors([]);
                }}
                className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold uppercase focus:outline-none focus:border-cyan-500"
              >
                <option value="pump">Centrifugal Pump</option>
                <option value="compressor">Gas Compressor</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                <span>2. Injectable Variables</span>
                <span className={selectedSimSensors.length >= 3 ? "text-emerald-400" : "text-amber-400"}>
                  {selectedSimSensors.length} Selected
                </span>
              </label>
              
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                {EQUIPMENT_SENSORS[selectedSimEquipment].map(sensor => {
                  const isSimSelected = selectedSimSensors.includes(sensor.id);
                  return (
                    <button 
                      key={`sim-${sensor.id}`} 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSimSensorToggle(sensor.id);
                      }}
                      className={`p-3 border text-[10px] font-bold uppercase transition-all rounded-lg text-center cursor-pointer select-none ${
                        isSimSelected 
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-lg' 
                          : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {sensor.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="button"
                onClick={() => setSimulationStep(2)} 
                disabled={selectedSimSensors.length < 3}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-lg transition-colors uppercase text-xs tracking-widest ${
                  selectedSimSensors.length >= 3 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer' 
                    : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                }`}
              >
                Set Values <ArrowRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
        )}

        {simulationStep === 2 && (
          <form onSubmit={handleSimulateData} className="space-y-4 pt-2">
            <div className="flex items-center justify-between mb-4">
              <button 
                type="button" 
                onClick={() => { setSimulationStep(1); setSimulationResult(null); }} 
                className="text-[10px] font-bold uppercase text-slate-400 hover:text-cyan-400 flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3"/> Back
              </button>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                {selectedSimEquipment} SIMULATION
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 max-h-56 overflow-y-auto pr-2">
              {EQUIPMENT_SENSORS[selectedSimEquipment]
                .filter(s => selectedSimSensors.includes(s.id))
                .map(sensor => (
                  <div key={`input-${sensor.id}`}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {sensor.label}
                      </label>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        ({sensor.unit})
                      </span>
                    </div>
                    <input 
                      type="number" 
                      step={sensor.step} 
                      name={sensor.id} 
                      required 
                      defaultValue={sensor.optimal}
                      className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                ))}
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors uppercase text-xs tracking-widest"
              >
                Run ML Engine
              </button>
            </div>

            {simulationResult && (
              <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Model Output</h3>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase text-slate-300">Predicted RUL:</span>
                  <span className={`text-lg font-bold ${
                    simulationResult.alert_level === 'green' ? 'text-emerald-400' : 
                    simulationResult.alert_level === 'yellow' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {simulationResult.simulated_rul} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase text-slate-300">Est. Efficiency:</span>
                  <span className="text-lg font-bold text-cyan-400">{simulationResult.simulated_efficiency}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-300">System Status:</span>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                    simulationResult.alert_level === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' :
                    simulationResult.alert_level === 'yellow' ? 'bg-amber-500/10 text-amber-400 border-amber-500/50' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/50 animate-pulse'
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
  );
};