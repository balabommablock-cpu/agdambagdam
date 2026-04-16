import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGate from './components/AuthGate';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Docs from './pages/Docs';
import ExperimentList from './pages/ExperimentList';
import ExperimentCreate from './pages/ExperimentCreate';
import ExperimentDetail from './pages/ExperimentDetail';
import FeatureFlags from './pages/FeatureFlags';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function isLoggedIn(): boolean {
  return !!localStorage.getItem('abacus_api_key');
}

/** Renders children when logged in; shows AuthGate otherwise. Settings is always reachable
 *  so a new user can paste their API key without being bounced back to Landing. */
function Protected({ feature, children }: { feature: string; children: React.ReactNode }) {
  if (!isLoggedIn()) return <AuthGate feature={feature} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing landing. Logged-in users get the app shell at /. */}
      <Route path="/" element={isLoggedIn() ? <Layout><Dashboard /></Layout> : <Landing />} />

      {/* Docs are public. */}
      <Route path="/docs" element={<Layout><Docs /></Layout>} />

      {/* Settings is always reachable so users can paste in their key. */}
      <Route path="/settings" element={<Layout><Settings /></Layout>} />

      {/* Gated routes render Layout + AuthGate when no key, real page when keyed. */}
      <Route
        path="/experiments"
        element={<Layout><Protected feature="Experiments"><ExperimentList /></Protected></Layout>}
      />
      <Route
        path="/experiments/new"
        element={<Layout><Protected feature="Experiments"><ExperimentCreate /></Protected></Layout>}
      />
      <Route
        path="/experiments/:id"
        element={<Layout><Protected feature="Experiments"><ExperimentDetail /></Protected></Layout>}
      />
      <Route
        path="/flags"
        element={<Layout><Protected feature="Feature Flags"><FeatureFlags /></Protected></Layout>}
      />
      <Route
        path="/flags/new"
        element={<Layout><Protected feature="Feature Flags"><FeatureFlags /></Protected></Layout>}
      />
      <Route
        path="/metrics"
        element={<Layout><Protected feature="Metrics"><Metrics /></Protected></Layout>}
      />

      {/* Legacy /app/* paths — redirect to canonical root-level routes. */}
      <Route path="/app" element={<Navigate to="/" replace />} />
      <Route path="/app/*" element={<Navigate to="/" replace />} />

      {/* Real 404, not a stealthy landing-page fallback. */}
      <Route path="*" element={<Layout><NotFound /></Layout>} />
    </Routes>
  );
}
