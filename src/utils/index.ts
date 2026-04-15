export function createPageUrl(pageName: string) {
  if (!pageName || pageName === 'Dashboard' || pageName === 'index') return '/';
  return '/' + pageName.replace(/ /g, '-');
}
