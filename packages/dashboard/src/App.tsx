import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExperimentList from './pages/ExperimentList';
import ExperimentCreate from './pages/ExperimentCreate';
import ExperimentDetail from './pages/ExperimentDetail';
import FeatureFlags from './pages/FeatureFlags';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';

export default function App() {
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
