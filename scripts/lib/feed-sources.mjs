// RSS feed catalog for Mode C news + advisory curation.
//
// Licensing rule: every source is treated as link-out only, regardless of
// public-domain status. Summaries are mechanically truncated to 240 chars
// at extraction time in scripts/fetch-news.mjs. No AI paraphrasing in the
// curation path.
//
// "public_domain: true" is informational only. It does NOT change the editorial
// pattern. CBP, DOS, and US embassy content is public domain per 17 USC 105 but
// we still link out rather than excerpt, for one consistent editorial standard.

export const FEEDS = [
  {
    id: 'cbp-news',
    name: 'CBP Newsroom',
    url: 'https://www.cbp.gov/rss/newsroom/media-releases',
    home: 'https://www.cbp.gov/newsroom',
    category: 'official',
    public_domain: true,
  },
  {
    id: 'dos-mexico',
    name: 'US Department of State, Mexico',
    url: 'https://travel.state.gov/_res/rss/TAsTWs.xml',
    home: 'https://travel.state.gov/en/international-travel/travel-advisories/mexico.html',
    category: 'official',
    public_domain: true,
    mexico_only: true,
  },
  {
    id: 'us-embassy-mx',
    name: 'US Embassy in Mexico security alerts',
    url: 'https://mx.usembassy.gov/category/messages-for-u-s-citizens/feed/',
    home: 'https://mx.usembassy.gov/',
    category: 'official',
    public_domain: true,
  },
  {
    id: 'kpbs-border',
    name: 'KPBS Border and Immigration',
    url: 'https://www.kpbs.org/news/border-immigration.rss',
    home: 'https://www.kpbs.org/news/border-immigration',
    category: 'news',
    public_domain: false,
  },
  {
    id: 'border-report',
    name: 'Border Report',
    url: 'https://www.borderreport.com/feed/',
    home: 'https://www.borderreport.com/',
    category: 'news',
    public_domain: false,
  },
  {
    id: 'el-paso-matters',
    name: 'El Paso Matters',
    url: 'https://elpasomatters.org/feed/',
    home: 'https://elpasomatters.org/',
    category: 'news',
    public_domain: false,
  },
  {
    id: 'texas-tribune-border',
    name: 'Texas Tribune Border',
    url: 'https://www.texastribune.org/feeds/section/border/',
    home: 'https://www.texastribune.org/',
    category: 'news',
    public_domain: false,
  },
  // AZ Central RSS URLs for border/Mexico coverage all return 404 as of 2026-04.
  // Left out pending a working feed; add back when one is confirmed.
];

// Hard cap for summary length. Enforced at extraction time. Do NOT raise this
// without legal review: short extracts from copyrighted feeds are defensible
// fair use; long extracts are not.
export const SUMMARY_MAX_CHARS = 240;
