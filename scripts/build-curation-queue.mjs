import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const LATEST_FEED = path.resolve(root, 'drafts/curation/latest-feed.json');
const TIMELINES_OUT_DIR = path.resolve(root, 'public/data/timelines');
const MAX_TIMELINE_ENTRIES = 50;

// Extra aliases that map Mexican sister-city / POE sub-name references to ports.
// Keep these conservative to avoid false positives across unrelated stories.
const ALIAS_TO_PORT = {
  tijuana: ['250401', '250601', '250501'], // San Ysidro, Otay Mesa, Tecate
  'cross border xpress': ['250601'], // Otay Mesa area
  cbx: ['250601'],
  mexicali: ['250301', '250302'], // Calexico East + West
  algodones: ['250201'], // Andrade
  'los algodones': ['250201'],
  'san luis rio colorado': ['260601'], // San Luis
  'ciudad juarez': ['240221', '240201', '240202', '240203'], // All El Paso ports
  'cd juarez': ['240221', '240201', '240202', '240203'],
  'nuevo laredo': ['230404', '230401', '230403'], // All Laredo
  'piedras negras': ['230301', '230302'], // Eagle Pass
  'ciudad acuna': ['230201'], // Del Rio
  'acuna': ['230201'],
  reynosa: ['230501', '230502', '230503'], // Hidalgo/Pharr
  matamoros: ['535501', '535502', '535503', '535504'], // Brownsville
  'nogales sonora': ['260401', '260402', '260403'],
};

async function loadCrossings() {
  const p = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  return doc.crossings || [];
}

async function loadSlugMap() {
  const mod = await import(path.resolve(root, 'src/lib/slugs.js'));
  const crossings = await loadCrossings();
  const { portToSlug } = mod.buildSlugMap(crossings);
  return { portToSlug, crossings };
}

// Cities that have multiple ports. For these, we require the port sub-name
// (e.g. "Paso Del Norte", "World Trade Bridge") and never match on the city
// alone, to avoid classifying general city news as port news.
const MULTI_POE_CITIES = new Set([
  'el paso',
  'laredo',
  'eagle pass',
  'calexico',
  'nogales',
  'hidalgo/pharr',
  'brownsville',
  'progreso',
]);

// Ports with names that are too generic to auto-match reliably. Skip from the
// classifier and let the human triage. Port 240221 is formally named just
// "El Paso" in CBP data, which would match every city-of-El-Paso news item.
const SKIP_AUTO_CLASSIFY = new Set([
  '240221', // El Paso (bare city name, no sub-port identifier)
]);

// Build regex patterns per port. For single-POE cities we match the full
// canonical name. For multi-POE cities we match only the sub-name after the
// " - " separator plus any parenthetical code (PDN, BOTA, etc).
function buildPortPatterns(crossings) {
  const patterns = [];
  for (const c of crossings) {
    if (SKIP_AUTO_CLASSIFY.has(c.port_number)) continue;
    const name = c.name;
    const patternStrings = new Set();
    const cityPrefix = name.split(' - ')[0].trim().toLowerCase();
    const isMultiPoe = MULTI_POE_CITIES.has(cityPrefix);

    if (isMultiPoe) {
      // Sub-name after " - "
      const subName = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ') : name;
      const subNameCleaned = subName.replace(/\s*\(.*?\)\s*/g, '').trim();
      if (subNameCleaned.length >= 4) patternStrings.add(subNameCleaned);
      // Parenthetical code, e.g. "PDN", "BOTA"
      const paren = name.match(/\(([^)]+)\)/);
      if (paren && paren[1].length >= 3) patternStrings.add(paren[1]);
    } else {
      // Single-POE city: full name is fine.
      patternStrings.add(name);
      patternStrings.add(name.replace(/\s*\(.*?\)\s*/g, '').trim());
    }
    const cleanPatterns = Array.from(patternStrings).filter((s) => s.length >= 4);
    if (cleanPatterns.length === 0) continue;
    const regexParts = cleanPatterns.map((s) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
    );
    const regex = new RegExp(`\\b(?:${regexParts.join('|')})\\b`, 'i');
    patterns.push({ port_number: c.port_number, name: c.name, regex });
  }
  return patterns;
}

function classifyItem(item, portPatterns) {
  const haystack = `${item.title} ${item.summary}`;
  const matched = new Set();
  for (const p of portPatterns) {
    if (p.regex.test(haystack)) matched.add(p.port_number);
  }
  // Aliases
  const lower = haystack.toLowerCase();
  for (const [alias, portNumbers] of Object.entries(ALIAS_TO_PORT)) {
    if (lower.includes(alias)) {
      for (const pn of portNumbers) matched.add(pn);
    }
  }
  return Array.from(matched);
}

function mergeTimeline(existing, newEntries) {
  const byUrl = new Map();
  for (const e of existing.entries || []) byUrl.set(e.url, e);
  for (const e of newEntries) {
    const prev = byUrl.get(e.url);
    if (!prev || (e.published_at && e.published_at > (prev.published_at || ''))) {
      byUrl.set(e.url, e);
    }
  }
  const merged = Array.from(byUrl.values()).sort((a, b) => {
    return (b.published_at || '').localeCompare(a.published_at || '');
  });
  return merged.slice(0, MAX_TIMELINE_ENTRIES);
}

async function main() {
  if (!fs.existsSync(LATEST_FEED)) {
    console.error('[curation] no drafts/curation/latest-feed.json. Run fetch-news.mjs first.');
    process.exit(1);
  }
  const feed = JSON.parse(fs.readFileSync(LATEST_FEED, 'utf8'));
  const items = feed.items || [];

  const { portToSlug, crossings } = await loadSlugMap();
  const portPatterns = buildPortPatterns(crossings);

  const classified = [];
  const unmatched = [];
  const perPort = {}; // port_number -> entries[]

  for (const item of items) {
    const ports = classifyItem(item, portPatterns);
    const row = {
      id: item.id,
      title: item.title,
      url: item.url,
      summary: item.summary,
      source_name: item.source_name,
      source_category: item.source_category,
      published_at: item.published_at,
      port_numbers: ports,
    };
    if (ports.length === 0) {
      unmatched.push(row);
    } else {
      classified.push(row);
      for (const pn of ports) {
        (perPort[pn] = perPort[pn] || []).push(row);
      }
    }
  }

  // Write curation digest for PR review.
  const today = new Date().toISOString().slice(0, 10);
  const outDigest = path.resolve(root, `drafts/curation/${today}.json`);
  fs.writeFileSync(
    outDigest,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        total: items.length,
        classified: classified.length,
        unmatched: unmatched.length,
        items_by_port: Object.fromEntries(
          Object.entries(perPort).map(([pn, arr]) => [pn, arr.length]),
        ),
        classified_items: classified,
        unmatched_items: unmatched,
      },
      null,
      2,
    ),
  );

  // Update per-port timelines (append-only, capped).
  fs.mkdirSync(TIMELINES_OUT_DIR, { recursive: true });
  const crossingsByPort = Object.fromEntries(crossings.map((c) => [c.port_number, c]));
  let portsUpdated = 0;
  for (const [portNumber, newEntries] of Object.entries(perPort)) {
    const slug = portToSlug[portNumber];
    if (!slug) continue;
    const timelinePath = path.resolve(TIMELINES_OUT_DIR, `${slug}.json`);
    let existing = { port_number: portNumber, port_name: crossingsByPort[portNumber]?.name, entries: [] };
    if (fs.existsSync(timelinePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
      } catch {}
    }
    const merged = mergeTimeline(existing, newEntries);
    fs.writeFileSync(
      timelinePath,
      JSON.stringify(
        {
          port_number: portNumber,
          port_name: crossingsByPort[portNumber]?.name,
          slug,
          updated_at: new Date().toISOString(),
          entries: merged,
        },
        null,
        2,
      ),
    );
    portsUpdated += 1;
  }

  console.log(
    `[curation] ${classified.length} classified, ${unmatched.length} unmatched, ${portsUpdated} per-port timelines updated.`,
  );
  console.log(`[curation] digest: drafts/curation/${today}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
