import { z } from 'zod';

export const PILLARS = ['data-analysis', 'crossing-guides', 'policy-programs', 'traveler-tips'];
export const LANGS = ['en', 'es'];

export const officialSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export const SOURCES = ['human', 'auto-a', 'auto-b', 'curated'];

export const frontmatterSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(80).max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  author: z.string().min(1),
  pillar: z.enum(PILLARS),
  lang: z.enum(LANGS),
  tags: z.array(z.string()).max(6).optional().default([]),
  hero: z.string().optional(),
  ogImage: z.string().optional(),
  translationKey: z.string().optional(),
  relatedCrossings: z.array(z.string()).optional().default([]),
  officialSources: z.array(officialSourceSchema).optional().default([]),
  draft: z.boolean().optional().default(false),
  source: z.enum(SOURCES).optional().default('human'),
  humanEdited: z.boolean().optional().default(true),
});
