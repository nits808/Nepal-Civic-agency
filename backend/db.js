// ═══════════════════════════════════════════════════════════════
// NCIG Backend — Built-in SQLite Database Layer
// Stores articles, cache metadata, and news sources
// ═══════════════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DB_DIR || (process.env.NODE_ENV === 'production' ? join(__dir, 'data') : __dir);
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, 'ncig.db');

let db;

export function initDB() {
  db = new Database(DB_PATH);

  // Set pragmas for performance
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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

    CREATE TABLE IF NOT EXISTS article_embeddings (
      article_id  TEXT PRIMARY KEY,
      embedding   TEXT,
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS discovered_sources (
      id          TEXT PRIMARY KEY,
      district    TEXT,
      page_name   TEXT,
      url         TEXT UNIQUE,
      discovered_at TEXT,
      status      TEXT DEFAULT 'new'
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

  console.log(`[DB] Using better-sqlite3 at ${DB_PATH}`);
  return db;
}

export function getDB() {
  if (!db) initDB();
  return db;
}

// ── Insert / upsert articles ─────────────────────────────────
export function upsertArticles(articles) {
  const db = getDB();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO articles
      (id, title, link, description, category, district, province,
       date, time_ago, source, feed_type, image_url, has_real_image, og_image, fetched_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `);

  let count = 0;
  const trx = db.transaction((items) => {
    for (const row of items) {
      insert.run(
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
      );
      count++;
    }
  });

  try {
    trx(articles);
  } catch (e) {
    console.warn('[DB] upsertArticles failed:', e.message);
  }

  return count;
}

// ── Upsert feed status ───────────────────────────────────────
export function upsertFeedStatus(feedId, feedName, feedType, ok, count, error = null) {
  const db = getDB();
  const existing = db.prepare(`
    SELECT article_count
    FROM feed_status
    WHERE feed_id = ?
  `).get(feedId);

  const normalizedCount = Number.isFinite(count)
    ? count
    : (existing?.article_count || 0);

  db.prepare(`
    INSERT OR REPLACE INTO feed_status (feed_id, feed_name, feed_type, ok, article_count, last_fetched, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(feedId, feedName, feedType, ok ? 1 : 0, normalizedCount, new Date().toISOString(), error);
}

// ── Query articles ───────────────────────────────────────────
export function queryArticles({ limit = 200, offset = 0, category, province, search } = {}) {
  const db = getDB();

  if (search) {
    return db.prepare(`
        SELECT * FROM articles 
        WHERE title LIKE ? OR description LIKE ? OR content LIKE ?
        ORDER BY date DESC
        LIMIT ? OFFSET ?
    `).all(`%${search}%`, `%${search}%`, `%${search}%`, limit, offset);
  }

  let query = 'SELECT * FROM articles WHERE 1=1';
  const params = [];

  if (category) { query += ' AND category = ?'; params.push(category); }
  if (province)  { query += ' AND province = ?'; params.push(province); }

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

// ── Get feed statuses ────────────────────────────────────────
export function getFeedStatuses() {
  return getDB().prepare('SELECT * FROM feed_status ORDER BY feed_name').all();
}

// ── News Source Management ───────────────────────────────────
export function getAllSources() {
  return getDB().prepare("SELECT * FROM sources WHERE status = 'active'").all();
}

export function upsertSources(sources) {
  const db = getDB();
  const insert = db.prepare(`
    INSERT INTO sources (id, name, type, tier, province, url, fb, website, verified, status)
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
      status = excluded.status
  `);

  const trx = db.transaction((items) => {
    for (const f of items) {
      insert.run(f.id, f.name, f.type, f.tier, f.province, f.url, f.fb, f.website, f.verified, f.status);
    }
  });

  try {
    trx(sources);
  } catch (err) {
    console.error('[DB] upsertSources failed:', err.message);
  }
}

// ── Bootstrap Registry ───────────────────────────────────────
export function bootstrapSources(legacyFeeds) {
    const db = getDB();
    const count = db.prepare('SELECT COUNT(*) as c FROM sources').get().c;
    if (count > 0) return;
  
    console.log(`[DB] Bootstrapping sources table with ${legacyFeeds.length} items…`);
    upsertSources(legacyFeeds.map(f => ({
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
}

// ── Discovery Management ─────────────────────────────────────
export function saveDiscoveredSources(results) {
  const db = getDB();
  const insert = db.prepare(`
    INSERT INTO discovered_sources (id, district, page_name, url, discovered_at, status)
    VALUES (?, ?, ?, ?, ?, 'new')
    ON CONFLICT(url) DO NOTHING
  `);

  const trx = db.transaction((items) => {
    for (const row of items) {
      insert.run(row.id || Buffer.from(row.url).toString('base64'), row.district, row.page_name || row.pageName, row.url, row.discovered_at || row.date);
    }
  });

  try {
    trx(results);
  } catch (err) {
    console.error('[DB] saveDiscoveredSources failed:', err.message);
  }
}

export function getDiscoveredSources(status = 'new') {
  return getDB().prepare('SELECT * FROM discovered_sources WHERE status = ? ORDER BY discovered_at DESC').all(status);
}

export function updateDiscoveryStatus(id, status) {
  getDB().prepare('UPDATE discovered_sources SET status = ? WHERE id = ?').run(status, id);
}

// ── Cache og:image for URL ───────────────────────────────────
export function cacheOgImage(url, ogImage) {
  getDB().prepare(`
    INSERT OR REPLACE INTO og_image_cache (url, og_image, fetched_at)
    VALUES (?, ?, unixepoch())
  `).run(url, ogImage);
}

export function getCachedOgImage(url) {
  const row = getDB().prepare('SELECT og_image FROM og_image_cache WHERE url = ?').get(url);
  return row?.og_image || null;
}

export function getFeedHttpCache(feedId) {
  return getDB()
    .prepare('SELECT etag, last_modified FROM feed_http_cache WHERE feed_id = ?')
    .get(feedId) || null;
}

export function upsertFeedHttpCache(feedId, etag = null, lastModified = null) {
  getDB().prepare(`
    INSERT INTO feed_http_cache (feed_id, etag, last_modified, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(feed_id) DO UPDATE SET
      etag = excluded.etag,
      last_modified = excluded.last_modified,
      updated_at = unixepoch()
  `).run(feedId, etag, lastModified);
}

// ── Stats ────────────────────────────────────────────────────
export function getStats() {
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
  const byCategory = db.prepare('SELECT category, COUNT(*) as c FROM articles GROUP BY category ORDER BY c DESC').all();
  const byProvince = db.prepare('SELECT province, COUNT(*) as c FROM articles GROUP BY province ORDER BY c DESC').all();
  const latest = db.prepare('SELECT MAX(date) as d FROM articles').get().d;
  const feedsOk = db.prepare('SELECT COUNT(*) as c FROM feed_status WHERE ok = 1').get().c;
  const feedsTotal = db.prepare('SELECT COUNT(*) as c FROM feed_status').get().c;

  return { total, byCategory, byProvince, latest, feedsOk, feedsTotal };
}

// ── Cleanup old articles (keep last 7 days) ──────────────────
export function purgeOldArticles(daysToKeep = 7) {
  const cutoff = new Date(Date.now() - daysToKeep * 86400_000).toISOString();
  const result = getDB().prepare("DELETE FROM articles WHERE date < ?").run(cutoff);
  return result.changes;
}
