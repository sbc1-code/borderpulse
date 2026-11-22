import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import { LangContext } from '@/lib/LangContext';
import { sponsorForGuide } from '@/lib/sponsors';

// Mid-article ad for long guides. A post that uses it sets `inArticleAd: true`
// in frontmatter so BlogPost skips its end-of-post slot: one container per page.
// One commercial spot per page: a guide with a sponsor shows no network ad.
export default function InArticleAd() {
  const lang = useContext(LangContext) || 'en';
  const { slug } = useParams();
  if (sponsorForGuide(slug)) return null;
  return (
    <div className="not-prose">
      <AdsterraBanner label={lang === 'es' ? 'Publicidad' : 'Advertisement'} language={lang} />
    </div>
  );
}
