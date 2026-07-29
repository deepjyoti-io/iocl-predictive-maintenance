import React from 'react';
import { X, List } from 'lucide-react';

export const AllSensorsModal = ({ isShowAllOpen, setIsShowAllOpen, equipment, activeConfig, currentData }) => {
  if (!isShowAllOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
        <button onClick={() => setIsShowAllOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2">
          <List className="w-5 h-5 text-emerald-400"/> Full Sensor Array: {equipment.toUpperCase()}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {activeConfig.map(sensor => (
            <div key={sensor.id} className="bg-slate-800/50 p-4 border-l-4 rounded-r-md flex flex-col justify-between" style={{ borderColor: sensor.color }}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{sensor.fullLabel}</p>
              <p className="text-2xl font-extrabold text-white mt-2">
                {currentData[sensor.id] !== undefined ? currentData[sensor.id].toFixed(1) : "0.0"} <span className="text-xs text-slate-500 font-normal">{sensor.unit}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={() => setIsShowAllOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg transition-colors uppercase text-xs tracking-wider">Close</button>
        </div>
      </div>
    </div>
  );
};