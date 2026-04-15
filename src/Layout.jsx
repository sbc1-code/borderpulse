import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Menu, X, Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BetaBanner from '@/components/ui/BetaBanner';

const SB_MARK = (
  <span className="inline-flex items-center gap-1 font-semibold">
    <span>SB</span>
    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#8a9a7b' }} />
  </span>
);

export default function Layout({ children }) {
  const location = useLocation();
  const [language, setLanguage] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('borderPulse_language') || 'en' : 'en'
  );
  const [theme, setTheme] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('borderPulse_theme') || 'light' : 'light'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const applyTheme = useCallback((t) => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, []);

  useEffect(() => { applyTheme(theme); }, [theme, applyTheme]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_language') setLanguage(e.newValue || 'en');
      if (e.key === 'borderPulse_theme') setTheme(e.newValue || 'light');
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

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('borderPulse_theme', next);
  };

  const nav = [
    {
      name: language === 'en' ? 'Dashboard' : 'Panel',
      href: '/',
      icon: BarChart3,
      current: location.pathname === '/',
    },
  ];

  const isDark = theme === 'dark';
  const bgShell = isDark
    ? 'bg-gray-950'
    : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50';
  const sidebarClasses = isDark
    ? 'bg-gray-900/80 border-gray-800'
    : 'bg-white/80 border-slate-200';
  const textClass = isDark ? 'text-slate-100' : 'text-slate-900';

  return (
    <div className={`min-h-screen ${bgShell} ${textClass}`}>
      <BetaBanner language={language} />

      {/* Mobile header */}
      <div className={`lg:hidden ${isDark ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b sticky top-0 z-40`}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'}`}>
              Border Pulse
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} className="rounded-full">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className={`border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'border-slate-200 bg-white'} px-4 py-2 space-y-1`}>
            {nav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${item.current ? 'bg-blue-100 text-blue-700' : isDark ? 'text-slate-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex min-h-screen">
        <aside className={`w-60 shrink-0 ${sidebarClasses} backdrop-blur-md border-r flex flex-col`}>
          <div className={`p-5 border-b ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'}`}>
                  Border Pulse
                </h1>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'en' ? 'Intelligence Dashboard' : 'Panel de Inteligencia'}
                </p>
              </div>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${item.current
                  ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700'
                  : isDark ? 'text-slate-300 hover:bg-gray-800/60' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className={`p-3 border-t ${isDark ? 'border-gray-800' : 'border-slate-200'} flex items-center justify-between`}>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <a
              href="https://sbc1-code.github.io/portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition-colors`}
              title="Built by SB"
            >
              {SB_MARK}
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Mobile content */}
      <div className="lg:hidden">{children}</div>

      {/* Footer (all viewports) */}
      <footer className={`border-t ${isDark ? 'border-gray-800 bg-gray-900/60' : 'border-slate-200 bg-white/60'} backdrop-blur-sm`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <a href="https://sbc1-code.github.io/portfolio/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              {SB_MARK}
            </a>
            <span>·</span>
            <span>
              {language === 'en' ? 'Data: U.S. Customs and Border Protection' : 'Datos: Aduanas y Protección Fronteriza EE.UU.'}
            </span>
          </div>
          <span>© {new Date().getFullYear()} Border Pulse</span>
        </div>
      </footer>
    </div>
  );
}
