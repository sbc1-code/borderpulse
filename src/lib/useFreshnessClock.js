import { useEffect, useState } from 'react';

// Freshness changes even when the source data does. A shared minute clock lets
// each page reclassify the same snapshot without pretending a reload happened,
// and avoids an interval per crossing card.
export function useFreshnessClock(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return now;
}
