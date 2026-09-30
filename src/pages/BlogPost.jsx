import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Copy, MessageCircle } from 'lucide-react';
import { MDXProvider } from '@mdx-js/react';
import { Button } from '@/components/ui/button';
import { getPost, getAuthor, pillarLabel, listPosts } from '@/lib/blog-runtime';
import { mdxComponents } from '@/components/blog/MdxComponents';
import { LangContext } from '@/lib/LangContext';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { track } from '@/lib/analytics';

const STRINGS = {
  en: {
    allPosts: 'All posts',
    by: 'By',
    updated: 'Updated',
    footer: 'Border Pulse publishes data and links to official sources. Always verify program rules at',
    and: 'and',
    beforeTravel: 'before you travel.',
    alsoIn: 'Also available in',
    crossingSoon: 'Crossing soon?',
    nextStep: 'Check the latest official northbound wait report, then send this guide to someone who needs it.',
    currentWaits: 'Current wait times',
    copyLink: 'Copy guide link',
    copied: 'Guide link copied.',
    copyFailed: 'Copy failed. You can share this page from your browser.',
  },
  es: {
    allPosts: 'Todos los posts',
    by: 'Por',
    updated: 'Actualizado',
    footer: 'Border Pulse publica datos y enlaces a fuentes oficiales. Siempre verifica las reglas en',
    and: 'y',
    beforeTravel: 'antes de viajar.',
    alsoIn: 'Disponible en',
    crossingSoon: '¿Cruzarás pronto?',
    nextStep: 'Consulta el reporte oficial más reciente hacia EE. UU. y comparte esta guía con quien la necesite.',
    currentWaits: 'Tiempos de espera actuales',
    copyLink: 'Copiar enlace de la guía',
    copied: 'Enlace de la guía copiado.',
    copyFailed: 'No se pudo copiar. Puedes compartir esta página desde tu navegador.',
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
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => setCopyStatus(''), [slug]);

  useEffect(() => {
    if (!post) return;
    const fm = post.frontmatter;
    const title = `${fm.title} | Border Pulse`;
    const desc = fm.description || fm.title;
    const url = `https://borderpulse.com/blog/${slug}/`;
    const imagePath = fm.ogImage || fm.hero;
    const ogImg = imagePath ? `https://borderpulse.com${imagePath}` : undefined;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: url, ogImage: ogImg, canonical: url, lang: fm.lang || 'en' });
    return () => resetPageMeta();
  }, [post, slug]);

  if (!post) return <Navigate to="/blog/" replace />;
  const fm = post.frontmatter;
  const lang = fm.lang || 'en';
  const t = STRINGS[lang] || STRINGS.en;
  const author = getAuthor(fm.author);
  const Body = post.Component;

  // Find translation twin
  const allPosts = [...listPosts({ lang: 'en' }), ...listPosts({ lang: 'es' })];
  const twin = findTwin(post, allPosts);
  const twinLangLabel = twin?.frontmatter.lang === 'es' ? 'Español' : 'English';
  const guideUrl = `https://borderpulse.com/blog/${slug}/`;
  const whatsappUrl = `${guideUrl}?utm_source=whatsapp&utm_medium=share&utm_campaign=guide`;
  const copyUrl = `${guideUrl}?utm_source=copy&utm_medium=share&utm_campaign=guide`;
  const shareText = lang === 'es'
    ? `Lee esta guía de Border Pulse: ${fm.title}`
    : `Read this Border Pulse guide: ${fm.title}`;
  const copyGuideLink = async () => {
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopyStatus(t.copied);
      track('blog-share', { slug, method: 'copy' });
    } catch {
      setCopyStatus(t.copyFailed);
    }
  };

  return (
    <article className="p-3 sm:p-4 lg:p-6 max-w-[760px] mx-auto" lang={lang}>
      <div className="mb-4">
        <Link to="/blog/">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t.allPosts}</span>
          </Button>
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
          <span>{pillarLabel(fm.pillar, lang)}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium tracking-normal">
            {lang.toUpperCase()}
          </span>
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
            <Link to={`/blog/${twin.slug}/`} className="text-emerald-700 dark:text-emerald-400 underline">
              {twinLangLabel}
            </Link>
          </p>
        )}
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-emerald-700 dark:prose-a:text-emerald-400 prose-a:underline">
        <LangContext.Provider value={lang}>
          <MDXProvider components={mdxComponents}>
            <Body />
          </MDXProvider>
        </LangContext.Provider>
      </div>
      <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 sm:p-5" aria-label={t.crossingSoon}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t.crossingSoon}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.nextStep}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/" onClick={() => track('blog-to-waits', { slug })} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            {t.currentWaits}<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${whatsappUrl}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('blog-share', { slug, method: 'whatsapp' })} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
            <MessageCircle aria-hidden="true" className="h-4 w-4" />WhatsApp
          </a>
          <button type="button" onClick={copyGuideLink} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-800">
            <Copy aria-hidden="true" className="h-4 w-4" />{t.copyLink}
          </button>
        </div>
        {copyStatus && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300" role="status">{copyStatus}</p>}
      </section>
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
    </article>
  );
}
