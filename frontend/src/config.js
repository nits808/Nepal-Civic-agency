const trimTrailingSlash = (value) => value?.replace(/\/+$/, '') ?? '';

const apiBase = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || window.location.origin
);

// BUG-02 FIX: Use relative /ws path so Vite proxy correctly forwards to
// ws://localhost:4003 (alert-service). Deriving from window.location.origin
// produced ws://localhost:5173 with no /ws suffix — bypassing the proxy entirely.
// In production, VITE_WS_BASE_URL should be set to the full wss:// URL.
const wsBase = import.meta.env.VITE_WS_BASE_URL || '/ws';

const analyticsBase = trimTrailingSlash(
  import.meta.env.VITE_ANALYTICS_API_BASE_URL || apiBase
);

export const API_BASE_URL = apiBase;
export const WS_BASE_URL = wsBase;
export const ANALYTICS_API_BASE_URL = analyticsBase;
