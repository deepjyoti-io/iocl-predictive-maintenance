import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const SemiCircleGauge = ({ value, max, color, unit, label, icon: Icon }) => {
  const percentage = Math.min(value / max, 1);
  const data = [
    { name: 'Value', value: percentage },
    { name: 'Empty', value: 1 - percentage }
  ];

  return (
    <div className="bg-[#0f172a] rounded-xl p-5 border border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
      <div className="w-full flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: color }} />
        <p className="text-xs text-slate-400 font-medium truncate">{label}</p>
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
          <span className="text-3xl font-extrabold text-white leading-none tracking-tight">
            {value !== undefined ? value.toFixed(1) : "0.0"}
          </span>
          <span className="text-xs text-slate-400 font-medium mt-1">{unit}</span>
        </div>
      </div>
    </div>
  );
};