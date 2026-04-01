// ═══════════════════════════════════════════════════════════════
// NCIG Backend — SQLite Database Layer
// Stores articles, cache metadata, and feed status
// ═══════════════════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dir, 'ncig.db');

let db;

export function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');   // faster writes
  db.pragma('synchronous = NORMAL'); // balance durability vs speed
  db.pragma('cache_size = -64000');  // 64MB in-memory cache

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
      og_image    TEXT,       -- extracted from actual page (server-side)
      fetched_at  INTEGER NOT NULL DEFAULT (unixepoch())
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

    -- Full-text search using FTS5
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      title, description, source, category, province,
      content='articles', content_rowid='rowid'
    );
  `);

  console.log(`[DB] Initialized at ${DB_PATH}`);
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
      (@id, @title, @link, @description, @category, @district, @province,
       @date, @timeAgo, @source, @feedType, @imageUrl, @hasRealImage, @ogImage, unixepoch())
  `);

  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const row of rows) {
      try {
        insert.run({
          id:           row.id,
          title:        row.title,
          link:         row.link || '',
          description:  row.description || '',
          category:     row.category || 'politics',
          district:     row.district || 'Kathmandu',
          province:     row.province || 'Bagmati',
          date:         row.date || new Date().toISOString(),
          timeAgo:      row.timeAgo || 'recently',
          source:       row.source || '',
          feedType:     row.feedType || 'media',
          imageUrl:     row.imageUrl || null,
          hasRealImage: row.hasRealImage ? 1 : 0,
          ogImage:      row.ogImage || null,
        });
        count++;
      } catch (_) {/* skip duplicate */}
    }

    // Keep FTS index in sync — INSERT OR REPLACE breaks FTS rowid tracking
    // so we do a full rebuild after each batch (cheap for SQLite sizes)
    if (count > 0) {
      db.prepare("INSERT INTO articles_fts(articles_fts) VALUES('rebuild')").run();
    }

    return count;
  });

  return insertMany(articles);
}

// ── Upsert feed status ───────────────────────────────────────
export function upsertFeedStatus(feedId, feedName, feedType, ok, count, error = null) {
  const existing = getDB().prepare(`
    SELECT article_count
    FROM feed_status
    WHERE feed_id = ?
  `).get(feedId);

  const normalizedCount = Number.isFinite(count)
    ? count
    : (existing?.article_count || 0);

  getDB().prepare(`
    INSERT OR REPLACE INTO feed_status (feed_id, feed_name, feed_type, ok, article_count, last_fetched, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(feedId, feedName, feedType, ok ? 1 : 0, normalizedCount, new Date().toISOString(), error);
}

// ── Query articles ───────────────────────────────────────────
export function queryArticles({ limit = 200, offset = 0, category, province, search } = {}) {
  const db = getDB();

  if (search) {
    // Full-text search
    return db.prepare(`
      SELECT a.* FROM articles a
      JOIN articles_fts fts ON a.rowid = fts.rowid
      WHERE articles_fts MATCH ?
      ORDER BY a.date DESC
      LIMIT ? OFFSET ?
    `).all(`${search}*`, limit, offset);
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
