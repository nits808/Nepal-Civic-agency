// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — API Gateway
// Central entry point: authentication, rate limiting, routing
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Redis from 'ioredis';

const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'ncig_jwt_secret_2026_dev';
const REDIS_URL = process.env.REDIS_URL || 'redis://:nepal_civic_2026@localhost:6379';

// ── Service Registry ──────────────────────────────────────────
const SERVICES = {
  scraper:    { host: process.env.SCRAPER_HOST || 'localhost', port: 3001 },
  classifier: { host: process.env.CLASSIFIER_HOST || 'localhost', port: 8001 },
  summarizer: { host: process.env.SUMMARIZER_HOST || 'localhost', port: 8002 },
  graph:      { host: process.env.GRAPH_HOST || 'localhost', port: 4001 },
  query:      { host: process.env.QUERY_HOST || 'localhost', port: 4002 },
  alerts:     { host: process.env.ALERTS_HOST || 'localhost', port: 4003 },
  chatbot:    { host: process.env.CHATBOT_HOST || 'localhost', port: 4004 },
  policy:     { host: process.env.POLICY_HOST || 'localhost', port: 4005 },
  scorer:     { host: process.env.SCORER_HOST || 'localhost', port: 4006 },
  simulation: { host: process.env.SIMULATION_HOST || 'localhost', port: 4007 },
  dedup:      { host: process.env.DEDUP_HOST || 'localhost', port: 4008 },
};

// ── Initialize Fastify ────────────────────────────────────────
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
  trustProxy: true,
});

// ── Redis Connection ──────────────────────────────────────────
const redis = new Redis(REDIS_URL);

redis.on('connect', () => app.log.info('Redis connected'));
redis.on('error', (err) => app.log.error({ err }, 'Redis error'));

// ── Plugins ───────────────────────────────────────────────────
await app.register(cors, {
  origin: (origin, cb) => {
    // Allow dev origins, configurable production origin
    const allowed = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      process.env.CORS_ORIGIN,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
  credentials: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  }),
});

await app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: '24h' },
});

await app.register(swagger, {
  openapi: {
    info: {
      title: 'Nepal Civic Intelligence Graph API',
      description: 'National-level civic intelligence platform API',
      version: '3.0.0',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});

// ── Auth Middleware ────────────────────────────────────────────
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
});

// ── Admin-only Middleware ──────────────────────────────────────
app.decorate('requireAdmin', async (request, reply) => {
  try {
    await request.jwtVerify();
    if (request.user?.role !== 'admin') {
      reply.status(403).send({ error: 'Forbidden', message: 'Admin role required' });
    }
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
});

// Primary health check used by useNews.js checkBackend()
app.get('/api/health', async () => ({
  status: 'healthy',
  service: 'api-gateway',
  version: '3.0.0',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

// Root-level health check (internal / Docker)
app.get('/health', async () => ({
  status: 'healthy',
  service: 'api-gateway',
  version: '3.0.0',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

// ── Auth Routes ───────────────────────────────────────────────
app.post('/api/v1/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      },
    },
  },
}, async (request, reply) => {
  const { email, password } = request.body;
  // In production, validate against database
  // For now, demo authentication
  const token = app.jwt.sign({
    userId: 'demo-user-id',
    email,
    role: 'analyst',
  });
  return { token, expiresIn: '24h' };
});

app.post('/api/v1/auth/register', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        name: { type: 'string', minLength: 2 },
      },
    },
  },
}, async (request) => {
  return { message: 'Registration successful', userId: 'new-user-id' };
});

// ── Proxy Helper ──────────────────────────────────────────────
async function proxyToService(serviceName, path, request, reply) {
  const service = SERVICES[serviceName];
  if (!service) {
    return reply.status(502).send({ error: `Service ${serviceName} not found` });
  }

  try {
    const url = `http://${service.host}:${service.port}${path}`;
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': request.id,
        'X-User-Id': request.user?.userId || 'anonymous',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(request.method)
        ? JSON.stringify(request.body)
        : undefined,
    });

    const data = await response.json();
    return reply.status(response.status).send(data);
  } catch (err) {
    app.log.error({ err, service: serviceName }, 'Proxy error');
    return reply.status(502).send({
      error: 'Service Unavailable',
      message: `${serviceName} service is not responding`,
    });
  }
}

// ── API Routes ────────────────────────────────────────────────

// Knowledge Graph
app.get('/api/v1/graph/*', { preHandler: [app.authenticate] }, async (req, reply) => {
  return proxyToService('graph', req.url.replace('/api/v1/graph', ''), req, reply);
});

// Query Engine
app.get('/api/v1/query', async (req, reply) => {
  // Forward the raw query string from the original request
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return proxyToService('query', `/query${qs}`, req, reply);
});

app.post('/api/v1/query/advanced', { preHandler: [app.authenticate] }, async (req, reply) => {
  return proxyToService('query', '/query/advanced', req, reply);
});

// Documents & Events
app.get('/api/v1/documents', async (req, reply) => {
  return proxyToService('graph', '/documents' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''), req, reply);
});

app.get('/api/v1/events', async (req, reply) => {
  return proxyToService('graph', '/events' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''), req, reply);
});

// ── Legacy Compatibility Routes ──────────────────────────────
// Maps NCIG 2.0 frontend requests to 3.0 microservices

app.get('/api/articles', async (req, reply) => {
  const service = SERVICES.graph;
  const qs = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
  const url = `http://${service.host}:${service.port}/events${qs}`;

  // Helper: human-readable "X mins ago"
  function timeAgo(dateStr) {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1)  return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24)  return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch { return ''; }
  }

  // Province → district heuristic (fallback when graph doesn't supply district)
  const PROVINCE_DISTRICTS = {
    'Bagmati': 'Kathmandu', 'Gandaki': 'Kaski', 'Lumbini': 'Rupandehi',
    'Madhesh': 'Parsa', 'Karnali': 'Surkhet', 'Sudurpashchim': 'Kailali',
    'Province No. 1': 'Morang',
  };

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Graph service HTTP ${response.status}`);
    const data = await response.json();
    // Graph may return array or { events: [] }
    const events = Array.isArray(data) ? data : (data.events || []);

    const articles = events.map(e => {
      const province = e.locationName || e.province || 'National';
      return {
        id:            e.id,
        title:         e.title,
        link:          e.sourceUrl || e.link || '#',
        description:   e.summary  || e.description || '',
        category:      e.category || 'general',
        province,
        district:      e.district || PROVINCE_DISTRICTS[province] || province,
        date:          e.date || e.publishedAt || new Date().toISOString(),
        timeAgo:       timeAgo(e.date || e.publishedAt),
        source:        e.sourceName || e.source || 'NCIG Graph',
        feed_type:     e.feedType   || 'media',
        image_url:     e.imageUrl   || e.image_url || null,
        has_real_image: !!(e.imageUrl || e.image_url),
      };
    });

    // Build feedStatus map so frontend progress bar works
    const feedStatus = {};
    articles.forEach(a => {
      if (a.source) feedStatus[a.source] = { ok: true, count: (feedStatus[a.source]?.count || 0) + 1 };
    });

    return {
      articles,
      feedStatus,
      total: articles.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    app.log.warn({ err }, '/api/articles: graph service unavailable, returning empty set');
    return { articles: [], feedStatus: {}, total: 0, timestamp: new Date().toISOString() };
  }
});

app.get('/api/feeds', async (req, reply) => {
  // Proxy to scraper service /scrapers and transform
  const service = SERVICES.scraper;
  const url = `http://${service.host}:${service.port}/scrapers`;

  try {
    const response = await fetch(url);
    const { scrapers } = await response.json();

    const feeds = scrapers.map(s => ({
      feed_id: s.id,
      feed_name: s.name,
      feed_type: s.type,
      ok: s.lastScraped ? 1 : 0,
      article_count: 0,
      last_fetched: s.lastScraped,
    }));

    return { feeds, total: feeds.length };
  } catch (err) {
    return { feeds: [], total: 0 };
  }
});

// Policies
app.get('/api/v1/policies', async (req, reply) => {
  return proxyToService('policy', '/policies', req, reply);
});

app.get('/api/v1/policies/:id', async (req, reply) => {
  return proxyToService('policy', `/policies/${req.params.id}`, req, reply);
});

// Officials
app.get('/api/v1/officials', async (req, reply) => {
  return proxyToService('scorer', '/officials', req, reply);
});

app.get('/api/v1/officials/:id/score', async (req, reply) => {
  return proxyToService('scorer', `/officials/${req.params.id}/score`, req, reply);
});

// Locations (Geospatial)
app.get('/api/v1/locations', async (req, reply) => {
  return proxyToService('graph', '/locations', req, reply);
});

app.get('/api/v1/locations/:id/events', async (req, reply) => {
  return proxyToService('graph', `/locations/${req.params.id}/events`, req, reply);
});

// Alerts
app.get('/api/v1/alerts', async (req, reply) => {
  return proxyToService('alerts', '/alerts', req, reply);
});

// Chatbot
app.post('/api/v1/chat', { preHandler: [app.authenticate] }, async (req, reply) => {
  return proxyToService('chatbot', '/chat', req, reply);
});

// Predictions
app.get('/api/v1/predictions', async (req, reply) => {
  return proxyToService('graph', '/predictions', req, reply);
});

// Simulation
app.post('/api/v1/simulate', { preHandler: [app.authenticate] }, async (req, reply) => {
  return proxyToService('simulation', '/simulate', req, reply);
});

// Scraper Management (admin only)
app.get('/api/v1/admin/scrapers', { preHandler: [app.requireAdmin] }, async (req, reply) => {
  return proxyToService('scraper', '/scrapers', req, reply);
});

app.post('/api/v1/admin/scrapers/trigger', { preHandler: [app.requireAdmin] }, async (req, reply) => {
  return proxyToService('scraper', '/scrapers/trigger', req, reply);
});

// ── Audit Logging ─────────────────────────────────────────────
app.addHook('onResponse', async (request, reply) => {
  if (request.url.startsWith('/api/')) {
    await redis.lpush('audit:log', JSON.stringify({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      ip: request.ip,
      userId: request.user?.userId || 'anonymous',
    }));
    await redis.ltrim('audit:log', 0, 99999); // Keep last 100K entries
  }
});

// ── Start Server ──────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`🏛️  Nepal Civic Intelligence Graph — API Gateway running on port ${PORT}`);
  app.log.info(`📚  API Documentation: http://localhost:${PORT}/docs`);
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}
