import matter from 'gray-matter';

// BorderPulse only uses YAML frontmatter. The upstream plugin also brings in
// the unmaintained TOML parser, so keep the small export contract locally.
export default function remarkMdxFrontmatterLocal() {
  return (tree, file) => {
    const parsed = matter(String(file));
    const exportNode = {
      type: 'mdxjsEsm',
      value: '',
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [{
            type: 'ExportNamedDeclaration',
            declaration: {
              type: 'VariableDeclaration',
              kind: 'const',
              declarations: [{
                type: 'VariableDeclarator',
                id: { type: 'Identifier', name: 'frontmatter' },
                init: toEstree(parsed.data || {}),
              }],
            },
            specifiers: [],
          }],
        },
      },
    };

    tree.children = tree.children.filter((node) => node.type !== 'yaml' && node.type !== 'toml');
    tree.children.unshift(exportNode);
  };
}

function toEstree(value) {
  if (value === null) return { type: 'Literal', value: null };
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { type: 'Literal', value };
  }
  if (Array.isArray(value)) return { type: 'ArrayExpression', elements: value.map(toEstree) };
  if (typeof value === 'object') {
    return {
      type: 'ObjectExpression',
      properties: Object.entries(value).map(([key, entry]) => ({
        type: 'Property',
        key: { type: 'Literal', value: key },
        value: toEstree(entry),
        kind: 'init',
        method: false,
        shorthand: false,
        computed: false,
      })),
    };
  }
  return { type: 'Identifier', name: 'undefined' };
}
