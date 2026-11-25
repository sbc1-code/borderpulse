import {readFile, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const target = new URL('atlas.html', root);
let html = await readFile(target, 'utf8');
for (const [id, file] of [['canada-data', 'canada.json'], ['us-data', 'us-lanes.json'], ['mexico-data', 'mexico-directory.json']]) {
  const data = JSON.parse(await readFile(new URL('fixtures/' + file, root), 'utf8'));
  const pattern = new RegExp('(<script type="application/json" id="' + id + '">)[^<]*(</script>)');
  if (!Array.isArray(data.crossings) || !pattern.test(html)) throw Error('Missing data or embed target: ' + id);
  const safeJson = JSON.stringify(data).replaceAll('<', '\\u003c');
  html = html.replace(pattern, (_, open, close) => open + safeJson + close);
}
await writeFile(target, html);
