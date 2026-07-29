import React from 'react';
import { X, FileText } from 'lucide-react';

export const ReportModal = ({ isReportModalOpen, setIsReportModalOpen, equipment, handleGenerateReport }) => {
  if (!isReportModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button onClick={() => setIsReportModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400"/> Generate Audit Report
        </h2>
        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Equipment</label>
            <select name="equipment" defaultValue={equipment} className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold uppercase focus:outline-none focus:border-cyan-500">
              <option value="pump">Centrifugal Pump 01</option>
              <option value="compressor">Gas Compressor 01</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">From Date</label>
              <input type="date" name="fromDate" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">From Time</label>
              <input type="time" name="fromTime" defaultValue="00:00" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">To Date</label>
              <input type="date" name="toDate" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">To Time</label>
              <input type="time" name="toTime" defaultValue="23:59" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500" />
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors uppercase text-xs tracking-widest">
              Generate Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};