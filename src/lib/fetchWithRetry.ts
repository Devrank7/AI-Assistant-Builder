/**
 * Fetch wrapper that retries on 401 (auth token race condition).
 *
 * When the dashboard loads with an expired access_token but valid refresh_token,
 * the AuthProvider refreshes the token asynchronously. API calls made before the
 * refresh completes get a 401. This wrapper retries after a short delay to give
 * the AuthProvider time to set the new cookie.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 2,
  delayMs = 800
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 401 && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    return res;
  }
  // Should never reach here, but TypeScript needs it
  return fetch(url, options);
}
