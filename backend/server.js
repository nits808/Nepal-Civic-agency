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
import { initDB, queryArticles, getFeedStatuses, getStats, purgeOldArticles } from './db.js';
import { fetchAllFeeds, enrichArticlesWithOgImages } from './fetcher.js';
import { computeSentimentReport } from './sentiment.js';
import { clusterAndFlatten, clusterArticles } from './clustering.js';

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// ── Init ─────────────────────────────────────────────────────
initDB();
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
app.get('/api/articles', (req, res) => {
  const { limit = 200, offset = 0, category, province, search } = req.query;
  try {
    const articles = queryArticles({
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

    res.json({
      articles: clustered,
      feedStatus: getFeedStatuses(),
      total: clustered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feeds — feed status list
app.get('/api/feeds', (req, res) => {
  try {
    const feeds = getFeedStatuses();
    res.json({ feeds, total: feeds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — dashboard stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ ...stats, connectedClients, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search?q=query — full-text search
app.get('/api/search', (req, res) => {
  const { q, limit = 50 } = req.query;
  if (!q) return res.status(400).json({ error: 'q parameter required' });
  try {
    const results = queryArticles({ search: q, limit: parseInt(limit) });
    res.json({ results, total: results.length, query: q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clusters — story threads grouped by similarity
app.get('/api/clusters', (req, res) => {
  try {
    const { limit = 300, category, threshold = 0.35 } = req.query;
    const articles = queryArticles({
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

// GET /api/health — health check
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
app.get('/api/sentiment', (req, res) => {
  try {
    const { limit = 400, province, category } = req.query;
    const articles = queryArticles({
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
  const articles = queryArticles({ limit: 50 });
  await enrichArticlesWithOgImages(articles);
});

// Purge articles older than 7 days every midnight
cron.schedule('0 0 * * *', () => {
  const deleted = purgeOldArticles(7);
  console.log(`[Cron] Purged ${deleted} old articles`);
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
