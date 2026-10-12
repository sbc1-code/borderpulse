# Ad-slot diagnostics

The existing cookieless Umami wrapper receives `ad-slot-diagnostic` events for
`slot: dashboard-native`. Only the following fixed `state` values are sent:

- `script-ready`: the existing script element fired `load`. This does not prove
  that its runtime or a creative succeeded.
- `script-error`: the element fired `error`. It cannot distinguish a blocker,
  offline connection, DNS failure or a provider error. No retry is made.
- `container-populated`: a direct element other than script/style/link appeared
  in the slot. A placeholder wrapper is sufficient; cross-origin contents are
  not inspected. This does not establish successful ad fill.
- `slot-visible`: the populated, positive-area container reached at least 50%
  geometric viewport intersection while the document was visible. There is no
  dwell-time, occlusion or creative verification. This is not an audited
  impression or an ad-network viewability measurement.

Each state is attempted once per mounted slot lifetime. React effect replays,
ordinary rerenders and repeated observer callbacks share that lifetime's cap.
Leaving the dashboard and returning creates a new slot lifetime, as it already
creates a new ad-script attempt. A normal successful lifetime has up to three
events; there are four possible states in total. Nothing is persisted, queued
or retried. Observers/listeners are disconnected on completion or unmount.

There are no added provider requests, ad units, identifiers, coordinates, URLs,
creative text, free text, cookies or storage. The ad URL, placement, disclosure
and privacy links remain unchanged. The diagnostics use the site's existing
Umami provider. Missing/blocked Umami drops observations, including events that
happen before it loads. Unsupported observers also undercount. These signals
can help distinguish script failure from later DOM/visibility stages; they
cannot establish actual publisher revenue, CPM, fill rate or billed impressions.
Read actual ad-network totals and earnings in the publisher dashboard.

## Verification

Run `npm run test:ads` for mocked load/error, mutation, intersection, resize,
cleanup/replay, delayed zero-area growth, missing APIs and blocked analytics.
Run `npm run build` followed by `node scripts/smoke-routes.mjs --ads-only` for
focused desktop/mobile EN/ES browser cases. The browser checks replace the
provider script with inert fixture content or abort it and block all other
external requests. They do not load live ads or click a creative.

`npm test` includes both the unit checks and browser checks with the existing
release gates. A local browser-launch failure is a verification blocker, not a
passed route suite. This change alone does not establish production emission
or that Umami reports are accessible.
