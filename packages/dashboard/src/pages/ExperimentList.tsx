import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  FlaskConical,
  Play,
  Pause,
  Eye,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';

interface Experiment {
  id: string;
  name: string;
  key: string;
  status: string;
  type: string;
  traffic_percentage: number;
  variants: Array<{ name: string }>;
  created_at: string;
  started_at: string | null;
  primary_metric_result?: {
    improvement: number;
    significant: boolean;
  };
}

type StatusFilter = 'all' | 'draft' | 'running' | 'paused' | 'completed' | 'archived';
type TypeFilter = 'all' | 'ab' | 'multivariate' | 'bandit';

export default function ExperimentList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { data, loading, error } = useApi<Experiment[]>('/api/experiments');

  const experiments = (data || [])
    .filter((exp) => {
      if (search && !exp.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && exp.status !== statusFilter) return false;
      if (typeFilter !== 'all' && exp.type !== typeFilter) return false;
      return true;
    });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Experiments</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your A/B tests and experiments</p>
        </div>
        <Link to="/experiments/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Experiment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search experiments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="input appearance-none pr-8 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="input appearance-none pr-8 text-sm"
            >
              <option value="all">All Types</option>
              <option value="ab">A/B Test</option>
              <option value="multivariate">Multivariate</option>
              <option value="bandit">Bandit</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <p className="text-sm text-warning-600">Could not load experiments. Check API connection.</p>
          </div>
        )}

        {!loading && !error && experiments.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No experiments match your filters'
                : 'No experiments yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first experiment to start testing hypotheses and making data-driven decisions.'}
            </p>
            {!search && statusFilter === 'all' && typeFilter === 'all' && (
              <Link to="/experiments/new" className="btn-primary">
                <Plus className="w-4 h-4" />
                Create Experiment
              </Link>
            )}
          </div>
        )}

        {!loading && !error && experiments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Experiment
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Status
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Type
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Traffic
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Variants
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Started
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                    Result
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {experiments.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/experiments/${exp.id}`}
                        className="text-sm font-medium text-slate-900 dark:text-white hover:text-primary-600 transition-colors"
                      >
                        {exp.name}
                      </Link>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{exp.key}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={exp.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500 capitalize">{exp.type}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${exp.traffic_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{exp.traffic_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">{exp.variants?.length || 0}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">
                        {exp.started_at
                          ? new Date(exp.started_at).toLocaleDateString()
                          : '--'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {exp.primary_metric_result ? (
                        <span
                          className={`text-xs font-medium ${
                            exp.primary_metric_result.significant
                              ? exp.primary_metric_result.improvement > 0
                                ? 'text-success-600'
                                : 'text-danger-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {exp.primary_metric_result.improvement > 0 ? '+' : ''}
                          {exp.primary_metric_result.improvement.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {exp.status === 'draft' && (
                          <button className="p-1.5 text-slate-400 hover:text-success-600 transition-colors" title="Start">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {exp.status === 'running' && (
                          <button className="p-1.5 text-slate-400 hover:text-warning-600 transition-colors" title="Pause">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link
                          to={`/experiments/${exp.id}`}
                          className="p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
