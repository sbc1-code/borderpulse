import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { pillarLabel } from '@/lib/blog-runtime';

function formatDate(iso, lang) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return dt.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function RelatedPosts({ posts, language = 'en' }) {
  if (!posts || posts.length === 0) return null;

  return (
    <section
      className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800"
      aria-label={language === 'en' ? 'Related posts' : 'Posts relacionados'}
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
        <BookOpen className="h-4 w-4 text-emerald-600" />
        {language === 'en' ? 'Keep reading' : 'Sigue leyendo'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {posts.map((p) => {
          const fm = p.frontmatter || {};
          const lang = fm.lang || 'en';
          return (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {pillarLabel(fm.pillar, lang)}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-emerald-300">
                {fm.title}
              </h3>
              {fm.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                  {fm.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-slate-500 dark:text-slate-500">
                <span>{formatDate(fm.date, lang)}</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
