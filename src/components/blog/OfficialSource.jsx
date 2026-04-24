import { ExternalLink, Shield } from 'lucide-react';
import { useLang } from '@/lib/LangContext';

const STRINGS = {
  en: {
    label: 'Official source',
    readOn: 'Read on',
  },
  es: {
    label: 'Fuente oficial',
    readOn: 'Leer en',
  },
};

export default function OfficialSource({ agency, url, children }) {
  const lang = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  return (
    <aside
      role="note"
      className="not-prose my-6 border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-500 rounded-r-md p-4"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
        <Shield className="w-3.5 h-3.5" />
        {t.label}: {agency}
      </div>
      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
        {children}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
      >
        {t.readOn} {new URL(url).hostname}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </aside>
  );
}
