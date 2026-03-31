const trimTrailingSlash = (value) => value?.replace(/\/+$/, '') ?? '';

const apiBase = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || window.location.origin
);

const wsBase = trimTrailingSlash(
  import.meta.env.VITE_WS_BASE_URL ||
    apiBase.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')
);

const analyticsBase = trimTrailingSlash(
  import.meta.env.VITE_ANALYTICS_API_BASE_URL || apiBase
);

export const API_BASE_URL = apiBase;
export const WS_BASE_URL = wsBase;
export const ANALYTICS_API_BASE_URL = analyticsBase;
