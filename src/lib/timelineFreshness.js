// Timeline files retain historical items. Only genuinely recent publication
// dates belong under the crossing page's "Recent" heading; a fetch/update
// timestamp must never make an old or undated story appear fresh.
export const RECENT_TIMELINE_DAYS = 30;
const WINDOW_MS = RECENT_TIMELINE_DAYS * 24 * 60 * 60 * 1000;

export function recentTimelineEntries(entries, now = Date.now()) {
  if (!Array.isArray(entries) || !Number.isFinite(now)) return [];
  const cutoff = now - WINDOW_MS;
  return entries.filter(entry => {
    if (typeof entry?.published_at !== 'string') return false;
    const published = Date.parse(entry.published_at);
    return Number.isFinite(published) && published >= cutoff && published <= now;
  }).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 8);
}
