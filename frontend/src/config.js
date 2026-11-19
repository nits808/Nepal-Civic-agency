const trimTrailingSlash = (value) => value?.replace(/\/+$/, '') ?? '';

const apiBase = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || window.location.origin
);

function getWsBase() {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  // Always produce an absolute WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

const analyticsBase = trimTrailingSlash(
  import.meta.env.VITE_ANALYTICS_API_BASE_URL || apiBase
);

export const API_BASE_URL = apiBase;
export const WS_BASE_URL = getWsBase();
export const ANALYTICS_API_BASE_URL = analyticsBase;
export const API_KEY = import.meta.env.VITE_NCIG_API_KEY || 'ncig-dev-key-change-me';
