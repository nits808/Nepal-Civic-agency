// ---------------------------------------------------------------
// NCIG Frontend — useNews Hook v4.0
// Primary: Backend REST API + WebSocket real-time push
// Fallback: Client-side RSS via CORS proxies (if backend offline)
// ---------------------------------------------------------------
import { useState, useEffect, useCallback, useRef } from 'react';
import { RSS_FEEDS, CORS_PROXIES, parseRSS } from './data.js';
import { API_BASE_URL, WS_BASE_URL } from './config.js';

const BACKEND_URL  = API_BASE_URL;
const WS_URL       = WS_BASE_URL;
const CACHE_KEY    = 'ncig_v4_cache';
const CACHE_TTL    = 3 * 60_000;       // 3 min cache
const REFRESH_MS   = 90_000;           // client-side fallback refresh
const TIMEOUT_MS   = 5000;
const IMAGE_FETCH_LIMIT = 60;
const IMAGE_CONCURRENCY = 6;

// -- LocalStorage Cache ---------------------------------------
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

// -- Check if backend is available ---------------------------
// BUG-03 FIX: Capture timer ID and clear in both success and error paths
// so the abort callback cannot fire after the function has already resolved.
async function checkBackend() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const r = await fetch(`${BACKEND_URL}/api/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return r.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

// -- Fetch from backend ---------------------------------------
async function fetchFromBackend() {
  const r = await fetch(`${BACKEND_URL}/api/articles?limit=400`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!r.ok) throw new Error(`Backend HTTP ${r.status}`);
  const data = await r.json();
  const feedStatus = data.feedStatus || {};
  return { articles: Array.isArray(data.articles) ? data.articles : [], feedStatus };
}

// -- Fallback: client-side RSS fetch -------------------------
// BUG-03 FIX: Capture + clear timer in each proxy attempt
async function fetchOneFeed(feed) {
  for (const proxy of CORS_PROXIES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(proxy + encodeURIComponent(feed.url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.length < 50) continue;
      return { ok: true, items: parseRSS(text, feed) };
    } catch {
      clearTimeout(timer);
      continue;
    }
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

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:')) return false;
  if (!url.startsWith('http')) return false;
  if (/pixel|spacer|tracking|blank/i.test(url)) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes('image');
}

function extractMetaImage(html) {
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const candidates = [
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      doc.querySelector('meta[property="twitter:image"]')?.getAttribute('content'),
      doc.querySelector('meta[itemprop="image"]')?.getAttribute('content'),
      doc.querySelector('link[rel="image_src"]')?.getAttribute('href'),
    ];
    return candidates.find(isValidImageUrl) || null;
  } catch {
    return null;
  }
}

// BUG-03 FIX: Capture + clear timer in each proxy attempt
async function fetchOgImage(url) {
  if (!url) return null;
  for (const proxy of CORS_PROXIES) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(proxy + encodeURIComponent(url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.length < 200) continue;
      const img = extractMetaImage(text);
      if (img && isValidImageUrl(img)) return img;
    } catch {
      clearTimeout(timer);
      continue;
    }
  }
  return null;
}

// -- Main hook ------------------------------------------------
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
  const imageCacheRef = useRef(new Map());

  const enhanceImages = useCallback(async (items = []) => {
    if (!items.length) return;
    const toFetch = [];
    items.forEach(a => {
      if (!a?.link || a.hasRealImage) return;
      if (imageCacheRef.current.has(a.link)) {
        const cached = imageCacheRef.current.get(a.link);
        if (cached) {
          setArticles(prev => prev.map(p => p.link === a.link ? { ...p, imageUrl: cached, hasRealImage:true } : p));
        }
        return;
      }
      if (toFetch.length < IMAGE_FETCH_LIMIT) toFetch.push(a);
    });
    if (!toFetch.length) return;

    let idx = 0;
    const worker = async () => {
      while (idx < toFetch.length && mountedRef.current) {
        const article = toFetch[idx++];
        const img = await fetchOgImage(article.link);
        imageCacheRef.current.set(article.link, img || null);
        if (img && mountedRef.current) {
          setArticles(prev => prev.map(p => p.link === article.link ? { ...p, imageUrl: img, hasRealImage:true } : p));
        }
      }
    };
    await Promise.all(Array.from({ length: IMAGE_CONCURRENCY }, worker));
  }, []);

  // -- WebSocket connection ---------------------------------
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
              enhanceImages(articles);
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
  }, [enhanceImages]);

  const fetchClientFallback = useCallback(async () => {
    console.log('[useNews] Using client-side RSS fallback');
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
    enhanceImages(final);
  }, [enhanceImages]);
  // -- Main fetch function ----------------------------------
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
      // -- Backend path ------------------------------------
      try {
        const { articles, feedStatus } = await fetchFromBackend();
        if (!mountedRef.current) return;
        if (!articles || articles.length === 0) {
          throw new Error('Backend returned no articles');
        }
        const unique = dedup(articles);
        setArticles(unique);
        setFeedStatus(feedStatus);
        setLastUpdated(new Date());
        setProgress({ done: RSS_FEEDS.length, total: RSS_FEEDS.length });
        writeCache(unique, feedStatus, 'backend');
        connectWS();
        enhanceImages(unique);
      } catch (err) {
        console.warn('[Backend fetch failed]', err.message);
        setBackendOnline(false);
        await fetchClientFallback();
      }
    } else {
      await fetchClientFallback();
    }
    if (mountedRef.current) {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [connectWS, fetchClientFallback, enhanceImages]);

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






