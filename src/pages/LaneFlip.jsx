import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeToBorderData } from '@/lib/liveDataSubscription';
import { buildSlugMap, crossingForSlug } from '@/lib/slugs';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';
import { fetchLabel, reportTimeLabel } from '@/lib/trustState';
import { walkDriveFreshness } from '@/lib/walkDriveFreshness';
import { getPortTimezone, nowInTz } from '@/components/utils/crossingMeta';
import {
  currentFlips,
  describePair,
  heatLevel,
  laneReport,
  historyFor,
  hourStats,
  laneFlipEntries,
  laneStats,
} from '@/lib/laneFlips';
import {
  archiveCaveat,
  eligibilityNote,
  historyNotice,
  pairClocks,
  baselineLabel,
  checkNote,
  closedSentence,
  detailDescription,
  detailTitle,
  emptyFlips,
  flipsHeading,
  formatHour,
  heatLegend,
  historyLoading,
  historyUnavailable,
  hourDetail,
  indexDescription,
  indexTitle,
  laneLabel,
  methodParagraph,
  methodTitle,
  periodSentence,
  shareText,
  verdictSentence,
} from '@/lib/laneFlipCopy';

const HEAT_CLASS = {
  none: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'none-slower': 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  mixed: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  often: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
};

function pairsFor(crossing, entry) {
  return ['passenger_ready', 'passenger_sentri', 'pedestrian_ready'].map(key => {
    const general = key === 'pedestrian_ready' ? 'pedestrian_standard' : 'passenger_standard';
    const row = describePair(crossing || { lanes: {}, port_status: 'Open' }, { key, general });
    return { ...row, stats: laneStats(entry, key) };
  }).filter(row => row.fast.present || row.stats.paired > 0);
}

const CARD_KEYS = ['passenger_standard', 'passenger_ready', 'passenger_sentri', 'pedestrian_standard', 'pedestrian_ready'];

function WaitCard({ report, language, closed }) {
  const es = language === 'es';
  const minutes = closed ? null : report.minutes;
  return (
    <article className="min-w-0 break-words rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{laneLabel(report.key, language)}</h3>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
        {closed ? (es ? 'Cerrado' : 'Closed') : minutes == null ? (es ? 'Sin reporte' : 'No report') : `${minutes} min`}
      </p>
      {!closed && minutes != null && report.lanesOpen != null && (
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {es ? `${report.lanesOpen} abiertas` : `${report.lanesOpen} open`}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{reportTimeLabel(closed ? null : report.reportTime, language)}</p>
      {report.sourceUpdatedAt && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{es ? 'Fila CBP: ' : 'CBP row: '}{report.sourceUpdatedAt}</p>}
    </article>
  );
}

function HourStrip({ row, hour, language, onHour }) {
  const es = language === 'es';
  const move = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? 23
        : (hour + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + 24) % 24;
    onHour(next);
    document.getElementById(`hour-${row.key}-${next}`)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={es ? `Por hora, ${laneLabel(row.key, language)}` : `By hour, ${laneLabel(row.key, language)}`}
      className="flex gap-1 overflow-x-auto pb-2"
      onKeyDown={move}
    >
      {Array.from({ length: 24 }, (_, value) => {
        const cell = hourStats(row.stats, value);
        const selected = value === hour;
        const level = heatLevel(cell);
        const percent = cell.paired ? `${Math.round((cell.slower / cell.paired) * 100)}%` : '';
        const shortHour = `${(value % 12) || 12}${value >= 12 ? 'p' : 'a'}`;
        return (
          <button
            key={value}
            id={`hour-${row.key}-${value}`}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={cell.paired
              ? `${formatHour(value, language)}, ${cell.slower}/${cell.paired}`
              : `${formatHour(value, language)}, ${es ? 'sin reportes' : 'no reports'}`}
            tabIndex={selected ? 0 : -1}
            data-testid={`hour-${row.key}-${value}`}
            onClick={() => onHour(value)}
            onMouseEnter={() => onHour(value)}
            onFocus={() => onHour(value)}
            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border text-[10px] font-semibold leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${HEAT_CLASS[level]} ${selected ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
          >
            <span>{shortHour}</span>
            <span className="mt-0.5 tabular-nums">{percent || '·'}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function LaneFlip() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const language = usePersistentLanguage();
  const es = language === 'es';
  const [border, setBorder] = useState({ crossings: [], fetchedAt: null, ready: false });
  const [historyDoc, setHistoryDoc] = useState(undefined);
  const [now, setNow] = useState(() => Date.now());
  const [pickedHour, setPickedHour] = useState(null);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => subscribeToBorderData(data => {
    setBorder({ crossings: data.crossings || [], fetchedAt: data.timestamp, ready: true });
    setNow(Date.now());
  }), []);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/lane-flips.json')
      .then(response => (response.ok ? response.json() : null))
      .then(doc => { if (!cancelled) setHistoryDoc(doc); })
      .catch(() => { if (!cancelled) setHistoryDoc(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPickedHour(null);
    setShareStatus('');
  }, [slug, language]);

  const { portToSlug } = useMemo(() => buildSlugMap(border.crossings), [border.crossings]);
  const crossing = slug ? crossingForSlug(slug, border.crossings) : null;
  const entries = useMemo(() => laneFlipEntries(historyDoc), [historyDoc]);
  const history = historyFor(historyDoc, crossing ? portToSlug[crossing.port_number] : slug);
  const canonicalSlug = crossing ? portToSlug[crossing.port_number] : history?.slug || null;
  const displayName = crossing?.name || history?.name || '';
  const freshness = walkDriveFreshness(border.fetchedAt, now);
  const usable = freshness.usable && Boolean(crossing);

  useEffect(() => {
    const title = slug ? detailTitle(displayName || slug, language) : indexTitle(language);
    const description = slug ? detailDescription(displayName || slug, language) : indexDescription(language);
    const path = slug ? `/lane-flip/${canonicalSlug || slug}/` : '/lane-flip/';
    const url = `https://borderpulse.com${path}`;
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: url,
      canonical: url,
    });
    return () => resetPageMeta();
  }, [slug, language, displayName, canonicalSlug]);

  const pairs = useMemo(() => (slug ? pairsFor(crossing, history) : []), [slug, crossing, history]);
  const flips = useMemo(() => currentFlips(border.crossings), [border.crossings]);
  const timezone = history?.timezone || (crossing ? getPortTimezone(crossing) : null);
  const portHour = timezone ? nowInTz(timezone, new Date(now)).hour : 0;
  const hour = pickedHour == null ? portHour : pickedHour;
  const catalog = new Set(entries.map(entry => entry.slug));

  if (border.ready && slug && canonicalSlug && canonicalSlug !== slug) {
    return <Navigate to={`/lane-flip/${canonicalSlug}/`} replace />;
  }
  if (border.ready && historyDoc !== undefined && slug && !crossing && !history) {
    return <Navigate to="/lane-flip/" replace />;
  }

  const copyShare = async (text) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable');
      await navigator.clipboard.writeText(text);
      setShareStatus(es ? 'Texto copiado.' : 'Text copied.');
    } catch {
      setShareStatus(es ? 'Copia el texto desde la tarjeta.' : 'Copy the text from the card.');
    }
  };

  const share = async (text, url) => {
    const shareFn = typeof navigator.share === 'function' ? navigator.share.bind(navigator) : null;
    if (!shareFn) {
      await copyShare(text);
      return;
    }
    try {
      await shareFn({ title: displayName || 'Border Pulse', text, url });
      setShareStatus('');
    } catch (error) {
      if (error?.name !== 'AbortError') await copyShare(text);
    }
  };

  const closed = String(crossing?.port_status || '').toLowerCase() === 'closed';
  const cardKeys = CARD_KEYS.filter(key => crossing?.lanes?.[key] || pairs.some(row => row.key === key || row.general === key));
  const shareUrl = `https://borderpulse.com/lane-flip/${canonicalSlug || slug || ''}/`;
  const shareBody = displayName ? shareText({
    language,
    name: displayName,
    url: shareUrl,
    notes: pairs.filter(row => ['slower', 'faster', 'same', 'closed'].includes(row.state)).map(row => verdictSentence(row, language, usable)),
    rows: cardKeys.map(key => {
      const report = laneReport(crossing, key);
      const hidden = closed || pairs.some(row => row.key === key && row.state === 'no-open');
      return { key, minutes: hidden ? null : report.minutes, reportTime: hidden ? null : report.reportTime };
    }).filter(row => row.minutes != null),
  }) : '';

  return (
    <div className="mx-auto max-w-[1100px] p-3 sm:p-4 lg:p-6">
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 min-h-11 gap-1">
          <Link to={slug ? '/lane-flip/' : '/'}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="text-xs">{slug ? (es ? 'Todos los carriles' : 'All lane watches') : (es ? 'Todos los cruces' : 'All crossings')}</span>
          </Link>
        </Button>
      </div>

      <header className="mb-4">
        <h1 data-testid="lane-flip-heading" className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          {slug
            ? (es ? `Ready y SENTRI frente al carril general en ${displayName || '…'}` : `Lane Flip Watch at ${displayName || '…'}`)
            : (es ? 'Ready y SENTRI frente al carril general' : 'Lane Flip Watch')}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          {es
            ? 'Compara Ready y SENTRI frente al carril general con los valores guardados de CBP. La misma consulta puede incluir relojes de reporte distintos; no implica condiciones actuales ni simultáneas.'
            : 'Compare Ready and SENTRI with general using retained CBP values. One fetch may contain different report clocks; it does not establish current or simultaneous conditions.'}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" data-testid="lane-flip-fetched">
          {border.ready ? fetchLabel(freshness.state, freshness.age, language) : (es ? 'Cargando el reporte…' : 'Loading the report…')}
        </p>
        <p data-testid="lane-flip-check-cbp" className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          {checkNote(language)}{' '}
          <a className="underline underline-offset-2" href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer">
            {es ? 'Tiempos de espera de CBP' : 'CBP border wait times'}
          </a>
        </p>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{eligibilityNote(language)}</p>
        {historyDoc && <div data-testid="lane-flip-coverage" className="mt-2 break-words text-xs text-slate-600 dark:text-slate-300">
          <p>{historyNotice(historyDoc, now, language)}</p>
          <p className="mt-1">{archiveCaveat(language)}</p>
        </div>}
      </header>

      <label className="mb-5 block text-sm font-medium text-slate-800 dark:text-slate-100">
        {es ? 'Cruce' : 'Crossing'}
        <select
          aria-label={es ? 'Cruce' : 'Crossing'}
          data-testid="lane-flip-picker"
          className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          value={canonicalSlug || ''}
          onChange={(event) => navigate(event.target.value ? `/lane-flip/${event.target.value}/` : '/lane-flip/')}
        >
          <option value="">{es ? 'Todos los cruces' : 'All crossings'}</option>
          {entries.map(entry => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}
          {canonicalSlug && !catalog.has(canonicalSlug) && displayName && (
            <option value={canonicalSlug}>{displayName}</option>
          )}
        </select>
      </label>

      {!slug && (
        <>
          <section aria-labelledby="flips-heading" className="mb-6">
            <h2 id="flips-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
              {flipsHeading(language, usable || (border.ready && freshness.usable))}
            </h2>
            {!border.ready ? (
              <p className="mt-2 text-sm text-slate-500">{es ? 'Cargando el reporte…' : 'Loading the report…'}</p>
            ) : flips.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" data-testid="lane-flip-flips">{emptyFlips(language)}</p>
            ) : (
              <ul data-testid="lane-flip-flips" className="mt-3 space-y-2">
                {flips.map(flip => {
                  const dest = flip.crossing.slug;
                  if (!dest) return null;
                  const href = catalog.has(dest) ? `/lane-flip/${dest}/` : `/crossing/${dest}/`;
                  return (
                    <li key={`${dest}-${flip.key}`}>
                      <Link to={href} className="block rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                        <span className="font-semibold">{flip.crossing.name}</span>
                        <span className="mt-1 block">{verdictSentence(flip, language, freshness.usable)}</span>
                        <span className="mt-1 block text-xs">
                          {laneLabel(flip.general, language)} {flip.generalReport.minutes} min · {laneLabel(flip.key, language)} {flip.fast.minutes} min
                          <span className="mt-1 block">{pairClocks(flip, language)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="catalog-heading">
            <h2 id="catalog-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
              {es ? 'Cruces con más de un carril' : 'Crossings with more than one lane'}
            </h2>
            {historyDoc === undefined ? <p className="mt-2 text-sm text-slate-500">{historyLoading(language)}</p> : null}
            {historyDoc === null ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{historyUnavailable(language)}</p> : null}
            <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {entries.map(entry => (
                <li key={entry.slug}>
                  <Link to={`/lane-flip/${entry.slug}/`} className="block min-h-11 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="font-medium text-slate-900 dark:text-white">{entry.name}</span>
                    <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                      {Object.keys(entry.lanes).length
                        ? Object.entries(entry.lanes).map(([key, stats]) => (
                          es
                            ? `${laneLabel(key, language)}: ${stats.slower} de ${stats.paired} más lento`
                            : `${laneLabel(key, language)}: ${stats.slower} of ${stats.paired} slower`
                        )).join(' · ')
                        : (es ? 'Sin consultas comparables en el archivo' : 'No comparable fetches in the archive')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {slug && (
        <>
          {crossing && String(crossing.port_status || '').toLowerCase() === 'closed' && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {closedSentence(language)}
              {crossing.hours ? ` ${es ? 'Horario publicado por CBP:' : 'Posted CBP hours:'} ${crossing.hours}` : ''}
            </p>
          )}
          {!border.ready && <p className="mb-4 text-sm text-slate-500">{es ? 'Cargando el reporte…' : 'Loading the report…'}</p>}
          {border.ready && !crossing && (
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              {es
                ? 'Este cruce no está en el último reporte. Los conteos de abajo, si aparecen, son del archivo conservado.'
                : 'This crossing is not in the latest report. Counts below, when present, describe the retained archive.'}
            </p>
          )}

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cardKeys.map(key => (
              <WaitCard key={key} language={language} closed={closed} report={laneReport(crossing, key)} />
            ))}
          </div>

          <section aria-labelledby="verdict-heading" className="mb-6 space-y-3">
            <h2 id="verdict-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
              {es ? 'Lectura del reporte' : 'What the report says'}
            </h2>
            {pairs.length === 0 && border.ready && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {es
                  ? 'Este cruce no reporta un segundo carril de autos o peatonal Ready para comparar.'
                  : 'This crossing does not report a second passenger lane, or Ready pedestrian, to compare.'}
              </p>
            )}
            {pairs.map(row => (
              <article key={row.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {laneLabel(row.key, language)} {es ? 'contra' : 'against'} {baselineLabel(row.general, language)}
                </h3>
                <p data-testid={`verdict-${row.key}`} data-state={row.state} className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {verdictSentence(row, language, usable)}
                </p>
                <p data-testid={`pair-clocks-${row.key}`} className="mt-1 text-xs text-slate-600 dark:text-slate-300">{pairClocks(row, language)}</p>
                {historyDoc === undefined && <p className="mt-2 text-xs text-slate-500">{historyLoading(language)}</p>}
                {historyDoc === null && <p className="mt-2 text-xs text-slate-500">{historyUnavailable(language)}</p>}
                {historyDoc && (
                  <>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200" data-testid={`period-${row.key}`} data-slower={row.stats.slower} data-paired={row.stats.paired}>
                      {periodSentence(row, row.stats, language)}
                      {row.stats.first_fetch && row.stats.last_fetch && <span className="mt-1 block break-words text-xs">{historyNotice({ window_start: row.stats.first_fetch, window_end: row.stats.last_fetch, snapshot_count: row.stats.paired }, now, language)}</span>}
                    </p>
                    {row.stats.paired > 0 && (
                      <>
                        <HourStrip row={row} hour={hour} language={language} onHour={setPickedHour} />
                        <p data-testid={`hour-detail-${row.key}`} data-hour={hour} data-slower={hourStats(row.stats, hour).slower} data-paired={hourStats(row.stats, hour).paired} className="text-sm text-slate-700 dark:text-slate-200">
                          {hourDetail(row, hourStats(row.stats, hour), hour, language)}
                        </p>
                      </>
                    )}
                  </>
                )}
              </article>
            ))}
            {pairs.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                {heatLegend(language).map(item => (
                  <li key={item.level} className="inline-flex items-center gap-1">
                    <span className={`h-3 w-3 rounded-sm ${HEAT_CLASS[item.level]}`} aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {displayName && (
            <section aria-label={es ? 'Compartir este cruce' : 'Share this crossing'} className="mb-6 rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{es ? 'Compartir este reporte' : 'Share this report'}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200" data-testid="lane-flip-share-text">{shareBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" className="min-h-11 gap-2" onClick={() => share(shareBody, shareUrl)}>
                  <Share2 aria-hidden="true" className="h-4 w-4" />
                  {es ? 'Compartir' : 'Share'}
                </Button>
                <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => copyShare(shareBody)}>
                  <Copy aria-hidden="true" className="h-4 w-4" />
                  {es ? 'Copiar texto' : 'Copy text'}
                </Button>
                <Button asChild variant="outline" className="min-h-11">
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareBody)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </Button>
              </div>
              <p role="status" className="mt-2 text-xs text-slate-600 dark:text-slate-300">{shareStatus}</p>
            </section>
          )}

          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{methodTitle(language)}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{methodParagraph(language)}</p>
            <p className="mt-2 text-sm">
              <Link className="font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-300" to={`/crossing/${canonicalSlug || slug}/`}>
                {es ? `Abrir el reporte de ${displayName || ''}`.trim() : `Open the ${displayName || 'crossing'} report`.trim()}
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  );
}
