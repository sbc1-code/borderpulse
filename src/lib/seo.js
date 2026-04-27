/**
 * seo.js — lightweight helpers to set <meta> tags from SPA routes.
 * No extra deps; manipulates head directly.
 */

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Update page-level SEO tags. Call from useEffect in each page component.
 * Pass null/undefined for any field to skip it.
 */
export function updatePageMeta({ title, description, ogTitle, ogDescription, ogImage, ogUrl, canonical }) {
  if (title) document.title = title;
  if (description) setMeta('description', description);
  if (ogTitle) setMeta('og:title', ogTitle, 'property');
  if (ogDescription) setMeta('og:description', ogDescription, 'property');
  if (ogImage) setMeta('og:image', ogImage, 'property');
  if (ogUrl) setMeta('og:url', ogUrl, 'property');
  if (canonical) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }
}

/**
 * Reset meta tags to defaults (call on unmount or route change).
 */
export function resetPageMeta() {
  document.title = 'Border Pulse | Real-Time US-Mexico Border Crossing Wait Times';
  setMeta('description', 'Live wait times at US-Mexico border crossings. Official CBP data updated every 15 minutes. Bilingual EN/ES.');
  setMeta('og:title', 'Border Pulse | Real-Time US-Mexico Border Crossing Wait Times', 'property');
  setMeta('og:description', 'Live wait times at US-Mexico border crossings. Official CBP data, updated every 15 minutes. Bilingual EN/ES.', 'property');
  setMeta('og:image', 'https://borderpulse.com/og-card.png', 'property');
  setMeta('og:url', 'https://borderpulse.com', 'property');
  const link = document.querySelector('link[rel="canonical"]');
  if (link) link.setAttribute('href', 'https://borderpulse.com');
}
