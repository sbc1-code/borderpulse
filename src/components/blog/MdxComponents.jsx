import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import OfficialSource from './OfficialSource';
import BestTimeChart from './BestTimeChart';
import EmailCapture from '../marketing/EmailCapture';
import { LangContext } from '@/lib/LangContext';
import { slugifyHeading } from '@/lib/headingSlug';

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

// Best-effort text extraction so we can derive a TOC slug from heading
// children. MDX may give us nested elements (links, code spans, etc.), so we
// walk recursively.
function getTextContent(children) {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getTextContent).join('');
  if (children.props && children.props.children) return getTextContent(children.props.children);
  return '';
}

function H2WithCapture(props) {
  const ctx = useContext(LangContext);
  const lang = renderState?.lang || ctx || 'en';

  // Auto-anchor: emit an `id` so the TOC links can scroll to this heading.
  // If the MDX author already set an id, respect it.
  const text = getTextContent(props.children);
  const id = props.id || (text ? slugifyHeading(text) : undefined);
  const h2 = <h2 {...props} id={id} />;

  if (renderState && !renderState.seenH2) {
    renderState.seenH2 = true;
    return (
      <>
        {h2}
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
  return h2;
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
