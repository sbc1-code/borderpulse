import React from 'react';
import AdsterraBanner from './AdsterraBanner';
import GoogleAdBanner from './GoogleAdBanner';
import { GOOGLE_ADS_ENABLED } from '@/lib/googleAds';

export default function DashboardAd(props) {
  return GOOGLE_ADS_ENABLED ? <GoogleAdBanner {...props} /> : <AdsterraBanner {...props} />;
}
