import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MDXProvider } from '@mdx-js/react';
import { Button } from '@/components/ui/button';
import { getPost, getAuthor, pillarLabel } from '@/lib/blog-runtime';
import { mdxComponents } from '@/components/blog/MdxComponents';

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPost(slug);

  useEffect(() => {
    if (post) document.title = `${post.frontmatter.title} | Border Pulse`;
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;
  const fm = post.frontmatter;
  const author = getAuthor(fm.author);
  const Body = post.Component;

  return (
    <article className="p-3 sm:p-4 lg:p-6 max-w-[760px] mx-auto">
      <div className="mb-4">
        <Link to="/blog">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">All posts</span>
          </Button>
        </Link>
      </div>

      <header className="mb-6">
        <div className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
          {pillarLabel(fm.pillar)}
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
          {fm.title}
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{fm.description}</p>
        <p className="mt-4 text-xs text-slate-500">
          By {author.name} · {formatDate(fm.date)}
          {fm.updated && fm.updated !== fm.date ? ` · Updated ${formatDate(fm.updated)}` : ''}
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:underline">
        <MDXProvider components={mdxComponents}>
          <Body />
        </MDXProvider>
      </div>

      <footer className="mt-10 border-t border-slate-200 dark:border-gray-800 pt-4 text-xs text-slate-500">
        Border Pulse publishes data and links to official sources. Always verify program rules at{' '}
        <a
          href="https://www.cbp.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          cbp.gov
        </a>{' '}
        and{' '}
        <a
          href="https://travel.state.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          travel.state.gov
        </a>{' '}
        before you travel.
      </footer>
    </article>
  );
}
