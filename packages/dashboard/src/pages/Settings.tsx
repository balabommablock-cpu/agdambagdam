import { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code,
  Users,
  Database,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { getApiKey, setApiKey } from '../lib/api';

const SDK_SNIPPETS = {
  javascript: {
    label: 'JavaScript (Browser)',
    language: 'javascript',
    code: `import { AbacusClient } from '@abacus/sdk-js';

const abacus = new AbacusClient({
  apiKey: 'YOUR_API_KEY',
  // apiUrl: 'https://your-domain.com/api', // optional
});

// Get variant assignment
const variant = abacus.getVariant('experiment_key', userId);

// Track event
abacus.track('purchase', userId, { revenue: 49.99 });`,
  },
  react: {
    label: 'React',
    language: 'jsx',
    code: `import { AbacusProvider, useExperiment, useTrack } from '@abacus/sdk-js/react';

function App() {
  return (
    <AbacusProvider apiKey="YOUR_API_KEY" userId={userId}>
      <MyComponent />
    </AbacusProvider>
  );
}

function MyComponent() {
  const { variant, loading } = useExperiment('experiment_key');
  const track = useTrack();

  if (loading) return <Spinner />;

  return variant === 'control' ? (
    <OldCheckout onPurchase={() => track('purchase')} />
  ) : (
    <NewCheckout onPurchase={() => track('purchase')} />
  );
}`,
  },
  node: {
    label: 'Node.js',
    language: 'javascript',
    code: `const { AbacusClient } = require('@abacus/sdk-node');

const abacus = new AbacusClient({
  apiKey: 'YOUR_API_KEY',
  apiUrl: 'http://localhost:3456',
});

// Server-side assignment
app.get('/checkout', async (req, res) => {
  const variant = await abacus.getVariant('checkout_experiment', req.userId);

  if (variant === 'new_checkout') {
    res.render('checkout-v2');
  } else {
    res.render('checkout');
  }
});

// Track server-side events
await abacus.track('purchase', userId, { revenue: 49.99 });`,
  },
  python: {
    label: 'Python',
    language: 'python',
    code: `from abacus import AbacusClient

client = AbacusClient(
    api_key="YOUR_API_KEY",
    api_url="http://localhost:3456"
)

# Get variant assignment
variant = client.get_variant("experiment_key", user_id)

if variant == "new_checkout":
    show_new_checkout()
else:
    show_original()

# Track event
client.track("purchase", user_id, {"revenue": 49.99})`,
  },
  curl: {
    label: 'cURL',
    language: 'bash',
    code: `# Get variant assignment
curl -X POST http://localhost:3456/api/assignments \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"experiment_key": "checkout_experiment", "user_id": "user_123"}'

# Track event
curl -X POST http://localhost:3456/api/events \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"event_name": "purchase", "user_id": "user_123", "properties": {"revenue": 49.99}}'`,
  },
};

export default function Settings() {
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState('');
  const [activeSDK, setActiveSDK] = useState<keyof typeof SDK_SNIPPETS>('javascript');
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    setApiKey(apiKeyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Project configuration and SDK setup</p>
      </div>

      {/* API Key */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">API Key</h2>
            <p className="text-xs text-slate-500">Used to authenticate SDK and API requests</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your API key"
              className="input pr-20 font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleCopy(apiKeyInput, 'api-key')}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {copied === 'api-key' ? (
                  <Check className="w-4 h-4 text-success-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={handleSaveKey}
            className="btn-primary"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>

      {/* SDK Integration */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-50 dark:bg-success-950 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">SDK Integration</h2>
              <p className="text-xs text-slate-500">Get started with your preferred language</p>
            </div>
          </div>
        </div>

        {/* Language tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-6">
          {Object.entries(SDK_SNIPPETS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveSDK(key as keyof typeof SDK_SNIPPETS)}
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
          <button
            onClick={() => handleCopy(SDK_SNIPPETS[activeSDK].code, `sdk-${activeSDK}`)}
            className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors z-10"
          >
            {copied === `sdk-${activeSDK}` ? (
              <Check className="w-4 h-4 text-success-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <pre className="bg-slate-900 text-slate-100 p-6 overflow-x-auto text-xs leading-relaxed">
            <code>{SDK_SNIPPETS[activeSDK].code}</code>
          </pre>
        </div>
      </div>

      {/* Team Management Placeholder */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-warning-50 dark:bg-warning-950 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-warning-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Team Management</h2>
            <p className="text-xs text-slate-500">Manage team members and permissions</p>
          </div>
        </div>
        <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Team management coming soon</p>
          <p className="text-xs text-slate-400 mt-1">Invite team members, assign roles, manage access</p>
        </div>
      </div>

      {/* Data Retention */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-danger-50 dark:bg-danger-950 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Data Retention</h2>
            <p className="text-xs text-slate-500">Configure how long data is kept</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Event Data</div>
              <div className="text-xs text-slate-500">Raw event and assignment data</div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">90 days</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Aggregated Results</div>
              <div className="text-xs text-slate-500">Experiment statistics and results</div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Forever</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Audit Log</div>
              <div className="text-xs text-slate-500">User actions and changes</div>
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">1 year</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Data retention settings will be configurable in a future release.
        </p>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-danger-200 dark:border-danger-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-danger-50 dark:bg-danger-950 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-danger-600">Danger Zone</h2>
            <p className="text-xs text-slate-500">Irreversible actions</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border border-danger-200 dark:border-danger-800 rounded-lg">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Regenerate API Key</div>
            <div className="text-xs text-slate-500">This will invalidate the current key</div>
          </div>
          <button className="btn-danger text-sm">
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
