# Border-wide map facility-overview review — preview only

## Current policy and coverage

All 42 catalog identities now have a documented location decision. Use a named US facility building/site representative or the target of a named public-directory link for this overview. These points are not surveyed entrances, routing destinations or arbitrary averages of conflicting records.

Current coverage is **40 approximate pins and 2 list-only records**: **26 GSA facility representatives, 12 TABC directory targets, 1 Federal Register facility point and 1 explicitly limited contextual approximation (Morley)**. There are no remaining unclassified inherited points in this frozen catalog. Mapped state counts are **CA 6, AZ 7, NM 2, TX 25**. Runtime totals remain data-driven; the 42-identity fixture is a regression baseline.

The coordinating independent researchers classified the remaining points against the [GSA IOLP catalog](https://catalog.data.gov/dataset/inventory-of-owned-and-leased-properties-iolp) and its October 23, 2026 [original buildings export](https://inventory.data.gov/dataset/9a9e946e-124e-46f5-a934-e458a6c1c2b2/resource/a07671a5-037d-4a2b-8f52-3a556f0a2422/download/2026-10-23-iolp-buildings.xlsx). They supplied SHA-256 `4ef7c372d15f540ee277ad7b05d5110d48e4a570953ecc7169333b9e2896fe0f`, asset identities and representative values. The implementation worker independently read the catalog, which exposes the dated export, but direct workbook retrieval was blocked by proxy 403. **The worker did not independently hash or parse the workbook and did not bypass that denial.** Full selected values, asset IDs, source URLs, policy choices and this attribution are retained in [the facility review evidence](borderwide-map-review/geographic-facility-review.json). The original eight directory targets and San Luis I numeric permit point are retained in the initial review below.

The GSA corrections include materially displaced Andrade, Douglas, Mariposa, Columbus, Santa Teresa, Ysleta, Tornillo, Anzalduas, Rio Grande City and B&M points, as well as consistent facility refinements elsewhere. The shared proximity helper and the map use the same catalog. Directory targets use the named link target, never the map viewport center.

## Identity and representative choices

- **Otay:** restore CA0267, the named main/primary US facility at 2500 Paseo Internacional, 32.5527/-116.9391. This replaces the former unsupported commercial-facility override.
- **World Trade:** restore TX0730, the named US administration facility at 715 Bob Bullock Loop, 27.5977/-99.5343. Adjacent core assets corroborate the facility area. It is not a bridge entrance pin.
- **Columbus:** use NM8015's site at 31.7838/-107.6279, not repeated building rows geocoded to town. Page 3 of the [GSA prospectus](https://www.gsa.gov/system/files/2016_CONSTRUCTION_PROSPECTUS_Columbus_NM_U_S_Land_Port_of_Entry.pdf) places the port about three miles south of Columbus beside Palomas.
- **Anzalduas:** use TX0610's US facility, 26.1453/-98.3121. The [NADBank proposal](https://nadbank.org/hubfs/projects/draft_bd_2022_xx_anzalduas_expansion_project_proposal_public_eng.pdf?hsLang=en) independently places the project in that facility area; it does not turn the point into an approach or route.
- **Ysleta:** use TX0963 and the [MPO facility-corridor reference](https://www.elpasompo.org/media/Rider7/EmissionQuantification.pdf). Do not adopt the internally contradictory S/N Zaragoza directory redirect.
- **Eagle Pass I:** consistently use the TX0201 administration facility, 28.7054/-100.5059, rather than mixing a bridge target with the building representative.
- **Morley:** retain 31.3343/-110.9408 as an **explicitly limited contextual approximation**, separate from DeConcini. GSA AZ0553 repeats DeConcini's coordinates despite the distinct facility. The [FHWA Arizona map](https://rosap.ntl.bts.gov/view/dot/53809/dot_53809_DS2.pdf) describes Morley as the adjacent pedestrian crossing; it supplies context, not independent numeric certification.
- **San Luis II:** remain list-only. GSA representatives 32.515786/-114.70114 and NII 32.4635599/-114.6997983 conflict by about 5.8 km. Do not average them or reuse San Luis I.
- **Aggregate El Paso:** remain list-only because the aggregate record is not another physical crossing.

The selected report shows GSA asset identity, directory/federal source or Morley's limited status. The source disclosure states the facility-overview policy, exact coverage and two list-only decisions. Wait freshness remains independent of location evidence. Raw clocks, closures, missing/zero semantics, recorded gaps and all report access are preserved.

## Current validation and review limits

Nine model checks cover the entire classified catalog, asset-to-port/state identity, supplied target values, kilometer-scale old-point negative controls, restored Otay aliases and World Trade, Morley/DeConcini separation, San Luis I/II decisions and exact coverage. Browser checks cover EN/ES coverage and provenance, the two list-only reports, restored selections, clustering, strict 0.6 px geographic registration and its shifted-point negative control, keyboard/Back/focus, lanes/history gaps, themes, intermediate widths and reduced motion. Exact final build, full-suite and CI results belong in PR #166; a focused pass is not full approval.

**Geographic classification is complete for the accepted facility-overview policy.** Lack of surveyed entrance coordinates is not a blanket blocker for this overview. Morley's limited numeric support and San Luis II's absent pin are explicit scoped limitations. This remains a draft review preview: hosted interactive QA has not run behind existing Vercel authentication, physical-device/Safari review is unrun, and no production publication is authorized in this task. No access controls are changed.

## Current visual evidence

[Desktop overview](borderwide-map-review/facility/overview-1440-en.png) · [Phone overview](borderwide-map-review/facility/overview-390-es.png) · [Coverage](borderwide-map-review/facility/coverage-390-es.png) · [Restored Otay](borderwide-map-review/facility/otay-390-es.png) · [World Trade](borderwide-map-review/facility/world-trade-1440-en.png) · [Morley](borderwide-map-review/facility/morley-390-es.png) · [Columbus](borderwide-map-review/facility/columbus-1440-en.png) · [Capture receipt](borderwide-map-review/facility/capture-receipt.json)

[Current motion recording](borderwide-map-review/facility/motion-demo.mp4) · [Recording stages/frame timestamps](borderwide-map-review/facility/motion-receipt.json). This is an actual browser screencast of search/camera fit, restored facility selection, Escape/focus return and Morley's limited label, using the same dated snapshot. The installed Playwright video helper was absent; the existing local CDP screencast and system ffmpeg path was used without installing dependencies or changing browser access.

Captures use the actual dated repository snapshot (retrieved November 1, 2026 at 20:37:32.153 UTC), without fixture waits or a frozen clock. They show local production-mode renders, including honest stale/fallback states. Earlier candidate images and recordings remain intact in their historical folders and Git history.

## Initial correction record — historical (58f3b74)

**The following first-pass counts, withholding decisions and release gate are superseded by the current facility classification above.** They remain as the review trail; the original numeric evidence is still relevant to its eight directory targets and San Luis I.

The first candidate inherited material catalog errors. “Approximate” did not adequately describe displacements of roughly 1.5–16.6 km, or a point that confused Stanton with the BOTA area. This correction replaces source-backed points and withholds unresolved suspect locations. It is not production approval or certification of the remaining catalog.

## Evidence and method

The coordinating independent geography review supplied eight named [TABC directory](https://www.tabc.texas.gov/services/texas-ports-of-entry/ports-of-entry-locations/) location-link targets. The implementation worker independently read the directory and confirmed the named crossing associations. Numeric targets were supplied from the links' `!3d`/`!4d` components, **not** the map viewport `@` center. Map rendering was blocked and was not bypassed. These are official-directory-linked targets, not surveyed entrance coordinates. The plotted values are rounded to four decimal places; the full supplied target values and former fallbacks are retained in [machine-readable evidence](borderwide-map-review/geographic-evidence.json).

| CBP identity | Linked target latitude, longitude | Plotted facility approximation | Former displacement |
| --- | --- | --- | --- |
| 240204 Stanton | 31.7498171, -106.4835194 | 31.7498, -106.4835 | about 3.7 km |
| 230502 Pharr | 26.0668542, -98.205208 | 26.0669, -98.2052 | about 10.0 km |
| 535504 Gateway | 25.8987897, -97.49755 | 25.8988, -97.4976 | about 16.6 km |
| 535502 Veterans | 25.8857715, -97.4763808 | 25.8858, -97.4764 | about 6.9 km |
| 230902 Donna | 26.069075, -98.073754 | 26.0691, -98.0738 | about 10.8 km |
| 230302 Eagle Pass II | 28.6978826, -100.5093898 | 28.6979, -100.5094 | about 3.1 km |
| 240301 Presidio | 29.562278, -104.391103 | 29.5623, -104.3911 | about 1.8 km |
| 535503 Los Indios | 26.0291368, -97.738798 | 26.0291, -97.7388 | about 1.5 km |

Identity corroboration: the [City of El Paso](https://www.elpasotexas.gov/international-bridges) places Stanton at 1001 S. Stanton and BOTA at 3600 E. Paisano; the [Pharr bridge authority](https://bridge.pharr-tx.gov/contact/) identifies 9900 S. Cage; [GSA's Gateway page](https://www.gsa.gov/real-estate/ongoing-construction-projects/brownsvillegateway-land-port-of-entry) identifies 1500 W. University in downtown Brownsville. These support crossing identity, not a surveyed driving entrance.

For **San Luis I (260801)**, page 1 of the [Federal Register permit](https://public-inspection.federalregister.gov/2025-23091.pdf), scheduled for December 16, 2025, explicitly gives the facility point as 32°29′03.77463″ N, 114°46′47.57786″ W. Decimal conversion is approximately 32.48438184, -114.77988274. The map uses **32.4844, -114.7799**, as a facility overview point. It does not identify a passenger approach or entrance.

The shared coordinate catalog is corrected so the map and existing nearby-distance helpers agree. The three previously plotted Laredo approximations are also used consistently by the shared helper: Bridge I 27.499/-99.507, Bridge II 27.501/-99.503, Colombia 27.700/-99.746. Those earlier TxDOT indexed-table values remain a **limited-review** class; this follow-up did not independently certify them. TxDOT's feature query and the Laredo document were unavailable; no denied origin was bypassed.

## Withheld and unverified locations

Four records remain available in the list and full report, with no map point or shared catalog fallback:

- **Otay (250601, including alias 250609):** the former override was not numerically established for the current passenger facility. The cited FHWA commercial-facility material does not certify the passenger entrance.
- **World Trade (230404):** the inherited point is suspect and no adequate numeric correction was established.
- **San Luis II (260802):** its old point duplicated San Luis I. The [Greater Yuma Port Authority](https://gypa.org/san-luis-2.html) identifies a separate eastern commercial facility; no replacement point is guessed.
- **Aggregate El Paso (240221):** this is an aggregate record, not a separate physical crossing to pin.

For the frozen 42-identity catalog, coverage is **38 approximate map points and 4 list-only records**: 8 directory-linked targets, 1 federal facility point, 3 earlier published approximations with limited review, and **26 inherited points without independent numeric verification**. Mapped counts by state are CA 5, AZ 7, NM 2, TX 24. New/unreviewed feed coordinates are not silently adopted as catalog points. Runtime totals remain data-driven; the frozen identity fixture is only a regression baseline.

The UI shows the evidence class and source when a report is selected. Its coverage disclosure separates supported references, limited approximations and inherited unverified points, and says that CBP wait reports do not certify coordinates. Wait freshness, closures, zero/missing values and report clocks are unchanged. Location evidence does not become a queue-confidence label.

**Release gate remains closed.** The remaining inherited/limited points still need authoritative geographic review. Directory targets and the federal facility point are not entrance/routing certification. Hosted product QA remains unrun behind Vercel authentication; no access changes are authorized.

## Regression coverage

Seven model checks cover source-target rounding within 15 m, rejection of the old kilometer-scale fallbacks, canonical crossing identity/aliases, Stanton's downtown relationship versus BOTA, Gateway/Veterans distinction, Donna/Progreso distinction, San Luis I DMS conversion versus the withheld II record, exact frozen-catalog coverage and all withheld points (including supplied feed coordinates). Existing geographic affine/negative controls, lane/clock/zero/gap, keyboard/Back, EN/ES, mobile and reduced-motion assertions remain.

The desktop and phone browser journeys additionally expose the coverage disclosure, verify inherited-source wording and primary source links, and open all four withheld reports without a guessed pin. Final full-suite, exact-head and preview results are recorded in PR #166; a focused pass alone is not full-suite approval.

## Updated local visual evidence

These captures use the actual dated repository snapshot, fetched 2026-11-01 20:37:32.153 UTC, without a frozen clock or fixture waits. The stale-data state is deliberately retained. They are local production-mode renders of the geography correction, not hosted-product QA. The earlier 6a4a0bd images/recording remain in Git history and the original review folder.

[Desktop overview](borderwide-map-review/geography/overview-1440-en.png) · [Phone overview](borderwide-map-review/geography/overview-390-es.png) · [Coverage disclosure](borderwide-map-review/geography/coverage-390-es.png) · [Stanton](borderwide-map-review/geography/stanton-1440-en.png) · [Gateway](borderwide-map-review/geography/gateway-1440-en.png) · [Pharr](borderwide-map-review/geography/pharr-390-es.png) · [San Luis I](borderwide-map-review/geography/san-luis-i-390-es.png) · [Otay report without a pin](borderwide-map-review/geography/otay-withheld-390-es.png) · [Capture receipt](borderwide-map-review/geography/capture-receipt.json)
