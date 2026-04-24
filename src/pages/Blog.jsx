import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listPosts, pillarLabel } from '@/lib/blog-runtime';

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function Blog() {
  const posts = listPosts({ lang: 'en' });

  useEffect(() => {
    document.title = 'Border Pulse Blog | Crossing data, guides, and program explainers';
  }, []);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[860px] mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
          Border Pulse Blog
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-prose">
          Data-driven guides to crossing the U.S.-Mexico border. Hour by hour patterns, neutral
          program explainers, and trip planning for the people who actually cross. Every program
          rule links to the official source.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-slate-500">No posts yet.</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((p) => {
            const fm = p.frontmatter;
            return (
              <li
                key={p.slug}
                className="border-b border-slate-200 dark:border-gray-800 pb-6 last:border-b-0"
              >
                <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
                  {pillarLabel(fm.pillar)}
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                  <Link to={`/blog/${p.slug}`} className="hover:underline">
                    {fm.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{fm.description}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(fm.date)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
