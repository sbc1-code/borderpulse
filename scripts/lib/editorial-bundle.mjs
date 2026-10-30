// Transport contract for genuine assistant synthesis. This module does not call
// a model and cannot prove semantic entailment. It verifies the evidence and
// review record, then passes article strings as data to a trusted text renderer.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const utc = z.iso.datetime({ precision: 3 });
const prose = z.string().trim().min(1).max(1600);
const bilingual = z.strictObject({ en: prose, es: prose });
const origin = z.strictObject({ system: z.enum(['chatgpt-scheduled-task', 'codex-local', 'chatgpt-interactive']), runId: z.string().min(1).max(160),
  model: z.string().min(1).max(100).nullable(), at: utc });
export const editorialBundleSchema = z.strictObject({
  version: z.literal('borderpulse-editorial-v1'),
  id: id.refine(v => /^\d{4}-\d{2}-\d{2}-/.test(v), 'Start submission id with its UTC date'),
  topicKey: id,
  category: z.enum(['operations-report', 'source-explainer', 'product-guide']),
  createdAt: utc,
  synthesizedBy: origin,
  title: z.strictObject({ en: z.string().min(12).max(80), es: z.string().min(12).max(80) }),
  readerValue: bilingual,
  relatedCrossings: z.array(z.string().regex(/^[a-z0-9]{6}$/)).max(5),
  sources: z.array(z.strictObject({ id, url: z.url(), title: z.string().min(1).max(180),
    role: z.enum(['primary', 'secondary-discovery']), publishedDate: z.iso.date().nullable(), publishedAt: utc.nullable(), checkedAt: utc,
    publicationDateEvidence: z.string().min(1).max(160).nullable() })).min(1).max(8),
  claims: z.array(z.strictObject({ id, type: z.enum(['reported-fact', 'background', 'inference']), text: bilingual,
    evidence: z.array(z.strictObject({ sourceId: id, excerpt: z.string().trim().min(3).max(240) })).min(1).max(5),
    basisClaimIds: z.array(id).max(8), preserveTerms: z.array(z.string().min(1).max(100)).max(10) })).min(2).max(16),
  // The article order is a claim graph, not arbitrary executable MDX.
  articleClaimIds: z.array(id).min(2).max(16),
  review: z.strictObject({ performedBy: origin, method: z.literal('ai-source-and-language-review'),
    claimIdsChecked: z.array(id).min(2).max(16), semanticSupport: z.literal('pass'),
    scopeAndDates: z.literal('pass'), riskClassification: z.literal('routine-factual-reporting'), translationConsistency: z.literal('pass'),
    duplicateTopicCheck: z.literal('pass'), headlineAndReaderValue: z.literal('pass'), sourceInstructionsIgnored: z.literal(true),
    holds: z.array(z.string().min(1).max(200)).max(10), rationale: z.string().min(40).max(1200) }),
});
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const assert = (v, message) => { if (!v) throw new Error(message); };
export const normalize = value => String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const words = value => normalize(value).split(/\s+/).filter(Boolean);
const numeric = value => [...new Set(String(value).match(/\d+(?:[.,:]\d+)*/g) || [])].sort();
const canonicalUrl = value => {
  const url = new URL(value);
  assert(url.protocol === 'https:' && !url.username && !url.password && !url.port, 'Only ordinary HTTPS source URLs are accepted');
  url.hash = '';
  for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(k)) url.searchParams.delete(k);
  return url.href;
};
const PRIMARY_HOSTS = ['www.cbp.gov', 'cbp.gov', 'bwt.cbp.gov', 'dot.ca.gov', 'borderpulse.com'];
export function sourceUrl(value) {
  const url = canonicalUrl(value);
  assert(PRIMARY_HOSTS.includes(new URL(url).hostname), 'Primary source host is outside the initial official-source allowlist');
  return url;
}
const riskPattern = /\b(?:passport|visa|asylum|deportation|i-94|vaccine|vaccination|rabies|medical|health requirement|entry requirement|immigration eligibility|avoid inspection|guaranteed entry|pasaporte|visado|asilo|deportaci[oó]n|vacuna|rabia|requisito[s]? de (?:entrada|salud)|garanti[za].{0,15}(?:entrada|inspecci[oó]n))\b/i;
const liveWaitPattern = /(?:\b(?:live|current|right now)\b.{0,35}\b(?:wait|queue)\b|\b(?:espera|fila)\b.{0,35}\b(?:ahora|actual(?:es)?)\b)/i;

export function checkBundle(input, { now = Date.now(), existing = [], portIds = null } = {}) {
  const b = editorialBundleSchema.parse(input);
  assert(b.id.startsWith(b.createdAt.slice(0, 10) + '-'), 'Submission date/id mismatch');
  for (const t of [b.createdAt, b.synthesizedBy.at, b.review.performedBy.at, ...b.sources.map(s => s.checkedAt)]) {
    assert(Date.parse(t) <= now && now - Date.parse(t) <= 24 * 3_600_000, 'Authoring, review or source check is stale/future-dated');
  }
  assert(Date.parse(b.synthesizedBy.at) <= Date.parse(b.review.performedBy.at), 'Review precedes synthesis');
  assert(!b.review.holds.length, 'Editorial risk or uncertainty remains held');
  const ids = a => a.map(x => x.id);
  assert(new Set(ids(b.sources)).size === b.sources.length && new Set(ids(b.claims)).size === b.claims.length, 'Duplicate source/claim id');
  const primary = b.sources.filter(s => s.role === 'primary');
  assert(primary.length > 0, 'No primary source');
  for (const s of b.sources) canonicalUrl(s.url);
  assert(JSON.stringify(numeric(b.title.en)) === JSON.stringify(numeric(b.title.es)), 'Headline translation changes numbers');
  const urls = primary.map(s => sourceUrl(s.url));
  assert(b.category === 'product-guide' || urls.every(u => new URL(u).hostname !== 'borderpulse.com'), 'BorderPulse is primary only for its own product, not external operations news');
  assert(new Set(urls).size === urls.length, 'Duplicate canonical primary URL');
  const claims = new Map(b.claims.map(c => [c.id, c]));
  assert(b.articleClaimIds.length === b.claims.length && new Set(b.articleClaimIds).size === b.claims.length
    && b.articleClaimIds.every(k => claims.has(k)), 'Article omits, duplicates or invents claims');
  assert(new Set(b.review.claimIdsChecked).size === b.claims.length && b.review.claimIdsChecked.length === b.claims.length
    && b.review.claimIdsChecked.every(k => claims.has(k)), 'AI evidence review does not cover every claim');
  if (portIds) assert(b.relatedCrossings.every(p => portIds.has(p)), 'Unknown related crossing identity');
  const excerpts = new Map();
  for (const c of b.claims) {
    assert(JSON.stringify(numeric(c.text.en)) === JSON.stringify(numeric(c.text.es)), `Numeric translation mismatch: ${c.id}`);
    for (const term of c.preserveTerms) assert(['en','es'].every(l => normalize(c.text[l]).includes(normalize(term))), `Named term changed: ${c.id}`);
    const evidence = c.evidence.map(e => {
      const s = primary.find(s => s.id === e.sourceId);
      assert(s, 'Every published claim needs primary support; secondary discovery is not verification');
      if (!excerpts.has(s.id)) excerpts.set(s.id, new Set());
      excerpts.get(s.id).add(normalize(e.excerpt));
      return e.excerpt;
    }).join(' ');
    assert(numeric(c.text.en).every(n => numeric(evidence).includes(n)), `Untraced numeric claim: ${c.id}`);
    assert(c.basisClaimIds.every(k => k !== c.id && claims.has(k) && claims.get(k).type !== 'inference'), 'Invalid inference basis');
    if (c.type === 'inference') assert(c.basisClaimIds.length > 0, 'Inference lacks factual basis');
    else assert(c.basisClaimIds.length === 0, 'Only labeled inference may declare derived context');
  }
  for (const source of primary) {
    assert(excerpts.has(source.id), 'Unused primary source is not corroboration');
    assert(words([...excerpts.get(source.id)].join(' ')).length <= 25, 'Public source excerpts exceed the conservative per-source cap');
    if (b.category === 'operations-report') {
      const publicationClock = source.publishedAt ? Date.parse(source.publishedAt) : source.publishedDate ? Date.parse(source.publishedDate + 'T00:00:00.000Z') : NaN;
      assert(source.publicationDateEvidence && publicationClock <= now && now - publicationClock <= 72 * 3_600_000,
    'Operations news needs an explicit source publication date within 72 hours');
    }
  }
  for (const l of ['en','es']) {
    const body = b.claims.map(c => c.text[l]).join(' ');
    assert(words(body).length >= 80 && words(body).length <= 1500, 'Article is too thin or oversized');
    assert(!riskPattern.test(body + ' ' + b.title[l]), 'Legal, entry, immigration, health or safety subject requires human review');
    assert(!liveWaitPattern.test(body), 'Live/current-wait interpretation must use the dedicated measured-data path');
    const claimNumbers = b.claims.flatMap(c => numeric(c.text[l]));
    assert(numeric(b.title[l]).every(n => claimNumbers.includes(n)), 'Untraced headline number');
  }
  const fingerprint = hash(b.claims.map(c => ({ text: normalize(c.text.en), sources: c.evidence.map(e => canonicalUrl(primary.find(s => s.id === e.sourceId).url)).sort() })));
  assert(!existing.some(p => p.editorialFingerprint === fingerprint), 'Duplicate finding');
  assert(!existing.some(p => p.topicKey === b.topicKey && Date.parse(p.date) >= now - 30 * 86_400_000), 'Topic already covered in the last 30 days');
  return { bundle: b, fingerprint };
}

export function pageText(html) {
  return String(html).replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
export async function fetchPrimary(url, fetcher = fetch) {
  let current = sourceUrl(url);
  for (let i = 0; i < 4; i++) {
    const response = await fetcher(current, {redirect:'manual',signal:AbortSignal.timeout(20_000),headers:{'User-Agent':'BorderPulseEvidence/1.0 (+https://borderpulse.com)'}});
    if ([301,302,303,307,308].includes(response.status)) { current = sourceUrl(new URL(response.headers.get('location'), current).href); continue; }
    assert(response.ok, `Primary source unavailable: HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    assert(/text\/html|text\/plain|application\/json/.test(type), 'Unsupported source format; explicit extraction/review needed');
    let bytes = 0, chunks = [];
    for await (const chunk of response.body) { bytes += chunk.byteLength; assert(bytes <= 1_000_000, 'Source page too large'); chunks.push(Buffer.from(chunk)); }
    const text = pageText(Buffer.concat(chunks).toString('utf8'));
    assert(text.length >= 40, 'Primary page has no usable content');
    return { text, url:current, type };
  }
  throw new Error('Too many source redirects');
}
export async function verifyBundle(input, options = {}) {
  const {bundle:b, fingerprint} = checkBundle(input, options);
  const clock = () => new Date(options.now ?? Date.now()).toISOString();
  const confirmations = [];
  for (const s of b.sources.filter(s => s.role === 'primary')) {
    const page = await fetchPrimary(s.url, options.fetcher);
    const normalized = normalize(page.text);
    const evidence = b.claims.flatMap(c => c.evidence).filter(e => e.sourceId === s.id);
    for (const e of evidence) assert(normalized.includes(normalize(e.excerpt)), `Source support excerpt absent/changed: ${s.id}`);
    if (s.publicationDateEvidence) assert(normalized.includes(normalize(s.publicationDateEvidence)), 'Source publication-date evidence absent');
    confirmations.push({sourceId:s.id,url:page.url,verifiedAt:clock(),contentType:page.type,textHash:hash(normalized),excerptHashes:[...new Set(evidence.map(e => hash(normalize(e.excerpt))))].sort()});
  }
  return {version:'borderpulse-editorial-receipt-v1', admittedAt:clock(), fingerprint, bundle:b, confirmations};
}
const plainText = text => String(text).replace(/\s+/g, ' ');
export function renderEditorial(receipt, lang, draft = false) {
  assert(['en','es'].includes(lang), 'Unsupported editorial language');
  const b = receipt.bundle, es = lang === 'es', slug = b.id + (es ? '-es' : '');
  const fm = {title:b.title[lang],description:es
    ? 'Informe redactado por IA con enlaces a fuentes primarias, revisión de evidencia y traducción, fechas explícitas y límites de interpretación.'
    : 'An AI-written report with primary-source links, recorded evidence and translation review, explicit dates and limits on interpretation.',
    slug,date:receipt.admittedAt.slice(0,10),author:'borderpulse-editorial-ai',pillar:'traveler-tips',lang,
    tags:['source-checked',b.category],translationKey:b.id,relatedCrossings:b.relatedCrossings,
    officialSources:b.sources.filter(s=>s.role==='primary').map(s=>({label:s.title,url:s.url})),draft,source:'ai-editorial',humanEdited:false,
    editorialReceipt:b.id+'.json',editorialFingerprint:receipt.fingerprint,topicKey:b.topicKey};
  const primary = b.sources.filter(s=>s.role==='primary'), map = new Map(b.claims.map(c=>[c.id,c]));
  const paragraphs = b.articleClaimIds.map(k=>{const c=map.get(k);const label=c.type==='inference'?(es?'Interpretación:':'Interpretation:'):null;
    const refs=[...new Set(c.evidence.map(e=>e.sourceId))].map(id=>primary.find(s=>s.id===id));
    return {label,text:plainText(c.text[lang]),sources:refs.map(s=>({label:plainText(s.title),url:canonicalUrl(s.url)}))};});
  const disclosure=es?'Redactado y revisado por IA. Sin revisión humana individual.':'Written and reviewed by AI. No individual human review.';
  const dates=primary.map(s=>({label:plainText(s.title),url:canonicalUrl(s.url),published:s.publishedAt || (s.publishedDate ? s.publishedDate + (es?' (hora no indicada)':' (time not stated)') : (es?'no indicada':'not stated'))}));
  const limits=es?'Las fuentes y fechas citadas delimitan este artículo. La revisión de IA puede pasar por alto contexto o diferencias de traducción; consulta la fuente enlazada para ver el aviso completo y sus actualizaciones.':'The cited sources and dates bound this article. AI review can miss context or translation differences; read the linked source for the complete notice and later updates.';
  fm.editorialArticle={version:'borderpulse-editorial-article-v1',disclosure,paragraphs,sourcesHeading:es?'Fuentes y límites':'Sources and limits',
    dates,publishedLabel:es?'publicación':'published',verifiedLabel:es?'verificada':'verified',verifiedAt:receipt.admittedAt,limits,
    evidence:{label:es?'Registro de evidencia y revisión':'Evidence and review record',url:`https://borderpulse.com/data/editorial-evidence/${b.id}.json`}};
  // The frontmatter plugin turns JSON/YAML values into ESTree literals. No
  // claim, source label, or URL is interpolated into the fixed MDX program.
  return '---\n'+Object.entries(fm).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')+'\n---\n\n'
    +"import EditorialArticle from '@/components/blog/EditorialArticle.js';\n\n"
    +'<EditorialArticle article={frontmatter.editorialArticle} />\n';
}
export function validateEditorialPosts(root) {
  const dir=path.join(root,'src/content/blog'),pairs=new Map();
  for (const file of fs.readdirSync(dir).filter(f=>f.endsWith('.mdx'))) {
    const raw=fs.readFileSync(path.join(dir,file),'utf8'),fm=matter(raw).data;
    if(fm.source!=='ai-editorial'&&!fm.editorialReceipt&&!fm.editorialFingerprint)continue;
    assert(/^[a-z0-9-]+\.json$/.test(fm.editorialReceipt),'Missing/unsafe editorial receipt');
    const r=JSON.parse(fs.readFileSync(path.join(root,'public/data/editorial-evidence',fm.editorialReceipt),'utf8'));
    assert(r.version==='borderpulse-editorial-receipt-v1','Unknown editorial receipt version');
    const checked=checkBundle(r.bundle,{now:Date.parse(r.admittedAt)});
    assert(r.fingerprint===checked.fingerprint,'Editorial fingerprint changed');
    const primary=r.bundle.sources.filter(s=>s.role==='primary');
    assert(r.confirmations.length===primary.length,'Missing primary confirmation');
    for(const s of primary){const p=r.confirmations.find(p=>p.sourceId===s.id);assert(p&&sourceUrl(p.url)&&Date.parse(p.verifiedAt)<=Date.parse(r.admittedAt)&&Date.parse(r.admittedAt)-Date.parse(p.verifiedAt)<=10*60_000&&/^[a-f0-9]{64}$/.test(p.textHash),'Invalid source confirmation');
      const hashes=[...new Set(r.bundle.claims.flatMap(c=>c.evidence).filter(e=>e.sourceId===s.id).map(e=>hash(normalize(e.excerpt))))].sort();
      assert(JSON.stringify(hashes)===JSON.stringify(p.excerptHashes),'Source excerpts changed after verification');}
    assert(raw===renderEditorial(r,fm.lang,false)&&file===fm.slug+'.mdx','Editorial content differs from checked receipt');
    if(!pairs.has(fm.translationKey))pairs.set(fm.translationKey,[]);pairs.get(fm.translationKey).push(fm.lang);
  }
  for(const [id,l]of pairs)assert(l.sort().join(',')==='en,es',`Missing editorial translation: ${id}`);
  return pairs.size;
}
