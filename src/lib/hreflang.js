const BASE = 'https://borderpulse.com';

// Only these routes have separately crawlable translated pages. A language
// preference on a shared URL does not create a Spanish alternate URL.
export function pageHreflangs(canonical, lang = 'en') {
  for (const [en, es] of [['methodology', 'metodologia'], ['privacy', 'privacidad']]) {
    const enUrl = `${BASE}/${en}/`;
    const esUrl = `${BASE}/${es}/`;
    if (canonical === enUrl || canonical === esUrl) {
      return [{ lang: 'en', href: enUrl }, { lang: 'es', href: esUrl }, { lang: 'x-default', href: enUrl }];
    }
  }
  return [{ lang, href: canonical }, { lang: 'x-default', href: canonical }];
}

export function blogHreflangs(post, posts) {
  const canonical = `${BASE}/blog/${post.slug}/`;
  if (post.translationKey) {
    const en = posts.find((p) => p.translationKey === post.translationKey && p.lang === 'en');
    const es = posts.find((p) => p.translationKey === post.translationKey && p.lang === 'es');
    if (en && es) {
      return [
        { lang: 'en', href: `${BASE}/blog/${en.slug}/` },
        { lang: 'es', href: `${BASE}/blog/${es.slug}/` },
        { lang: 'x-default', href: `${BASE}/blog/${en.slug}/` },
      ];
    }
  }
  return pageHreflangs(canonical, post.lang || 'en');
}
