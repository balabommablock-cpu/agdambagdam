import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Globe,
  FlaskConical,
  Code2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

/**
 * Three-step onboarding wizard. Designed for a visitor who just got their API
 * key and has no idea what to do next. No jargon, no blank forms — every field
 * has a sensible default and a one-sentence explanation.
 *
 * Step 1 — Paste your site URL (just so we can tailor the copy snippet)
 * Step 2 — Name your first experiment
 * Step 3 — Copy the snippet that makes it work
 *
 * State lives in component state only — we don't persist partial wizards
 * because restarting is free and reliable. When the user clicks "Done" on
 * Step 3 we fire the actual experiment-creation API call, then send them to
 * /experiments/:id so they see their new experiment live.
 */

const API_KEY_STORAGE = 'abacus_api_key';
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '';

// ─── types ────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface WizardState {
  siteUrl: string;
  experimentKey: string;
  experimentName: string;
  variantA: string;
  variantB: string;
  metricKey: string;
  metricName: string;
}

// ─── small components ────────────────────────────────────────────────

function StepBadge({ active, done, n }: { active: boolean; done: boolean; n: number }) {
  const base =
    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition';
  if (done) return <div className={`${base} bg-emerald-500 border-emerald-500 text-white`}><Check className="w-4 h-4" /></div>;
  if (active) return <div className={`${base} bg-primary-600 border-primary-600 text-white`}>{n}</div>;
  return <div className={`${base} bg-transparent border-slate-300 dark:border-slate-700 text-slate-400`}>{n}</div>;
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <StepBadge active={step === 1} done={step > 1} n={1} />
      <div className={`h-0.5 w-8 transition ${step > 1 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
      <StepBadge active={step === 2} done={step > 2} n={2} />
      <div className={`h-0.5 w-8 transition ${step > 2 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
      <StepBadge active={step === 3} done={false} n={3} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-3 right-3 px-2 py-1.5 text-xs rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 inline-flex items-center gap-1.5 transition"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// ─── step screens ─────────────────────────────────────────────────────

function Step1({
  state,
  setState,
  onNext,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
  onNext: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const isValid = state.siteUrl.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-semibold uppercase tracking-wide mb-3">
        <Globe className="w-4 h-4" />
        Step 1 of 3
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Where do you want to run your first test?
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Paste the URL of the page you want to test. This is just so we can tailor the copy-paste
        snippet — we don't hit your site or require any verification.
      </p>

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Your website URL
      </label>
      <input
        type="url"
        value={state.siteUrl}
        onChange={(e) => setState({ ...state, siteUrl: e.target.value })}
        onBlur={() => setTouched(true)}
        placeholder="https://myawesome.site"
        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        autoFocus
      />
      {touched && !isValid && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
          Paste a URL to continue. Any format works — `localhost:3000` is fine for dev.
        </p>
      )}

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mt-6 border border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          💡 <span className="font-semibold text-slate-800 dark:text-slate-200">Good first experiments:</span>{' '}
          button color, hero headline, CTA placement, checkout form layout. Pick something with an
          obvious outcome (clicks / signups / purchases) — not "brand sentiment".
        </p>
      </div>

      <div className="flex justify-end mt-8">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isValid}
          onClick={onNext}
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Step2({
  state,
  setState,
  onBack,
  onNext,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isValid =
    state.experimentName.length > 0 &&
    state.experimentKey.length > 0 &&
    state.variantA.length > 0 &&
    state.variantB.length > 0;

  // Auto-populate key from name
  useEffect(() => {
    if (!state.experimentKey || state.experimentKey === slugify(state.experimentName).slice(0, -1)) {
      const k = slugify(state.experimentName);
      if (k !== state.experimentKey) setState({ ...state, experimentKey: k });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.experimentName]);

  return (
    <div>
      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-semibold uppercase tracking-wide mb-3">
        <FlaskConical className="w-4 h-4" />
        Step 2 of 3
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Name your experiment
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        A friendly name for you, a URL-safe key for the code. Two variants — the control
        (what you have now) and the treatment (the change you want to test).
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Experiment name
          </label>
          <input
            value={state.experimentName}
            onChange={(e) => setState({ ...state, experimentName: e.target.value })}
            placeholder="Green button test"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Experiment key <span className="text-slate-400 font-normal">(used in code)</span>
          </label>
          <input
            value={state.experimentKey}
            onChange={(e) => setState({ ...state, experimentKey: slugify(e.target.value) })}
            placeholder="green-button-test"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Control variant
            </label>
            <input
              value={state.variantA}
              onChange={(e) => setState({ ...state, variantA: slugify(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Treatment variant
            </label>
            <input
              value={state.variantB}
              onChange={(e) => setState({ ...state, variantB: slugify(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            What are you measuring?
          </label>
          <input
            value={state.metricName}
            onChange={(e) => {
              const name = e.target.value;
              setState({ ...state, metricName: name, metricKey: slugify(name) });
            }}
            placeholder="Button clicks"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            This is what will count as a "conversion". Your code will call{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              ab.track('{state.metricKey || 'metric-key'}')
            </code>{' '}
            to fire it.
          </p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isValid}
          onClick={onNext}
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Step3({
  state,
  onBack,
  onCreate,
  creating,
  error,
}: {
  state: WizardState;
  onBack: () => void;
  onCreate: () => void;
  creating: boolean;
  error: string | null;
}) {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE) ?? 'YOUR-PUBLIC-KEY' : 'YOUR-PUBLIC-KEY';
  const baseUrl = inferBaseUrlFromSite(state.siteUrl);
  const snippet = buildSnippet({ apiKey, baseUrl, state });

  return (
    <div>
      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-semibold uppercase tracking-wide mb-3">
        <Code2 className="w-4 h-4" />
        Step 3 of 3
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Copy this into your site
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Paste this just before <code>&lt;/body&gt;</code>. When you click "Create experiment" below,
        we'll wire up the experiment, variants, and metric in your project — then take you to the
        results page.
      </p>

      <div className="relative bg-slate-900 dark:bg-black rounded-lg overflow-hidden border border-slate-800 mb-6">
        <CopyButton text={snippet} />
        <pre className="p-5 pr-24 overflow-x-auto text-sm text-slate-100 leading-relaxed">
          <code>{snippet}</code>
        </pre>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" /> What happens next
        </p>
        <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal pl-5">
          <li>We create the experiment <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{state.experimentKey}</code> with variants <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{state.variantA}</code> and <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{state.variantB}</code>.</li>
          <li>We create the metric <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{state.metricKey}</code> and attach it to the experiment.</li>
          <li>You paste the snippet into your site. Deploy.</li>
          <li>As real visitors hit your page, results populate automatically.</li>
        </ol>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-300 font-semibold">Couldn't create the experiment.</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2"
          onClick={onBack}
          disabled={creating}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          onClick={onCreate}
          disabled={creating}
        >
          {creating ? 'Creating…' : (<>Create experiment <Check className="w-4 h-4" /></>)}
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 text-center">
        Need help?{' '}
        <a href="/docs" className="underline hover:text-slate-700 dark:hover:text-slate-200">
          Read the quickstart
        </a>{' '}
        ·{' '}
        <a
          href="https://boredfolio.com/agdambagdam/docs/troubleshooting"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1"
        >
          Troubleshooting <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}

// ─── wizard container ────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>({
    siteUrl: '',
    experimentKey: 'my-first-test',
    experimentName: 'My first test',
    variantA: 'control',
    variantB: 'treatment',
    metricKey: 'button-click',
    metricName: 'Button clicks',
  });

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const apiKey = localStorage.getItem(API_KEY_STORAGE);
      if (!apiKey) throw new Error('No API key found. Go to Settings and paste your key first.');

      // Create the metric
      const metricRes = await fetch(`${API_BASE_URL}/api/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ key: state.metricKey, name: state.metricName, type: 'conversion' }),
      });
      if (!metricRes.ok && metricRes.status !== 409) {
        // 409 = already exists; OK to reuse
        const body = await metricRes.json().catch(() => ({}));
        throw new Error(body?.errorDetail?.title ?? body?.error ?? `Metric creation failed (${metricRes.status})`);
      }

      // Create the experiment
      const expRes = await fetch(`${API_BASE_URL}/api/experiments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          key: state.experimentKey,
          name: state.experimentName,
          type: 'ab',
          variants: [
            { key: state.variantA, name: state.variantA, weight: 0.5, is_control: true },
            { key: state.variantB, name: state.variantB, weight: 0.5 },
          ],
        }),
      });
      if (!expRes.ok) {
        const body = await expRes.json().catch(() => ({}));
        throw new Error(body?.errorDetail?.title ?? body?.error ?? `Experiment creation failed (${expRes.status})`);
      }
      const experiment = await expRes.json();
      navigate(`/experiments/${experiment.id}`);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Stepper step={step} />
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        {step === 1 && (
          <Step1 state={state} setState={setState} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2
            state={state}
            setState={setState}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <Step3
            state={state}
            onBack={() => setStep(2)}
            onCreate={handleCreate}
            creating={creating}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function inferBaseUrlFromSite(_siteUrl: string): string {
  // For self-hosted setups the dashboard URL is the same as the API URL.
  // Rather than parse the user's site URL (which isn't where the API lives),
  // we point the snippet at the current window origin so it works for
  // the most common self-host setup. Users can override before pasting.
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://boredfolio.com/agdambagdam';
}

function buildSnippet({
  apiKey,
  baseUrl,
  state,
}: {
  apiKey: string;
  baseUrl: string;
  state: WizardState;
}): string {
  return `<script src="https://unpkg.com/agdambagdam@latest/dist/abacus.js"></script>
<script>
  const ab = new Abacus({
    apiKey: '${apiKey}',
    baseUrl: '${baseUrl}'
  });

  // Assign a variant for this visitor
  ab.getVariant('${state.experimentKey}').then((variant) => {
    if (variant === '${state.variantB}') {
      // TODO: apply your treatment here.
      // Example: change the CTA button's background color.
      const btn = document.querySelector('.cta-button');
      if (btn) btn.style.backgroundColor = 'green';
    }
  });

  // Track '${state.metricName}' — call this when the user does the thing you're measuring.
  // Example: on click of the CTA button.
  document.querySelector('.cta-button')?.addEventListener('click', () => {
    ab.track('${state.metricKey}');
  });
</script>`;
}
