import { ArrowUp, ArrowDown, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface VariantResult {
  name: string;
  isControl?: boolean;
  sampleSize: number;
  conversionRate: number;
  confidenceInterval: [number, number];
  relativeImprovement?: number;
  isSignificant?: boolean;
  probabilityBest?: number;
  pValue?: number;
}

interface StatsCardProps {
  variant: VariantResult;
  srmDetected?: boolean;
}

export default function StatsCard({ variant, srmDetected }: StatsCardProps) {
  const improvement = variant.relativeImprovement ?? 0;
  const isPositive = improvement > 0;
  const isSignificant = variant.isSignificant ?? false;

  let improvementColor = 'text-slate-500';
  if (isSignificant && isPositive) improvementColor = 'text-success-600';
  if (isSignificant && !isPositive) improvementColor = 'text-danger-600';

  return (
    <div className="card p-5">
      {/* SRM Warning */}
      {srmDetected && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0" />
          <span className="text-xs text-warning-700 dark:text-warning-400 font-medium">
            Sample Ratio Mismatch detected. Results may be unreliable.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{variant.name}</h3>
          {variant.isControl && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
              CONTROL
            </span>
          )}
        </div>
        {isSignificant ? (
          <div className="flex items-center gap-1 text-success-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">Significant</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Collecting</span>
          </div>
        )}
      </div>

      {/* Main metric */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {(variant.conversionRate * 100).toFixed(2)}%
          </span>
          {!variant.isControl && (
            <span className={`flex items-center gap-0.5 text-sm font-medium ${improvementColor}`}>
              {isPositive ? (
                <ArrowUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(improvement).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          CI: [{(variant.confidenceInterval[0] * 100).toFixed(2)}%,{' '}
          {(variant.confidenceInterval[1] * 100).toFixed(2)}%]
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
            Sample Size
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {variant.sampleSize.toLocaleString()}
          </div>
        </div>
        {variant.probabilityBest != null && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
              P(Best)
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {(variant.probabilityBest * 100).toFixed(1)}%
            </div>
          </div>
        )}
        {variant.pValue != null && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
              P-Value
            </div>
            <div className={`text-sm font-semibold ${variant.pValue < 0.05 ? 'text-success-600' : 'text-slate-900 dark:text-white'}`}>
              {variant.pValue.toFixed(4)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
