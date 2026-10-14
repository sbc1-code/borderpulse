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

## Expanded camera coverage — October 13

The homepage camera-area picker includes all nine corridors. Six have reviewed
source paths: 14 video-player views and two camera snapshots at eight crossings
in three corridors, plus
official external-source links at five crossings in three additional corridors.
Calexico–Mexicali, Brownsville and Progreso have no source verified in this batch
and show that explicitly. A reviewed source is not a stream-uptime guarantee.

| Area | Canonical ports | Type and source receipt |
| --- | --- | --- |
| San Diego–Tijuana | 250401 San Ysidro; 250601 Otay Mesa | Caltrans U.S. road approaches; not the northbound inspection queue in Mexico. Official list: https://cwwp2.dot.ca.gov/vm/streamlist.htm |
| Eagle Pass | 230302 Bridge II | Four iframe players published at https://www.eaglepasstx.gov/335/International-Bridge-2-Cameras ; alias IDs: 67231a475ead1, 639ba5d96b3f6, 639ba81bb4b49, 68f3f8b846277. Views are numbered because lane/orientation is unconfirmed. |
| Nogales | 260401 DeConcini; 260402 Mariposa | External municipal directory: https://heroicanogales.gob.mx/webcams-garitas ; municipal source publication: https://heroicanogales.gob.mx/acciones/fortalecen-acceso-ciudadano-a-camaras-de-garita-mariposa |
| Laredo | 230401 Bridge I; 230402 Bridge II | External municipal directory: https://www.cityoflaredo.com/services/bridge-cameras . Indexed official listing was retrieved; page fetch returned 403 during review, so no embed/playback is claimed. |
| McAllen–Reynosa | 230502 Pharr | External official bridge site: https://bridge.pharr-tx.gov/ advertises its Live Bridge Camera link. The viewer fetch timed out during review; no embed/playback is claimed. This source must not be assigned to Anzalduas (230503). |

Caltrans viewer pages inspected in the browser:
- San Ysidro: https://cwwp2.dot.ca.gov/vm/loc/d11/c214sb5viadesanysidro.htm
- Otay Mesa: https://cwwp2.dot.ca.gov/vm/loc/d11/c100i905siemprevivat.htm

The viewer's video poster fields publish the snapshot URLs used in the app:
- https://cwwp2.dot.ca.gov/data/d11/cctv/image/c214sb5viadesanysidro/c214sb5viadesanysidro.jpg
- https://cwwp2.dot.ca.gov/data/d11/cctv/image/c100i905siemprevivat/c100i905siemprevivat.jpg

These images load after view selection and refresh only on explicit request;
request time is not displayed as capture time. Failed loads expose a visible
error and an official video-viewer link. The provider's own Temporarily
Unavailable placeholder remains visible when returned as an image. Both sources
showed that placeholder during this review; playback/uptime is not claimed.

Caltrans publishes these viewers through its official live-camera list and
describes its own information as generally public domain in
https://dot.ca.gov/conditions-of-use . Keep attribution and provider links.
BorderTraffic's public page requires licensing for commercial use of its
content; its free personal-use views are not copied or embedded here. No
license was purchased and no provider was contacted.

Area/crossing selection alone creates no provider iframe. Selecting one of the
reviewed embedded views loads that provider's page; source-only options are
ordinary outbound links. Existing detail cards, titles and visible static
snapshots use the correct source and distinguish road approaches from queues.

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
