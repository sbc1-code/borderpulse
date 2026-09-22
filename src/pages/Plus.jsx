import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Clock3, ExternalLink, Lock, Mail, Plus as PlusIcon, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dataService } from '@/components/utils/dataService';
import { apiFetch, getSupabaseBrowserClient, hasSupabaseBrowserConfig, sendMagicLink } from '@/lib/paidApi';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';

const laneOptions = [
  ['standard', 'Passenger standard'],
  ['sentri', 'SENTRI'],
  ['ready', 'Ready Lane'],
  ['pedestrian', 'Pedestrian'],
];

function formatError(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-emerald-600" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
      {label}
      <input
        {...props}
        className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
      {label}
      <select
        {...props}
        className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

export default function Plus() {
  const language = usePersistentLanguage();
  const configured = hasSupabaseBrowserConfig();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [savedCrossings, setSavedCrossings] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [alertDeliveries, setAlertDeliveries] = useState([]);
  const [crossings, setCrossings] = useState([]);
  const [crossingForm, setCrossingForm] = useState({ port_number: '', lane_type: 'standard' });
  const [alertForm, setAlertForm] = useState({
    saved_crossing_id: '', threshold_minutes: 30, days_of_week: [1, 2, 3, 4, 5], window_start: '06:00', window_end: '22:00',
  });

  const isSpanish = language === 'es';
  const copy = isSpanish ? {
    title: 'Border Pulse Plus',
    subtitle: 'Tus cruces guardados y alertas por correo, en un solo lugar.',
    beta: 'Beta privada propuesta',
    notReady: 'La conexión de cuenta todavía no está activada. La app pública sigue disponible sin cuenta.',
    free: 'Volver al panel gratuito',
    includes: 'Incluye',
    saved: 'Cruces guardados',
    alerts: 'Alertas por correo',
    accountSync: 'Sincronización de cuenta',
    noPaywall: 'Los datos públicos siguen siendo gratuitos.',
    signIn: 'Recibe un enlace para entrar',
    email: 'Correo electrónico',
    send: 'Enviar enlace',
    sent: 'Revisa tu correo. El enlace abre tu cuenta de Border Pulse.',
    signedIn: 'Cuenta conectada',
    signOut: 'Salir',
    deleteAccount: 'Eliminar cuenta',
    deleteConfirm: '¿Eliminar tu cuenta y tus datos guardados? Esta acción no se puede deshacer.',
    deleted: 'Tu cuenta fue eliminada.',
    loading: 'Cargando cuenta…',
    checkout: 'Unirme a la beta privada',
    billingUnavailable: 'La beta de pago todavía no está conectada. Esta página no iniciará ningún cobro todavía.',
    portal: 'Administrar suscripción',
    active: 'Plus está activo',
    pending: 'Tu suscripción está procesándose.',
    save: 'Guardar cruce',
    crossing: 'Cruce',
    lane: 'Tipo de carril',
    savedTitle: 'Mis cruces',
    alertTitle: 'Mis alertas',
    activityTitle: 'Actividad de alertas',
    noActivity: 'Todavía no hay actividad de alertas.',
    alertIntro: 'Recibe un correo cuando el tiempo esté en o por debajo de tu límite.',
    threshold: 'Límite en minutos',
    days: 'Días de la semana',
    from: 'Desde',
    until: 'Hasta',
    addAlert: 'Crear alerta',
    optIn: 'Acepto recibir alertas de Border Pulse por correo.',
    remove: 'Eliminar',
    noSaved: 'Todavía no tienes cruces guardados.',
    noAlerts: 'Todavía no tienes alertas.',
    accountError: 'No pudimos cargar tu cuenta.',
  } : {
    title: 'Border Pulse Plus',
    subtitle: 'Your saved crossings and email alerts in one place.',
    beta: 'Proposed private beta',
    notReady: 'Account connection is not active yet. The public app remains available without an account.',
    free: 'Back to the free dashboard',
    includes: 'Includes',
    saved: 'Saved crossings',
    alerts: 'Email alerts',
    accountSync: 'Account sync',
    noPaywall: 'Public data stays free.',
    signIn: 'Get a sign-in link',
    email: 'Email address',
    send: 'Send link',
    sent: 'Check your email. The link will open your Border Pulse account.',
    signedIn: 'Account connected',
    signOut: 'Sign out',
    deleteAccount: 'Delete account',
    deleteConfirm: 'Delete your account and saved data? This cannot be undone.',
    deleted: 'Your account was deleted.',
    loading: 'Loading account…',
    checkout: 'Join the private beta',
    billingUnavailable: 'The paid beta is not connected yet. This page will not start a charge yet.',
    portal: 'Manage subscription',
    active: 'Plus is active',
    pending: 'Your subscription is processing.',
    save: 'Save crossing',
    crossing: 'Crossing',
    lane: 'Lane type',
    savedTitle: 'My crossings',
    alertTitle: 'My alerts',
    activityTitle: 'Alert activity',
    noActivity: 'There is no alert activity yet.',
    alertIntro: 'Get an email when the wait is at or below your limit.',
    threshold: 'Limit in minutes',
    days: 'Days of the week',
    from: 'From',
    until: 'Until',
    addAlert: 'Create alert',
    optIn: 'I agree to receive Border Pulse alerts by email.',
    remove: 'Remove',
    noSaved: 'You have no saved crossings yet.',
    noAlerts: 'You have no alerts yet.',
    accountError: 'We could not load your account.',
  };

  useEffect(() => {
    const title = isSpanish ? 'Border Pulse Plus | Alertas de cruces' : 'Border Pulse Plus | Saved crossings and email alerts';
    const description = isSpanish
      ? 'Guarda cruces fronterizos y configura alertas por correo con Border Pulse Plus.'
      : 'Save border crossings and configure email alerts with Border Pulse Plus.';
    updatePageMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: 'https://borderpulse.com/plus/', canonical: 'https://borderpulse.com/plus/' });
    return () => resetPageMeta();
  }, [isSpanish]);

  useEffect(() => {
    let cancelled = false;
    dataService.getBorderData().then((payload) => {
      if (!cancelled) {
        const rows = (payload.crossings || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
        setCrossings(rows);
        if (rows[0]) setCrossingForm((current) => ({ ...current, port_number: current.port_number || rows[0].port_number }));
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const loadAccount = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError('');
    try {
      const [profileResult, entitlementResult] = await Promise.all([
        apiFetch('/api/me/profile', { supabase }),
        apiFetch('/api/me/entitlement', { supabase }),
      ]);
      setProfile(profileResult.profile);
      setEntitlement(entitlementResult);
      if (entitlementResult.entitled) {
        const [crossingResult, alertResult, deliveryResult] = await Promise.all([
          apiFetch('/api/me/saved-crossings', { supabase }),
          apiFetch('/api/me/alert-rules', { supabase }),
          apiFetch('/api/me/alert-deliveries', { supabase }),
        ]);
        setSavedCrossings(crossingResult.saved_crossings || []);
        setAlertRules(alertResult.alert_rules || []);
        setAlertDeliveries(deliveryResult.alert_deliveries || []);
        setAlertForm((current) => ({ ...current, saved_crossing_id: current.saved_crossing_id || crossingResult.saved_crossings?.[0]?.id || '' }));
      }
    } catch (loadError) {
      setError(formatError(loadError));
    } finally {
      setBusy(false);
    }
  }, [session, supabase]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  async function handleSignIn(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await sendMagicLink(email.trim());
      setMessage(copy.sent);
    } catch (signInError) { setError(formatError(signInError)); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    setBusy(true); setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(formatError(signOutError));
    setBusy(false);
  }

  async function handleDeleteAccount() {
    if (typeof window !== 'undefined' && !window.confirm(copy.deleteConfirm)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await apiFetch('/api/me/account', { supabase, method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) });
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setEntitlement(null);
      setMessage(copy.deleted);
    } catch (deleteError) {
      setError(formatError(deleteError));
    } finally {
      setBusy(false);
    }
  }

  async function handleAction(action) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await action();
      if (result?.url) window.location.assign(result.url);
      else await loadAccount();
    } catch (actionError) { setError(formatError(actionError)); setBusy(false); }
  }

  async function updateEmailOptIn(checked) {
    await handleAction(async () => {
      const result = await apiFetch('/api/me/profile', { supabase, method: 'PATCH', body: JSON.stringify({ email_opt_in: checked }) });
      setProfile(result.profile);
      return null;
    });
  }

  const crossingByPort = useMemo(() => new Map(crossings.map((crossing) => [String(crossing.port_number), crossing])), [crossings]);
  const crossingLabel = (saved) => saved.display_name || crossingByPort.get(String(saved.port_number))?.name || saved.port_number;
  const entitled = Boolean(entitlement?.entitled);
  const billingReady = Boolean(entitlement?.paid_workflow_ready);
  const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';
  const dayOptions = isSpanish
    ? [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']]
    : [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];

  return (
    <div className="mx-auto max-w-[1000px] p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">← {copy.free}</Link>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{copy.beta}</span>
      </div>

      <header className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/20 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">{copy.subtitle}</p>
          </div>
          <Lock className="hidden h-8 w-8 text-emerald-700 sm:block dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-3">
          {[copy.saved, copy.alerts, copy.accountSync].map((item) => <div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{item}</div>)}
        </div>
        <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">{copy.noPaywall}</p>
      </header>

      {message && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" role="status">{message}</div>}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" role="alert">{error}</div>}

      {!configured && (
        <Panel title={copy.title} icon={Lock}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{copy.notReady}</p>
        </Panel>
      )}

      {configured && !session && (
        <Panel title={copy.signIn} icon={Mail}>
          <form onSubmit={handleSignIn} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><Field label={copy.email} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
            <Button type="submit" disabled={busy}>{busy ? copy.loading : copy.send}</Button>
          </form>
        </Panel>
      )}

      {configured && session && (
        <div className="mt-5 space-y-4">
          <Panel title={copy.signedIn} icon={UserRound}>
            <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{profile?.email || session.user?.email}</span>
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={handleSignOut} disabled={busy}>{copy.signOut}</Button><Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={busy}>{copy.deleteAccount}</Button></div>
            </div>
            <label className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
              <input type="checkbox" className="mt-0.5" checked={Boolean(profile?.email_opt_in)} onChange={(event) => updateEmailOptIn(event.target.checked)} disabled={busy || !profile} />
              <span>{copy.optIn}</span>
            </label>
          </Panel>

          {!entitled && (
            <Panel title={copy.title} icon={PlusIcon}>
              <p className="text-sm text-slate-600 dark:text-slate-300">{billingReady ? (entitlement ? copy.pending : copy.notReady) : copy.billingUnavailable}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {billingReady && <Button onClick={() => handleAction(() => apiFetch('/api/billing/checkout', { supabase, method: 'POST' }))} disabled={busy}>{copy.checkout}</Button>}
                {billingReady && entitlement?.has_billing_record && <Button variant="outline" onClick={() => handleAction(() => apiFetch('/api/billing/portal', { supabase, method: 'POST' }))} disabled={busy}>{copy.portal}</Button>}
              </div>
            </Panel>
          )}

          {entitled && (
            <>
              <Panel title={copy.active} icon={Check}>
                <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => handleAction(() => apiFetch('/api/billing/portal', { supabase, method: 'POST' }))} disabled={busy}>{copy.portal}</Button></div>
              </Panel>

              <Panel title={copy.savedTitle} icon={Clock3}>
                <form onSubmit={(event) => { event.preventDefault(); handleAction(async () => { const crossing = crossingByPort.get(String(crossingForm.port_number)); const result = await apiFetch('/api/me/saved-crossings', { supabase, method: 'POST', body: JSON.stringify({ ...crossingForm, display_name: crossing?.name || crossingForm.port_number }) }); setAlertForm((current) => ({ ...current, saved_crossing_id: result.saved_crossing.id })); return null; }); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <SelectField label={copy.crossing} value={crossingForm.port_number} onChange={(event) => setCrossingForm({ ...crossingForm, port_number: event.target.value })} required>
                    {crossings.map((crossing) => <option key={crossing.port_number} value={crossing.port_number}>{crossing.name}</option>)}
                  </SelectField>
                  <SelectField label={copy.lane} value={crossingForm.lane_type} onChange={(event) => setCrossingForm({ ...crossingForm, lane_type: event.target.value })}>
                    {laneOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </SelectField>
                  <Button type="submit" disabled={busy || !crossingForm.port_number}>{copy.save}</Button>
                </form>
                <div className="mt-4 space-y-2">{savedCrossings.length ? savedCrossings.map((saved) => <div key={saved.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-gray-800"><span>{crossingLabel(saved)} · {saved.lane_type}</span><Button variant="ghost" size="sm" onClick={() => handleAction(() => apiFetch(`/api/me/saved-crossings?id=${encodeURIComponent(saved.id)}`, { supabase, method: 'DELETE' }))} disabled={busy} aria-label={`${copy.remove} ${crossingLabel(saved)}`}><Trash2 className="h-4 w-4" /></Button></div>) : <p className="text-sm text-slate-500">{copy.noSaved}</p>}</div>
              </Panel>

              <Panel title={copy.alertTitle} icon={Bell}>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{copy.alertIntro}</p>
                <form onSubmit={(event) => { event.preventDefault(); handleAction(() => apiFetch('/api/me/alert-rules', { supabase, method: 'POST', body: JSON.stringify({ ...alertForm, threshold_minutes: Number(alertForm.threshold_minutes), timezone }) })); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                  <SelectField label={copy.crossing} value={alertForm.saved_crossing_id} onChange={(event) => setAlertForm({ ...alertForm, saved_crossing_id: event.target.value })} required>
                    <option value="">—</option>{savedCrossings.map((saved) => <option key={saved.id} value={saved.id}>{crossingLabel(saved)}</option>)}
                  </SelectField>
                  <Field label={copy.threshold} type="number" min="0" max="600" value={alertForm.threshold_minutes} onChange={(event) => setAlertForm({ ...alertForm, threshold_minutes: event.target.value })} required />
                  <Field label={copy.from} type="time" value={alertForm.window_start} onChange={(event) => setAlertForm({ ...alertForm, window_start: event.target.value })} required />
                  <Field label={copy.until} type="time" value={alertForm.window_end} onChange={(event) => setAlertForm({ ...alertForm, window_end: event.target.value })} required />
                  <fieldset className="sm:col-span-2 lg:col-span-5">
                    <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">{copy.days}</legend>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {dayOptions.map(([day, label]) => (
                        <label key={day} className="flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 dark:border-gray-600 dark:bg-gray-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={alertForm.days_of_week.includes(day)}
                            onChange={() => setAlertForm((current) => ({
                              ...current,
                              days_of_week: current.days_of_week.includes(day)
                                ? current.days_of_week.filter((value) => value !== day)
                                : [...current.days_of_week, day].sort((a, b) => a - b),
                            }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Button type="submit" disabled={busy || !alertForm.saved_crossing_id || !profile?.email_opt_in || !alertForm.days_of_week.length}>{copy.addAlert}</Button>
                </form>
                <div className="mt-4 space-y-2">{alertRules.length ? alertRules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-gray-800"><span>{crossingLabel(savedCrossings.find((saved) => saved.id === rule.saved_crossing_id) || { port_number: rule.saved_crossing_id })} ≤ {rule.threshold_minutes} min</span><Button variant="ghost" size="sm" onClick={() => handleAction(() => apiFetch(`/api/me/alert-rules?id=${encodeURIComponent(rule.id)}`, { supabase, method: 'DELETE' }))} disabled={busy} aria-label={`${copy.remove} alert`}><Trash2 className="h-4 w-4" /></Button></div>) : <p className="text-sm text-slate-500">{copy.noAlerts}</p>}</div>
              </Panel>

              <Panel title={copy.activityTitle} icon={Mail}>
                <div className="space-y-2">{alertDeliveries.length ? alertDeliveries.map((delivery) => <div key={delivery.id} className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium text-slate-700 dark:text-slate-200">{delivery.status === 'sent' ? (isSpanish ? 'Enviado' : 'Sent') : delivery.status === 'failed' ? (isSpanish ? 'Falló' : 'Failed') : delivery.status === 'suppressed' ? (isSpanish ? 'Suprimido' : 'Suppressed') : (isSpanish ? 'En cola' : 'Queued')}</span><span className="text-slate-500 dark:text-slate-400">{new Date(delivery.evaluated_at || delivery.created_at).toLocaleString(isSpanish ? 'es-MX' : 'en-US')}{delivery.suppression_reason ? ` · ${delivery.suppression_reason}` : ''}</span></div>) : <p className="text-sm text-slate-500">{copy.noActivity}</p>}</div>
              </Panel>
            </>
          )}
        </div>
      )}

      <p className="mt-5 flex items-center gap-1 text-xs text-slate-500"><ExternalLink className="h-3 w-3" /> {copy.noPaywall}</p>
    </div>
  );
}
