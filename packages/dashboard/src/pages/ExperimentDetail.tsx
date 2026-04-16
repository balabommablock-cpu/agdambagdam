import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  Square,
  Clock,
  Users,
  Calendar,
  ArrowLeft,
  BarChart3,
  Settings,
  Activity,
  Shield,
  AlertTriangle,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useApi, useMutation } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import ExperimentChart from '../components/ExperimentChart';
import TrafficChart from '../components/TrafficChart';

interface ExperimentData {
  id: string;
  name: string;
  key: string;
  description: string;
  hypothesis: string;
  status: string;
  type: string;
  traffic_percentage: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    is_control: boolean;
    payload: Record<string, unknown>;
  }>;
  results?: {
    variants: Array<{
      name: string;
      isControl: boolean;
      sampleSize: number;
      conversionRate: number;
      confidenceInterval: [number, number];
      relativeImprovement: number;
      isSignificant: boolean;
      probabilityBest: number;
      pValue: number;
    }>;
    srmDetected: boolean;
    srmPValue: number;
    chartData: Array<{ date: string; [key: string]: number | string }>;
    guardrails: Array<{
      name: string;
      status: 'pass' | 'fail' | 'pending';
      value: number;
    }>;
    power: {
      currentPower: number;
      daysToSignificance: number | null;
    };
  };
  auditLog?: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }>;
}

export default function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'results' | 'settings' | 'activity'>('results');
  const [statsMethod, setStatsMethod] = useState<'bayesian' | 'frequentist'>('bayesian');
  const { data: experiment, loading, error, refetch } = useApi<ExperimentData>(`/api/experiments/${id}`);
  const { mutate: updateStatus, loading: updating } = useMutation(`/api/experiments/${id}/status`, 'PATCH');

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({ status: newStatus });
      refetch();
    } catch {
      // error handled by hook
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-warning-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Experiment Not Found
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {error || 'This experiment does not exist or could not be loaded.'}
          </p>
          <Link to="/experiments" className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Experiments
          </Link>
        </div>
      </div>
    );
  }

  const results = experiment.results;
  const daysRunning = experiment.started_at
    ? Math.ceil((Date.now() - new Date(experiment.started_at).getTime()) / 86400000)
    : 0;
  const totalUsers = results?.variants.reduce((s, v) => s + v.sampleSize, 0) || 0;

  const chartVariants = experiment.variants.map((v, i) => ({
    key: v.name.toLowerCase().replace(/\s+/g, '_'),
    name: v.name,
    color: ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'][i] || '#6B7280',
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb + Header */}
      <Link
        to="/experiments"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Experiments
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{experiment.name}</h1>
            <StatusBadge status={experiment.status} />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {experiment.key}
            </span>
            <span className="capitalize">{experiment.type}</span>
            {experiment.started_at && (
              <span>Started {new Date(experiment.started_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {experiment.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('running')}
              disabled={updating}
              className="btn-primary"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
          {experiment.status === 'running' && (
            <>
              <button
                onClick={() => handleStatusChange('paused')}
                disabled={updating}
                className="btn-secondary"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={updating}
                className="btn-primary"
              >
                <Square className="w-4 h-4" />
                Complete
              </button>
            </>
          )}
          {experiment.status === 'paused' && (
            <button
              onClick={() => handleStatusChange('running')}
              disabled={updating}
              className="btn-primary"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {totalUsers.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Total Users</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-success-50 dark:bg-success-950 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {daysRunning}
            </div>
            <div className="text-xs text-slate-500">Days Running</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-warning-50 dark:bg-warning-950 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-warning-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {results?.power.currentPower != null
                ? `${(results.power.currentPower * 100).toFixed(0)}%`
                : '--'}
            </div>
            <div className="text-xs text-slate-500">Statistical Power</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-6">
          {[
            { key: 'results', label: 'Results', icon: BarChart3 },
            { key: 'settings', label: 'Settings', icon: Settings },
            { key: 'activity', label: 'Activity', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Stats method toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Variant Results</h2>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setStatsMethod('bayesian')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statsMethod === 'bayesian'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Bayesian
              </button>
              <button
                onClick={() => setStatsMethod('frequentist')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statsMethod === 'frequentist'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Frequentist
              </button>
            </div>
          </div>

          {/* Variant stats */}
          {results ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.variants.map((v) => (
                <StatsCard
                  key={v.name}
                  variant={v}
                  srmDetected={results.srmDetected}
                />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {experiment.status === 'draft'
                  ? 'Start this experiment to begin collecting data.'
                  : 'No results yet. Data will appear once events are tracked.'}
              </p>
            </div>
          )}

          {/* Charts */}
          {results?.chartData && results.chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ExperimentChart data={results.chartData} variants={chartVariants} />
              </div>
              <div>
                <TrafficChart
                  variants={experiment.variants.map((v, i) => ({
                    name: v.name,
                    sampleSize: results.variants[i]?.sampleSize || 0,
                    expectedWeight: v.weight / 100,
                    color: chartVariants[i]?.color,
                  }))}
                  srmDetected={results.srmDetected}
                  srmPValue={results.srmPValue}
                />
              </div>
            </div>
          )}

          {/* SRM Check */}
          {results?.srmDetected && (
            <div className="card p-5 border-warning-200 dark:border-warning-800 bg-warning-50/50 dark:bg-warning-950/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-warning-800 dark:text-warning-300">
                    Sample Ratio Mismatch Detected
                  </h3>
                  <p className="text-xs text-warning-700 dark:text-warning-400 mt-1">
                    The observed traffic split differs significantly from the expected split
                    (p = {results.srmPValue?.toFixed(4)}). This could indicate a bug in your implementation.
                    Results should not be trusted until SRM is resolved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guardrails */}
          {results?.guardrails && results.guardrails.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-500" />
                  Guardrail Metrics
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.guardrails.map((g) => (
                  <div key={g.name} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{g.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {g.value.toFixed(2)}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.status === 'pass'
                            ? 'bg-success-50 text-success-700'
                            : g.status === 'fail'
                              ? 'bg-danger-50 text-danger-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {g.status === 'pass' ? 'Pass' : g.status === 'fail' ? 'Fail' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Power Analysis */}
          {results?.power && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Power Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                    Current Power
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {(results.power.currentPower * 100).toFixed(1)}%
                  </div>
                  <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        results.power.currentPower >= 0.8 ? 'bg-success-500' : 'bg-warning-500'
                      }`}
                      style={{ width: `${results.power.currentPower * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Target: 80%</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                    Est. Days to Significance
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {results.power.daysToSignificance != null
                      ? results.power.daysToSignificance
                      : '--'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">at current traffic rate</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Name</div>
                <div className="text-sm text-slate-900 dark:text-white">{experiment.name}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Key</div>
                <div className="text-sm text-slate-900 dark:text-white font-mono">{experiment.key}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Type</div>
                <div className="text-sm text-slate-900 dark:text-white capitalize">{experiment.type}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Traffic</div>
                <div className="text-sm text-slate-900 dark:text-white">{experiment.traffic_percentage}%</div>
              </div>
            </div>
            {experiment.description && (
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Description</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{experiment.description}</div>
              </div>
            )}
            {experiment.hypothesis && (
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Hypothesis</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 italic">{experiment.hypothesis}</div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Variants</h3>
            <div className="space-y-3">
              {experiment.variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{v.name}</span>
                    {v.is_control && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded uppercase">
                        Control
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{v.weight}%</span>
                    {v.payload && Object.keys(v.payload).length > 0 && (
                      <code className="text-[11px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded max-w-[200px] truncate">
                        {JSON.stringify(v.payload)}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SDK integration snippet */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              SDK Integration
            </h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed">
              <code>{`const variant = abacus.getVariant('${experiment.key}', userId);

if (variant === 'control') {
  // Show original
} else {
  // Show variant
}

// Track conversion
abacus.track('${experiment.key}', userId, 'conversion');`}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Audit Log</h3>
          </div>
          {experiment.auditLog && experiment.auditLog.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {experiment.auditLog.map((entry) => (
                <div key={entry.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-white">{entry.user}</span>{' '}
                      {entry.action}
                    </div>
                    {entry.details && (
                      <div className="text-xs text-slate-400 mt-0.5">{entry.details}</div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No activity recorded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
