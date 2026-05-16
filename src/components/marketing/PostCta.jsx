import React from 'react';
import EmailCapture from './EmailCapture';

// End-of-post CTA — always the newsletter. Earlier iteration routed
// ops/freight posts to a /services pitch; that page was pulled before any
// monetization went live. Single CTA target keeps the post tail clean.
export default function PostCta({ frontmatter, language = 'en' }) {
  const lang = (frontmatter?.lang === 'es' ? 'es' : language) || 'en';
  return (
    <aside
      className="my-8"
      aria-label={lang === 'en' ? 'Newsletter signup' : 'Suscripción al boletín'}
    >
      <EmailCapture variant="inline" source={`post:${frontmatter?.slug || 'unknown'}`} language={lang} />
    </aside>
  );
}
