# BorderPulse Atlas pilot

Open `atlas.html` in a browser. The globe, directory and saved observations run offline. The links to BorderPulse guides and reporting agencies need an internet connection.

## What the capture covers

The pilot matches three Washington–British Columbia crossings across two official sources and two vehicle types. The file is a historical capture taken around 23:40 in California on November 23, 2026 (07:40 UTC on November 24). The Canadian observations cover entry into Canada. The U.S. observations cover general passenger and commercial lanes entering Washington. NEXUS and FAST lanes are outside this sample.

The Mexico directory links to the existing BorderPulse pages for 42 crossing records. The repository supplies approximate locations for 40. El Paso Downtown and San Luis II appear in the directory without map coordinates. Names, canonical routes and facility coordinates were matched by port ID at [the recorded base revision](https://github.com/sbc1-code/borderpulse/tree/a57f6015861b7ef66874bc41555d0104343553d1). See `src/lib/slugs.js`, `src/lib/geo.js`, `public/data/crossings.json` and `public/sitemap.xml` in that revision.

## Replay the data checks

Run these commands from this directory with Node installed. The first command runs the offline regression and multi-update replay tests (`test-canada-fixture.mjs`, `test-us-fixture.mjs`, and `test-replay-sequence.mjs`). Each subsequent command reproduces a data snapshot or embeds the snapshots in the standalone page.

```sh
node --test scripts/test-*.mjs
node scripts/canada-fixture.mjs > fixtures/canada.json
node scripts/us-fixture.mjs > fixtures/us-lanes.json
node scripts/embed-atlas.mjs
```

With the repository's browser-test dependencies installed and Chrome available, run `node scripts/check-atlas-browser.mjs` for the desktop and narrow-screen checks. Set `ATLAS_SCREENSHOT_DIR` to save the rendered views.

The raw English and French Canadian excerpts include the original header and selected records. `fixtures/capture.json` gives the source URLs, retrieval times, and SHA-256 hashes of the full files and excerpts. The U.S. fixture holds the three raw port objects, retrieval time and a hash of the source response. The two readers are scoped to these ports and the evidence format in this capture.

## Reading the sample

CBSA's “No Delay” is a category covering five minutes or less. Its numeric value is left empty. A reported wait, an inapplicable vehicle type, a closure and a missing value each have their own state. CBP publishes a separate clock for each lane. The pilot displays an older U.S. lane report as historical when its age at capture exceeds the trial threshold of two hours. The source report clock and retrieval clock remain separate. The trial threshold is a design choice to review before attaching a live feed.

The Canadian parser retains the B.C. source stamp and computes UTC using the verified offset for the three pilot locations and dates it accepts. Washington has a separate clock. World boundaries provide geographic context. The sample supplies too little evidence to assign a severity to an entire national border.

## Sources and attribution

- Canada Border Services Agency. Contains information licensed under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada). [Dataset and both language files](https://open.canada.ca/data/dataset/d4a716f5-a2fc-4c3c-88ed-451fe05900e4) · [field dictionary](https://www.cbsa-asfc.gc.ca/data/bwt-taf--ref.odt).
- U.S. Customs and Border Protection. [Border wait-time data](https://bwt.cbp.gov/api/waittimes) · [measurement FAQ](https://bwt.cbp.gov/mfaq.html).
- Geography uses [Natural Earth](https://www.naturalearthdata.com/), in the public domain. The offline map uses the QGIS distribution of this geography. Approximate crossing locations support browsing only.
