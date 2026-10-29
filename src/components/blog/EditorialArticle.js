import { createElement as h, Fragment } from 'react';

// Editorial strings are React text children. Never parse them as Markdown,
// MDX, HTML, or JavaScript; only this trusted component defines the markup.
export default function EditorialArticle({ article }) {
  if (article?.version !== 'borderpulse-editorial-article-v1') {
    throw new Error('Missing or unsupported editorial article data');
  }
  return h(Fragment, null,
    h('p', null, h('strong', null, article.disclosure)),
    ...article.paragraphs.map((paragraph, index) => h('p', { key: `claim-${index}` },
      paragraph.label ? h('strong', null, paragraph.label + ' ') : null,
      paragraph.text,
      ...paragraph.sources.flatMap(source => [' ', h('a', { key: source.url, href: source.url }, source.label)]),
    )),
    h('h2', null, article.sourcesHeading),
    h('ul', null, ...article.dates.map(source => h('li', { key: source.url },
      h('a', { href: source.url }, source.label),
      `: ${article.publishedLabel} ${source.published}; ${article.verifiedLabel} ${article.verifiedAt}.`,
    ))),
    h('p', null, article.limits),
    h('p', null, h('a', { href: article.evidence.url }, article.evidence.label), '.'),
  );
}
