// ═══════════════════════════════════════════════════════════════
// NCIG Backend — Main Express + WebSocket Server
// Endpoints: /api/articles /api/feeds /api/stats /api/search
// Real-time: WebSocket push when new articles arrive
// Cron: Fetches all RSS feeds every 90 seconds automatically
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cron from 'node-cron';
import { initDB, queryArticles, lookupArticlesByIds, getFeedStatuses, getStats, purgeOldArticles, getAllSources, upsertSources } from './db.js';
import { fetchAllFeeds, enrichArticlesWithOgImages } from './fetcher.js';
import { computeSentimentReport } from './sentiment.js';
import { clusterAndFlatten, clusterArticles } from './clustering.js';

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ── Init ─────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ── WebSocket Server ─────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });
let connectedClients = 0;

wss.on('connection', (ws, req) => {
  connectedClients++;
  console.log(`[WS] Client connected — ${connectedClients} total (${req.socket.remoteAddress})`);

  // Send a welcome ping with current stats
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'NCIG live feed connected' }));

  ws.on('close', () => {
    connectedClients--;
    console.log(`[WS] Client disconnected — ${connectedClients} remaining`);
  });

  ws.on('error', (err) => console.warn('[WS] Error:', err.message));
});

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// ── API Routes ───────────────────────────────────────────────

// GET /api/articles — main articles endpoint
app.get('/api/articles', async (req, res) => {
  const { limit = 200, offset = 0, category, province, search } = req.query;
  try {
    const articles = await queryArticles({
      limit: Math.min(parseInt(limit), 500),
      offset: parseInt(offset),
      category: category || undefined,
      province: province || undefined,
      search: search || undefined,
    });

    // Compute live timeAgo
    const now = Date.now();
    const enriched = articles.map(a => {
      const mins = Math.floor((now - new Date(a.date).getTime()) / 60000);
      let timeAgo = 'recently';
      if (!isNaN(mins) && mins >= 0) {
        if (mins < 1) timeAgo = 'just now';
        else if (mins < 60) timeAgo = `${mins}m ago`;
        else if (mins < 1440) timeAgo = `${Math.floor(mins / 60)}h ago`;
        else timeAgo = `${Math.floor(mins / 1440)}d ago`;
      }
      return {
        ...a,
        timeAgo,
        imageUrl: a.og_image || a.image_url || null,
        hasRealImage: !!(a.og_image || a.image_url),
      };
    });

    // Optionally cluster
    const clustered = req.query.cluster === 'true'
      ? clusterAndFlatten(enriched)
      : enriched;

    const feedStatus = await getFeedStatuses();

    res.json({
      articles: clustered,
      feedStatus,
      total: clustered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles/lookup — batch lookup articles by exact IDs
app.post(['/api/articles/lookup', '/api/articles'], async (req, res) => {
  try {
    const article_ids = req.body?.article_ids || req.body?.ids;
    if (!Array.isArray(article_ids) || article_ids.length === 0) {
      return res.status(400).json({ error: 'article_ids must be a non-empty array of strings' });
    }

    const cleanIds = [...new Set(article_ids.filter(id => typeof id === 'string' && id.trim()))].slice(0, 100);
    if (cleanIds.length === 0) {
      return res.status(400).json({ error: 'No valid article IDs provided' });
    }

    const articles = await lookupArticlesByIds(cleanIds);

    const now = Date.now();
    const enriched = articles.map(a => {
      const mins = Math.floor((now - new Date(a.date).getTime()) / 60000);
      let timeAgo = 'recently';
      if (!isNaN(mins) && mins >= 0) {
        if (mins < 1) timeAgo = 'just now';
        else if (mins < 60) timeAgo = `${mins}m ago`;
        else if (mins < 1440) timeAgo = `${Math.floor(mins / 60)}h ago`;
        else timeAgo = `${Math.floor(mins / 1440)}d ago`;
      }

      let cleanDesc = (a.description || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      if (!cleanDesc || cleanDesc === a.source || cleanDesc.includes('news.google.com') || cleanDesc.length < 15) {
        cleanDesc = `${(a.title || '').split(' - ')[0].trim()} — Read full coverage on ${a.source || 'News'}.`;
      }

      return {
        ...a,
        description: cleanDesc,
        timeAgo,
        imageUrl: a.og_image || a.image_url || `/images/${a.category || 'politics'}-fallback.svg`,
        hasRealImage: !!(a.og_image || a.image_url),
      };
    });

    const foundIdSet = new Set(enriched.map(a => a.id));
    const missing_ids = cleanIds.filter(id => !foundIdSet.has(id));

    res.json({
      ok: true,
      count: enriched.length,
      articles: enriched,
      missing_ids
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/feeds — feed status list
app.get('/api/feeds', async (req, res) => {
  try {
    const feeds = await getFeedStatuses();
    res.json({ feeds, total: feeds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ ...stats, connectedClients, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search?q=query — full-text search
app.get('/api/search', async (req, res) => {
  const { q, limit = 50 } = req.query;
  if (!q) return res.status(400).json({ error: 'q parameter required' });
  try {
    const results = await queryArticles({ search: q, limit: parseInt(limit) });
    res.json({ results, total: results.length, query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clusters — story threads grouped by similarity
app.get('/api/clusters', async (req, res) => {
  try {
    const { limit = 300, category, threshold = 0.35 } = req.query;
    const articles = await queryArticles({
      limit: Math.min(parseInt(limit), 500),
      category: category || undefined,
    });
    const now = Date.now();
    const enriched = articles.map(a => {
      const mins = Math.floor((now - new Date(a.date).getTime()) / 60000);
      return {
        ...a,
        timeAgo: !isNaN(mins) && mins >= 0
          ? mins < 1 ? 'just now'
          : mins < 60 ? `${mins}m ago`
          : mins < 1440 ? `${Math.floor(mins/60)}h ago`
          : `${Math.floor(mins/1440)}d ago`
          : 'recently',
        imageUrl: a.og_image || a.image_url || null,
        hasRealImage: !!(a.og_image || a.image_url),
      };
    });
    const clusters = clusterArticles(enriched, parseFloat(threshold));
    res.json({
      clusters: clusters.slice(0, 100),
      total: clusters.length,
      multiSourceCount: clusters.filter(c => c.sourceCount > 1).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fetch — manually trigger a fetch cycle
app.post('/api/fetch', async (req, res) => {
  res.json({ message: 'Fetch cycle started', timestamp: new Date().toISOString() });
  // Run in background
  fetchAllFeeds(wss).catch(console.error);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ncig-backend',
    version: '1.0.0',
    connectedClients,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/sentiment — Nepal civic mood analysis
app.get('/api/sentiment', async (req, res) => {
  try {
    const { limit = 400, province, category } = req.query;
    const articles = await queryArticles({
      limit: parseInt(limit),
      province: province || undefined,
      category: category || undefined,
    });
    const report = computeSentimentReport(articles);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cron Jobs ────────────────────────────────────────────────

// Fetch all feeds every 90 seconds (node-cron 6-field: s m h dom mon dow)
cron.schedule('*/90 * * * * *', async () => {
  console.log('[Cron] 90s tick — fetching all feeds…');
  await fetchAllFeeds(wss);
}, { scheduled: true });

// Enrich articles with og:images every 3 minutes
cron.schedule('*/3 * * * *', async () => {
  const articles = await queryArticles({ limit: 50 });
  await enrichArticlesWithOgImages(articles);
});

// Soft archive retention (purges articles older than 180 days)
cron.schedule('0 0 * * *', async () => {
  const deleted = await purgeOldArticles(180);
  console.log(`[Cron] Purged ${deleted} old articles (>180d)`);
});

// GET /api/rss — CORS proxy for client-side RSS feeds
app.get('/api/rss', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url parameter');

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).send('Invalid URL');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return res.status(403).send('Forbidden protocol');
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return res.status(403).send('Access to private network denied');
    }

    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NCIG-Bot/3.0)',
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await fetchRes.text();
    res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(fetchRes.status).send(text);
  } catch (err) {
    return res.status(500).send(`Proxy Error: ${err.message}`);
  }
});

// GET /api/sources — list active sources
app.get('/api/sources', async (req, res) => {
  try {
    const sources = await getAllSources();
    res.json({ sources, total: sources.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sources — add a new source (with YouTube & website auto-resolution)
app.post('/api/sources', async (req, res) => {
  try {
    const { url, name, province = 'National', type = 'media', tier = 4 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    let finalUrl = url.trim();
    let detectedType = type;
    let sourceName = name;

    // 1. YouTube Channel Resolution
    if (finalUrl.includes('youtube.com/') || finalUrl.includes('youtu.be/')) {
      detectedType = 'tv';
      if (!finalUrl.includes('videos.xml')) {
        try {
          const ytRes = await fetch(finalUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(6000)
          });
          const html = await ytRes.text();
          const channelIdMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/) ||
                                 html.match(/itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)"/);
          if (channelIdMatch) {
            finalUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;
          }
          if (!sourceName) {
            const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
            if (titleMatch) sourceName = titleMatch[1];
          }
        } catch (e) {
          console.warn('[Sources] Could not resolve YouTube channelId:', e.message);
        }
      }
    } else if (!finalUrl.includes('.xml') && !finalUrl.includes('/rss') && !finalUrl.includes('/feed')) {
      // 2. Website without direct RSS — Google News Search fallback
      try {
        const u = new URL(finalUrl);
        const domain = u.hostname.replace(/^www\./, '');
        if (!sourceName) sourceName = domain.split('.')[0].toUpperCase();
        finalUrl = `https://news.google.com/rss/search?q=site:${domain}`;
      } catch (e) {}
    }

    if (!sourceName) {
      try { sourceName = new URL(finalUrl).hostname.replace(/^www\./, ''); } catch (e) { sourceName = 'New Source'; }
    }

    const id = `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSource = {
      id,
      name: sourceName,
      type: detectedType,
      tier: parseInt(tier) || 4,
      province,
      url: finalUrl,
      fb: null,
      website: url,
      verified: 0,
      status: 'active'
    };

    await upsertSources([newSource]);

    res.json({
      ok: true,
      message: 'Source added successfully',
      source: newSource
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start Server ─────────────────────────────────────────────
httpServer.listen(PORT, async () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║  🇳🇵  NCIG Backend — Running on :${PORT}     ║
  ║                                            ║
  ║  REST:  http://localhost:${PORT}/api/articles ║
  ║  WS:    ws://localhost:${PORT}               ║
  ║  Stats: http://localhost:${PORT}/api/stats    ║
  ╚════════════════════════════════════════════╝
  `);

  // Initialize DB & bootstrap sources if empty
  await initDB();

  // Initial fetch on startup
  console.log('[Startup] Running initial feed fetch…');
  await fetchAllFeeds(wss);
});

function gracefulShutdown(signal) {
  console.log(`[Server] ${signal} received — shutting down…`);
  httpServer.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
  // Force-kill if it lingers more than 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

export default app;
