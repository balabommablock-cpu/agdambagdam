import { Link } from 'react-router-dom';
import {
  FlaskConical,
  Flag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  Activity,
  Users,
  Zap,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';

interface DashboardStats {
  activeExperiments: number;
  totalEvents: number;
  uniqueUsers: number;
  totalFlags: number;
  experimentsNeedingAttention: Array<{
    id: string;
    name: string;
    reason: string;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    experimentName: string;
    experimentId: string;
    timestamp: string;
    user: string;
  }>;
}

export default function Dashboard() {
  const { data, loading, error } = useApi<DashboardStats>('/api/dashboard/stats');

  // Fallback data when API isn't connected yet
  const stats: DashboardStats = data || {
    activeExperiments: 0,
    totalEvents: 0,
    uniqueUsers: 0,
    totalFlags: 0,
    experimentsNeedingAttention: [],
    recentActivity: [],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of your experimentation program</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/flags/new" className="btn-secondary">
            <Flag className="w-4 h-4" />
            New Flag
          </Link>
          <Link to="/experiments/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Experiment
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Experiments"
          value={stats.activeExperiments}
          icon={FlaskConical}
          color="primary"
          loading={loading}
        />
        <StatCard
          label="Events (7 days)"
          value={stats.totalEvents}
          icon={Activity}
          color="success"
          format="compact"
          loading={loading}
        />
        <StatCard
          label="Feature Flags"
          value={stats.totalFlags}
          icon={Flag}
          color="warning"
          loading={loading}
        />
        <StatCard
          label="Unique Users (7d)"
          value={stats.uniqueUsers}
          icon={Users}
          color="primary"
          format="compact"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs attention */}
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning-500" />
              Needs Attention
            </h2>
            <Link
              to="/experiments"
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <div className="px-5 py-8 text-center">
                <div className="animate-pulse flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            )}
            {!loading && stats.experimentsNeedingAttention.length === 0 && (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-success-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All experiments are running smoothly</p>
              </div>
            )}
            {stats.experimentsNeedingAttention.map((exp) => (
              <Link
                key={exp.id}
                to={`/experiments/${exp.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-8 h-8 bg-warning-50 dark:bg-warning-950 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-warning-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {exp.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{exp.reason}</div>
                </div>
                <StatusBadge status={exp.status} size="sm" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <div className="px-5 py-6 text-center">
                <div className="animate-pulse h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
              </div>
            )}
            {!loading && stats.recentActivity.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-500">No recent activity</p>
                <Link to="/experiments/new" className="text-xs text-primary-600 font-medium mt-1 inline-block">
                  Create your first experiment
                </Link>
              </div>
            )}
            {stats.recentActivity.slice(0, 8).map((item) => (
              <div key={item.id} className="px-5 py-3">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{item.user}</span>{' '}
                  <span className="text-slate-500">{item.action}</span>{' '}
                  <Link
                    to={`/experiments/${item.experimentId}`}
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    {item.experimentName}
                  </Link>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick start when no experiments */}
      {!loading && stats.activeExperiments === 0 && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Start Experimenting
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Create your first A/B test to start making data-driven decisions. Set up an experiment, integrate the SDK, and let the data guide you.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/experiments/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Create First Experiment
            </Link>
            <Link to="/settings" className="btn-secondary">
              View SDK Setup
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-4 border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950">
          <p className="text-sm text-warning-700 dark:text-warning-400">
            Could not connect to API server. Make sure the server is running on port 3456.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  format,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'success' | 'warning';
  format?: 'compact';
  loading: boolean;
}) {
  const colorMap = {
    primary: 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400',
    success: 'bg-success-50 dark:bg-success-950 text-success-600 dark:text-success-400',
    warning: 'bg-warning-50 dark:bg-warning-950 text-warning-600 dark:text-warning-400',
  };

  const formatted = format === 'compact' && value >= 1000
    ? value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : `${(value / 1_000).toFixed(1)}K`
    : value.toLocaleString();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      ) : (
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatted}</div>
      )}
    </div>
  );
}
