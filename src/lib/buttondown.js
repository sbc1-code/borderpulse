// Client-side helper for posting to Buttondown's public embed-subscribe
// endpoint. No API key in the browser — the form endpoint takes a plain
// form-encoded POST and CORS is wide-open (access-control-allow-origin: *),
// so we can call it directly from a static site.
//
// Username is read at build time from VITE_BUTTONDOWN_USERNAME so future
// account migrations only touch env + GH secrets, not committed code.

const USERNAME = import.meta.env.VITE_BUTTONDOWN_USERNAME || 'Digito-bp';
const ENDPOINT = `https://buttondown.com/api/emails/embed-subscribe/${USERNAME}`;
const QUEUE_KEY = 'borderPulse_newsletterQueue_v1';

export function emailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

async function postEmail(email, metadata = {}) {
  const body = new URLSearchParams();
  body.set('email', email.trim());
  // Buttondown ignores unknown fields gracefully; tags help downstream segmentation.
  const tags = [metadata.source, metadata.variant, metadata.language]
    .filter(Boolean)
    .join(',');
  if (tags) body.set('tags', tags);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(arr) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr.slice(-200)));
  } catch {}
}

function queueLocally(payload) {
  const arr = readQueue();
  arr.push({ ...payload, queued_at: new Date().toISOString() });
  writeQueue(arr);
}

// Best-effort: replay any signups captured before this endpoint existed.
// Fire-and-forget; we clear items as they succeed so we don't double-post.
export async function drainQueue() {
  if (typeof window === 'undefined') return;
  const items = readQueue();
  if (!items.length) return;
  const remaining = [];
  for (const item of items) {
    if (!item || !emailValid(item.email)) continue;
    try {
      await postEmail(item.email, {
        source: item.source,
        variant: item.variant,
        language: item.language,
      });
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
}

export async function subscribe(email, metadata = {}) {
  if (!emailValid(email)) {
    return { ok: false, error: 'invalid_email' };
  }
  try {
    await postEmail(email, metadata);
    // Opportunistic drain so a successful live signup also flushes anything
    // queued from earlier sessions when the endpoint was missing.
    drainQueue();
    return { ok: true };
  } catch (err) {
    queueLocally({ email, ...metadata });
    // We still treat this as a "soft success" from the user's perspective —
    // the signup isn't lost, it's queued for the next page load.
    return { ok: true, queued: true };
  }
}
