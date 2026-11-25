// The saved captures use explicit UTC and may include submillisecond precision.
// Date.parse alone can silently roll an impossible date into the next month.
export function captureMilliseconds(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|\+00:00)$/.test(value)) {
    return NaN;
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== value.slice(0, 19)) return NaN;
  return ms;
}
