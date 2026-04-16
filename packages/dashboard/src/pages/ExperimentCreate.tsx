import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Shuffle,
  Brain,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Percent,
  Target,
  Check,
} from 'lucide-react';
import { useMutation, useApi } from '../hooks/useApi';
import TargetingBuilder from '../components/TargetingBuilder';

interface Variant {
  id: string;
  name: string;
  weight: number;
  payload: string;
  isControl: boolean;
}

interface Metric {
  id: string;
  name: string;
  type: string;
}

const EXPERIMENT_TYPES = [
  { value: 'ab', label: 'A/B Test', icon: FlaskConical, description: 'Compare two or more variants against a control' },
  { value: 'multivariate', label: 'Multivariate', icon: Shuffle, description: 'Test multiple variables simultaneously' },
  { value: 'bandit', label: 'Multi-Armed Bandit', icon: Brain, description: 'Automatically optimize traffic allocation' },
];

const STEPS = ['Basics', 'Variants', 'Metrics', 'Targeting', 'Review'];

let variantId = 0;
const genVariantId = () => `v_${++variantId}`;

export default function ExperimentCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const { mutate, loading: saving, error: saveError } = useMutation<{ id: string }>('/api/experiments');
  const { data: availableMetrics } = useApi<Metric[]>('/api/metrics');

  // Form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [type, setType] = useState('ab');
  const [trafficPercentage, setTrafficPercentage] = useState(100);
  const [variants, setVariants] = useState<Variant[]>([
    { id: genVariantId(), name: 'Control', weight: 50, payload: '{}', isControl: true },
    { id: genVariantId(), name: 'Variant B', weight: 50, payload: '{}', isControl: false },
  ]);
  const [primaryMetricId, setPrimaryMetricId] = useState('');
  const [secondaryMetricIds, setSecondaryMetricIds] = useState<string[]>([]);
  const [targetingGroups, setTargetingGroups] = useState<Array<{
    id: string;
    logic: 'and' | 'or';
    conditions: Array<{ id: string; attribute: string; operator: string; value: string }>;
  }>>([]);
  const [exclusionGroup, setExclusionGroup] = useState('');

  const autoGenerateKey = useCallback((n: string) => {
    setKey(n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  }, []);

  const addVariant = () => {
    const letter = String.fromCharCode(67 + variants.length - 1); // C, D, E...
    const newVariant: Variant = {
      id: genVariantId(),
      name: `Variant ${letter}`,
      weight: 0,
      payload: '{}',
      isControl: false,
    };
    const updated = [...variants, newVariant];
    // Redistribute weights equally
    const w = Math.floor(100 / updated.length);
    const remainder = 100 - w * updated.length;
    setVariants(
      updated.map((v, i) => ({ ...v, weight: w + (i === 0 ? remainder : 0) }))
    );
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 2) return;
    const updated = variants.filter((v) => v.id !== id);
    const w = Math.floor(100 / updated.length);
    const remainder = 100 - w * updated.length;
    setVariants(
      updated.map((v, i) => ({ ...v, weight: w + (i === 0 ? remainder : 0) }))
    );
  };

  const updateVariant = (id: string, field: keyof Variant, value: string | number | boolean) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const handleSubmit = async () => {
    try {
      const result = await mutate({
        name,
        key,
        description,
        hypothesis,
        type,
        traffic_percentage: trafficPercentage,
        variants: variants.map((v) => ({
          name: v.name,
          weight: v.weight,
          is_control: v.isControl,
          payload: JSON.parse(v.payload || '{}'),
        })),
        primary_metric_id: primaryMetricId || undefined,
        secondary_metric_ids: secondaryMetricIds,
        targeting: targetingGroups.length > 0 ? { groups: targetingGroups } : undefined,
        mutual_exclusion_group: exclusionGroup || undefined,
      });
      navigate(`/experiments/${result.id}`);
    } catch {
      // error is shown via saveError
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0 && key.trim().length > 0;
      case 1: return variants.length >= 2 && variants.reduce((s, v) => s + v.weight, 0) === 100;
      case 2: return true; // Metrics are optional
      case 3: return true; // Targeting is optional
      default: return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Experiment</h1>
        <p className="text-sm text-slate-500 mt-1">Set up a new A/B test or experiment</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className="flex items-center gap-1"
            disabled={i > step}
          >
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-primary-600 text-white'
                  : i < step
                    ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 cursor-pointer hover:bg-primary-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {i < step ? (
                <Check className="w-3 h-3" />
              ) : (
                <span>{i + 1}</span>
              )}
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
            )}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-6">
        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="label">Experiment Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!key || key === name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')) {
                    autoGenerateKey(e.target.value);
                  }
                }}
                placeholder="e.g., Checkout Button Color Test"
                className="input"
              />
            </div>
            <div>
              <label className="label">Experiment Key</label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="checkout_button_color"
                className="input font-mono text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Used in SDK integration. Auto-generated from name.</p>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you testing and why?"
                rows={3}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="label">Hypothesis</label>
              <textarea
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                placeholder="We believe that [change] will cause [effect] because [reason]..."
                rows={2}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="label">Experiment Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                {EXPERIMENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        type === t.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${type === t.value ? 'text-primary-600' : 'text-slate-400'}`} />
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{t.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Variants */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Variants</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define the variants users will see</p>
              </div>
              <button type="button" onClick={addVariant} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className={`p-4 rounded-xl border ${
                    variant.isControl
                      ? 'border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                          className="input flex-1"
                          placeholder="Variant name"
                        />
                        {variant.isControl && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded uppercase">
                            Control
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Percent className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={variant.weight}
                            onChange={(e) => updateVariant(variant.id, 'weight', parseInt(e.target.value))}
                            className="flex-1 accent-primary-600"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={variant.weight}
                            onChange={(e) => updateVariant(variant.id, 'weight', parseInt(e.target.value) || 0)}
                            className="input w-16 text-center text-sm"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-1 block">
                          Payload (JSON)
                        </label>
                        <textarea
                          value={variant.payload}
                          onChange={(e) => updateVariant(variant.id, 'payload', e.target.value)}
                          className="input font-mono text-xs resize-none h-16"
                          placeholder='{"color": "blue"}'
                        />
                      </div>
                    </div>
                    {!variant.isControl && variants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="p-1.5 text-slate-400 hover:text-danger-500 transition-colors mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Weight validation */}
            {variants.reduce((s, v) => s + v.weight, 0) !== 100 && (
              <div className="px-4 py-2.5 bg-danger-50 dark:bg-danger-950 border border-danger-200 dark:border-danger-800 rounded-lg">
                <p className="text-xs text-danger-700 dark:text-danger-400 font-medium">
                  Weights must sum to 100%. Current total: {variants.reduce((s, v) => s + v.weight, 0)}%
                </p>
              </div>
            )}

            {/* Traffic allocation */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="label">Traffic Allocation</label>
              <p className="text-xs text-slate-500 mb-3">
                Percentage of total traffic to include in this experiment
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={trafficPercentage}
                  onChange={(e) => setTrafficPercentage(parseInt(e.target.value))}
                  className="flex-1 accent-primary-600"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-white w-12 text-right">
                  {trafficPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Metrics */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Primary Metric</h3>
              <p className="text-xs text-slate-500 mt-0.5">The main metric to evaluate your experiment</p>
            </div>
            {availableMetrics && availableMetrics.length > 0 ? (
              <div className="space-y-2">
                {availableMetrics.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrimaryMetricId(m.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      primaryMetricId === m.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Target className={`w-4 h-4 ${primaryMetricId === m.id ? 'text-primary-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{m.type}</div>
                    </div>
                    {primaryMetricId === m.id && (
                      <Check className="w-4 h-4 text-primary-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-2">No metrics configured yet</p>
                <p className="text-xs text-slate-400">You can add metrics later or create them in the Metrics page</p>
              </div>
            )}

            {availableMetrics && availableMetrics.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Secondary Metrics (optional)
                </h3>
                <p className="text-xs text-slate-500 mb-3">Additional metrics to track alongside your primary metric</p>
                <div className="space-y-2">
                  {availableMetrics
                    .filter((m) => m.id !== primaryMetricId)
                    .map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={secondaryMetricIds.includes(m.id)}
                          onChange={(e) =>
                            setSecondaryMetricIds(
                              e.target.checked
                                ? [...secondaryMetricIds, m.id]
                                : secondaryMetricIds.filter((id) => id !== m.id)
                            )
                          }
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</div>
                          <div className="text-xs text-slate-500 capitalize">{m.type}</div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Targeting */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Targeting Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">Define which users should be included in this experiment</p>
            </div>
            <TargetingBuilder groups={targetingGroups} onChange={setTargetingGroups} />

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <label className="label">Mutual Exclusion Group (optional)</label>
              <input
                type="text"
                value={exclusionGroup}
                onChange={(e) => setExclusionGroup(e.target.value)}
                placeholder="e.g., checkout_experiments"
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">
                Users in one experiment in this group won't be in another
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Review & Create</h3>
              <p className="text-xs text-slate-500 mt-0.5">Confirm your experiment configuration</p>
            </div>

            <div className="space-y-4">
              <ReviewRow label="Name" value={name} />
              <ReviewRow label="Key" value={key} mono />
              <ReviewRow label="Type" value={EXPERIMENT_TYPES.find((t) => t.value === type)?.label || type} />
              <ReviewRow label="Description" value={description || '--'} />
              <ReviewRow label="Hypothesis" value={hypothesis || '--'} />
              <ReviewRow label="Traffic" value={`${trafficPercentage}%`} />
              <div className="py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Variants</div>
                <div className="space-y-1.5">
                  {variants.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{v.name}</span>
                      <span className="text-slate-400">-</span>
                      <span className="text-slate-500">{v.weight}%</span>
                      {v.isControl && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                          CONTROL
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <ReviewRow label="Targeting" value={targetingGroups.length > 0 ? `${targetingGroups.length} rule group(s)` : 'All users'} />
              <ReviewRow label="Exclusion Group" value={exclusionGroup || 'None'} />
            </div>

            {saveError && (
              <div className="px-4 py-2.5 bg-danger-50 dark:bg-danger-950 border border-danger-200 dark:border-danger-800 rounded-lg">
                <p className="text-xs text-danger-700 dark:text-danger-400">{saveError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step > 0 ? setStep(step - 1) : navigate('/experiments')}
          className="btn-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="btn-primary"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Experiment
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start py-3 border-b border-slate-100 dark:border-slate-800">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider w-32 shrink-0 pt-0.5">
        {label}
      </span>
      <span className={`text-sm text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
