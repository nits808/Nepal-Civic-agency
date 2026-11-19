// ═══════════════════════════════════════════════════════════════
// NCIG Backend — LibSQL Database Layer (Turso Cloud & Local)
// Stores articles, cache metadata, and news sources with zero C++ compilation
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@libsql/client';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RSS_FEEDS } from './feeds.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = join(__dir, 'ncig.db');

let client;

export function getDB() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || `file:${LOCAL_DB_PATH}`;
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
    client = createClient({ url, authToken });
  }
  return client;
}

export async function initDB() {
  const db = getDB();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS articles (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      link        TEXT,
      description TEXT,
      category    TEXT,
      district    TEXT,
      province    TEXT,
      date        TEXT,
      time_ago    TEXT,
      source      TEXT,
      feed_type   TEXT,
      image_url   TEXT,
      has_real_image INTEGER DEFAULT 0,
      og_image    TEXT,
      fetched_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sources (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT,
      tier        INTEGER,
      province    TEXT,
      url         TEXT NOT NULL,
      fb          TEXT,
      website     TEXT,
      verified    INTEGER DEFAULT 0,
      status      TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS feed_status (
      feed_id     TEXT PRIMARY KEY,
      feed_name   TEXT,
      feed_type   TEXT,
      ok          INTEGER DEFAULT 0,
      article_count INTEGER DEFAULT 0,
      last_fetched TEXT,
      error_msg   TEXT
    );

    CREATE TABLE IF NOT EXISTS og_image_cache (
      url         TEXT PRIMARY KEY,
      og_image    TEXT,
      fetched_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS feed_http_cache (
      feed_id       TEXT PRIMARY KEY,
      etag          TEXT,
      last_modified TEXT,
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_articles_date     ON articles(date DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_province ON articles(province);
    CREATE INDEX IF NOT EXISTS idx_articles_source   ON articles(source);
  `);

  console.log(`[DB] Connected via @libsql/client (${process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local file: ' + LOCAL_DB_PATH})`);
  await bootstrapSources(RSS_FEEDS);
  return db;
}

// ── Insert / upsert articles ─────────────────────────────────
export async function upsertArticles(articles) {
  if (!articles || articles.length === 0) return 0;
  const db = getDB();

  const stmts = articles.map(row => ({
    sql: `INSERT OR REPLACE INTO articles
      (id, title, link, description, category, district, province,
       date, time_ago, source, feed_type, image_url, has_real_image, og_image, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
    args: [
      row.id,
      row.title,
      row.link || '',
      row.description || '',
      row.category || 'politics',
      row.district || 'Kathmandu',
      row.province || 'Bagmati',
      row.date || new Date().toISOString(),
      row.timeAgo || 'recently',
      row.source || '',
      row.feedType || 'media',
      row.imageUrl || null,
      row.hasRealImage ? 1 : 0,
      row.ogImage || null
    ]
  }));

  try {
    // Process in batches of 50 to avoid payload limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
      const slice = stmts.slice(i, i + BATCH_SIZE);
      await db.batch(slice, 'write');
    }
    return articles.length;
  } catch (e) {
    console.warn('[DB] upsertArticles failed:', e.message);
    return 0;
  }
}

// ── Upsert feed status ───────────────────────────────────────
export async function upsertFeedStatus(feedId, feedName, feedType, ok, count, error = null) {
  const db = getDB();
  try {
    const existingRes = await db.execute({
      sql: 'SELECT article_count FROM feed_status WHERE feed_id = ?',
      args: [feedId]
    });
    const existing = existingRes.rows[0];
    const normalizedCount = Number.isFinite(count) ? count : (existing?.article_count || 0);

    await db.execute({
      sql: `INSERT OR REPLACE INTO feed_status (feed_id, feed_name, feed_type, ok, article_count, last_fetched, error_msg)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [feedId, feedName, feedType, ok ? 1 : 0, normalizedCount, new Date().toISOString(), error]
    });
  } catch (e) {
    console.warn('[DB] upsertFeedStatus failed:', e.message);
  }
}

// ── Query articles ───────────────────────────────────────────
export async function queryArticles({ limit = 200, offset = 0, category, province, search } = {}) {
  const db = getDB();

  if (search) {
    const res = await db.execute({
      sql: `SELECT * FROM articles 
        WHERE title LIKE ? OR description LIKE ?
        ORDER BY date DESC LIMIT ? OFFSET ?`,
      args: [`%${search}%`, `%${search}%`, limit, offset]
    });
    return res.rows;
  }

  let query = 'SELECT * FROM articles WHERE 1=1';
  const args = [];

  if (category) { query += ' AND category = ?'; args.push(category); }
  if (province)  { query += ' AND province = ?'; args.push(province); }

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const res = await db.execute({ sql: query, args });
  return res.rows;
}

// ── Get feed statuses ────────────────────────────────────────
export async function getFeedStatuses() {
  const res = await getDB().execute('SELECT * FROM feed_status ORDER BY feed_name');
  return res.rows;
}

// ── News Source Management ───────────────────────────────────
export async function getAllSources() {
  const res = await getDB().execute("SELECT * FROM sources WHERE status = 'active'");
  return res.rows;
}

export async function upsertSources(sources) {
  if (!sources || sources.length === 0) return;
  const db = getDB();
  const stmts = sources.map(f => ({
    sql: `INSERT INTO sources (id, name, type, tier, province, url, fb, website, verified, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        tier = excluded.tier,
        province = excluded.province,
        url = excluded.url,
        fb = excluded.fb,
        website = excluded.website,
        verified = excluded.verified,
        status = excluded.status`,
    args: [
      f.id,
      f.name,
      f.type || 'media',
      f.tier || 4,
      f.province || 'National',
      f.url,
      f.fb || null,
      f.website || null,
      f.verified ? 1 : 0,
      f.status || 'active'
    ]
  }));

  try {
    await db.batch(stmts, 'write');
  } catch (err) {
    console.error('[DB] upsertSources failed:', err.message);
  }
}

// ── Bootstrap Registry ───────────────────────────────────────
export async function bootstrapSources(legacyFeeds) {
  const db = getDB();
  try {
    const res = await db.execute('SELECT COUNT(*) as c FROM sources');
    const count = Number(res.rows[0]?.c || 0);
    if (count > 0) return;

    console.log(`[DB] Bootstrapping sources table with ${legacyFeeds.length} items…`);
    await upsertSources(legacyFeeds.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type || 'media',
      tier: f.tier || 4,
      province: f.province || 'National',
      url: f.url,
      fb: f.fb || null,
      website: f.website || null,
      verified: f.verified ? 1 : 0,
      status: 'active'
    })));
  } catch (err) {
    console.warn('[DB] bootstrapSources check failed:', err.message);
  }
}

// ── Cache og:image for URL ───────────────────────────────────
export async function cacheOgImage(url, ogImage) {
  try {
    await getDB().execute({
      sql: `INSERT OR REPLACE INTO og_image_cache (url, og_image, fetched_at) VALUES (?, ?, unixepoch())`,
      args: [url, ogImage]
    });
  } catch (e) {}
}

export async function getCachedOgImage(url) {
  try {
    const res = await getDB().execute({
      sql: 'SELECT og_image FROM og_image_cache WHERE url = ?',
      args: [url]
    });
    return res.rows[0]?.og_image || null;
  } catch (e) {
    return null;
  }
}

export async function getFeedHttpCache(feedId) {
  try {
    const res = await getDB().execute({
      sql: 'SELECT etag, last_modified FROM feed_http_cache WHERE feed_id = ?',
      args: [feedId]
    });
    return res.rows[0] || null;
  } catch (e) {
    return null;
  }
}

export async function upsertFeedHttpCache(feedId, etag = null, lastModified = null) {
  try {
    await getDB().execute({
      sql: `INSERT INTO feed_http_cache (feed_id, etag, last_modified, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(feed_id) DO UPDATE SET
          etag = excluded.etag,
          last_modified = excluded.last_modified,
          updated_at = unixepoch()`,
      args: [feedId, etag, lastModified]
    });
  } catch (e) {}
}

// ── Stats ────────────────────────────────────────────────────
export async function getStats() {
  const db = getDB();
  const [totalRes, catRes, provRes, latestRes, okRes, allFeedsRes] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM articles'),
    db.execute('SELECT category, COUNT(*) as c FROM articles GROUP BY category ORDER BY c DESC'),
    db.execute('SELECT province, COUNT(*) as c FROM articles GROUP BY province ORDER BY c DESC'),
    db.execute('SELECT MAX(date) as d FROM articles'),
    db.execute('SELECT COUNT(*) as c FROM feed_status WHERE ok = 1'),
    db.execute('SELECT COUNT(*) as c FROM feed_status')
  ]);

  return {
    total: Number(totalRes.rows[0]?.c || 0),
    byCategory: catRes.rows,
    byProvince: provRes.rows,
    latest: latestRes.rows[0]?.d || null,
    feedsOk: Number(okRes.rows[0]?.c || 0),
    feedsTotal: Number(allFeedsRes.rows[0]?.c || 0)
  };
}

// ── Soft archive retention (Defaults to 180 days — preserves historical news) ──
export async function purgeOldArticles(daysToKeep = 180) {
  const cutoff = new Date(Date.now() - daysToKeep * 86400_000).toISOString();
  try {
    const res = await getDB().execute({
      sql: 'DELETE FROM articles WHERE date < ?',
      args: [cutoff]
    });
    return res.rowsAffected || 0;
  } catch (e) {
    return 0;
  }
}
