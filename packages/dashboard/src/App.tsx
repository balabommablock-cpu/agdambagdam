import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGate from './components/AuthGate';
import Dashboard from './pages/Dashboard';
import Docs from './pages/Docs';
import ExperimentList from './pages/ExperimentList';
import ExperimentCreate from './pages/ExperimentCreate';
import ExperimentDetail from './pages/ExperimentDetail';
import FeatureFlags from './pages/FeatureFlags';
import Metrics from './pages/Metrics';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function isLoggedIn(): boolean {
  return !!localStorage.getItem('abacus_api_key');
}

/** Renders children when logged in; shows AuthGate otherwise. Settings is always reachable
 *  so a new user can paste their API key without being bounced into a gated loop. */
function Protected({ feature, children }: { feature: string; children: React.ReactNode }) {
  if (!isLoggedIn()) return <AuthGate feature={feature} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/*
        `/` IS the product. Marketing lives at boredfolio.com/agdambagdam,
        not here — we intentionally don't ship a second marketing landing
        from this domain. When the visitor isn't logged in they see the
        AuthGate (with instructions to get a key). Once logged in they see
        the Dashboard overview.
      */}
      <Route
        path="/"
        element={<Layout><Protected feature="Dashboard"><Dashboard /></Protected></Layout>}
      />

      {/* Docs are public. */}
      <Route path="/docs" element={<Layout><Docs /></Layout>} />

      {/* Settings is always reachable so users can paste in their key. */}
      <Route path="/settings" element={<Layout><Settings /></Layout>} />

      {/* 3-step onboarding wizard. Gated because it creates an experiment. */}
      <Route
        path="/onboarding"
        element={<Layout><Protected feature="Onboarding"><Onboarding /></Protected></Layout>}
      />

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
