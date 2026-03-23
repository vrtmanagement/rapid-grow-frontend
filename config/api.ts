/**
 * API config - points to Gateway (http://localhost:5000/api)
 * Set VITE_API_URL in .env for different environments
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getAuthHeaders(): Record<string, string> {
  const stored = localStorage.getItem('rapidgrow-admin');
  if (!stored) return { 'Content-Type': 'application/json' };
  try {
    const { token } = JSON.parse(stored);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

