import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

// Preserve old bookmarks within the shared crossing experience. This region
// is a filter, never a second map identity or a separate navigation item.
export default function CorridorRedirect() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set('area', 'san-diego-tijuana');
  next.delete('display');
  return <Navigate to={`/?${next}`} replace />;
}
