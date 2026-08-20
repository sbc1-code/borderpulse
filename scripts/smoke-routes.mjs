import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.resolve(root, 'dist');
const configuredBase = process.env.ROUTE_SMOKE_BASE_URL;
const baseUrl = new URL(configuredBase || 'http://127.0.0.1:4173');
const productionOrigin = 'https://borderpulse.com';

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function listIndexFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...listIndexFiles(fullPath));
    if (entry.isFile() && entry.name === 'index.html') files.push(fullPath);
  }
  return files;
}

function pathForIndex(filePath) {
  const relative = path.relative(distDir, filePath);
  if (relative === 'index.html') return '/';
  return `/${path.dirname(relative).split(path.sep).join('/')}/`;
}

// NOTE: this manifest is built from dist/sitemap.xml alone, so any route
// deliberately excluded from the sitemap (embed pages, for example) is NOT
// covered here. That blind spot is how /alerts/ shipped a hard 404 for weeks.
// If a linked, sitemap-excluded route is ever added, assert it explicitly.
function loadRouteManifest() {
  const sitemapPath = path.resolve(distDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    throw new Error('dist/sitemap.xml is missing. Run npm run build first.');
  }

  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const canonicals = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const canonical = new URL(decodeXml(match[1]));
    const filePath = canonical.pathname === '/'
      ? path.resolve(distDir, 'index.html')
      : path.resolve(distDir, `.${canonical.pathname}`, 'index.html');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Sitemap route has no prerendered page: ${canonical.pathname}`);
    }
    return { path: canonical.pathname, canonical: canonical.href };
  });

  const canonicalPaths = new Set(canonicals.map((route) => route.path));
  const aliases = [];
  for (const filePath of listIndexFiles(distDir)) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!/<meta\s+http-equiv=["']refresh["']/i.test(html)) continue;
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (!canonicalMatch) throw new Error(`Redirect page has no canonical: ${filePath}`);
    const target = new URL(canonicalMatch[1]);
    if (target.origin !== productionOrigin) {
      throw new Error(`Redirect leaves Border Pulse: ${pathForIndex(filePath)} -> ${target.href}`);
    }
    if (!canonicalPaths.has(target.pathname)) {
      throw new Error(`Redirect target is not canonical: ${pathForIndex(filePath)} -> ${target.pathname}`);
    }
    aliases.push({ path: pathForIndex(filePath), targetPath: target.pathname });
  }

  return {
    canonicals: canonicals.sort((a, b) => a.path.localeCompare(b.path)),
    aliases: aliases.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
  }
  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const found = spawnSync('which', [command], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }

  const bundled = chromium.executablePath();
  if (bundled && fs.existsSync(bundled)) return bundled;
  throw new Error('Chrome/Chromium was not found. Set CHROME_BIN to its executable path.');
}

async function waitForPreview(child) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode != null) {
      throw new Error(`Vite preview exited early with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`Preview returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Vite preview did not start: ${lastError?.message || 'unknown error'}`);
}

async function startPreview() {
  if (configuredBase) return null;
  const viteBin = path.resolve(root, 'node_modules/vite/bin/vite.js');
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', baseUrl.hostname, '--port', baseUrl.port, '--strictPort'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  await waitForPreview(child);
  return child;
}

function schemaTypes(schemas) {
  return new Set(schemas.flatMap((schema) => {
    if (Array.isArray(schema)) return schema.map((item) => item?.['@type']).filter(Boolean);
    const direct = schema?.['@type'] ? [schema['@type']] : [];
    const graph = Array.isArray(schema?.['@graph'])
      ? schema['@graph'].map((item) => item?.['@type']).filter(Boolean)
      : [];
    return [...direct, ...graph];
  }));
}

async function inspectRenderedPage(page) {
  return page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    body: document.body?.innerText || '',
    headings: [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim() || ''),
    schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => node.textContent || ''),
  }));
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(150);
}

async function runProfile(browser, profile, manifest, expectedCrossingCount) {
  const failures = [];
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.isMobile,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  let activeErrors = null;

  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === baseUrl.origin) await route.continue();
    else await route.abort('blockedbyclient');
  });
  page.on('pageerror', (error) => activeErrors?.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (/\[ErrorBoundary\]|Uncaught|ReferenceError|TypeError|SyntaxError/.test(value)) {
      activeErrors?.push(`console: ${value}`);
    }
  });

  for (let index = 0; index < manifest.canonicals.length; index += 1) {
    const route = manifest.canonicals[index];
    activeErrors = [];
    try {
      const response = await page.goto(new URL(route.path, baseUrl).href, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      await settle(page);
      if (route.path === '/best-time/') {
        await page.waitForFunction(() => {
          const headings = [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim() || '');
          const body = document.body?.innerText || '';
          return headings.some((heading) =>
            heading.startsWith('Best time to cross every U.S.-Mexico border crossing today'),
          ) || body.includes('Something went wrong');
        }, null, { timeout: 5_000 });
      }
      if (!response || response.status() >= 400) {
        throw new Error(`HTTP ${response?.status() || 'no response'}`);
      }
      const rendered = await inspectRenderedPage(page);
      if (!rendered.body.trim()) throw new Error('empty body');
      if (rendered.body.includes('Something went wrong') || rendered.body.includes('Border Pulse encountered an error')) {
        throw new Error('ErrorBoundary rendered');
      }
      if (rendered.canonical !== route.canonical) {
        throw new Error(`canonical ${rendered.canonical || '(missing)'} != ${route.canonical}`);
      }
      if (!rendered.title || !rendered.description) throw new Error('missing title or description');
      const schemas = rendered.schemas.map((value) => JSON.parse(value));
      if (route.path === '/best-time/') {
        const types = schemaTypes(schemas);
        const itemList = schemas.find((schema) => schema?.['@type'] === 'ItemList');
        const routeHeading = rendered.headings.find((heading) =>
          heading.startsWith('Best time to cross every U.S.-Mexico border crossing today'),
        );
        if (!routeHeading) {
          throw new Error(`expected Best time heading; saw: ${rendered.headings.join(' | ') || '(none)'}`);
        }
        if (!rendered.description.includes(`${expectedCrossingCount} crossings`)) {
          throw new Error(`description does not reflect ${expectedCrossingCount} crossings`);
        }
        if (!types.has('BreadcrumbList') || !types.has('ItemList')) {
          throw new Error('missing route-specific BreadcrumbList or ItemList schema');
        }
        if (itemList?.numberOfItems !== expectedCrossingCount) {
          throw new Error(`ItemList count ${itemList?.numberOfItems} != ${expectedCrossingCount}`);
        }
      }
      if (activeErrors.length) throw new Error(activeErrors.join(' | '));
    } catch (error) {
      failures.push(`${profile.name} ${route.path}: ${error.message}`);
    }
    if ((index + 1) % 40 === 0) {
      console.log(`[routes:${profile.name}] ${index + 1}/${manifest.canonicals.length} canonical routes`);
    }
  }

  for (const route of manifest.aliases) {
    activeErrors = [];
    try {
      const response = await page.goto(new URL(route.path, baseUrl).href, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      await page.waitForURL((url) => url.origin === baseUrl.origin && url.pathname === route.targetPath, {
        timeout: 5_000,
      });
      await settle(page);
      if (!response || response.status() >= 400) {
        throw new Error(`HTTP ${response?.status() || 'no response'}`);
      }
      const rendered = await inspectRenderedPage(page);
      if (new URL(page.url()).pathname !== route.targetPath) {
        throw new Error(`landed on ${new URL(page.url()).pathname}, expected ${route.targetPath}`);
      }
      if (rendered.body.includes('Something went wrong')) throw new Error('ErrorBoundary rendered after redirect');
      if (rendered.canonical !== `${productionOrigin}${route.targetPath}`) {
        throw new Error(`redirect canonical ${rendered.canonical || '(missing)'} is wrong`);
      }
      if (activeErrors.length) throw new Error(activeErrors.join(' | '));
    } catch (error) {
      failures.push(`${profile.name} alias ${route.path}: ${error.message}`);
    }
  }

  // The dashboard's Analytics view is a lazy-loaded chunk, so a route-only
  // sweep cannot prove its asset is present in the deploy artifact. Exercise
  // the toggle once per viewport and fail on the same ErrorBoundary users see.
  activeErrors = [];
  try {
    const response = await page.goto(new URL('/', baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await settle(page);
    if (!response || response.status() >= 400) {
      throw new Error(`HTTP ${response?.status() || 'no response'}`);
    }
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await page.waitForFunction(() => {
      const body = document.body?.innerText || '';
      return body.includes('Analytics populate as you use the app.')
        || body.includes('Average wait by hour')
        || body.includes('Something went wrong');
    }, null, { timeout: 5_000 });
    const rendered = await inspectRenderedPage(page);
    if (rendered.body.includes('Something went wrong') || rendered.body.includes('Border Pulse encountered an error')) {
      throw new Error('ErrorBoundary rendered');
    }
    if (!rendered.body.includes('Analytics populate as you use the app.') && !rendered.body.includes('Average wait by hour')) {
      throw new Error('Analytics view did not render');
    }
    if (activeErrors.length) throw new Error(activeErrors.join(' | '));
  } catch (error) {
    failures.push(`${profile.name} dashboard analytics: ${error.message}`);
  }

  await context.close();
  console.log(`[routes:${profile.name}] checked ${manifest.canonicals.length} canonical + ${manifest.aliases.length} alias routes + dashboard analytics`);
  return failures;
}

async function main() {
  const manifest = loadRouteManifest();
  const crossings = JSON.parse(fs.readFileSync(path.resolve(root, 'public/data/crossings.json'), 'utf8')).crossings || [];
  const preview = await startPreview();
  let browser;
  try {
    const executablePath = findChrome();
    console.log(`[routes] Chrome: ${executablePath}`);
    console.log(`[routes] manifest: ${manifest.canonicals.length} canonical + ${manifest.aliases.length} alias routes`);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const profiles = [
      { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
      { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
    ];
    const failures = (await Promise.all(
      profiles.map((profile) => runProfile(browser, profile, manifest, crossings.length)),
    )).flat();
    if (failures.length) {
      console.error(`\n[routes] ${failures.length} failure(s):\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[routes] PASS: ${profiles.length * (manifest.canonicals.length + manifest.aliases.length + 1)} browser navigations`);
  } finally {
    if (browser) await browser.close();
    if (preview) preview.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(`[routes] ${error.stack || error.message}`);
  process.exit(1);
});
