import { useContext } from 'react';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import { LangContext } from '@/lib/LangContext';

// Mid-article ad for long guides. A post that uses it sets `inArticleAd: true`
// in frontmatter so BlogPost skips its end-of-post slot: one container per page.
export default function InArticleAd() {
  const lang = useContext(LangContext) || 'en';
  return (
    <div className="not-prose">
      <AdsterraBanner label={lang === 'es' ? 'Publicidad' : 'Advertisement'} language={lang} />
    </div>
  );
}
