import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/Layout';
import Dashboard from '@/pages/Dashboard';
import SharedStatus from '@/pages/SharedStatus';
import CrossingDetail from '@/pages/CrossingDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crossing/:slug" element={<CrossingDetail />} />
          <Route path="/status/:id" element={<SharedStatus />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
