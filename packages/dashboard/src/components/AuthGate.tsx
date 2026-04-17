import { Link } from 'react-router-dom';
import { Key, ExternalLink } from 'lucide-react';

/**
 * Rendered when a user hits a gated route (Dashboard / Experiments / etc.)
 * without an API key in localStorage. Gives a clear path forward instead of
 * silently falling through to the marketing landing.
 */
export default function AuthGate({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center mb-4">
        <Key className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Unlock {feature}
      </h1>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
        You need an API key to use the dashboard.
        Copy the public demo key below to try it right now — or self-host to get your own key and private data.
      </p>

      <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6 text-left">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
          Public demo key (shared, rate-limited)
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-slate-900 dark:text-white bg-white dark:bg-black px-3 py-2 rounded border border-slate-200 dark:border-slate-800 select-all">
            demo-public-key
          </code>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          This is a shared demo account. Good for trying the dashboard; don't use it for real customer data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/settings" className="btn-primary">
          Paste the key in Settings
        </Link>
        <a
          href="https://github.com/balabommablock-cpu/agdambagdam#quick-start"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-2"
        >
          Self-Host Guide <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
