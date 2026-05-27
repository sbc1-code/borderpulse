import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Dashboard from '@/pages/Dashboard';
import Alerts from '@/pages/Alerts';

// Most leaf routes are code-split — no reason to ship Blog/Api/Embed/BestTime
// JS for someone who lands on the dashboard. The dashboard is the hot path,
// and Alerts stays in the shell because it is a small, launch-critical route.
const SharedStatus = lazy(() => import('@/pages/SharedStatus'));
const CrossingDetail = lazy(() => import('@/pages/CrossingDetail'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const Embed = lazy(() => import('@/pages/Embed'));
const Api = lazy(() => import('@/pages/Api'));
const BestTime = lazy(() => import('@/pages/BestTime'));
const BestTimeIndex = lazy(() =>
  import('@/pages/BestTime').then((m) => ({ default: m.BestTimeIndex })),
);
const About = lazy(() => import('@/pages/About'));
const Methodology = lazy(() => import('@/pages/Methodology'));
const Compare = lazy(() => import('@/pages/Compare'));
const WalkOrDrive = lazy(() => import('@/pages/WalkOrDrive'));
const Guide = lazy(() => import('@/pages/Guide'));
const Predictions = lazy(() => import('@/pages/Predictions'));

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
          <Route path="/about" element={<About />} />
          <Route path="/methodology" element={<Methodology lang="en" />} />
          <Route path="/metodologia" element={<Methodology lang="es" />} />
          <Route path="/compare/:pair" element={<Compare />} />
          <Route path="/walk-or-drive/:slug" element={<WalkOrDrive />} />
          <Route path="/guide/:slug" element={<Guide />} />
          <Route path="/predictions" element={<Predictions />} />
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
