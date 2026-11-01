# Border-wide map geography correction — review only

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
