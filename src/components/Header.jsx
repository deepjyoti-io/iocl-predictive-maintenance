import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, AlertOctagon, List, Menu, X, Settings2, FileText, Database } from 'lucide-react';

export const Header = ({ 
  displayName, 
  displayAsset, 
  machineData, 
  equipment, 
  setEquipment, 
  isMenuOpen, 
  setIsMenuOpen, 
  setIsShowAllOpen, 
  setIsReportModalOpen, 
  openSimulateModal, 
  menuRef 
}) => {
  return (
    <header className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative z-20">
      <div className="flex items-center gap-3">
        <Activity className="w-7 h-7 text-cyan-400" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">{displayName} Predictive Monitor</h1>
          <p className="text-xs text-cyan-400 mt-1 font-mono font-medium">Asset: {displayAsset} | Unit: Guwahati Refinery</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsShowAllOpen(true)} 
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-2 transition-colors"
        >
          <List className="w-4 h-4 text-emerald-400" />
          <span>All Sensors</span>
        </button>

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
              <FileText className="w-4 h-4 text-cyan-400" /> Generate Report
            </button>
            <button onClick={openSimulateModal} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" /> Simulate Sensor Data
            </button>
          </div>
        </div>
      )}
    </header>
  );
};