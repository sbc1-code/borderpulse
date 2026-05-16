// Heading slugifier shared by the MDX h2 component (which emits the `id`)
// and the TOC builder in blog-runtime (which links to that id). Both have to
// produce the same string or the TOC anchors fall off the page.
// RegExp is built from a string so the U+0300..U+036F (combining marks) range
// is unambiguous in source rather than relying on literal combining chars.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '') // strip accents so Spanish headings slug cleanly
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
