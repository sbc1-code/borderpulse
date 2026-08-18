#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugMap } from '../src/lib/slugs.js';
import { isAnyDayHourEligible } from '../src/lib/recommendations.js';
import { pickLightestHour } from '../src/lib/recommendations.js';
import { isHourWithinOperatingHours } from '../src/components/utils/crossingMeta.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const crossingsPath = path.resolve(root, 'public/data/crossings.json');
const aggregatesDir = path.resolve(root, 'public/data/aggregates');
const rankingsPath = path.resolve(root, 'public/data/rankings.json');
const crossings = JSON.parse(fs.readFileSync(crossingsPath, 'utf8')).crossings || [];
const { portToSlug } = buildSlugMap(crossings);

const violations = [];
let overallChecked = 0;
let dailyChecked = 0;

for (const crossing of crossings) {
  const slug = portToSlug[crossing.port_number];
  if (!slug) continue;
  const aggregatePath = path.resolve(aggregatesDir, `${slug}.json`);
  if (!fs.existsSync(aggregatePath)) continue;
  const aggregate = JSON.parse(fs.readFileSync(aggregatePath, 'utf8'));

  if (aggregate.overall_best_hour != null) {
    overallChecked += 1;
    if (!isAnyDayHourEligible(crossing, aggregate.overall_best_hour)) {
      violations.push(`${crossing.name}: overall ${aggregate.overall_best_hour}`);
    }
  }

  for (let day = 0; day < 7; day += 1) {
    const best = pickLightestHour(crossing, aggregate.by_hour, day);
    if (!best) continue;
    dailyChecked += 1;
    if (!isHourWithinOperatingHours(crossing, best.day, best.hour)) {
      violations.push(`${crossing.name}: day ${day} ${best.hour}`);
    }
  }
}

if (fs.existsSync(rankingsPath)) {
  const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8')).crossings || [];
  for (const row of rankings) {
    if (row.best_hour == null) continue;
    const crossing = crossings.find((candidate) => portToSlug[candidate.port_number] === row.slug);
    if (!crossing) continue;
    if (!isAnyDayHourEligible(crossing, row.best_hour)) {
      violations.push(`${crossing.name}: ranking ${row.best_hour}`);
    }
  }
}

console.log(`[audit] checked ${overallChecked} overall and ${dailyChecked} daily recommendations`);
console.log(`[audit] out-of-hours recommendations: ${violations.length}`);
if (violations.length) {
  for (const violation of violations) console.error(`[audit] ${violation}`);
  process.exitCode = 1;
}
