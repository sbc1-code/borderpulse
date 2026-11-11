import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { LangContext } from '@/lib/LangContext';
import SponsoredCard from '@/components/sponsors/SponsoredCard';
import { sponsorForGuide } from '@/lib/sponsors';

// Places this guide's sponsor (if any) where the article calls for it.
export default function FeaturedSponsor() {
  const lang = useContext(LangContext) || 'en';
  const { slug } = useParams();
  return <SponsoredCard sponsor={sponsorForGuide(slug)} placement={`guide-${slug}`} language={lang} />;
}
