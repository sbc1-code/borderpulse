import { reportTimeLabel } from '@/lib/trustState';

// Single-row presentation of one CBP lane's current state. Used both on
// the dashboard card (gated behind "Show lanes") and on /crossing/:slug
// (always-on "Latest lane reports" section). Kept light-themed to match the
// dashboard card's existing lane-drawer chrome.
export default function LaneRow({ icon: Icon, label, data, language }) {
  if (!data) return null;
  return (
    <div className="py-1.5 text-xs" data-testid="lane-row">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-600 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{label[language] || label.en}</span>
        </div>
        <div className="flex items-center gap-2 font-medium text-slate-900 tabular-nums whitespace-nowrap">
          <span>{data.delay_minutes == null ? '—' : `${data.delay_minutes}m`}</span>
          <span className="text-slate-700 font-normal">
            · {data.lanes_open} {language === 'en' ? 'open' : 'abiertas'}
          </span>
        </div>
      </div>
      {typeof data.delay_minutes === 'number' && (
        <p data-testid="cbp-report-time" className="mt-1 text-slate-600 break-words">{reportTimeLabel(data.update_time, language)}</p>
      )}
    </div>
  );
}
