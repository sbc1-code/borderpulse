import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { listAlerts, removeAlert, setAlertEnabled } from '@/components/utils/notifyService';
import { dataService } from '@/components/utils/dataService';
import { resetPageMeta, updatePageMeta } from '@/lib/seo';

const STRINGS = {
  en: {
    title: 'Alerts',
    subtitle: 'Manage your wait-time alerts. Notifications fire when a crossing crosses your threshold.',
    empty: 'No alerts yet. Open any crossing and tap Notify Me to set one up.',
    backToDashboard: 'Back to dashboard',
    crossing: 'Crossing',
    threshold: 'Threshold',
    direction: 'Direction',
    enabled: 'Enabled',
    delete: 'Delete',
    paused: 'Paused',
    active: 'Active',
    below: 'below',
    above: 'above',
    northbound: 'To USA',
    southbound: 'To Mexico',
    minutes: 'min',
    unknown: 'Unknown crossing',
  },
  es: {
    title: 'Alertas',
    subtitle: 'Gestiona tus alertas de tiempo de espera. Las notificaciones se envían cuando un cruce cruza tu umbral.',
    empty: 'Aún no hay alertas. Abre cualquier cruce y toca Notificar para configurar una.',
    backToDashboard: 'Volver al panel',
    crossing: 'Cruce',
    threshold: 'Umbral',
    direction: 'Dirección',
    enabled: 'Activa',
    delete: 'Eliminar',
    paused: 'Pausada',
    active: 'Activa',
    below: 'menor que',
    above: 'mayor que',
    northbound: 'Hacia EE.UU.',
    southbound: 'Hacia México',
    minutes: 'min',
    unknown: 'Cruce desconocido',
  },
};

export default function Alerts() {
  const [language, setLanguage] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('borderPulse_language') || 'en' : 'en'
  );
  const [alerts, setAlerts] = useState(() => listAlerts());
  const [crossingsByPort, setCrossingsByPort] = useState({});

  // Keep language in sync with the rest of the app (Layout writes to localStorage).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_language') setLanguage(e.newValue || 'en');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Pull crossing names so we can render them in each row.
  useEffect(() => {
    let mounted = true;
    dataService
      .getBorderData()
      .then((data) => {
        if (!mounted || !data?.crossings) return;
        const map = {};
        for (const c of data.crossings) {
          if (c.port_number) map[String(c.port_number)] = c;
        }
        setCrossingsByPort(map);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // SEO + tab title.
  useEffect(() => {
    const t = STRINGS[language] || STRINGS.en;
    const title = `${t.title} | Border Pulse`;
    updatePageMeta({
      title,
      description: t.subtitle,
      ogTitle: title,
      ogDescription: t.subtitle,
      canonical: 'https://borderpulse.com/alerts',
    });
    return () => resetPageMeta();
  }, [language]);

  const t = STRINGS[language] || STRINGS.en;

  const refresh = () => setAlerts(listAlerts());

  const handleToggle = (id, next) => {
    setAlertEnabled(id, next);
    refresh();
  };

  const handleDelete = (id) => {
    removeAlert(id);
    refresh();
  };

  const sorted = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const an = crossingsByPort[a.portNumber]?.name || '';
        const bn = crossingsByPort[b.portNumber]?.name || '';
        return an.localeCompare(bn);
      }),
    [alerts, crossingsByPort]
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[860px] mx-auto">
      <header className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.backToDashboard}
        </Link>
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-emerald-600" />
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t.title}
          </h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-prose">
          {t.subtitle}
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-8 text-center">
          <BellOff className="w-8 h-8 mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">
            {STRINGS.en.empty}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {STRINGS.es.empty}
          </p>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/">{t.backToDashboard}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((alert) => {
            const crossing = crossingsByPort[alert.portNumber];
            const name = crossing?.name || t.unknown;
            const slug = crossing?.slug;
            const directionLabel =
              alert.direction === 'southbound' ? t.southbound : t.northbound;
            const conditionLabel =
              alert.kind === 'above' ? t.above : t.below;
            return (
              <li
                key={alert.id}
                className="rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {slug ? (
                      <Link
                        to={`/crossing/${slug}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:underline truncate"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {name}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        alert.active
                          ? 'text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                          : 'text-[10px] bg-slate-50 text-slate-600 border-slate-200 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700'
                      }
                    >
                      {alert.active ? t.active : t.paused}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {directionLabel} ·{' '}
                    <span className="font-medium tabular-nums">
                      {conditionLabel} {alert.threshold} {t.minutes}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={alert.active}
                    onCheckedChange={(v) => handleToggle(alert.id, v)}
                    aria-label={t.enabled}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(alert.id)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    aria-label={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
