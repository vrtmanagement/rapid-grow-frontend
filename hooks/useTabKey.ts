import { useLocation } from 'react-router-dom';
import { normalizeTabKeyFromPath } from '../services/tabSessionCache';

export function useTabKey(override?: string): string {
  const location = useLocation();
  return override || normalizeTabKeyFromPath(location.pathname);
}
