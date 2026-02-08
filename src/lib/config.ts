// Application configuration

/**
 * Get the base URL for the application
 * - In development: uses localhost:3000
 * - In production: uses NEXT_PUBLIC_APP_URL environment variable
 */
export function getBaseUrl(): string {
  // Client-side
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fallback for development
  return 'http://localhost:3000';
}

/**
 * Get the widget script URL for a specific client
 */
export function getWidgetScriptUrl(clientId: string): string {
  return `${getBaseUrl()}/widgets/${clientId}/script.js`;
}

/**
 * Get the widget embed code for a specific client
 */
export function getWidgetEmbedCode(clientId: string): string {
  const scriptUrl = getWidgetScriptUrl(clientId);
  return `<script src="${scriptUrl}"></script>`;
}

/**
 * Configuration object
 */
export const config = {
  appName: 'WinBix AI',
  getBaseUrl,
  getWidgetScriptUrl,
  getWidgetEmbedCode,
};

export default config;
