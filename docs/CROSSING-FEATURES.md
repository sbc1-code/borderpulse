# Crossing feature batch — October 13, 2026

## Prepared implementation

The dashboard's crossing-area selector remembers one of nine named corridors.
Selecting a state clears that corridor; selecting a corridor clears the search
and state scope. Existing public routes, source data, collection, ads and
publication gates stay intact. Local comparisons include the selected lane
only; a shorter reported queue is not a shorter total journey.

Public camera players are available on Paso del Norte, Stanton-Lerdo,
Ysleta-Zaragoza, Tornillo and Bridge of the Americas detail pages. The regional
panel links directly to each page's camera section. No video, thumbnail or
provider request is made by this feature before a view is selected. Selecting
another view replaces the iframe; closing removes it. There is no video relay,
recording, paid routing call, new SDK or new secret. Availability is controlled
by the source and is not inferred from iframe load success.

The homepage also has a visible Camera feeds section with explicit El Paso–Juárez
coverage. Opening it exposes the bridge/view controls without creating a player.
Selecting a view loads the same component used on crossing pages. Changing the
bridge or collapsing the section removes the player. This path addresses the
owner's difficulty finding the feeds in the preview.

## Camera source receipts

Official directory: https://www.puentesfronterizos.gob.mx/camaras-en-vivo.php

The directory lists each orientation separately. On review, its CamStreamer
links resolve to the following YouTube player IDs; BOTA links point to YouTube
directly. These are public-source embeds, not scraped competitor video assets.
The displayed orientation is the official heading, not inferred travel direction.

| Canonical port | Official views | Player IDs |
| --- | --- | --- |
| 240202 Paso del Norte | North to south / South to north | IcvugJWPXz8 / 0Pg3S6s76IE |
| 240204 Stanton-Lerdo | North to south / South to north | CYhISA_wFQ8 / sOHFG6_3zAs |
| 240104 Ysleta-Zaragoza | North to south / South to north | GC5RY3zipa4 / KX-bm-Lhy3w |
| 240401 Tornillo | North to south / South to north | 0gT7jvaLCkg / 8u-hBawdG8c |
| 240201 BOTA | North / South | mp3RS0y77tY / CZM5TpXLzE8 |

Review the IDs against the directory when playback stops: livestream IDs can
change. The official directory remains the fallback. Santa Teresa has no
verified stream in this registry. City of El Paso's own directory reported
camera maintenance during review, so its streams are not advertised as working.
Playback itself could not be established by text retrieval; browser tests mock
or block providers and test the controls, not third-party stream uptime.

## Next: real email threshold alerts

The existing product has no database or email delivery provider. Do not collect
addresses or show a signup success until the full path exists. Prepare an
explicit provider/storage choice and cost cap before provisioning anything.

- Pilot one corridor. Subscription specifies canonical port, eligible lane,
  threshold, language and email. Confirm the email before activation.
- Durable storage needs subscription ID, email, confirmed status, port/lane,
  threshold, confirmation/unsubscribe token hashes, and last delivery time.
- Reuse the current validated CBP collector; do not add a per-subscriber polling
  loop. A scheduled evaluator compares only open, reporting eligible lanes.
- Trigger on crossing from above to below the threshold, at most one email per
  subscriber per day. On stale/missing data, send nothing. Recovery must not
  manufacture a threshold crossing from an unknown previous observation.
- Idempotent delivery ledger prevents retry duplicates. Unsubscribe is present
  in each email; remove/suppress addresses after bounce or complaint.
- Validation: closed browser receives the confirmed test email; threshold
  transition, stale feeds, duplicate cron runs, unsubscribe and provider errors
  are tested. Never call an open-tab-only banner an alert.
- Costs are unknown until the provider and expected volume are selected.
  Calculate confirmed subscriptions × maximum deliveries/day, storage volume,
  cron frequency and provider rate limits. Target no new monthly spend for the
  pilot; alert at a reviewed cap and fail closed before paid overages.

## Next: community crossing reports

A public community feed needs shared storage and an abuse-control path; a
local browser timer alone cannot provide community reports.

- Collect canonical port, direction, lane, actual duration, completion time and
  submission time. Do not require precise GPS, document data or free text.
- Optional timer uses absolute start/end timestamps, survives reload in local
  browser storage, and stops only on explicit completion. A saved local record
  is labeled as such until a server confirms publication.
- Validate numeric bounds, allowed port/lane combinations and recency on the
  server. Rate-limit and deduplicate submissions; cap retention and volume.
- Public read model shows report count, lane, time range and a summary with a
  sample floor. Keep community observations separate from official CBP waits.
- Do not claim improved estimates until held-out completed crossings show it.
  Compare error by bridge/lane and quiet/busy periods; avoid validating on the
  observations used to calibrate the model.
- Validation: submission appears in a second browser; expired, implausible,
  duplicate and rejected reports never create a misleading public estimate.

## Competitor operating-cost observations

Fila de Puentes credits Fideicomiso, CBP, TxDOT and public streams on its About
page, and Fili's explanation states a daily message limit. Public embeds and
message limits can reduce bandwidth/inference cost. Revenue, funding, actual
traffic, model/provider and operating expenses remain unknown. Absence of a
visible paid plan or ad unit does not establish that its costs are high.
