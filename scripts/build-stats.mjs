// Aggregate publishable stats about the dataset for /about and B2B context.
// Written each prebuild so /data/stats.json reflects the current snapshot.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const crossingsDoc = readJsonSafe(path.resolve(root, 'public/data/crossings.json'));
  const crossings = crossingsDoc?.crossings || [];

  const aggDir = path.resolve(root, 'public/data/aggregates');
  const aggFiles = fs.existsSync(aggDir)
    ? fs.readdirSync(aggDir).filter((f) => f.endsWith('.json'))
    : [];

  let totalSamples = 0;
  let lookbackDays = 0;
  let aggregatesWithData = 0;
  for (const f of aggFiles) {
    const d = readJsonSafe(path.resolve(aggDir, f));
    if (!d) continue;
    if (typeof d.sample_count === 'number') {
      totalSamples += d.sample_count;
      if (d.sample_count > 0) aggregatesWithData++;
    }
    if (typeof d.lookback_days === 'number') {
      lookbackDays = Math.max(lookbackDays, d.lookback_days);
    }
  }

  const blog = readJsonSafe(path.resolve(root, 'public/data/blog/index.json'));
  const posts = blog?.posts || [];
  const blogPostsTotal = posts.length;
  const blogPostsEs = posts.filter((p) => p.lang === 'es').length;
  const blogPostsEn = blogPostsTotal - blogPostsEs;

  const timelineIndex = readJsonSafe(path.resolve(root, 'public/data/timelines/index.json'));
  const timelineCrossings = Array.isArray(timelineIndex?.slugs) ? timelineIndex.slugs.length : 0;

  const stats = {
    crossings: crossings.length,
    aggregates: aggFiles.length,
    aggregates_with_data: aggregatesWithData,
    total_samples: totalSamples,
    lookback_days: lookbackDays,
    refresh_minutes: 15,
    blog_posts: blogPostsTotal,
    blog_posts_en: blogPostsEn,
    blog_posts_es: blogPostsEs,
    timeline_crossings: timelineCrossings,
    api_endpoints: 5,
    generated_at: new Date().toISOString(),
  };

  const out = path.resolve(root, 'public/data/stats.json');
  fs.writeFileSync(out, JSON.stringify(stats, null, 2));
  console.log(
    `[stats] ${stats.crossings} crossings, ${stats.total_samples} samples, ${stats.blog_posts} posts (${stats.blog_posts_en} EN / ${stats.blog_posts_es} ES)`,
  );
}

main();
