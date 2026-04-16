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
        Sign in to view {feature}
      </h1>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
        Agdam Bagdam is self-hosted. Run the platform locally, grab your API key, and paste it
        into Settings to unlock the dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/settings" className="btn-primary">
          Paste API Key
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
      <p className="text-xs text-slate-400 mt-6">
        No hosted signup yet —{' '}
        <a
          className="underline hover:text-slate-600"
          href="https://github.com/balabommablock-cpu/agdambagdam/issues/1"
          target="_blank"
          rel="noopener noreferrer"
        >
          track progress
        </a>
        .
      </p>
    </div>
  );
}
