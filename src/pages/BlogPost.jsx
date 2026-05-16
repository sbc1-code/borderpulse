import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { MDXProvider } from '@mdx-js/react';
import { Button } from '@/components/ui/button';
import { getPost, getAuthor, pillarLabel, listPosts, getRelatedPosts } from '@/lib/blog-runtime';
import { mdxComponents, setActivePost } from '@/components/blog/MdxComponents';
import { LangContext } from '@/lib/LangContext';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import PostCta from '@/components/marketing/PostCta';
import PostToc from '@/components/blog/PostToc';
import RelatedPosts from '@/components/blog/RelatedPosts';

const STRINGS = {
  en: {
    allPosts: 'All posts',
    by: 'By',
    updated: 'Updated',
    footer: 'Border Pulse publishes data and links to official sources. Always verify program rules at',
    and: 'and',
    beforeTravel: 'before you travel.',
    alsoIn: 'Also available in',
    minRead: 'min read',
  },
  es: {
    allPosts: 'Todos los posts',
    by: 'Por',
    updated: 'Actualizado',
    footer: 'Border Pulse publica datos y enlaces a fuentes oficiales. Siempre verifica las reglas en',
    and: 'y',
    beforeTravel: 'antes de viajar.',
    alsoIn: 'Disponible en',
    minRead: 'min de lectura',
  },
};

function formatDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return dt.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function findTwin(post, allPosts) {
  if (!post.frontmatter.translationKey) return null;
  const otherLang = post.frontmatter.lang === 'es' ? 'en' : 'es';
  return allPosts.find(
    (p) =>
      p.frontmatter.translationKey === post.frontmatter.translationKey &&
      p.frontmatter.lang === otherLang,
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPost(slug);

  useEffect(() => {
    if (!post) return;
    const fm = post.frontmatter;
    const title = `${fm.title} | Border Pulse`;
    const desc = fm.description || fm.title;
    const url = `https://borderpulse.com/blog/${slug}`;
    const ogImg = fm.ogImage ? `https://borderpulse.com${fm.ogImage}` : undefined;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: url, ogImage: ogImg, canonical: url });
    return () => resetPageMeta();
  }, [post, slug]);

  if (!post) return <Navigate to="/blog" replace />;
  const fm = post.frontmatter;
  const lang = fm.lang || 'en';
  const t = STRINGS[lang] || STRINGS.en;
  const author = getAuthor(fm.author);
  const Body = post.Component;

  const allPosts = [...listPosts({ lang: 'en' }), ...listPosts({ lang: 'es' })];
  const twin = findTwin(post, allPosts);
  const twinLangLabel = twin?.frontmatter.lang === 'es' ? 'Español' : 'English';

  const related = getRelatedPosts(slug, { limit: 3 });
  const toc = post.toc || [];
  const hasToc = toc.length >= 3;

  return (
    <article className="p-3 sm:p-4 lg:p-6 max-w-[1100px] mx-auto" lang={lang}>
      <div className="mb-4">
        <Link to="/blog">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t.allPosts}</span>
          </Button>
        </Link>
      </div>

      <header className="mb-6 max-w-[760px]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
          <span>{pillarLabel(fm.pillar, lang)}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium tracking-normal">
            {lang.toUpperCase()}
          </span>
          {post.readingTimeMin > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-slate-600 dark:bg-gray-800 dark:text-slate-300"
              title={t.minRead}
            >
              <Clock className="h-3 w-3" />
              {post.readingTimeMin} {t.minRead}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
          {fm.title}
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{fm.description}</p>
        <p className="mt-4 text-xs text-slate-500">
          {t.by} {author.name} · {formatDate(fm.date, lang)}
          {fm.updated && fm.updated !== fm.date ? ` · ${t.updated} ${formatDate(fm.updated, lang)}` : ''}
        </p>
        {twin && (
          <p className="mt-2 text-xs text-slate-500">
            {t.alsoIn}{' '}
            <Link to={`/blog/${twin.slug}`} className="text-emerald-700 dark:text-emerald-400 underline">
              {twinLangLabel}
            </Link>
          </p>
        )}
      </header>

      {/* Two-column on desktop when the post has a TOC: body on the left
          (760px so prose width matches the no-TOC layout), TOC sticky on the
          right. Mobile collapses to single column with the TOC inline above
          the body. */}
      <div className={hasToc ? 'lg:grid lg:grid-cols-[minmax(0,760px),240px] lg:gap-8' : ''}>
        <div className="min-w-0 max-w-[760px]">
          {hasToc && (
            <div className="mb-5 lg:hidden">
              <PostToc items={toc} language={lang} />
            </div>
          )}
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:underline">
            <LangContext.Provider value={lang}>
              <MDXProvider components={mdxComponents}>
                {(() => {
                  // Reset the per-post "have we seen the first H2 yet" flag right
                  // before render so the inline EmailCapture only injects once.
                  setActivePost(slug, lang);
                  return <Body />;
                })()}
              </MDXProvider>
            </LangContext.Provider>
          </div>

          {/* End-of-post CTA — newsletter signup. */}
          <PostCta frontmatter={{ ...fm, slug }} language={lang} />

          {related.length > 0 && <RelatedPosts posts={related} language={lang} />}

          <footer className="mt-10 border-t border-slate-200 dark:border-gray-800 pt-4 text-xs text-slate-500">
            {t.footer}{' '}
            <a
              href="https://www.cbp.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              cbp.gov
            </a>{' '}
            {t.and}{' '}
            <a
              href="https://travel.state.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              travel.state.gov
            </a>{' '}
            {t.beforeTravel}
          </footer>
        </div>

        {hasToc && (
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <PostToc items={toc} language={lang} />
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
