// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — Scraper Service
// Production-ready web scraper with Playwright, BullMQ scheduling,
// change detection, deduplication, and Kafka ingestion
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import { Kafka, Partitioners } from 'kafkajs';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const PORT = parseInt(process.env.PORT || '3001');

// ── Configuration ─────────────────────────────────────────────
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://:nepal_civic_2026@localhost:6379';

// ── Source Configurations ─────────────────────────────────────
// Each source defines how to scrape, what to extract, and how often
const SOURCE_CONFIGS = [
  {
    id: 'nepal-gov-portal',
    name: 'Nepal Government Portal',
    url: 'https://nepal.gov.np',
    type: 'government',
    method: 'playwright', // 'playwright' for JS sites, 'http' for static
    schedule: '*/5 * * * *', // every 5 minutes
    priority: 1,
    extraction: {
      listSelector: 'article, .news-item, .notice-item',
      titleSelector: 'h2, h3, .title',
      contentSelector: '.content, .body, p',
      dateSelector: '.date, time, .published',
      linkSelector: 'a[href]',
    },
    kafkaTopic: 'raw.government',
  },
  {
    id: 'kathmandu-post',
    name: 'The Kathmandu Post',
    url: 'https://kathmandupost.com',
    type: 'media',
    method: 'http',
    schedule: '*/10 * * * *',
    priority: 2,
    extraction: {
      listSelector: 'article.article-item',
      titleSelector: 'h2, h3',
      contentSelector: '.description, .excerpt',
      dateSelector: 'time',
      linkSelector: 'a',
    },
    kafkaTopic: 'raw.news',
  },
  {
    id: 'mof-nepal',
    name: 'Ministry of Finance',
    url: 'https://mof.gov.np',
    type: 'government',
    method: 'playwright',
    schedule: '*/10 * * * *',
    priority: 1,
    extraction: {
      listSelector: '.news-list li, .notice-list li',
      titleSelector: 'a, .title',
      contentSelector: '.description',
      dateSelector: '.date',
      linkSelector: 'a',
    },
    kafkaTopic: 'raw.policy',
  },
  {
    id: 'online-khabar-rss',
    name: 'Online Khabar (RSS)',
    url: 'https://english.onlinekhabar.com/feed',
    type: 'media',
    method: 'rss',
    schedule: '*/10 * * * *',
    priority: 2,
    kafkaTopic: 'raw.news',
  },
  {
    id: 'ppmo-nepal',
    name: 'PPMO Tenders',
    url: 'https://ppmo.gov.np',
    type: 'government',
    method: 'playwright',
    schedule: '*/15 * * * *',
    priority: 1,
    extraction: {
      listSelector: '.tender-item, .bid-item, table tbody tr',
      titleSelector: 'td:first-child, .title',
      contentSelector: 'td, .details',
      dateSelector: '.date, td:last-child',
      linkSelector: 'a',
    },
    kafkaTopic: 'raw.government',
  },
];

// ── Initialize Services ───────────────────────────────────────
const redis = new Redis(REDIS_URL);
const rssParser = new Parser();

// Kafka Producer
const kafka = new Kafka({
  clientId: 'scraper-service',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 300, retries: 5 },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  idempotent: true,
  maxInFlightRequests: 5,
});

// BullMQ Job Queue
const scrapeQueue = new Queue('scrape-jobs', {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

// ── Content Hash for Deduplication ────────────────────────────
function contentHash(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

// ── Playwright Scraper ────────────────────────────────────────
async function scrapeWithPlaywright(config) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Nepal-Civic-Bot/3.0',
    locale: 'ne-NP',
    timezoneId: 'Asia/Kathmandu',
  });

  const page = await context.newPage();
  const results = [];

  try {
    // Navigate with retry logic
    await page.goto(config.url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Extract items
    const items = await page.$$eval(
      config.extraction.listSelector,
      (elements, selectors) => {
        return elements.slice(0, 50).map((el) => {
          const title = el.querySelector(selectors.title)?.textContent?.trim() || '';
          const content = el.querySelector(selectors.content)?.textContent?.trim() || '';
          const date = el.querySelector(selectors.date)?.textContent?.trim() || '';
          const link = el.querySelector(selectors.link)?.getAttribute('href') || '';
          return { title, content, date, link };
        });
      },
      {
        title: config.extraction.titleSelector,
        content: config.extraction.contentSelector,
        date: config.extraction.dateSelector,
        link: config.extraction.linkSelector,
      }
    );

    for (const item of items) {
      if (!item.title && !item.content) continue;

      const hash = contentHash(item.title + item.content);
      const exists = await redis.get(`content:hash:${hash}`);

      if (!exists) {
        results.push({
          sourceId: config.id,
          sourceName: config.name,
          sourceType: config.type,
          url: item.link.startsWith('http') ? item.link : new URL(item.link, config.url).href,
          title: item.title,
          content: item.content,
          publishedAt: item.date || new Date().toISOString(),
          contentHash: hash,
          scrapedAt: new Date().toISOString(),
          language: detectLanguage(item.title + ' ' + item.content),
        });

        // Mark as seen (TTL: 24 hours)
        await redis.set(`content:hash:${hash}`, '1', 'EX', 86400);
      }
    }

    logger.info({ source: config.id, found: items.length, new: results.length }, 'Playwright scrape complete');
  } catch (err) {
    logger.error({ err, source: config.id }, 'Playwright scrape failed');
    // Publish to dead letter queue
    await publishToDLQ(config.id, err.message);
  } finally {
    await browser.close();
  }

  return results;
}

// ── HTTP Scraper (for static sites) ───────────────────────────
async function scrapeWithHttp(config) {
  const results = [];

  try {
    const response = await fetch(config.url, {
      headers: {
        'User-Agent': 'Nepal-Civic-Intelligence-Bot/3.0',
        'Accept-Language': 'ne-NP,ne;q=0.9,en;q=0.8',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const items = [];

    $(config.extraction.listSelector).each((_, el) => {
      items.push({
        title: $(el).find(config.extraction.titleSelector).text().trim(),
        content: $(el).find(config.extraction.contentSelector).text().trim(),
        date: $(el).find(config.extraction.dateSelector).text().trim(),
        link: $(el).find(config.extraction.linkSelector).attr('href') || '',
      });
    });

    for (const item of items.slice(0, 50)) {
      if (!item.title && !item.content) continue;
      const hash = contentHash(item.title + item.content);
      const exists = await redis.get(`content:hash:${hash}`);

      if (!exists) {
        results.push({
          sourceId: config.id,
          sourceName: config.name,
          sourceType: config.type,
          url: item.link.startsWith('http') ? item.link : new URL(item.link, config.url).href,
          title: item.title,
          content: item.content,
          publishedAt: item.date || new Date().toISOString(),
          contentHash: hash,
          scrapedAt: new Date().toISOString(),
          language: detectLanguage(item.title + ' ' + item.content),
        });
        await redis.set(`content:hash:${hash}`, '1', 'EX', 86400);
      }
    }

    logger.info({ source: config.id, new: results.length }, 'HTTP scrape complete');
  } catch (err) {
    logger.error({ err, source: config.id }, 'HTTP scrape failed');
    await publishToDLQ(config.id, err.message);
  }

  return results;
}

// ── RSS Parser ────────────────────────────────────────────────
async function scrapeRss(config) {
  const results = [];

  try {
    const feed = await rssParser.parseURL(config.url);

    for (const item of feed.items || []) {
      const text = (item.title || '') + (item.contentSnippet || '');
      const hash = contentHash(text);
      const exists = await redis.get(`content:hash:${hash}`);

      if (!exists) {
        results.push({
          sourceId: config.id,
          sourceName: config.name,
          sourceType: config.type,
          url: item.link || config.url,
          title: item.title || '',
          content: item.contentSnippet || item.content || '',
          publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
          contentHash: hash,
          scrapedAt: new Date().toISOString(),
          language: detectLanguage(text),
        });
        await redis.set(`content:hash:${hash}`, '1', 'EX', 86400);
      }
    }

    logger.info({ source: config.id, new: results.length }, 'RSS parse complete');
  } catch (err) {
    logger.error({ err, source: config.id }, 'RSS parse failed');
    await publishToDLQ(config.id, err.message);
  }

  return results;
}

// ── Language Detection (simple heuristic) ─────────────────────
function detectLanguage(text) {
  // Nepali Unicode range: \u0900-\u097F (Devanagari)
  const nepaliChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return nepaliChars / totalChars > 0.3 ? 'ne' : 'en';
}

// ── Publish to Kafka ──────────────────────────────────────────
async function publishToKafka(topic, documents) {
  if (documents.length === 0) return;

  const messages = documents.map((doc) => ({
    key: doc.sourceId,
    value: JSON.stringify(doc),
    headers: {
      source: doc.sourceId,
      timestamp: new Date().toISOString(),
    },
  }));

  await producer.send({ topic, messages });
  logger.info({ topic, count: messages.length }, 'Published to Kafka');

  // Update metrics
  await redis.incrby('metrics:ingested:total', messages.length);
  await redis.incrby(`metrics:ingested:${topic}`, messages.length);
}

// ── Dead Letter Queue ─────────────────────────────────────────
async function publishToDLQ(sourceId, error) {
  await producer.send({
    topic: 'system.dead-letter',
    messages: [{
      key: sourceId,
      value: JSON.stringify({
        sourceId,
        error,
        timestamp: new Date().toISOString(),
      }),
    }],
  });
}

// ── BullMQ Worker ─────────────────────────────────────────────
const worker = new Worker('scrape-jobs', async (job) => {
  const config = job.data;
  logger.info({ source: config.id, method: config.method }, 'Starting scrape job');

  let documents = [];

  switch (config.method) {
    case 'playwright':
      documents = await scrapeWithPlaywright(config);
      break;
    case 'http':
      documents = await scrapeWithHttp(config);
      break;
    case 'rss':
      documents = await scrapeRss(config);
      break;
    default:
      throw new Error(`Unknown scrape method: ${config.method}`);
  }

  if (documents.length > 0) {
    await publishToKafka(config.kafkaTopic, documents);
  }

  // Update last scraped time
  await redis.set(`source:last_scraped:${config.id}`, new Date().toISOString());

  return { source: config.id, documentsIngested: documents.length };
}, {
  connection: { url: REDIS_URL },
  concurrency: 5, // Max 5 parallel scrape jobs
  limiter: { max: 10, duration: 60000 }, // Max 10 jobs per minute
});

worker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, ...result }, 'Scrape job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Scrape job failed');
});

// ── Schedule Jobs ─────────────────────────────────────────────
async function scheduleJobs() {
  for (const config of SOURCE_CONFIGS) {
    // Add repeatable job
    await scrapeQueue.add(`scrape:${config.id}`, config, {
      repeat: { pattern: config.schedule },
      priority: config.priority,
      jobId: `recurring:${config.id}`,
    });
    logger.info({ source: config.id, schedule: config.schedule }, 'Scheduled scrape job');
  }
}

// ── Fastify API ───────────────────────────────────────────────
const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'healthy',
  service: 'scraper-service',
  activeSources: SOURCE_CONFIGS.length,
  timestamp: new Date().toISOString(),
}));

// List all scrapers and their status
app.get('/scrapers', async () => {
  const scrapers = await Promise.all(
    SOURCE_CONFIGS.map(async (config) => {
      const lastScraped = await redis.get(`source:last_scraped:${config.id}`);
      return {
        id: config.id,
        name: config.name,
        type: config.type,
        method: config.method,
        schedule: config.schedule,
        lastScraped,
      };
    })
  );
  return { scrapers, total: scrapers.length };
});

// Trigger a specific scraper immediately
app.post('/scrapers/trigger', async (request) => {
  const { sourceId } = request.body || {};
  const config = SOURCE_CONFIGS.find((s) => s.id === sourceId);

  if (!config) {
    return { error: 'Source not found', availableSources: SOURCE_CONFIGS.map((s) => s.id) };
  }

  const job = await scrapeQueue.add(`manual:${config.id}`, config, {
    priority: 0, // Highest priority
  });

  return { message: 'Scrape triggered', jobId: job.id, source: config.id };
});

// Trigger all scrapers
app.post('/scrapers/trigger-all', async () => {
  const jobs = [];
  for (const config of SOURCE_CONFIGS) {
    const job = await scrapeQueue.add(`manual:${config.id}`, config, { priority: 0 });
    jobs.push({ jobId: job.id, source: config.id });
  }
  return { message: 'All scrapers triggered', jobs };
});

// Metrics
app.get('/scrapers/metrics', async () => {
  const totalIngested = await redis.get('metrics:ingested:total') || '0';
  const byTopic = {};
  for (const topic of ['raw.news', 'raw.policy', 'raw.disaster', 'raw.government', 'raw.social']) {
    byTopic[topic] = await redis.get(`metrics:ingested:${topic}`) || '0';
  }
  return { totalIngested: parseInt(totalIngested), byTopic };
});

// ── Startup ───────────────────────────────────────────────────
async function start() {
  await producer.connect();
  logger.info('Kafka producer connected');

  await scheduleJobs();
  logger.info('All scrape jobs scheduled');

  await app.listen({ port: PORT, host: '0.0.0.0' });
  logger.info(`🕷️  Scraper Service running on port ${PORT}`);
}

start().catch((err) => {
  logger.fatal(err);
  process.exit(1);
});

// ── Graceful Shutdown ─────────────────────────────────────────
async function shutdown() {
  logger.info('Shutting down...');
  await worker.close();
  await scrapeQueue.close();
  await producer.disconnect();
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
