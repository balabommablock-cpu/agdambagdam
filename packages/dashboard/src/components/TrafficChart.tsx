import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle } from 'lucide-react';

interface VariantTraffic {
  name: string;
  sampleSize: number;
  expectedWeight: number;
  color?: string;
}

interface TrafficChartProps {
  variants: VariantTraffic[];
  srmDetected?: boolean;
  srmPValue?: number;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899'];

export default function TrafficChart({ variants, srmDetected, srmPValue }: TrafficChartProps) {
  const total = variants.reduce((sum, v) => sum + v.sampleSize, 0);
  const data = variants.map((v, i) => ({
    name: v.name,
    value: v.sampleSize,
    color: v.color || COLORS[i % COLORS.length],
    expected: v.expectedWeight,
    actual: total > 0 ? v.sampleSize / total : 0,
  }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        Traffic Allocation
      </h3>

      {srmDetected && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0" />
          <div>
            <span className="text-xs font-medium text-warning-700 dark:text-warning-400">
              Sample Ratio Mismatch
            </span>
            {srmPValue != null && (
              <span className="text-xs text-warning-600 ml-1">(p = {srmPValue.toFixed(4)})</span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-6">
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Users']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((entry, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {entry.name}
                  </span>
                  <span className="text-sm text-slate-500 ml-2">
                    {entry.value.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(entry.actual * 100).toFixed(1)}%`,
                        backgroundColor: entry.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 w-12 text-right">
                    {(entry.actual * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 text-center">
          Total: {total.toLocaleString()} users
        </div>
      )}
    </div>
  );
}
