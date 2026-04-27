import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Dashboard from '@/pages/Dashboard';

// Leaf routes are code-split — no reason to ship Blog/Alerts/Api/Embed/BestTime
// JS for someone who lands on the dashboard. The dashboard is the hot path,
// everything else loads on demand.
const SharedStatus = lazy(() => import('@/pages/SharedStatus'));
const CrossingDetail = lazy(() => import('@/pages/CrossingDetail'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const Alerts = lazy(() => import('@/pages/Alerts'));
const Embed = lazy(() => import('@/pages/Embed'));
const Api = lazy(() => import('@/pages/Api'));
const BestTime = lazy(() => import('@/pages/BestTime'));
const BestTimeIndex = lazy(() =>
  import('@/pages/BestTime').then((m) => ({ default: m.BestTimeIndex })),
);

function RouteFallback() {
  return (
    <div className="p-6 max-w-[1100px] mx-auto text-sm text-slate-500 dark:text-slate-400">
      Loading…
    </div>
  );
}

function LayoutRoutes() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crossing/:slug" element={<CrossingDetail />} />
          <Route path="/best-time" element={<BestTimeIndex />} />
          <Route path="/best-time/:slug" element={<BestTime />} />
          <Route path="/status/:id" element={<SharedStatus />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/api" element={<Api />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/embed/:slug" element={<Embed />} />
            <Route path="*" element={<LayoutRoutes />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
