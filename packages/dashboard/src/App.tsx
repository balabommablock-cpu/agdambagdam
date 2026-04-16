import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Docs from './pages/Docs';
import ExperimentList from './pages/ExperimentList';
import ExperimentCreate from './pages/ExperimentCreate';
import ExperimentDetail from './pages/ExperimentDetail';
import FeatureFlags from './pages/FeatureFlags';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';

function isLoggedIn(): boolean {
  return !!localStorage.getItem('abacus_api_key');
}

export default function App() {
  if (!isLoggedIn()) {
    return (
      <Routes>
        <Route path="/app/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/experiments" element={<ExperimentList />} />
              <Route path="/experiments/new" element={<ExperimentCreate />} />
              <Route path="/experiments/:id" element={<ExperimentDetail />} />
              <Route path="/flags" element={<FeatureFlags />} />
              <Route path="/metrics" element={<Metrics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/docs" element={<Docs />} />
            </Routes>
          </Layout>
        } />
        <Route path="/docs" element={<Layout><Docs /></Layout>} />
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/experiments" element={<ExperimentList />} />
        <Route path="/experiments/new" element={<ExperimentCreate />} />
        <Route path="/experiments/:id" element={<ExperimentDetail />} />
        <Route path="/flags" element={<FeatureFlags />} />
        <Route path="/flags/new" element={<FeatureFlags />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
