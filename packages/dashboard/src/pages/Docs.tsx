import { useState } from 'react';
import {
  Copy,
  Check,
  BookOpen,
  Key,
  FlaskConical,
  Users,
  Activity,
  Flag,
  Target,
  Code,
  BarChart3,
  ChevronRight,
  Zap,
  ArrowUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Copy button helper
// ---------------------------------------------------------------------------
function CopyButton({ text, id, copied, onCopy }: {
  text: string;
  id: string;
  copied: string;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="absolute top-3 right-3 p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors z-10"
      title="Copy to clipboard"
    >
      {copied === id ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------
function CodeBlock({ code, id, copied, onCopy }: {
  code: string;
  id: string;
  copied: string;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="relative group">
      <CopyButton text={code} id={id} copied={copied} onCopy={onCopy} />
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTTP method badge
// ---------------------------------------------------------------------------
function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[method] || 'bg-slate-100 text-slate-600'}`}>
      {method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Endpoint documentation block
// ---------------------------------------------------------------------------
function Endpoint({ method, path, description, reqBody, resBody, id, copied, onCopy }: {
  method: string;
  path: string;
  description: string;
  reqBody?: string;
  resBody?: string;
  id: string;
  copied: string;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
        <MethodBadge method={method} />
        <code className="text-sm font-mono text-slate-900 dark:text-white">{path}</code>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{description}</p>
        {reqBody && (
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">Request Body</div>
            <CodeBlock code={reqBody} id={`${id}-req`} copied={copied} onCopy={onCopy} />
          </div>
        )}
        {resBody && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">Response</div>
            <CodeBlock code={resBody} id={`${id}-res`} copied={copied} onCopy={onCopy} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table of contents items
// ---------------------------------------------------------------------------
const TOC = [
  { id: 'quick-start', label: 'Quick Start', icon: Zap },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'experiments', label: 'Experiments API', icon: FlaskConical },
  { id: 'assignment', label: 'Assignment API', icon: Users },
  { id: 'events', label: 'Events API', icon: Activity },
  { id: 'flags', label: 'Feature Flags API', icon: Flag },
  { id: 'metrics', label: 'Metrics API', icon: Target },
  { id: 'sdk', label: 'SDK Integration', icon: Code },
  { id: 'results', label: 'Understanding Results', icon: BarChart3 },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Docs() {
  const [copied, setCopied] = useState('');
  const [activeSDK, setActiveSDK] = useState<'browser' | 'react' | 'node' | 'curl'>('browser');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const BASE = 'https://your-server.com';

  return (
    <div className="max-w-7xl mx-auto flex gap-8">
      {/* Sticky sidebar TOC */}
      <nav className="hidden xl:block w-56 shrink-0">
        <div className="sticky top-6 space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary-600" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On this page</span>
          </div>
          {TOC.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-12 pb-20">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">API Reference</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Everything you need to integrate Agdam Bagdam into your product. From first API call to production-grade experimentation in 30 minutes.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              Base URL
            </span>
            <code className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
              {BASE}
            </code>
          </div>
        </div>

        {/* ================================================================
            1. QUICK START
        ================================================================ */}
        <section id="quick-start">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary-50 dark:bg-primary-950 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Quick Start</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Three steps. Zero to first experiment.</p>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Create an experiment</h3>
              </div>
              <CodeBlock
                code={`curl -X POST ${BASE}/api/experiments \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "name": "Checkout Button Color",
    "key": "checkout_btn_color",
    "variants": [
      { "name": "control", "weight": 50 },
      { "name": "green_button", "weight": 50 }
    ]
  }'`}
                id="qs-1"
                copied={copied}
                onCopy={handleCopy}
              />
            </div>

            {/* Step 2 */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assign users and render variants</h3>
              </div>
              <CodeBlock
                code={`curl -X POST ${BASE}/api/assign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "experiment_key": "checkout_btn_color",
    "user_id": "user_123"
  }'

# Response:
# { "variant": "green_button", "experiment_key": "checkout_btn_color" }`}
                id="qs-2"
                copied={copied}
                onCopy={handleCopy}
              />
            </div>

            {/* Step 3 */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Track conversion events</h3>
              </div>
              <CodeBlock
                code={`curl -X POST ${BASE}/api/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "event_name": "purchase",
    "user_id": "user_123",
    "properties": { "revenue": 49.99 }
  }'`}
                id="qs-3"
                copied={copied}
                onCopy={handleCopy}
              />
            </div>
          </div>
        </section>

        {/* ================================================================
            2. AUTHENTICATION
        ================================================================ */}
        <section id="authentication">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950 rounded-lg flex items-center justify-center">
              <Key className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Authentication</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Every request requires two headers. Get your credentials from the <a href="/settings" className="text-primary-600 hover:underline">Settings</a> page.
          </p>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">Header</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3"><code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">x-api-key</code></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Your API key. Authenticates the request.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">x-project-id</code></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">Your project ID. Scopes all data to a specific project.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <CodeBlock
              code={`# Every request looks like this:
curl -X GET ${BASE}/api/experiments \\
  -H "x-api-key: ab_live_xxxxxxxxxxxx" \\
  -H "x-project-id: proj_xxxxxxxxxxxx"`}
              id="auth-example"
              copied={copied}
              onCopy={handleCopy}
            />
          </div>
        </section>

        {/* ================================================================
            3. EXPERIMENTS API
        ================================================================ */}
        <section id="experiments">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-violet-50 dark:bg-violet-950 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Experiments API</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Create, manage, and analyze A/B tests.</p>

          <div className="space-y-4">
            <Endpoint
              method="POST"
              path="/api/experiments"
              description="Create a new experiment. Returns the created experiment object."
              reqBody={`{
  "name": "Checkout Button Color",
  "key": "checkout_btn_color",
  "description": "Test green vs default button on checkout",
  "variants": [
    { "name": "control", "weight": 50 },
    { "name": "green_button", "weight": 50 }
  ],
  "targeting_rules": {
    "percentage": 100
  }
}`}
              resBody={`{
  "id": "exp_abc123",
  "name": "Checkout Button Color",
  "key": "checkout_btn_color",
  "status": "draft",
  "variants": [
    { "id": "var_1", "name": "control", "weight": 50 },
    { "id": "var_2", "name": "green_button", "weight": 50 }
  ],
  "created_at": "2025-01-15T10:30:00Z"
}`}
              id="exp-create"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="GET"
              path="/api/experiments"
              description="List all experiments. Supports optional query params: ?status=running&limit=20&offset=0"
              resBody={`{
  "experiments": [
    {
      "id": "exp_abc123",
      "name": "Checkout Button Color",
      "key": "checkout_btn_color",
      "status": "running",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1
}`}
              id="exp-list"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="GET"
              path="/api/experiments/:id"
              description="Get full experiment details, including variants and targeting rules."
              resBody={`{
  "id": "exp_abc123",
  "name": "Checkout Button Color",
  "key": "checkout_btn_color",
  "status": "running",
  "variants": [ ... ],
  "targeting_rules": { "percentage": 100 },
  "created_at": "2025-01-15T10:30:00Z",
  "started_at": "2025-01-16T08:00:00Z"
}`}
              id="exp-detail"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/experiments/:id/start"
              description="Start an experiment. Moves from draft to running. Assignment begins immediately."
              resBody={`{
  "id": "exp_abc123",
  "status": "running",
  "started_at": "2025-01-16T08:00:00Z"
}`}
              id="exp-start"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/experiments/:id/pause"
              description="Pause a running experiment. Existing assignments are preserved; no new users are assigned."
              resBody={`{
  "id": "exp_abc123",
  "status": "paused"
}`}
              id="exp-pause"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/experiments/:id/complete"
              description="Complete an experiment. Locks results. This action is irreversible."
              resBody={`{
  "id": "exp_abc123",
  "status": "completed",
  "completed_at": "2025-02-01T12:00:00Z"
}`}
              id="exp-complete"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="GET"
              path="/api/experiments/:id/results"
              description="Get statistical results for a running or completed experiment. Includes both frequentist and Bayesian analysis."
              resBody={`{
  "experiment_id": "exp_abc123",
  "status": "running",
  "total_assignments": 10482,
  "variants": [
    {
      "name": "control",
      "assignments": 5241,
      "conversions": 312,
      "conversion_rate": 0.0595,
      "revenue_per_user": 2.87
    },
    {
      "name": "green_button",
      "assignments": 5241,
      "conversions": 387,
      "conversion_rate": 0.0738,
      "revenue_per_user": 3.42
    }
  ],
  "frequentist": {
    "pValue": 0.0023,
    "confidenceInterval": [0.0041, 0.0245],
    "significant": true,
    "relativeUplift": 0.2403
  },
  "bayesian": {
    "probabilityOfBeingBest": {
      "control": 0.03,
      "green_button": 0.97
    },
    "expectedLoss": {
      "control": 0.0138,
      "green_button": 0.0002
    },
    "credibleInterval": [0.0035, 0.0251]
  },
  "srmCheck": {
    "passed": true,
    "pValue": 0.98,
    "expectedRatio": [0.5, 0.5],
    "observedRatio": [0.5, 0.5]
  },
  "power": {
    "current": 0.89,
    "requiredSampleSize": 12000,
    "estimatedDaysRemaining": 3
  }
}`}
              id="exp-results"
              copied={copied}
              onCopy={handleCopy}
            />
          </div>
        </section>

        {/* ================================================================
            4. ASSIGNMENT API
        ================================================================ */}
        <section id="assignment">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-cyan-50 dark:bg-cyan-950 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assignment API</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Deterministically assign users to experiment variants using MurmurHash3. Same user always gets the same variant.
          </p>

          <div className="space-y-4">
            <Endpoint
              method="POST"
              path="/api/assign"
              description="Get a variant assignment for a single user. Assignment is deterministic and sticky."
              reqBody={`{
  "experiment_key": "checkout_btn_color",
  "user_id": "user_123",
  "attributes": {
    "country": "US",
    "plan": "pro"
  }
}`}
              resBody={`{
  "variant": "green_button",
  "experiment_key": "checkout_btn_color",
  "user_id": "user_123"
}`}
              id="assign-single"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/assign/bulk"
              description="Get assignments for multiple experiments at once. Useful on page load to fetch all active experiments."
              reqBody={`{
  "user_id": "user_123",
  "experiment_keys": [
    "checkout_btn_color",
    "pricing_page_layout",
    "onboarding_flow"
  ],
  "attributes": {
    "country": "US"
  }
}`}
              resBody={`{
  "assignments": {
    "checkout_btn_color": "green_button",
    "pricing_page_layout": "control",
    "onboarding_flow": "streamlined"
  },
  "user_id": "user_123"
}`}
              id="assign-bulk"
              copied={copied}
              onCopy={handleCopy}
            />
          </div>
        </section>

        {/* ================================================================
            5. EVENTS API
        ================================================================ */}
        <section id="events">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-rose-50 dark:bg-rose-950 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Events API</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Track conversion events and custom metrics. Events are automatically associated with active experiment assignments.
          </p>

          <div className="space-y-4">
            <Endpoint
              method="POST"
              path="/api/events"
              description="Track a single event for a user."
              reqBody={`{
  "event_name": "purchase",
  "user_id": "user_123",
  "value": 49.99,
  "properties": {
    "currency": "USD",
    "item_count": 3
  }
}`}
              resBody={`{
  "success": true,
  "event_id": "evt_xyz789"
}`}
              id="events-single"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/events/batch"
              description="Track multiple events in a single request. Recommended for high-throughput scenarios. Max 100 events per batch."
              reqBody={`{
  "events": [
    {
      "event_name": "page_view",
      "user_id": "user_123",
      "properties": { "page": "/checkout" },
      "timestamp": "2025-01-16T08:12:00Z"
    },
    {
      "event_name": "purchase",
      "user_id": "user_123",
      "value": 49.99,
      "timestamp": "2025-01-16T08:14:30Z"
    }
  ]
}`}
              resBody={`{
  "success": true,
  "processed": 2,
  "failed": 0
}`}
              id="events-batch"
              copied={copied}
              onCopy={handleCopy}
            />
          </div>
        </section>

        {/* ================================================================
            6. FEATURE FLAGS API
        ================================================================ */}
        <section id="flags">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-orange-50 dark:bg-orange-950 rounded-lg flex items-center justify-center">
              <Flag className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Feature Flags API</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Ship features behind flags. Instant rollbacks. Gradual rollouts. Targeted releases.
          </p>

          <div className="space-y-4">
            <Endpoint
              method="POST"
              path="/api/flags"
              description="Create a new feature flag."
              reqBody={`{
  "name": "Dark Mode",
  "key": "dark_mode",
  "description": "Enable dark mode for users",
  "enabled": false,
  "targeting_rules": {
    "percentage": 0,
    "attributes": {
      "plan": ["pro", "enterprise"]
    }
  }
}`}
              resBody={`{
  "id": "flag_abc123",
  "key": "dark_mode",
  "name": "Dark Mode",
  "enabled": false,
  "created_at": "2025-01-15T10:30:00Z"
}`}
              id="flags-create"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="GET"
              path="/api/flags"
              description="List all feature flags."
              resBody={`{
  "flags": [
    {
      "id": "flag_abc123",
      "key": "dark_mode",
      "name": "Dark Mode",
      "enabled": false,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1
}`}
              id="flags-list"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/flags/:id/toggle"
              description="Toggle a feature flag on or off."
              reqBody={`{
  "enabled": true
}`}
              resBody={`{
  "id": "flag_abc123",
  "key": "dark_mode",
  "enabled": true
}`}
              id="flags-toggle"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="POST"
              path="/api/flags/evaluate"
              description="Evaluate a feature flag for a specific user. Returns whether the flag is active given the user's attributes."
              reqBody={`{
  "flag_key": "dark_mode",
  "user_id": "user_123",
  "attributes": {
    "plan": "pro",
    "country": "US"
  }
}`}
              resBody={`{
  "flag_key": "dark_mode",
  "enabled": true,
  "user_id": "user_123",
  "reason": "targeting_match"
}`}
              id="flags-evaluate"
              copied={copied}
              onCopy={handleCopy}
            />
          </div>
        </section>

        {/* ================================================================
            7. METRICS API
        ================================================================ */}
        <section id="metrics">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-teal-50 dark:bg-teal-950 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Metrics API</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Define the metrics that matter. Attach them to experiments to measure impact.
          </p>

          <div className="space-y-4">
            <Endpoint
              method="POST"
              path="/api/metrics"
              description="Create a new metric definition."
              reqBody={`{
  "name": "Revenue per User",
  "key": "revenue_per_user",
  "type": "revenue",
  "event_name": "purchase",
  "aggregation": "sum",
  "unit": "USD"
}`}
              resBody={`{
  "id": "met_abc123",
  "name": "Revenue per User",
  "key": "revenue_per_user",
  "type": "revenue",
  "created_at": "2025-01-15T10:30:00Z"
}`}
              id="metrics-create"
              copied={copied}
              onCopy={handleCopy}
            />

            <Endpoint
              method="GET"
              path="/api/metrics"
              description="List all metric definitions."
              resBody={`{
  "metrics": [
    {
      "id": "met_abc123",
      "name": "Revenue per User",
      "key": "revenue_per_user",
      "type": "revenue"
    },
    {
      "id": "met_def456",
      "name": "Conversion Rate",
      "key": "conversion_rate",
      "type": "conversion"
    }
  ],
  "total": 2
}`}
              id="metrics-list"
              copied={copied}
              onCopy={handleCopy}
            />
          </div>
        </section>

        {/* ================================================================
            8. SDK INTEGRATION
        ================================================================ */}
        <section id="sdk">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center justify-center">
              <Code className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">SDK Integration</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Drop-in SDKs for the most common environments. All SDKs handle caching, batching, and offline evaluation.
          </p>

          <div className="card overflow-hidden">
            {/* Language tabs */}
            <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-4">
              {([
                { key: 'browser' as const, label: 'Browser (Script Tag)' },
                { key: 'react' as const, label: 'React (Hook)' },
                { key: 'node' as const, label: 'Node.js (Server)' },
                { key: 'curl' as const, label: 'cURL (Any Language)' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSDK(key)}
                  className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSDK === key
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative">
              {activeSDK === 'browser' && (
                <CodeBlock
                  code={`<!-- Add to your HTML -->
<script src="https://unpkg.com/@abacus/sdk-js/dist/abacus.min.js"></script>
<script>
  const abacus = new Abacus.Client({
    apiKey: 'YOUR_API_KEY',
    apiUrl: '${BASE}',
  });

  // Get variant assignment (deterministic, cached locally)
  const variant = abacus.getVariant('checkout_btn_color', 'user_123');

  if (variant === 'green_button') {
    document.getElementById('cta').style.backgroundColor = '#22c55e';
  }

  // Track conversions (batched, uses sendBeacon on page unload)
  document.getElementById('cta').addEventListener('click', () => {
    abacus.track('purchase', 'user_123', { revenue: 49.99 });
  });
</script>`}
                  id="sdk-browser"
                  copied={copied}
                  onCopy={handleCopy}
                />
              )}
              {activeSDK === 'react' && (
                <CodeBlock
                  code={`import { AbacusProvider, useExperiment, useTrack } from '@abacus/sdk-js/react';

// Wrap your app
function App() {
  return (
    <AbacusProvider apiKey="YOUR_API_KEY" apiUrl="${BASE}" userId={userId}>
      <Checkout />
    </AbacusProvider>
  );
}

// Use in any component
function Checkout() {
  const { variant, loading } = useExperiment('checkout_btn_color');
  const track = useTrack();

  if (loading) return <Skeleton />;

  return (
    <button
      onClick={() => track('purchase', { revenue: 49.99 })}
      className={variant === 'green_button' ? 'bg-green-500' : 'bg-blue-500'}
    >
      Buy Now
    </button>
  );
}`}
                  id="sdk-react"
                  copied={copied}
                  onCopy={handleCopy}
                />
              )}
              {activeSDK === 'node' && (
                <CodeBlock
                  code={`const { AbacusClient } = require('@abacus/sdk-node');

const abacus = new AbacusClient({
  apiKey: 'YOUR_API_KEY',
  apiUrl: '${BASE}',
});

// Server-side assignment (deterministic, no network call needed)
app.get('/checkout', async (req, res) => {
  const variant = await abacus.getVariant(
    'checkout_btn_color',
    req.session.userId
  );

  res.render(variant === 'green_button' ? 'checkout-v2' : 'checkout');
});

// Track server-side events
app.post('/purchase', async (req, res) => {
  await abacus.track('purchase', req.session.userId, {
    revenue: req.body.total,
  });
  res.json({ success: true });
});`}
                  id="sdk-node"
                  copied={copied}
                  onCopy={handleCopy}
                />
              )}
              {activeSDK === 'curl' && (
                <CodeBlock
                  code={`# Works from any language that can make HTTP calls.
# Replace YOUR_API_KEY and YOUR_PROJECT_ID.

# 1. Get variant assignment
curl -X POST ${BASE}/api/assign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{"experiment_key": "checkout_btn_color", "user_id": "user_123"}'

# 2. Track event
curl -X POST ${BASE}/api/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{"event_name": "purchase", "user_id": "user_123", "value": 49.99}'

# 3. Get results
curl -X GET ${BASE}/api/experiments/exp_abc123/results \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID"`}
                  id="sdk-curl"
                  copied={copied}
                  onCopy={handleCopy}
                />
              )}
            </div>
          </div>
        </section>

        {/* ================================================================
            9. UNDERSTANDING RESULTS
        ================================================================ */}
        <section id="results">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Understanding Results</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            What each field in the results response actually means and when to act on it.
          </p>

          <div className="space-y-4">
            {/* frequentist.pValue */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">frequentist.pValue</code>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                The probability of seeing a difference this large (or larger) if there were <em>no real difference</em> between variants. A lower p-value means stronger evidence.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>p &lt; 0.05</strong> -- Statistically significant. Safe to call a winner.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>p = 0.05 - 0.10</strong> -- Directional signal. Consider running longer.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>p &gt; 0.10</strong> -- No meaningful difference detected yet.</span>
                </div>
              </div>
            </div>

            {/* bayesian.probabilityOfBeingBest */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">bayesian.probabilityOfBeingBest</code>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                The estimated probability that each variant is the best performer. Easier to interpret than p-values -- it directly answers &quot;which variant should I pick?&quot;
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>&gt; 95%</strong> -- High confidence. Ship the winner.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>80% - 95%</strong> -- Likely winner, but consider the expected loss before deciding.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>&lt; 80%</strong> -- Too close to call. Keep collecting data.</span>
                </div>
              </div>
            </div>

            {/* srmCheck */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">srmCheck</code>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Sample Ratio Mismatch detection. Checks whether each variant received the expected proportion of traffic. If this fails, your experiment has a data quality issue and <strong>results cannot be trusted</strong>.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>passed: true</strong> -- Traffic split is clean. Results are trustworthy.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertIcon />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>passed: false</strong> -- Something is wrong. Common causes: bot traffic, broken assignment logic, redirects dropping users from one variant. Investigate before drawing conclusions.</span>
                </div>
              </div>
            </div>

            {/* power */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">power</code>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Statistical power tells you whether your experiment has enough data to detect a real effect if one exists. Low power means you might miss a real winner.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>current &gt; 0.8</strong> -- Enough data. If the test is not significant, the effect is likely very small.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>current &lt; 0.8</strong> -- Under-powered. Check <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">requiredSampleSize</code> and <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">estimatedDaysRemaining</code> to plan.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Back to top */}
        <div className="flex justify-center pt-4">
          <a
            href="#quick-start"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-600 transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            Back to top
          </a>
        </div>
      </div>
    </div>
  );
}

// Small inline alert icon component
function AlertIcon() {
  return (
    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
