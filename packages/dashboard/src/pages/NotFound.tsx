import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Compass className="w-6 h-6 text-slate-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page not found</h1>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
        The page you're looking for doesn't exist (or hasn't been built yet).
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/" className="btn-primary">Go Home</Link>
        <Link to="/docs" className="btn-secondary">Read the Docs</Link>
      </div>
    </div>
  );
}
