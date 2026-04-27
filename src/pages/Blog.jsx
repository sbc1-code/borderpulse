import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPosts, pillarLabel } from '@/lib/blog-runtime';
import { resetPageMeta, updatePageMeta } from '@/lib/seo';

const STRINGS = {
  en: {
    title: 'Border Pulse Blog',
    subtitle:
      'Data-driven guides to crossing the U.S.-Mexico border. Hour by hour patterns, neutral program explainers, and trip planning for the people who actually cross. Every program rule links to the official source.',
    none: 'No posts yet.',
    all: 'All',
  },
  es: {
    title: 'Blog de Border Pulse',
    subtitle:
      'Guías basadas en datos para cruzar la frontera EE.UU.-México. Patrones hora por hora, explicaciones neutrales de programas y planeación de viaje para quienes cruzan a diario. Cada regla enlaza a su fuente oficial.',
    none: 'Aún no hay posts.',
    all: 'Todos',
  },
};

function formatDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return dt.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function Blog() {
  const [filter, setFilter] = useState('all');
  const en = listPosts({ lang: 'en' });
  const es = listPosts({ lang: 'es' });
  const all = [...en, ...es].sort((a, b) =>
    (b.frontmatter.date || '').localeCompare(a.frontmatter.date || ''),
  );
  const posts = filter === 'en' ? en : filter === 'es' ? es : all;

  useEffect(() => {
    const title = 'Border Pulse Blog | Crossing data, guides, and program explainers';
    const description = 'Data-driven guides to crossing the U.S.-Mexico border. Hour by hour patterns, neutral program explainers, and trip planning. Every program rule links to the official source.';
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: 'https://borderpulse.com/blog',
      canonical: 'https://borderpulse.com/blog',
    });
    return () => resetPageMeta();
  }, []);

  const tabClass = (active) =>
    `px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
      active
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[860px] mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
          Border Pulse Blog
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-prose">
          {filter === 'es' ? STRINGS.es.subtitle : STRINGS.en.subtitle}
        </p>
      </header>

      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => setFilter('all')} className={tabClass(filter === 'all')}>
          {STRINGS.en.all} ({all.length})
        </button>
        <button onClick={() => setFilter('en')} className={tabClass(filter === 'en')}>
          English ({en.length})
        </button>
        <button onClick={() => setFilter('es')} className={tabClass(filter === 'es')}>
          Español ({es.length})
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-slate-500">
          {filter === 'es' ? STRINGS.es.none : STRINGS.en.none}
        </p>
      ) : (
        <ul className="space-y-6">
          {posts.map((p) => {
            const fm = p.frontmatter;
            const lang = fm.lang || 'en';
            return (
              <li
                key={p.slug}
                className="border-b border-slate-200 dark:border-gray-800 pb-6 last:border-b-0"
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold">
                  <span className="text-emerald-700 dark:text-emerald-400">{pillarLabel(fm.pillar, lang)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 text-[10px] tracking-normal">
                    {lang.toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                  <Link to={`/blog/${p.slug}`} className="hover:underline" lang={lang}>
                    {fm.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" lang={lang}>{fm.description}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(fm.date, lang)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
