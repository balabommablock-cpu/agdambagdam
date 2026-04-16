import { useState } from 'react';
import {
  Flag,
  Plus,
  Search,
  X,
  Percent,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useApi, useMutation } from '../hooks/useApi';
import TargetingBuilder from '../components/TargetingBuilder';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  rollout_percentage: number;
  description: string;
  targeting: {
    groups: Array<{
      id: string;
      logic: 'and' | 'or';
      conditions: Array<{ id: string; attribute: string; operator: string; value: string }>;
    }>;
  } | null;
  created_at: string;
  updated_at: string;
}

export default function FeatureFlags() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const { data, loading, error, refetch } = useApi<FeatureFlag[]>('/api/flags');
  const { mutate: toggleFlag } = useMutation<FeatureFlag>('/api/flags', 'PATCH');

  const flags = (data || []).filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.key.includes(search.toLowerCase())
  );

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await toggleFlag({ id: flag.id, enabled: !flag.enabled });
      refetch();
    } catch {
      // handled by hook
    }
  };

  const openCreate = () => {
    setEditingFlag(null);
    setShowModal(true);
  };

  const openEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Feature Flags</h1>
          <p className="text-sm text-slate-500 mt-1">Control feature rollouts and kill switches</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Flag
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search flags..."
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
            <p className="text-sm text-warning-600">Could not load flags. Check API connection.</p>
          </div>
        )}

        {!loading && !error && flags.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {search ? 'No flags match your search' : 'No feature flags yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Feature flags let you control feature rollouts, run kill switches, and target specific user segments.
            </p>
            {!search && (
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" />
                Create Flag
              </button>
            )}
          </div>
        )}

        {!loading && !error && flags.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <button
                  onClick={() => handleToggle(flag)}
                  className="shrink-0"
                  title={flag.enabled ? 'Disable' : 'Enable'}
                >
                  {flag.enabled ? (
                    <ToggleRight className="w-8 h-8 text-success-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(flag)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{flag.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      flag.enabled
                        ? 'bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {flag.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400 font-mono">{flag.key}</span>
                    {flag.description && (
                      <span className="text-xs text-slate-400 truncate">{flag.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Percent className="w-3.5 h-3.5" />
                    <span>{flag.rollout_percentage}%</span>
                  </div>
                  {flag.targeting && flag.targeting.groups.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded">
                      Targeted
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <FlagModal
          flag={editingFlag}
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

function FlagModal({
  flag,
  onClose,
  onSave,
}: {
  flag: FeatureFlag | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!flag;
  const [name, setName] = useState(flag?.name || '');
  const [key, setKey] = useState(flag?.key || '');
  const [description, setDescription] = useState(flag?.description || '');
  const [enabled, setEnabled] = useState(flag?.enabled ?? false);
  const [rollout, setRollout] = useState(flag?.rollout_percentage ?? 100);
  const [targetingGroups, setTargetingGroups] = useState(flag?.targeting?.groups || []);

  const { mutate: createFlag, loading: creating, error: createError } = useMutation<FeatureFlag>('/api/flags');
  const { mutate: updateFlag, loading: updating, error: updateError } = useMutation<FeatureFlag>(
    `/api/flags/${flag?.id}`,
    'PUT'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      key: key || name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      description,
      enabled,
      rollout_percentage: rollout,
      targeting: targetingGroups.length > 0 ? { groups: targetingGroups } : null,
    };

    try {
      if (isEdit) {
        await updateFlag(payload);
      } else {
        await createFlag(payload);
      }
      onSave();
    } catch {
      // error shown in UI
    }
  };

  const saving = creating || updating;
  const saveError = createError || updateError;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEdit ? 'Edit Flag' : 'Create Feature Flag'}
            </h2>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="label">Flag Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEdit) {
                    setKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
                  }
                }}
                placeholder="e.g., New Checkout Flow"
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
                placeholder="new_checkout_flow"
                className="input font-mono text-sm"
                required
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this flag control?"
                rows={2}
                className="input resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Enabled</div>
                <div className="text-xs text-slate-500">Turn this flag on or off</div>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className="shrink-0"
              >
                {enabled ? (
                  <ToggleRight className="w-10 h-10 text-success-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300" />
                )}
              </button>
            </div>

            <div>
              <label className="label">Rollout Percentage</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={rollout}
                  onChange={(e) => setRollout(parseInt(e.target.value))}
                  className="flex-1 accent-primary-600"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white w-12 text-right">
                  {rollout}%
                </span>
              </div>
            </div>

            <div>
              <label className="label mb-3">Targeting Rules</label>
              <TargetingBuilder groups={targetingGroups} onChange={setTargetingGroups} />
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
              {isEdit ? 'Update Flag' : 'Create Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
