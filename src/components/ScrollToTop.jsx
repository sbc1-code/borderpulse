import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// New pages start at the top. Back/forward (POP) keeps the browser's own
// scroll restoration, and links with a #hash let the page scroll to it.
// Only a pathname change counts, so query-only changes (lane, map
// selection) keep their position.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (navigationType === 'POP' || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, navigationType]);

  return null;
}
