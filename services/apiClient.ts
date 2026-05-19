export type ApiErrorPayload = {
  message?: string;
  error?: string;
  errors?: unknown;
};

export async function parseApiResponse<T = any>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const data = payload as ApiErrorPayload;
    const message =
      data.message ||
      data.error ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function getReadableError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
