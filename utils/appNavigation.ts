export function getPublicPath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.replace(/^\//, '').split('?')[0];
}

export function navigateApp(path: string): void {
  if (typeof window === 'undefined') return;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.history.pushState(null, '', normalized);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
