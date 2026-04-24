import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callDrafter } from './lib/anthropic-client.mjs';
import { frontmatterSchema } from '../src/lib/blog-schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const QUEUE_PATH = path.resolve(root, 'drafts/blog/auto-a/queue.json');

function loadAggregate(slug) {
  const p = path.resolve(root, 'public/data/aggregates', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadCrossingMeta(portNumber) {
  const p = path.resolve(root, 'public/data/crossings.json');
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  return (doc.crossings || []).find((c) => c.port_number === portNumber) || null;
}

function loadCrossingSlugs() {
  const indexPath = path.resolve(root, 'public/data/crossings.json');
  const mod = fs.readFileSync(path.resolve(root, 'src/lib/slugs.js'), 'utf8');
  return { mod, indexPath };
}

function formatUserMessage(anomaly) {
  const aggregate = loadAggregate(anomaly.port_slug);
  const crossing = loadCrossingMeta(anomaly.port_number);
  const today = new Date().toISOString().slice(0, 10);

  return [
    `ANOMALY DETECTED.`,
    ``,
    `Port: ${anomaly.port_name} (${anomaly.port_number}), slug: ${anomaly.port_slug}, state: ${anomaly.state}`,
    `Type: ${anomaly.type}`,
    `Finding: ${anomaly.finding}`,
    `Today (ISO): ${today}`,
    ``,
    `Evidence (do not contradict these numbers):`,
    '```json',
    JSON.stringify(anomaly.evidence, null, 2),
    '```',
    ``,
    `Full 30-day aggregate for this port:`,
    '```json',
    JSON.stringify(aggregate, null, 2),
    '```',
    ``,
    `Crossing metadata:`,
    '```json',
    JSON.stringify(crossing, null, 2),
    '```',
    ``,
    `Please produce the draft via the write_post_draft tool. Use:`,
    `- frontmatter.slug: "${anomaly.type.replace(/_/g, '-')}-${anomaly.port_slug}-${today}"`,
    `- frontmatter.date: "${today}"`,
    `- frontmatter.author: "sebastian"`,
    `- frontmatter.pillar: "data-analysis"`,
    `- frontmatter.lang: "en"`,
    `- frontmatter.relatedCrossings: ["${anomaly.port_number}"]`,
    `- frontmatter.draft: true`,
    `- frontmatter.humanEdited: false`,
    `- frontmatter.source: "auto-a"`,
    ``,
    `Use <BestTimeChart slug="${anomaly.port_slug}" title="..." /> to render the heatmap.`,
  ].join('\n');
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
    } else if (typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

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

  const outDir = path.resolve(root, 'drafts/blog/auto-a');
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  let failed = 0;
  for (const anomaly of queue.anomalies) {
    const userMessage = formatUserMessage(anomaly);
    try {
      const draft = await callDrafter({ userMessage });
      const fm = {
        ...draft.frontmatter,
        draft: true,
        humanEdited: false,
        source: draft.frontmatter.source || 'auto-a',
      };

      const fmValidation = frontmatterSchema.safeParse(fm);
      if (!fmValidation.success) {
        console.error(`[drafter] frontmatter validation failed for ${anomaly.port_slug}/${anomaly.type}:`);
        console.error(JSON.stringify(fmValidation.error.flatten().fieldErrors, null, 2));
        failed += 1;
        continue;
      }

      const fileName = `${fm.slug}.mdx`;
      const filePath = path.resolve(outDir, fileName);
      const content = stringifyFrontmatter(fm) + draft.body.trim() + '\n';
      fs.writeFileSync(filePath, content);
      console.log(`[drafter] wrote ${fileName}`);
      written += 1;
    } catch (err) {
      console.error(`[drafter] failed for ${anomaly.port_slug}/${anomaly.type}: ${err.message}`);
      failed += 1;
    }
  }

  console.log(`[drafter] done. ${written} drafts written, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
