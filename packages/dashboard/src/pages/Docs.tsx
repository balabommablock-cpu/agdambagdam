import { useState } from 'react';
import {
  Copy,
  Check,
  BookOpen,
  Key,
  FlaskConical,
  Activity,
  Code,
  BarChart3,
  ChevronRight,
  Zap,
  ArrowUp,
  Target,
  AlertTriangle,
  Lightbulb,
  Info,
  Clock,
  Eye,
  MousePointerClick,
  TrendingUp,
  Shield,
  Gauge,
  StopCircle,
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
// Annotated code block (for results with arrows/explanations)
// ---------------------------------------------------------------------------
function AnnotatedBlock({ lines, id, copied, onCopy }: {
  lines: { code: string; annotation?: string; color?: 'green' | 'amber' | 'blue' | 'slate' }[];
  id: string;
  copied: string;
  onCopy: (text: string, id: string) => void;
}) {
  const rawCode = lines.map(l => l.code).join('\n');
  return (
    <div className="relative group">
      <CopyButton text={rawCode} id={id} copied={copied} onCopy={onCopy} />
      <div className="bg-slate-900 rounded-lg overflow-x-auto p-4 space-y-0.5">
        {lines.map((line, i) => {
          const annotationColor = {
            green: 'text-emerald-400',
            amber: 'text-amber-400',
            blue: 'text-blue-400',
            slate: 'text-slate-500',
          }[line.color ?? 'slate'];
          return (
            <div key={i} className="flex flex-wrap gap-x-4 items-baseline">
              <code className="text-xs text-slate-100 whitespace-pre">{line.code}</code>
              {line.annotation && (
                <span className={`text-[11px] ${annotationColor} whitespace-nowrap`}>{line.annotation}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Callout boxes
// ---------------------------------------------------------------------------
function Callout({ type, children }: {
  type: 'tip' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  const styles = {
    tip: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      icon: <Lightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
      text: 'text-emerald-800 dark:text-emerald-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
      text: 'text-amber-800 dark:text-amber-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
      text: 'text-blue-800 dark:text-blue-300',
    },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${s.bg}`}>
      {s.icon}
      <div className={`text-sm ${s.text}`}>{children}</div>
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
// Endpoint documentation block (for API Reference section)
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
  { id: 'first-test', label: 'Your First A/B Test', icon: Zap },
  { id: 'add-to-site', label: 'Adding to Your Website', icon: Code },
  { id: 'understanding-results', label: 'Understanding Results', icon: BarChart3 },
  { id: 'api-reference', label: 'Full API Reference', icon: BookOpen },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Docs() {
  const [copied, setCopied] = useState('');
  const [activeSDK, setActiveSDK] = useState<'html' | 'react' | 'node' | 'curl'>('html');
  const [showFullRef, setShowFullRef] = useState(false);

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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guide</span>
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
      <div className="flex-1 min-w-0 space-y-16 pb-20">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">How to A/B Test Anything</h1>
          <p className="text-base text-slate-500 mt-2 max-w-2xl">
            A step-by-step guide to running experiments with Agdam Bagdam. No statistics degree required.
          </p>
        </div>

        {/* ================================================================
            PAGE 1: YOUR FIRST A/B TEST IN 5 MINUTES
        ================================================================ */}
        <section id="first-test">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary-50 dark:bg-primary-950 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your First A/B Test in 5 Minutes</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 ml-11">
            Want to test if a green signup button gets more clicks than a blue one? Here is how.
          </p>

          <div className="space-y-8">
            {/* Step 1: Get Your API Key */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Get Your API Key</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                Think of your API key like a password that lets your website talk to Agdam Bagdam. You also need a Project ID, which tells Agdam Bagdam <em>which project</em> this data belongs to.
              </p>
              <div className="ml-10">
                <Callout type="tip">
                  Go to <a href="/settings" className="font-medium underline">Settings</a> in the dashboard. Your API key and Project ID are right at the top. Copy both -- you will need them for every step below.
                </Callout>
              </div>
              <div className="mt-4 ml-10">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Every request to Agdam Bagdam includes these two headers. Here is what they look like:</p>
                <CodeBlock
                  code={`-H "x-api-key: ab_live_xxxxxxxxxxxx"       # Your API key (authenticates you)
-H "x-project-id: proj_xxxxxxxxxxxx"      # Your project ID (scopes data)`}
                  id="step1-headers"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
            </div>

            {/* Step 2: Create Something to Measure */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create Something to Measure</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                Before testing, you need to tell Agdam Bagdam what &quot;winning&quot; means. Is it more clicks? More signups? More purchases? This is called a <strong>metric</strong>.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 ml-10">
                Let us say you want to count how many people click the signup button. Run this command in your terminal:
              </p>
              <div className="ml-10">
                <CodeBlock
                  code={`curl -X POST ${BASE}/api/metrics \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "key": "signup_clicks",
    "name": "Signup Button Clicks",
    "type": "conversion",
    "metricKey": "signup_click"
  }'`}
                  id="step2-metric"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-3 ml-10">
                <Callout type="info">
                  This tells Agdam Bagdam: &quot;Count how many people click the signup button. Each click is either a yes or no (conversion).&quot; You only need to create a metric once -- it gets reused across experiments.
                </Callout>
              </div>
            </div>

            {/* Step 3: Create Your Test */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-violet-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create Your Test</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                Now create the actual A/B test. You need a name and two versions to compare. Let us test a blue signup button vs. a green one.
              </p>
              <div className="ml-10">
                <CodeBlock
                  code={`curl -X POST ${BASE}/api/experiments \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "name": "Signup Button Color",
    "key": "signup-button-color",
    "description": "Test if a green button gets more signups than blue",
    "variants": [
      { "name": "blue", "weight": 0.5 },
      { "name": "green", "weight": 0.5 }
    ],
    "targeting_rules": []
  }'`}
                  id="step3-experiment"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-4 ml-10">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">What each field means:</p>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong>&quot;name&quot;</strong> -- A human-readable label. Shows up in the dashboard.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong>&quot;key&quot;</strong> -- A unique ID for this test. Your code will reference this. Use lowercase and hyphens.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong>&quot;variants&quot;</strong> -- The versions you are testing. &quot;weight: 0.5&quot; means 50% of visitors see this version (0-1 float).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300"><strong>&quot;targeting_rules&quot;</strong> -- An array of targeting rules for this test. An empty array means all traffic is eligible.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Start the Test */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">4</div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Start the Test</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                Your test was created in &quot;draft&quot; mode. Flip the switch to make it live. Replace <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">EXPERIMENT_ID</code> with the <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">id</code> from Step 3 response.
              </p>
              <div className="ml-10">
                <CodeBlock
                  code={`curl -X POST ${BASE}/api/experiments/EXPERIMENT_ID/start \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID"`}
                  id="step4-start"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-3 ml-10">
                <Callout type="tip">
                  Your test is now live. From this moment on, Agdam Bagdam can assign visitors to &quot;blue&quot; or &quot;green&quot;.
                </Callout>
              </div>
            </div>

            {/* Step 5: Show Different Versions */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">5</div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Show Different Versions to Different Users</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                When someone visits your site, ask Agdam Bagdam which version to show them. You pass a user ID (any unique string -- an email, a cookie ID, anything).
              </p>
              <div className="ml-10">
                <CodeBlock
                  code={`curl -X POST ${BASE}/api/assign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "experimentKey": "signup-button-color",
    "userId": "visitor_abc"
  }'`}
                  id="step5-assign"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 mb-2 ml-10">Agdam Bagdam responds with which version to show:</p>
              <div className="ml-10">
                <AnnotatedBlock
                  lines={[
                    { code: '{' },
                    { code: '  "variant": "green",', annotation: 'Show this visitor the green button', color: 'green' },
                    { code: '  "experimentKey": "signup-button-color",', annotation: 'Which test this belongs to', color: 'slate' },
                    { code: '  "userId": "visitor_abc"', annotation: 'The visitor you asked about', color: 'slate' },
                    { code: '}' },
                  ]}
                  id="step5-response"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-3 ml-10">
                <Callout type="info">
                  The system randomly (but consistently) assigns each visitor. The same visitor always gets the same version, so they do not see the button change color between visits.
                </Callout>
              </div>
            </div>

            {/* Step 6: Track When Someone Clicks */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">6</div>
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-orange-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Track When Someone Clicks</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                When a user clicks the signup button, tell Agdam Bagdam. This is how it counts conversions for each version.
              </p>
              <div className="ml-10">
                <CodeBlock
                  code={`curl -X POST ${BASE}/api/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{
    "metricKey": "signup_click",
    "userId": "visitor_abc"
  }'`}
                  id="step6-track"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-3 ml-10">
                <Callout type="warning">
                  Use the same <strong>userId</strong> you used in Step 5. That is how Agdam Bagdam connects the dots: &quot;visitor_abc saw the green button AND clicked signup.&quot;
                </Callout>
              </div>
            </div>

            {/* Step 7: Check Who's Winning */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">7</div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Check Who is Winning</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-10">
                After enough people have visited, check the results. You will see this in the dashboard automatically, but you can also request it via API:
              </p>
              <div className="ml-10">
                <CodeBlock
                  code={`curl -X GET ${BASE}/api/experiments/EXPERIMENT_ID/results \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID"`}
                  id="step7-results-req"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 mb-2 ml-10">Here is what the results look like, with annotations explaining each number:</p>
              <div className="ml-10">
                <AnnotatedBlock
                  lines={[
                    { code: '{' },
                    { code: '  "total_assignments": 10482,', annotation: '10,482 visitors entered this test', color: 'blue' },
                    { code: '  "variants": [' },
                    { code: '    {' },
                    { code: '      "name": "blue",', annotation: 'The original button', color: 'slate' },
                    { code: '      "assignments": 5241,', annotation: '5,241 people saw it', color: 'slate' },
                    { code: '      "conversions": 312,', annotation: '312 clicked signup', color: 'slate' },
                    { code: '      "conversion_rate": 0.0595', annotation: '5.95% click rate', color: 'amber' },
                    { code: '    },' },
                    { code: '    {' },
                    { code: '      "name": "green",', annotation: 'The new button', color: 'slate' },
                    { code: '      "assignments": 5241,', annotation: '5,241 people saw it', color: 'slate' },
                    { code: '      "conversions": 387,', annotation: '387 clicked signup', color: 'slate' },
                    { code: '      "conversion_rate": 0.0738', annotation: '7.38% click rate -- higher!', color: 'green' },
                    { code: '    }' },
                    { code: '  ],' },
                    { code: '  "frequentist": {' },
                    { code: '    "pValue": 0.0023,', annotation: 'Only 0.23% chance this is random luck', color: 'green' },
                    { code: '    "significant": true,', annotation: 'You can trust this result!', color: 'green' },
                    { code: '    "relativeUplift": 0.2403', annotation: 'Green is 24% better than blue', color: 'green' },
                    { code: '  },' },
                    { code: '  "bayesian": {' },
                    { code: '    "probabilityOfBeingBest": {' },
                    { code: '      "blue": 0.03,', annotation: '3% chance blue is better', color: 'amber' },
                    { code: '      "green": 0.97', annotation: '97% chance green is better', color: 'green' },
                    { code: '    }' },
                    { code: '  },' },
                    { code: '  "srmCheck": {' },
                    { code: '    "passed": true', annotation: 'Traffic split is clean -- no data issues', color: 'green' },
                    { code: '  },' },
                    { code: '  "power": {' },
                    { code: '    "current": 0.89', annotation: '89% power -- enough data to trust results', color: 'green' },
                    { code: '  }' },
                    { code: '}' },
                  ]}
                  id="step7-results-res"
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-4 ml-10">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">The verdict: Green wins!</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Green has a 97% probability of being the better button, with a 24% uplift in signups. Ship it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            PAGE 2: ADDING TO YOUR WEBSITE
        ================================================================ */}
        <section id="add-to-site">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950 rounded-lg flex items-center justify-center">
              <Code className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Adding to Your Website</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 ml-11">
            Pick the method that matches your tech stack. Each example shows the complete flow: connect, get a variant, show it, and track clicks.
          </p>

          <div className="card overflow-hidden">
            {/* Language tabs */}
            <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-4">
              {([
                { key: 'html' as const, label: 'Plain HTML' },
                { key: 'react' as const, label: 'React' },
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
              {activeSDK === 'html' && (
                <div>
                  <div className="px-4 pt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">The simplest approach. Add this to any HTML page -- no build tools needed.</p>
                  </div>
                  <CodeBlock
                    code={`<!-- Drop this into your HTML page -->
<script src="/path/to/abacus.js"></script>
<script>
  // 1. Connect to your Agdam Bagdam server
  var ab = new Abacus({
    apiKey: 'YOUR_API_KEY',
    baseUrl: '${BASE}',
    userId: 'visitor_abc',
  });

  // 2. Find out which version this visitor should see
  //    (uses localStorage to keep it consistent)
  ab.getVariant('signup-button-color').then(function(variant) {
    // 3. Show the right version
    if (variant === 'green') {
      document.getElementById('signup-btn').style.backgroundColor = '#22c55e';
    }
    // If variant is 'blue', do nothing -- blue is the default
  });

  // 4. Track when they click the button
  document.getElementById('signup-btn').addEventListener('click', function() {
    ab.track('signup_click');
  });
</script>`}
                    id="sdk-html"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              )}
              {activeSDK === 'react' && (
                <div>
                  <div className="px-4 pt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Use the Abacus class directly in React. Initialize once and use throughout your app.</p>
                  </div>
                  <CodeBlock
                    code={`import Abacus from '@abacus/sdk-js';

// Step 1: Create an instance (do this once, e.g. in a module or context)
const ab = new Abacus({
  apiKey: 'YOUR_API_KEY',
  baseUrl: '${BASE}',
  userId: currentUser.id,  // Your logged-in user's ID
});

// Step 2: Use in any component
function SignupPage() {
  const [variant, setVariant] = useState('blue');

  useEffect(() => {
    ab.getVariant('signup-button-color').then(setVariant);
  }, []);

  return (
    <button
      onClick={() => ab.track('signup_click')}
      style={{ backgroundColor: variant === 'green' ? '#22c55e' : '#3b82f6' }}
    >
      Sign Up Free
    </button>
  );
}`}
                    id="sdk-react"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              )}
              {activeSDK === 'node' && (
                <div>
                  <div className="px-4 pt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">For server-rendered apps (Express, Next.js, etc). The variant is decided before the page loads.</p>
                  </div>
                  <CodeBlock
                    code={`const { AbacusNode } = require('@abacus/sdk-node');

// Step 1: Create a client (do this once when your server starts)
const ab = new AbacusNode({
  apiKey: 'YOUR_API_KEY',
  baseUrl: '${BASE}',
});

// Step 2: Get the variant when a user requests the page
app.get('/signup', async (req, res) => {
  const variant = await ab.getVariant(
    'signup-button-color',   // Your experiment key
    req.session.userId       // The visitor's unique ID
  );

  // Step 3: Render the right version
  res.render('signup', { buttonColor: variant });
});

// Step 4: Track events when something happens
app.post('/signup-click', async (req, res) => {
  ab.track(req.session.userId, 'signup_click');
  res.json({ success: true });
});`}
                    id="sdk-node"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              )}
              {activeSDK === 'curl' && (
                <div>
                  <div className="px-4 pt-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Works from any language that can make HTTP calls. Python, Ruby, Go, PHP -- anything.</p>
                  </div>
                  <CodeBlock
                    code={`# Step 1: Ask which version to show this visitor
curl -X POST ${BASE}/api/assign \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{"experimentKey": "signup-button-color", "userId": "visitor_abc"}'

# Response: {"variant": "green", ...}
# Use that value to render the right version in your app.

# Step 2: When the user clicks, track it
curl -X POST ${BASE}/api/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-project-id: YOUR_PROJECT_ID" \\
  -d '{"metricKey": "signup_click", "userId": "visitor_abc"}'`}
                    id="sdk-curl"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================
            PAGE 3: UNDERSTANDING YOUR RESULTS
        ================================================================ */}
        <section id="understanding-results">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Understanding Your Results</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 ml-11">
            Your test is running and data is coming in. Here is how to read the numbers -- in plain English.
          </p>

          <div className="space-y-6">
            {/* Is my test working? */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">&quot;Is my test working?&quot;</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Check: SRM</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                If Agdam Bagdam says <strong>&quot;SRM Warning&quot;</strong> (or <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">srmCheck.passed: false</code>), it means something is wrong with how visitors are being split between versions. Think of it like a coin that lands heads 70% of the time -- that coin is broken.
              </p>
              <Callout type="warning">
                If SRM fails, <strong>do not trust the results</strong>. Common causes: bot traffic hitting one version more, a bug in your code that only loads one variant, or redirects dropping users. Fix your setup first, then restart the test.
              </Callout>
              <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>passed: true</strong> -- Traffic split is clean. Your test is set up correctly.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>passed: false</strong> -- Something is broken. Investigate before drawing any conclusions.</span>
                </div>
              </div>
            </div>

            {/* Who's winning? */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">&quot;Who is winning?&quot;</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Check: probabilityOfBeingBest</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                This number tells you the chance that each version is genuinely the best -- not just ahead due to luck. If green shows <strong>95%</strong>, that means there is a 95% chance green is truly better. Agdam Bagdam calculates this using Bayesian statistics (you do not need to know what that means).
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>Above 95%</strong> -- You have a clear winner. Ship it with confidence.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>80% - 95%</strong> -- Leaning one way, but you might want more data to be safe.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>Below 80%</strong> -- Too close to call. Keep the test running.</span>
                </div>
              </div>
            </div>

            {/* Can I trust this? */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Check className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">&quot;Can I trust this?&quot;</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Check: pValue and significant</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                The p-value answers: &quot;What is the probability that what I am seeing is just random chance?&quot; <strong>Lower is better.</strong> When it drops below 0.05 (5%), Agdam Bagdam marks the result as <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">significant: true</code> -- meaning you can trust it.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>p &lt; 0.05</strong> -- Statistically significant. Less than 5% chance this is luck.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>p = 0.05 - 0.10</strong> -- Getting there, but not enough yet. Keep the test running.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>p &gt; 0.10</strong> -- No meaningful difference detected. Need more data or the effect is very small.</span>
                </div>
              </div>
              <div className="mt-3">
                <Callout type="info">
                  Think of p-value and probabilityOfBeingBest as two lenses on the same question. If both agree, you can be very confident. Most people find probabilityOfBeingBest easier to understand.
                </Callout>
              </div>
            </div>

            {/* Do I have enough data? */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Gauge className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">&quot;Do I have enough data?&quot;</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Check: power</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Power tells you whether you have seen enough visitors to detect a real difference. Think of it like trying to hear a whisper in a crowded room -- you need enough quiet (data) to hear it.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>Above 80%</strong> -- You have enough data. If the test is not significant at this point, the real difference is probably very small.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>Below 80%</strong> -- Keep waiting. Check <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">requiredSampleSize</code> and <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">estimatedDaysRemaining</code> to see how long.</span>
                </div>
              </div>
            </div>

            {/* Should I stop early? */}
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <StopCircle className="w-5 h-5 text-violet-500" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">&quot;Should I stop early?&quot;</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Check: sequential testing</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Sometimes one version is SO much better that you do not need to wait for the full test to finish. Agdam Bagdam uses sequential testing to check for early winners safely (without increasing the chance of a false positive).
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>shouldStop: true</strong> -- There is a clear winner. You can end the test and ship.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300"><strong>shouldStop: false</strong> -- Not enough evidence yet for an early call. Let it run.</span>
                </div>
              </div>
              <div className="mt-3">
                <Callout type="tip">
                  When in doubt, let the test run until power reaches 80%+. Stopping too early is one of the most common mistakes in A/B testing.
                </Callout>
              </div>
            </div>

            {/* Quick reference summary */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Decision Guide</h4>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">You want to know</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">Look at</th>
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500">Good result</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-400">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">Is the test set up correctly?</td>
                    <td className="px-4 py-3"><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">srmCheck.passed</code></td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">true</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">Which version is better?</td>
                    <td className="px-4 py-3"><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">probabilityOfBeingBest</code></td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">&gt; 95%</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">Can I trust it?</td>
                    <td className="px-4 py-3"><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">significant</code></td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">true</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3">Enough data?</td>
                    <td className="px-4 py-3"><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">power.current</code></td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">&gt; 0.80</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Can I stop early?</td>
                    <td className="px-4 py-3"><code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">shouldStop</code></td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">true</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================================================================
            PAGE 4: FULL API REFERENCE
        ================================================================ */}
        <section id="api-reference">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Full API Reference</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 ml-11">
            Every endpoint Agdam Bagdam offers, with request and response formats. This section is for developers who want the complete spec.
          </p>

          <div className="ml-11 mb-6">
            <button
              onClick={() => setShowFullRef(!showFullRef)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              {showFullRef ? 'Hide' : 'Show'} Full API Reference
              <ChevronRight className={`w-4 h-4 transition-transform ${showFullRef ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {showFullRef && (
            <div className="space-y-10">
              {/* Authentication reminder */}
              <div className="ml-11">
                <Callout type="info">
                  Every request requires two headers: <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-xs">x-api-key</code> (your API key) and <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded text-xs">x-project-id</code> (your project ID). Get both from <a href="/settings" className="font-medium underline">Settings</a>.
                </Callout>
              </div>

              {/* Experiments */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-violet-500" />
                  Experiments
                </h3>
                <div className="space-y-4">
                  <Endpoint
                    method="POST"
                    path="/api/experiments"
                    description="Create a new experiment."
                    reqBody={`{
  "name": "Signup Button Color",
  "key": "signup-button-color",
  "description": "Test green vs blue button on signup",
  "variants": [
    { "name": "blue", "weight": 0.5 },
    { "name": "green", "weight": 0.5 }
  ],
  "targeting_rules": []
}`}
                    resBody={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Signup Button Color",
  "key": "signup-button-color",
  "status": "draft",
  "variants": [
    { "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "name": "blue", "weight": 0.5 },
    { "id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "name": "green", "weight": 0.5 }
  ],
  "created_at": "2025-01-15T10:30:00Z"
}`}
                    id="ref-exp-create"
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
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Signup Button Color",
      "key": "signup-button-color",
      "status": "running",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1
}`}
                    id="ref-exp-list"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/experiments/:id"
                    description="Get full experiment details including variants and targeting rules."
                    resBody={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Signup Button Color",
  "key": "signup-button-color",
  "status": "running",
  "variants": [ ... ],
  "targeting_rules": [],
  "created_at": "2025-01-15T10:30:00Z",
  "started_at": "2025-01-16T08:00:00Z"
}`}
                    id="ref-exp-detail"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <Endpoint method="POST" path="/api/experiments/:id/start" description="Start an experiment. Moves it from draft to running. Users start being assigned immediately." resBody={`{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "status": "running", "started_at": "2025-01-16T08:00:00Z" }`} id="ref-exp-start" copied={copied} onCopy={handleCopy} />
                  <Endpoint method="POST" path="/api/experiments/:id/pause" description="Pause a running experiment. Existing assignments are kept, but no new users are assigned." resBody={`{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "status": "paused" }`} id="ref-exp-pause" copied={copied} onCopy={handleCopy} />
                  <Endpoint method="POST" path="/api/experiments/:id/complete" description="Mark an experiment as complete. This locks the results. Irreversible." resBody={`{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "status": "completed", "completed_at": "2025-02-01T12:00:00Z" }`} id="ref-exp-complete" copied={copied} onCopy={handleCopy} />
                  <Endpoint
                    method="GET"
                    path="/api/experiments/:id/results"
                    description="Get statistical results for a running or completed experiment. Includes frequentist, Bayesian, SRM, and power analysis."
                    resBody={`{
  "experiment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "running",
  "total_assignments": 10482,
  "variants": [
    {
      "name": "blue",
      "assignments": 5241,
      "conversions": 312,
      "conversion_rate": 0.0595,
      "revenue_per_user": 2.87
    },
    {
      "name": "green",
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
    "probabilityOfBeingBest": { "blue": 0.03, "green": 0.97 },
    "expectedLoss": { "blue": 0.0138, "green": 0.0002 },
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
                    id="ref-exp-results"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              </div>

              {/* Assignment */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  Assignment
                </h3>
                <div className="space-y-4">
                  <Endpoint
                    method="POST"
                    path="/api/assign"
                    description="Get a variant assignment for a single user. Deterministic -- the same user always gets the same variant."
                    reqBody={`{
  "experimentKey": "signup-button-color",
  "userId": "visitor_abc",
  "context": { "country": "US", "plan": "pro" }
}`}
                    resBody={`{
  "variant": "green",
  "experimentKey": "signup-button-color",
  "userId": "visitor_abc"
}`}
                    id="ref-assign-single"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/assign/bulk"
                    description="Get assignments for multiple experiments at once. Useful on page load."
                    reqBody={`{
  "userId": "visitor_abc",
  "experimentKeys": [
    "signup-button-color",
    "pricing-page-layout",
    "onboarding-flow"
  ],
  "context": { "country": "US" }
}`}
                    resBody={`{
  "assignments": {
    "signup-button-color": "green",
    "pricing-page-layout": "control",
    "onboarding-flow": "streamlined"
  },
  "userId": "visitor_abc"
}`}
                    id="ref-assign-bulk"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              </div>

              {/* Events */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-orange-500" />
                  Events
                </h3>
                <div className="space-y-4">
                  <Endpoint
                    method="POST"
                    path="/api/events"
                    description="Track a single event. Automatically associated with any active experiment the user is in."
                    reqBody={`{
  "metricKey": "signup_click",
  "userId": "visitor_abc",
  "value": 49.99,
  "properties": { "currency": "USD", "item_count": 3 }
}`}
                    resBody={`{ "success": true }`}
                    id="ref-events-single"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/events/batch"
                    description="Track multiple events at once. Max 100 per batch."
                    reqBody={`{
  "events": [
    {
      "metricKey": "page_view",
      "userId": "visitor_abc",
      "properties": { "page": "/signup" },
      "timestamp": "2025-01-16T08:12:00Z"
    },
    {
      "metricKey": "signup_click",
      "userId": "visitor_abc",
      "timestamp": "2025-01-16T08:14:30Z"
    }
  ]
}`}
                    resBody={`{ "success": true, "count": 2 }`}
                    id="ref-events-batch"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-500" />
                  Metrics
                </h3>
                <div className="space-y-4">
                  <Endpoint
                    method="POST"
                    path="/api/metrics"
                    description="Create a new metric definition."
                    reqBody={`{
  "name": "Revenue per User",
  "key": "revenue_per_user",
  "type": "revenue",
  "metricKey": "purchase",
  "aggregation": "sum",
  "unit": "USD"
}`}
                    resBody={`{
  "id": "d4e5f6a7-b8c9-0123-def0-456789abcdef",
  "name": "Revenue per User",
  "key": "revenue_per_user",
  "type": "revenue",
  "created_at": "2025-01-15T10:30:00Z"
}`}
                    id="ref-metrics-create"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/metrics"
                    description="List all metric definitions."
                    resBody={`{
  "metrics": [
    { "id": "d4e5f6a7-b8c9-0123-def0-456789abcdef", "name": "Revenue per User", "key": "revenue_per_user", "type": "revenue" },
    { "id": "e5f6a7b8-c9d0-1234-ef01-56789abcdef0", "name": "Signup Clicks", "key": "signup_clicks", "type": "conversion" }
  ],
  "total": 2
}`}
                    id="ref-metrics-list"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              </div>

              {/* Feature Flags */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" />
                  Feature Flags
                </h3>
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
  "targeting_rules": [
    { "attribute": "plan", "operator": "in", "values": ["pro", "enterprise"] }
  ]
}`}
                    resBody={`{
  "id": "f6a7b8c9-d0e1-2345-f012-6789abcdef01",
  "key": "dark_mode",
  "name": "Dark Mode",
  "enabled": false,
  "created_at": "2025-01-15T10:30:00Z"
}`}
                    id="ref-flags-create"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                  <Endpoint method="GET" path="/api/flags" description="List all feature flags." resBody={`{ "flags": [{ "id": "f6a7b8c9-d0e1-2345-f012-6789abcdef01", "key": "dark_mode", "name": "Dark Mode", "enabled": false }], "total": 1 }`} id="ref-flags-list" copied={copied} onCopy={handleCopy} />
                  <Endpoint method="POST" path="/api/flags/:id/toggle" description="Toggle a feature flag on or off." reqBody={`{ "enabled": true }`} resBody={`{ "id": "f6a7b8c9-d0e1-2345-f012-6789abcdef01", "key": "dark_mode", "enabled": true }`} id="ref-flags-toggle" copied={copied} onCopy={handleCopy} />
                  <Endpoint
                    method="POST"
                    path="/api/flags/evaluate"
                    description="Evaluate a feature flag for a specific user."
                    reqBody={`{
  "flagKey": "dark_mode",
  "userId": "visitor_abc",
  "context": { "plan": "pro", "country": "US" }
}`}
                    resBody={`{
  "flagKey": "dark_mode",
  "enabled": true,
  "userId": "visitor_abc",
  "reason": "targeting_match"
}`}
                    id="ref-flags-evaluate"
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Back to top */}
        <div className="flex justify-center pt-4">
          <a
            href="#first-test"
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
