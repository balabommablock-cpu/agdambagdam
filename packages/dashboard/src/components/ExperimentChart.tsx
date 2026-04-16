import React, { useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface ExperimentChartProps {
  data: DataPoint[];
  variants: { key: string; name: string; color: string }[];
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899'];

export default function ExperimentChart({ data, variants }: ExperimentChartProps) {
  const [viewMode, setViewMode] = useState<'cumulative' | 'daily'>('cumulative');

  const variantsWithColors = variants.map((v, i) => ({
    ...v,
    color: v.color || COLORS[i % COLORS.length],
  }));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Conversion Rate Over Time
        </h3>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'cumulative'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Cumulative
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `${(value * 100).toFixed(1)}%`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${(value * 100).toFixed(3)}%`]}
              labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            />
            {variantsWithColors.map((variant) => (
              <React.Fragment key={variant.key}>
                {/* Confidence interval band */}
                <Area
                  dataKey={`${variant.key}_ci_upper`}
                  stroke="none"
                  fill={variant.color}
                  fillOpacity={0.08}
                  name={`${variant.name} CI`}
                  legendType="none"
                />
                {/* Main line */}
                <Line
                  type="monotone"
                  dataKey={`${variant.key}_${viewMode}`}
                  stroke={variant.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  name={variant.name}
                />
              </React.Fragment>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
