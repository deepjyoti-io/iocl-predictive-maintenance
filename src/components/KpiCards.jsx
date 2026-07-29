import React from 'react';

export const KpiCards = ({ machineData, kpiColorClass }) => {
  return (
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
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Efficiency</p>
          <div className="flex items-baseline gap-1 mt-4">
            <span className={`text-4xl font-extrabold tracking-tight ${kpiColorClass}`}>
              {machineData.calculated_efficiency ? machineData.calculated_efficiency.toFixed(1) : "0.0"}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Calculated via Live Thermodynamic Engine</p>
        </div>
      </div>
    </div>
  );
};