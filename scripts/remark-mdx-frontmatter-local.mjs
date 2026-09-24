import matter from 'gray-matter';

// The upstream remark-mdx-frontmatter plugin pulls in `toml`, which currently
// has high-severity advisories and no fixed release. BorderPulse only uses YAML
// frontmatter, so keep the same exported `frontmatter` contract locally and
// remove the unnecessary TOML parser from the build graph.
export default function remarkMdxFrontmatterLocal() {
  return (tree, file) => {
    const parsed = matter(String(file));
    const value = toEstree(parsed.data || {});
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
                init: value,
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
  if (Array.isArray(value)) {
    return { type: 'ArrayExpression', elements: value.map(toEstree) };
  }
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
