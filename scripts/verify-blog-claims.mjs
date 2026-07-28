// Assert every factual claim I wrote into the posts against the shipped
// aggregate files. Any mismatch is a publishing error, not a rounding nit.
import fs from 'node:fs';
// Run with: node scripts/verify-blog-claims.mjs
// Fails loudly when a hardcoded figure in the best-time posts no longer matches
// the aggregates the chart on that same page reads from. The window is rolling,
// so expect this to drift; re-run it before touching those posts.
const AGG = new URL('../public/data/aggregates', import.meta.url).pathname;
const D = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const cache = new Map();
const load = (s) => {
  if (!cache.has(s)) cache.set(s, JSON.parse(fs.readFileSync(`${AGG}/${s}.json`, 'utf8')));
  return cache.get(s);
};
const med = (a) => { const x = [...a].sort((p, q) => p - q); const m = x.length >> 1; return x.length % 2 ? x[m] : Math.round((x[m - 1] + x[m]) / 2); };

let pass = 0; const fails = [];
const check = (label, actual, expected) => {
  if (actual === expected) pass += 1;
  else fails.push(`${label}: post says ${expected}, data says ${actual}`);
};
// cell median
const cell = (slug, day, hour) => {
  const c = load(slug).by_hour.find((x) => x.day === D[day] && x.hour === hour);
  return c && c.samples >= 5 ? c.median : null;
};
// day median = median of that day's cells clearing the floor
const dayMed = (slug, day) => med(load(slug).by_hour.filter((x) => x.day === D[day] && x.samples >= 5).map((x) => x.median));
const overall = (s) => load(s).overall_median;
const bestHour = (s) => load(s).overall_best_hour;
const bestMed = (s) => load(s).overall_best_median;
const rawN = (s) => load(s).sample_count;

// ---- San Ysidro
check('SY overall', overall('san-ysidro'), 120);
// Raw counts are hedged as "about N" in the posts. Assert the stated value is
// within 15 of reality, which is what "about" has to mean on a rolling window.
const about = (label, slug, stated) => check(`${label} about ${stated}`, Math.abs(rawN(slug) - stated) <= 15, true);
about('SY raw n', 'san-ysidro', 390);
for (const [d, v] of [['Mon', 160], ['Tue', 159], ['Sun', 140], ['Thu', 122], ['Wed', 120], ['Sat', 90], ['Fri', 60]]) check(`SY day ${d}`, dayMed('san-ysidro', d), v);
check('SY Sat 3a', cell('san-ysidro', 'Sat', 3), 25);
check('SY Sun 4a', cell('san-ysidro', 'Sun', 4), 30);
check('SY Fri 5a', cell('san-ysidro', 'Fri', 5), 33);
check('SY Fri 6a', cell('san-ysidro', 'Fri', 6), 40);
check('SY Fri 7a', cell('san-ysidro', 'Fri', 7), 40);
check('SY Fri 9p', cell('san-ysidro', 'Fri', 21), 40);
check('SY Fri 10p', cell('san-ysidro', 'Fri', 22), 40);
for (let h = 14; h <= 21; h += 1) check(`SY Sun ${h}h=170`, cell('san-ysidro', 'Sun', h), 170);
check('SY Mon 10a', cell('san-ysidro', 'Mon', 10), 140);
check('SY Mon 11a', cell('san-ysidro', 'Mon', 11), 140);
for (let h = 12; h <= 16; h += 1) check(`SY Tue ${h}h=170`, cell('san-ysidro', 'Tue', h), 170);
check('SY Mon 3a', cell('san-ysidro', 'Mon', 3), 170);
check('SY Tue 3a', cell('san-ysidro', 'Tue', 3), 150);
check('SY best hour', bestHour('san-ysidro'), 6);
check('SY best med', bestMed('san-ysidro'), 83);

// ---- Otay Mesa
check('OM overall', overall('otay-mesa'), 90);
for (const [d, v] of [['Tue', 150], ['Mon', 105], ['Wed', 103], ['Sun', 100], ['Thu', 90], ['Sat', 53], ['Fri', 50]]) check(`OM day ${d}`, dayMed('otay-mesa', d), v);
for (const h of [5, 6, 7]) check(`OM Sat ${h}a=10`, cell('otay-mesa', 'Sat', h), 10);
check('OM best hour', bestHour('otay-mesa'), 6);
check('OM best med', bestMed('otay-mesa'), 60);
for (const h of [19, 20, 21]) check(`OM Sun ${h}h=210`, cell('otay-mesa', 'Sun', h), 210);
check('OM Sun 6p', cell('otay-mesa', 'Sun', 18), 195);
check('OM Sat 7p', cell('otay-mesa', 'Sat', 19), 60);
check('OM Fri 7a', cell('otay-mesa', 'Fri', 7), 20);
check('OM Fri 5a', cell('otay-mesa', 'Fri', 5), 23);
for (let h = 14; h <= 18; h += 1) check(`OM Tue ${h}h=170`, cell('otay-mesa', 'Tue', h), 170);
for (const h of [7, 8, 9, 12, 13, 14]) check(`OM Wed ${h}h=210`, cell('otay-mesa', 'Wed', h), 210);
check('OM Sun 9a', cell('otay-mesa', 'Sun', 9), 90);
check('OM Mon 4a', cell('otay-mesa', 'Mon', 4), 85);
check('SY Mon 4a', cell('san-ysidro', 'Mon', 4), 165);
check('SY Wed 9a', cell('san-ysidro', 'Wed', 9), 120);
check('SY Sun 9a', cell('san-ysidro', 'Sun', 9), 118);

// ---- Tecate
check('TEC overall', overall('tecate'), 120);
about('TEC raw n', 'tecate', 310);
check('TEC best hour', bestHour('tecate'), 7);
check('TEC best med', bestMed('tecate'), 60);
check('TEC Mon 8p ~250', Math.round(cell('tecate','Mon',20)/10)*10, 250);
check('TEC Mon 7p ~210', Math.round(cell('tecate','Mon',19)/10)*10, 210);
check('TEC Mon 4p', cell('tecate','Mon',16), 200);
check('TEC Mon 5p', cell('tecate','Mon',17), 200);
check('TEC Sun 5p', cell('tecate', 'Sun', 17), 235);
check('TEC Sun 7p', cell('tecate', 'Sun', 19), 235);
check('TEC Sun 6p', cell('tecate', 'Sun', 18), 225);
check('TEC Fri 10a', cell('tecate', 'Fri', 10), 45);
check('TEC Fri 11a', cell('tecate', 'Fri', 11), 45);
check('TEC Sun 10a', cell('tecate', 'Sun', 10), 180);
check('TEC Sun 7a', cell('tecate', 'Sun', 7), 60);
check('SY Sun 7a', cell('san-ysidro', 'Sun', 7), 100);
for (const [d, v] of [['Mon', 180], ['Sun', 180], ['Fri', 98]]) check(`TEC day ${d}`, dayMed('tecate', d), v);

// ---- Calexico West
check('CW overall', overall('calexico-west'), 70);
about('CW raw n', 'calexico-west', 380);
check('CW Sun 5a', cell('calexico-west', 'Sun', 5), 10);
check('CW Sat 5a', cell('calexico-west', 'Sat', 5), 28);
for (const h of [4, 6, 7, 8]) check(`CW Sun ${h}a=30`, cell('calexico-west', 'Sun', h), 30);
check('CW best hour', bestHour('calexico-west'), 4);
check('CW best med', bestMed('calexico-west'), 45);
check('CW day Wed', dayMed('calexico-west', 'Wed'), 105);
for (const h of [6, 7, 8, 9, 10, 11]) check(`CW Wed ${h}a=120`, cell('calexico-west', 'Wed', h), 120);
check('CW Wed 12p', cell('calexico-west', 'Wed', 12), 140);
check('CW Tue 8a', cell('calexico-west', 'Tue', 8), 60);
check('CW Tue 1p', cell('calexico-west', 'Tue', 13), 138);
check('CW Sun 2p', cell('calexico-west', 'Sun', 14), 45);
check('CW Mon 9p', cell('calexico-west','Mon',21), 90);
check('CW Mon 8p in 70s-90', cell('calexico-west','Mon',20)>=70 && cell('calexico-west','Mon',20)<=90, true);

// ---- Nogales DeConcini
check('ND overall', overall('nogales-deconcini'), 45);
about('ND raw n', 'nogales-deconcini', 390);
check('ND day Mon 85-90', dayMed('nogales-deconcini','Mon')>=85 && dayMed('nogales-deconcini','Mon')<=90, true);
check('ND day Thu', dayMed('nogales-deconcini', 'Thu'), 35);
check('ND Mon 12a', cell('nogales-deconcini', 'Mon', 0), 120);
check('ND Mon 1a', cell('nogales-deconcini', 'Mon', 1), 120);
check('ND Wed 1a', cell('nogales-deconcini', 'Wed', 1), 0);
check('ND Wed 2a', cell('nogales-deconcini', 'Wed', 2), 10);
check('ND Wed 3a', cell('nogales-deconcini', 'Wed', 3), 10);
check('ND Wed 12a', cell('nogales-deconcini', 'Wed', 0), 23);
check('ND Sun 4a', cell('nogales-deconcini', 'Sun', 4), 10);
check('ND Sun 3a', cell('nogales-deconcini', 'Sun', 3), 15);
check('ND best hour', bestHour('nogales-deconcini'), 8);
check('ND best med', bestMed('nogales-deconcini'), 30);
check('ND Fri 3p', cell('nogales-deconcini', 'Fri', 15), 90);
check('ND Fri 4p', cell('nogales-deconcini', 'Fri', 16), 90);
check('ND Fri 6a', cell('nogales-deconcini', 'Fri', 6), 45);
check('MAR overall', overall('nogales-mariposa'), 50);
check('MAR best med', bestMed('nogales-mariposa'), 0);
check('MAR best hour', bestHour('nogales-mariposa'), 6);
check('MAR Fri 6a', cell('nogales-mariposa', 'Fri', 6), 10);
check('DOU overall', overall('douglas-raul-hector-castro'), 35);
check('SL overall', overall('san-luis-san-luis-i'), 25);
check('NACO overall', overall('naco'), 10);

// ---- Paso del Norte
const PDN = 'el-paso-paso-del-norte-pdn';
check('PDN overall', overall(PDN), 54);
about('PDN raw n', PDN, 380);
check('BOTA overall', overall('el-paso-bridge-of-the-americas-bota'), 65);
check('PDN Wed 2a', cell(PDN, 'Wed', 2), 24);
check('PDN day Wed', dayMed(PDN, 'Wed'), 43);
check('PDN day Sun', dayMed(PDN, 'Sun'), 69);
check('PDN day Mon 65', dayMed(PDN,'Mon'), 65);
check('PDN day Sat', dayMed(PDN, 'Sat'), 65);
check('PDN Sat 2p', cell(PDN, 'Sat', 14), 85);
check('PDN Sat 3p', cell(PDN, 'Sat', 15), 85);
check('PDN Sat 4a', cell(PDN, 'Sat', 4), 38);
check('PDN Sat 5a', cell(PDN, 'Sat', 5), 38);
check('PDN best hour', bestHour(PDN), 4);
check('PDN best med', bestMed(PDN), 25);

// ---- Hidalgo
const HID = 'hidalgo-pharr-hidalgo';
check('HID overall', overall(HID), 55);
about('HID raw n', HID, 380);
check('HID best hour', bestHour(HID), 8);
check('HID best med', bestMed(HID), 20);
for (const h of [6, 7, 8, 9]) check(`HID Wed ${h}a=15`, cell(HID, 'Wed', h), 15);
check('HID Fri 6a', cell(HID, 'Fri', 6), 18);
check('HID Fri 7a', cell(HID, 'Fri', 7), 18);
check('HID Sun 6a', cell(HID, 'Sun', 6), 20);
check('HID Sun 7a', cell(HID, 'Sun', 7), 20);
check('HID Mon 4p', cell(HID, 'Mon', 16), 75);
check('HID Mon 3p', cell(HID, 'Mon', 15), 73);
check('HID Mon 5p', cell(HID, 'Mon', 17), 70);
check('HID day Fri', dayMed(HID, 'Fri'), 60);
check('HID day Wed', dayMed(HID, 'Wed'), 60);
check('HID day Sun', dayMed(HID, 'Sun'), 45);
check('HID day Tue', dayMed(HID, 'Tue'), 45);
check('HID Thu 6a', cell(HID, 'Thu', 6), 50);
check('HID Sat 7a', cell(HID, 'Sat', 7), 43);

console.log(`\n${pass} claims verified against the aggregates`);
if (fails.length) { console.log(`\n${fails.length} MISMATCH:`); fails.forEach((f) => console.log('  ' + f)); process.exit(1); }
console.log('no mismatches');
