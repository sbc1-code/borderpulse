// Router renders can lag the browser URL during a transition. Merge a new
// user action into the current URL, not a query captured by an older render.
export function currentSearchParams() {
  return new URLSearchParams(window.location.search);
}
