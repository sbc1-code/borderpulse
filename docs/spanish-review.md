# Spanish Copy Review — Guide Pages + Predictions

Date: 2026-05-27
Status: Needs Sebastian review

## Guide Pages (src/lib/guideData.js)

The Spanish copy in guide tips and FAQ was written idiomatically but
without accents (diacritics) — e.g., "mas" instead of "más",
"rapido" instead of "rápido". This was intentional to avoid encoding
issues, but Sebastian should decide whether to add accents for
production.

### Items to review:

1. **San Ysidro tips** — "mas transitado del hemisferio occidental" reads
   naturally but confirm phrasing.

2. **Otay Mesa tips** — "No hay cruce peatonal disponible en Otay Mesa.
   Debes cruzar en vehiculo." — Verify tone (direct imperative).

3. **Tecate tips** — "Vale la pena si quieres evitar la congestion de
   San Ysidro" — Conversational tone, confirm OK.

4. **All FAQ answers** — Written in a neutral informational tone. Verify
   the SENTRI application process description is accurate for MX audience.

## Predictions Page (src/pages/Predictions.jsx)

5. **Holiday names** — "Dia de la Constitucion", "Natalicio de Benito
   Juarez", "Dia de la Revolucion" — standard MX names, confirm.

6. **Methodology disclaimer** — "Cada prediccion muestra la mediana de
   espera hacia EE.UU. observada en este cruce..." — Technical phrasing,
   verify it reads clearly to a non-technical Spanish speaker.

## General note

All Spanish copy follows the existing BorderPulse pattern: informal
"tu" register (not "usted"), consistent with the rest of the site.
Bilingual toggle is handled by the existing useLanguage hook — the
guide and predictions pages respond to the global toggle like every
other page.
