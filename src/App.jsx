import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Dashboard from '@/pages/Dashboard';
import SharedStatus from '@/pages/SharedStatus';
import CrossingDetail from '@/pages/CrossingDetail';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crossing/:slug" element={<CrossingDetail />} />
          <Route path="/status/:id" element={<SharedStatus />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
