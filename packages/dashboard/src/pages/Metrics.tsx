import { useState } from 'react';
import {
  Target,
  Plus,
  Search,
  X,
  Check,
  TrendingUp,
  Hash,
  BarChart3,
} from 'lucide-react';
import { useApi, useMutation } from '../hooks/useApi';

interface Metric {
  id: string;
  name: string;
  key: string;
  type: 'binomial' | 'continuous' | 'count' | 'revenue';
  description: string;
  event_name: string;
  experiment_count: number;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Target; color: string }> = {
  binomial: { label: 'Binomial', icon: Target, color: 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400' },
  continuous: { label: 'Continuous', icon: TrendingUp, color: 'bg-success-50 text-success-600 dark:bg-success-950 dark:text-success-400' },
  count: { label: 'Count', icon: Hash, color: 'bg-warning-50 text-warning-600 dark:bg-warning-950 dark:text-warning-400' },
  revenue: { label: 'Revenue', icon: BarChart3, color: 'bg-danger-50 text-danger-600 dark:bg-danger-950 dark:text-danger-400' },
};

export default function Metrics() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const { data, loading, error, refetch } = useApi<Metric[]>('/api/metrics');

  const metrics = (data || []).filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.key.includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingMetric(null);
    setShowModal(true);
  };

  const openEdit = (metric: Metric) => {
    setEditingMetric(metric);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Metrics</h1>
          <p className="text-sm text-slate-500 mt-1">Define what you measure in experiments</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Metric
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search metrics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      <div className="card overflow-hidden">
        {loading && (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <p className="text-sm text-warning-600">Could not load metrics. Check API connection.</p>
          </div>
        )}

        {!loading && !error && metrics.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {search ? 'No metrics match your search' : 'No metrics yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Metrics define what success looks like. Create metrics for conversion rates, revenue, engagement, and more.
            </p>
            {!search && (
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" />
                Create Metric
              </button>
            )}
          </div>
        )}

        {!loading && !error && metrics.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.map((metric) => {
              const config = TYPE_CONFIG[metric.type] || TYPE_CONFIG.binomial;
              const Icon = config.icon;
              return (
                <div
                  key={metric.id}
                  onClick={() => openEdit(metric)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{metric.name}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">{metric.key}</span>
                      {metric.description && (
                        <span className="text-xs text-slate-400 truncate">{metric.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    {metric.experiment_count > 0 && (
                      <span className="text-xs text-slate-400">
                        {metric.experiment_count} experiment{metric.experiment_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <MetricModal
          metric={editingMetric}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function MetricModal({
  metric,
  onClose,
  onSave,
}: {
  metric: Metric | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!metric;
  const [name, setName] = useState(metric?.name || '');
  const [key, setKey] = useState(metric?.key || '');
  const [type, setType] = useState(metric?.type || 'binomial');
  const [description, setDescription] = useState(metric?.description || '');
  const [eventName, setEventName] = useState(metric?.event_name || '');

  const { mutate: createMetric, loading: creating, error: createError } = useMutation<Metric>('/api/metrics');
  const { mutate: updateMetric, loading: updating, error: updateError } = useMutation<Metric>(
    `/api/metrics/${metric?.id}`,
    'PUT'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      key: key || name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      type,
      description,
      event_name: eventName,
    };

    try {
      if (isEdit) {
        await updateMetric(payload);
      } else {
        await createMetric(payload);
      }
      onSave();
    } catch {
      // shown in UI
    }
  };

  const saving = creating || updating;
  const saveError = createError || updateError;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Metric' : 'Create Metric'}
            </h2>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="label">Metric Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit) {
                    setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
                  }
                }}
                placeholder="e.g., Signup Conversion"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Key</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="signup_conversion"
                className="input font-mono text-sm"
                required
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPE_CONFIG).map(([value, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value as Metric['type'])}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                        type === value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${type === value ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Event Name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., signup_completed"
                className="input font-mono text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">The event tracked via the SDK</p>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this metric measure?"
                rows={2}
                className="input resize-none"
              />
            </div>

            {saveError && (
              <div className="px-4 py-2.5 bg-danger-50 dark:bg-danger-950 border border-danger-200 dark:border-danger-800 rounded-lg">
                <p className="text-xs text-danger-700 dark:text-danger-400">{saveError}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name} className="btn-primary">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isEdit ? 'Update' : 'Create'} Metric
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
