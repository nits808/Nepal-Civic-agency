// ═══════════════════════════════════════════════════════════════
// NCIG Frontend — useNews Hook v4.0
// Primary: Backend REST API + WebSocket real-time push
// Fallback: Client-side RSS via CORS proxies (if backend offline)
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react';
import { RSS_FEEDS, CORS_PROXIES, parseRSS } from './data.js';

const BACKEND_URL  = 'http://localhost:3000';
const WS_URL       = 'ws://localhost:3000';
const CACHE_KEY    = 'ncig_v4_cache';
const CACHE_TTL    = 3 * 60_000;       // 3 min cache
const REFRESH_MS   = 90_000;           // client-side fallback refresh
const TIMEOUT_MS   = 5000;

// ── LocalStorage Cache ───────────────────────────────────────
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, articles, feedStatus, source } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return { articles, feedStatus, source };
  } catch { return null; }
}

function writeCache(articles, feedStatus, source = 'backend') {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(), articles: articles.slice(0, 600), feedStatus, source,
    }));
  } catch { /* quota */ }
}

// ── Check if backend is available ───────────────────────────
async function checkBackend() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${BACKEND_URL}/api/health`, { signal: ctrl.signal });
    return r.ok;
  } catch { return false; }
}

// ── Fetch from backend ───────────────────────────────────────
async function fetchFromBackend() {
  const r = await fetch(`${BACKEND_URL}/api/articles?limit=400`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!r.ok) throw new Error(`Backend HTTP ${r.status}`);
  const data = await r.json();
  const feedStatus = data.feedStatus || {};
  return { articles: Array.isArray(data.articles) ? data.articles : [], feedStatus };
}

// ── Fallback: client-side RSS fetch ─────────────────────────
async function fetchOneFeed(feed) {
  for (const proxy of CORS_PROXIES) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(proxy + encodeURIComponent(feed.url), { signal: ctrl.signal });
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.length < 50) continue;
      return { ok: true, items: parseRSS(text, feed) };
    } catch { continue; }
  }
  return { ok: false, items: [] };
}

function dedup(articles) {
  if (!Array.isArray(articles)) return [];
  const seen = new Set();
  return articles.filter(a => {
    if (!a || !a.id) return false;
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

// ── Main hook ────────────────────────────────────────────────
export function useNews() {
  const [articles,       setArticles]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [feedStatus,     setFeedStatus]     = useState({});
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [progress,       setProgress]       = useState({ done: 0, total: RSS_FEEDS.length });
  const [backendOnline,  setBackendOnline]  = useState(false);
  const [wsConnected,    setWsConnected]    = useState(false);
  const [newArticleToast, setNewArticleToast] = useState(null); // { source, count }

  const intervalRef  = useRef(null);
  const wsRef        = useRef(null);
  const mountedRef   = useRef(true);
  const wsTimerRef   = useRef(null); // tracks pending reconnect timer

  // ── WebSocket connection ─────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setWsConnected(true);
        console.log('[WS] Connected to NCIG backend');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'NEW_ARTICLES') {
            setNewArticleToast({ source: msg.source, count: msg.count });
            setTimeout(() => setNewArticleToast(null), 6000);
            fetchFromBackend().then(({ articles, feedStatus }) => {
              if (!mountedRef.current) return;
              setArticles(dedup(articles));
              setFeedStatus(feedStatus);
              setLastUpdated(new Date());
              writeCache(articles, feedStatus);
            }).catch(() => {});
          }
        } catch { /* bad JSON */ }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        // Schedule reconnect, store timer so cleanup can cancel it
        wsTimerRef.current = setTimeout(connectWS, 5000);
      };

      ws.onerror = () => ws.close();
    } catch { /* WS not available */ }
  }, []);

  // ── Main fetch function ──────────────────────────────────
  const fetch_ = useCallback(async (isRefresh = false) => {
    if (!mountedRef.current) return;

    // 1. Show cached data instantly
    const cached = readCache();
    if (cached && !isRefresh) {
      setArticles(Array.isArray(cached.articles) ? cached.articles : []);
      setFeedStatus(cached.feedStatus || {});
      setLoading(false);
      setIsRefreshing(true);
    } else if (!isRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    // 2. Check if backend is online
    const backendUp = await checkBackend();
    if (!mountedRef.current) return;
    setBackendOnline(backendUp);

    if (backendUp) {
      // ── Backend path ────────────────────────────────────
      try {
        const { articles, feedStatus } = await fetchFromBackend();
        if (!mountedRef.current) return;
        const unique = dedup(articles);
        setArticles(unique);
        setFeedStatus(feedStatus);
        setLastUpdated(new Date());
        setProgress({ done: RSS_FEEDS.length, total: RSS_FEEDS.length });
        writeCache(unique, feedStatus, 'backend');
        connectWS();
      } catch (err) {
        console.warn('[Backend fetch failed]', err.message);
      }
    } else {
      // ── Fallback: client-side RSS ────────────────────────
      console.log('[useNews] Backend offline — using client-side RSS');
      const localArticles = [];
      const status = {};
      let done = 0;
      setProgress({ done: 0, total: RSS_FEEDS.length });

      await Promise.race([
        Promise.allSettled(
          RSS_FEEDS.map(feed =>
            fetchOneFeed(feed).then(result => {
              if (!mountedRef.current) return;
              done++;
              status[feed.id] = { ok: result.ok, count: result.items.length, name: feed.name, type: feed.type };
              if (result.ok) localArticles.push(...result.items);
              setProgress(p => ({ ...p, done }));
              if (done % 4 === 0) {
                const snap = dedup([...localArticles].sort((a, b) => new Date(b.date) - new Date(a.date)));
                setArticles(snap);
                setFeedStatus({ ...status });
              }
            })
          )
        ),
        new Promise(res => setTimeout(res, 18_000)),
      ]);

      if (!mountedRef.current) return;
      const final = dedup(localArticles.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setArticles(final);
      setFeedStatus({ ...status });
      setLastUpdated(new Date());
      writeCache(final, status, 'client');
    }

    if (mountedRef.current) {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [connectWS]);

  useEffect(() => {
    mountedRef.current = true;
    fetch_(false);
    intervalRef.current = setInterval(() => fetch_(true), REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      clearTimeout(wsTimerRef.current);  // cancel pending reconnect
      wsRef.current?.close();
    };
  }, [fetch_]);

  const connectedFeeds = Object.values(feedStatus).filter(s => s.ok).length;
  const govFeeds       = Object.values(feedStatus).filter(s => s.ok && s.type === 'govt').length;
  const mediaFeeds     = Object.values(feedStatus).filter(s => s.ok && s.type === 'media').length;
  const intlFeeds      = Object.values(feedStatus).filter(s => s.ok && s.type === 'intl').length;

  return {
    articles, loading, isRefreshing, feedStatus, lastUpdated,
    refetch: () => fetch_(true),
    progress, connectedFeeds, govFeeds, mediaFeeds, intlFeeds,
    totalFeeds: RSS_FEEDS.length,
    backendOnline, wsConnected, newArticleToast,
  };
}
