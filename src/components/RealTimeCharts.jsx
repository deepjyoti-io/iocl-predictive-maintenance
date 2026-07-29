import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Clock } from 'lucide-react';

export const RealTimeCharts = ({ currentHistory, selectedGraph, graphConfig }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
      <div className="bg-[#0f172a] rounded-xl p-6 border border-slate-800/80 shadow-md">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">RUL Degradation Trend</h2>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
          <graphConfig.icon className="w-4 h-4" style={{ color: graphConfig.color }} />
          <h2 className="text-sm font-semibold text-slate-200">Live {graphConfig.label} Trend</h2>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 'dataMax + 5']} />
              <Line type="monotone" dataKey={selectedGraph} stroke={graphConfig.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};