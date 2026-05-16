import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import OfficialSource from './OfficialSource';
import BestTimeChart from './BestTimeChart';
import EmailCapture from '../marketing/EmailCapture';
import { LangContext } from '@/lib/LangContext';

function CrossingLink({ slug, children }) {
  return (
    <Link to={`/crossing/${slug}`} className="text-emerald-700 dark:text-emerald-400 underline">
      {children}
    </Link>
  );
}

// First-H2 detector: the first <h2> the MDX renders gets followed by an inline
// EmailCapture. Implemented as a module-level WeakMap keyed by the post's
// frontmatter slug (set via setActivePost from BlogPost). React doesn't expose
// "ordinal" position in MDX rendering, so we lean on a render-side counter.
let renderState = null;
export function setActivePost(slug, lang) {
  renderState = { slug, lang, seenH2: false };
}
export function resetActivePost() {
  renderState = null;
}

function H2WithCapture(props) {
  const ctx = useContext(LangContext);
  const lang = renderState?.lang || ctx || 'en';
  let injectCapture = false;
  if (renderState && !renderState.seenH2) {
    renderState.seenH2 = true;
    injectCapture = false; // inject AFTER this H2 by rendering capture below
    return (
      <>
        <h2 {...props} />
        <aside
          className="not-prose my-6"
          aria-label={lang === 'en' ? 'Newsletter signup' : 'Suscripción al boletín'}
        >
          <EmailCapture
            variant="inline"
            source={`post-inline:${renderState.slug || 'unknown'}`}
            language={lang}
          />
        </aside>
      </>
    );
  }
  return <h2 {...props} />;
}

export const mdxComponents = {
  OfficialSource,
  BestTimeChart,
  CrossingLink,
  h2: H2WithCapture,
  a: (props) => {
    const isExternal = /^https?:\/\//.test(props.href || '');
    if (isExternal) {
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
    return <a {...props} />;
  },
};
