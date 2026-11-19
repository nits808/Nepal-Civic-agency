// ═══════════════════════════════════════════════════════════════
// NCIG Autonomous Crawler — Standalone Ingestion Engine
// Used by GitHub Actions (every 30 mins) and manual CLI triggers
// Ingests 48+ sources directly into Turso Cloud / Local SQLite
// ═══════════════════════════════════════════════════════════════

import dotenv from 'dotenv';
dotenv.config();

import { initDB, getAllSources, purgeOldArticles, getStats } from './db.js';
import { fetchAllFeeds, enrichArticlesWithOgImages } from './fetcher.js';

async function runCrawler() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🇳🇵 NCIG Autonomous News Crawler — Starting Ingestion Cycle');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`☁️ Database Target: ${process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local SQLite'}`);
  console.log('═══════════════════════════════════════════════════════════');

  const startTime = Date.now();

  try {
    // 1. Initialize DB & bootstrap default sources if empty
    await initDB();

    // 2. Fetch all feeds
    const results = await fetchAllFeeds();

    // 3. Enrich latest articles with og:image real photos
    console.log('[Crawler] Enriching recent articles with og:image photos…');
    const { queryArticles } = await import('./db.js');
    const recentArticles = await queryArticles({ limit: 40 });
    await enrichArticlesWithOgImages(recentArticles);

    // 4. Soft archive retention (purges articles older than 180 days)
    const purged = await purgeOldArticles(180);
    if (purged > 0) {
      console.log(`[Crawler] Purged ${purged} old articles (>180 days)`);
    }

    // 5. Output Summary Stats
    const stats = await getStats();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n📊 ─── Ingestion Summary ─────────────────────────────────');
    console.log(`⏱️ Duration:       ${elapsed}s`);
    console.log(`📰 Total Articles: ${stats.total}`);
    console.log(`📡 Feeds Live:     ${stats.feedsOk} / ${stats.feedsTotal}`);
    console.log(`🗓️ Latest Article: ${stats.latest || 'N/A'}`);
    console.log('✅ Ingestion complete. Data persisted to Turso Cloud.');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ [Crawler Error]:', err);
    process.exit(1);
  }
}

runCrawler();
