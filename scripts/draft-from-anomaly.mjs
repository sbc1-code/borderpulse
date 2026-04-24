// Free, LLM-free template-based drafter for Mode A anomalies.
//
// Reads drafts/blog/auto-a/queue.json and emits one MDX draft per anomaly using
// a fixed template per anomaly type. The draft is ALWAYS flagged humanEdited:false,
// which the build-blog-index.mjs schema gate rejects for data-analysis posts.
// Sebastian rewrites the headline, lede, and adds local context, then flips
// humanEdited:true to publish.
//
// This is the default Mode A path. For richer LLM-drafted posts, use
// draft-from-anomaly-llm.mjs instead (requires ANTHROPIC_API_KEY).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatterSchema } from '../src/lib/blog-schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const QUEUE_PATH = path.resolve(root, 'drafts/blog/auto-a/queue.json');
const OUT_DIR = path.resolve(root, 'drafts/blog/auto-a');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatHour12(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12} ${suffix}`;
}

function stringifyFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`  - label: ${JSON.stringify(item.label)}`);
          lines.push(`    url: ${JSON.stringify(item.url)}`);
        } else {
          lines.push(`  - ${JSON.stringify(item)}`);
        }
      }
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

// TEMPLATE: lowest_today
// The data says a specific hour at this port was notably lighter than the
// 30-day overall median for the port. The draft sets up the chart + points
// at the hour. Human rewrites lede and adds local context.
function draftLowestToday(anomaly) {
  const { port_name, port_slug, port_number, evidence } = anomaly;
  const day = evidence.day_label;
  const hourStr = formatHour12(evidence.best_hour);
  const title = `${port_name}: ${day} at ${hourStr} is the lightest hour in the last 30 days`;
  const description = `Median wait at ${port_name} on ${day} at ${hourStr} is ${evidence.best_median} minutes, against a 30-day overall median of ${evidence.overall_median}. Draft auto-generated.`;

  const body = `<!-- DRAFT: human review required. Rewrite headline and lede before flipping humanEdited:true. -->

At ${port_name}, the lightest **${day}** hour over the last 30 days of CBP data is **${hourStr}**, with a median wait of **${evidence.best_median} minutes**. The 30-day overall median for the port is **${evidence.overall_median} minutes**.

<BestTimeChart slug="${port_slug}" title="${port_name}: median northbound wait by hour and day" />

## What the data shows

The chart is built from the last 30 days of CBP northbound wait snapshots at ${port_name}. The highlighted finding today: ${day} ${hourStr} sits roughly ${Math.round((1 - evidence.best_median / Math.max(1, evidence.overall_median)) * 100)}% below the port's overall median.

This is a median across ${evidence.samples} sample${evidence.samples === 1 ? '' : 's'} in that (day, hour) cell. With small sample counts a single quiet morning can move the cell. Confirm against the live page before relying on it.

## What this means for you

- If you can shift your crossing to ${day} ${hourStr}, expect materially shorter waits than the port's typical day.
- Peak hours at this port still run much higher. Check the full heatmap above for your actual day and hour.
- The live [${port_name} page](/crossing/${port_slug}) shows today's current wait alongside the same 30-day pattern, refreshed every 15 minutes.

<OfficialSource agency="U.S. Customs and Border Protection" url="https://bwt.cbp.gov/">
  CBP publishes live northbound wait times and the canonical list of port hours and lane types. The data used above comes from this feed. Always check the live number before you commit to a specific hour.
</OfficialSource>
`;

  return { title, description, body };
}

// TEMPLATE: sunday_spike
// Sunday evening peak is much higher than the port's overall median. The draft
// names the hour and multiplier and points at earlier crossings as the lever.
function draftSundaySpike(anomaly) {
  const { port_name, port_slug, evidence } = anomaly;
  const peakHour = formatHour12(evidence.peak_hour);
  const pct = Math.round(evidence.ratio * 100);
  const title = `${port_name}: Sunday ${peakHour} runs ${pct}% of the 30-day median`;
  const description = `At ${port_name}, the Sunday peak hour reaches ${evidence.peak_median} minutes median, versus ${evidence.overall_median} minutes for the port overall. Draft auto-generated.`;

  const body = `<!-- DRAFT: human review required. Rewrite headline and lede before flipping humanEdited:true. -->

On Sundays, the worst hour at **${port_name}** is **${peakHour}**, with a median wait of **${evidence.peak_median} minutes**. The port's 30-day overall median across all hours and days is **${evidence.overall_median} minutes**, so Sunday ${peakHour} runs roughly **${pct}% of the typical wait**.

<BestTimeChart slug="${port_slug}" title="${port_name}: median northbound wait by hour and day" />

## What the data shows

Sunday evening at ${port_name} follows the classic US-Mexico return pattern: families and weekend travelers heading back into the United States all at once. The chart above makes the Sunday afternoon and evening band visible as the darkest red in the heatmap.

This uses a median across ${evidence.samples} sample${evidence.samples === 1 ? '' : 's'} at ${peakHour}. Small sample counts mean the specific peak hour can shift week to week. What is stable is the Sunday afternoon-through-evening window itself.

## What this means for you

- If you have flexibility, finish a weekend trip by **Saturday night** or wait until **Monday morning** to avoid the Sunday peak.
- Within Sunday itself, **earlier in the day** is materially lighter than ${peakHour}. Check the heatmap for the specific hour that works for your schedule.
- The live [${port_name} page](/crossing/${port_slug}) shows today's current wait alongside this 30-day pattern.

<OfficialSource agency="U.S. Customs and Border Protection" url="https://bwt.cbp.gov/">
  CBP publishes live wait times every 15 minutes for every land POE. The 30-day pattern above is built from those snapshots. Always check the live number for the specific hour you plan to cross.
</OfficialSource>
`;

  return { title, description, body };
}

const TEMPLATES = {
  lowest_today: draftLowestToday,
  sunday_spike: draftSundaySpike,
};

async function main() {
  if (!fs.existsSync(QUEUE_PATH)) {
    console.error('[drafter] queue.json not found. Run detect-anomalies.mjs first.');
    process.exit(1);
  }
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  if (!queue.anomalies || queue.anomalies.length === 0) {
    console.log('[drafter] no anomalies in queue. Nothing to draft.');
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  let written = 0;
  let skipped = 0;
  for (const anomaly of queue.anomalies) {
    const template = TEMPLATES[anomaly.type];
    if (!template) {
      console.warn(`[drafter] no template for anomaly type "${anomaly.type}", skipping`);
      skipped += 1;
      continue;
    }
    const { title, description, body } = template(anomaly);
    const slug = `${anomaly.type.replace(/_/g, '-')}-${anomaly.port_slug}-${today}`;
    const fm = {
      title,
      description,
      slug,
      date: today,
      author: 'sebastian',
      pillar: 'data-analysis',
      lang: 'en',
      tags: [anomaly.port_slug, 'best-time-to-cross'],
      relatedCrossings: [anomaly.port_number],
      officialSources: [
        { label: 'CBP Border Wait Times', url: 'https://bwt.cbp.gov/' },
      ],
      draft: true,
      source: 'auto-a',
      humanEdited: false,
    };

    const fmValidation = frontmatterSchema.safeParse(fm);
    if (!fmValidation.success) {
      console.error(
        `[drafter] frontmatter validation failed for ${anomaly.port_slug}/${anomaly.type}:`,
        fmValidation.error.flatten().fieldErrors,
      );
      skipped += 1;
      continue;
    }

    const filePath = path.resolve(OUT_DIR, `${slug}.mdx`);
    const content = stringifyFrontmatter(fm) + body.trim() + '\n';
    fs.writeFileSync(filePath, content);
    console.log(`[drafter] wrote ${slug}.mdx`);
    written += 1;
  }

  console.log(`[drafter] done. ${written} drafts written, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
