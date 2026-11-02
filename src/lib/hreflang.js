const BASE = 'https://borderpulse.com';
export const HOME_URL = `${BASE}/`;
export const HOME_ES_URL = `${BASE}/es/`;

// Shared crossing URLs stay one address. The home page is the exception:
// /es/ is the indexable Spanish entry, and the in-page toggle does not
// replace it.
export function homeHreflangs() {
  return [
    { lang: 'en', href: HOME_URL },
    { lang: 'es', href: HOME_ES_URL },
    { lang: 'x-default', href: HOME_URL },
  ];
}

export function pageHreflangs(canonical, lang = 'en') {
  if (canonical === HOME_URL || canonical === HOME_ES_URL) return homeHreflangs();
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
