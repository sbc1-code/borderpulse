import React, { useEffect, useState } from 'react';
import BetaBanner from '@/components/ui/BetaBanner';

export default function Layout({ children }) {
  const [language, setLanguage] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('borderPulse_language') || 'en' : 'en'
  );

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_language') setLanguage(e.newValue || 'en');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const titles = {
      en: 'Border Pulse | Real-Time US-Mexico Border Wait Times',
      es: 'Border Pulse | Tiempos de Espera Frontera EE.UU.-México en Tiempo Real',
    };
    document.title = titles[language] || titles.en;
  }, [language]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      <BetaBanner language={language} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <a
              href="https://sbc1-code.github.io/portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span className="font-bold">SB</span>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#8a9a7b' }}
              />
            </a>
            <span>·</span>
            <span>
              {language === 'en'
                ? 'Data: U.S. Customs and Border Protection'
                : 'Datos: Aduanas y Protección Fronteriza EE.UU.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Border Pulse</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
