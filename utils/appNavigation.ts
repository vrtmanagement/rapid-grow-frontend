export function getPublicPath(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname.replace(/^\//, '').split('?')[0];
  if (pathname && pathname !== 'index.html') return pathname;

  // Legacy email links used hash routes: /#/invite/accept?token=...
  const hash = String(window.location.hash || '').replace(/^#\/?/, '');
  if (!hash) return pathname || '';
  return hash.split('?')[0];
}

export function getQueryParam(name: string): string {
  if (typeof window === 'undefined') return '';
  const fromSearch = new URLSearchParams(window.location.search).get(name);
  if (fromSearch) return fromSearch;

  const hash = String(window.location.hash || '');
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  if (!hashQuery) return '';
  return new URLSearchParams(hashQuery).get(name) || '';
}

export function navigateApp(path: string): void {
  if (typeof window === 'undefined') return;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.history.pushState(null, '', normalized);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
