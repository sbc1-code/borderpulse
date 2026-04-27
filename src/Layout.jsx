import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, Menu, X, Moon, Sun, Bell, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BorderPulseLogo from '@/components/BorderPulseLogo';

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
    document.documentElement.lang = language;
  }, [language]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('borderPulse_theme', next);
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('borderPulse_language', lang);
    window.dispatchEvent(new StorageEvent('storage', { key: 'borderPulse_language', newValue: lang }));
  };

  const nav = [
    {
      name: language === 'en' ? 'Dashboard' : 'Panel',
      href: '/',
      icon: BarChart3,
      current: location.pathname === '/',
    },
    {
      name: 'Blog',
      href: '/blog',
      icon: BookOpen,
      current: location.pathname.startsWith('/blog'),
    },
    {
      name: language === 'en' ? 'Alerts' : 'Alertas',
      href: '/alerts',
      icon: Bell,
      current: location.pathname.startsWith('/alerts'),
    },
    {
      name: 'API',
      href: '/api',
      icon: Code,
      current: location.pathname.startsWith('/api'),
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
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        {language === 'en' ? 'Skip to content' : 'Ir al contenido'}
      </a>
      {/* Mobile header */}
      <div className={`lg:hidden ${isDark ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b sticky top-0 z-40`}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BorderPulseLogo size={32} />
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Border Pulse
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <div className={`flex items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border rounded-lg p-0.5`}>
              <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('en')} className="text-xs px-2 h-7" aria-label="Switch to English">EN</Button>
              <Button variant={language === 'es' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('es')} className="text-xs px-2 h-7" aria-label="Cambiar a español">ES</Button>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen((v) => !v)} className="rounded-full" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
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
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${item.current ? isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-800' : isDark ? 'text-slate-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="lg:flex min-h-screen">
        <aside className={`hidden lg:flex w-60 shrink-0 ${sidebarClasses} backdrop-blur-md border-r flex-col`}>
          <div className={`p-5 border-b ${isDark ? 'border-gray-800' : 'border-slate-200'}`}>
            <Link to="/" className="flex items-center gap-3">
              <BorderPulseLogo size={40} />
              <div>
                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Border Pulse
                </h1>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'en' ? 'Border wait times' : 'Tiempos de espera'}
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
                  ? isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-800'
                  : isDark ? 'text-slate-300 hover:bg-gray-800/60' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className={`p-3 border-t ${isDark ? 'border-gray-800' : 'border-slate-200'} flex items-center justify-between`}>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
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
        <main id="main-content" className="flex-1 overflow-auto">{children}</main>
      </div>

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
