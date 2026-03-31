// ═══════════════════════════════════════════════════════════════
// NCIG Backend — Feed Fetcher + og:image Extractor
// Uses server-side fetch (no CORS!), parse all 26+ feeds in parallel
// ═══════════════════════════════════════════════════════════════

import { RSS_FEEDS } from './feeds.js';
import { parseRSSText } from './parser.js';
import { upsertArticles, upsertFeedStatus, cacheOgImage, getCachedOgImage, getDB } from './db.js';

const FETCH_TIMEOUT_MS = 8000;
const OG_FETCH_TIMEOUT = 5000;

// ── Fetch a single RSS feed ──────────────────────────────────
async function fetchFeed(feed) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(feed.url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NCIG-Bot/3.0; +https://ncig.np)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml || xml.length < 100) throw new Error('Empty response');

    const articles = parseRSSText(xml, feed);
    return { ok: true, articles, count: articles.length };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, articles: [], count: 0, error: err.message };
  }
}

// ── Extract og:image from an article page ───────────────────
export async function fetchOgImage(url) {
  if (!url || url.startsWith('#')) return null;

  // Check cache first
  const cached = getCachedOgImage(url);
  if (cached) return cached;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OG_FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NCIG-OgBot/3.0)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();

    // Extract og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    const ogImage = ogMatch ? ogMatch[1] : null;

    if (ogImage) {
      cacheOgImage(url, ogImage);
    }
    return ogImage;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Main fetch cycle: fetch all feeds in parallel ────────────
export async function fetchAllFeeds(wss = null) {
  console.log(`[Fetcher] Starting fetch cycle for ${RSS_FEEDS.length} feeds…`);
  const startTime = Date.now();

  // Fire all feeds in parallel
  const promises = RSS_FEEDS.map(feed =>
    fetchFeed(feed).then(result => {
      upsertFeedStatus(
        feed.id, feed.name, feed.type,
        result.ok, result.count, result.error || null
      );

      if (result.ok && result.articles.length > 0) {
        const inserted = upsertArticles(result.articles);

        // Push new articles to all WebSocket clients
        if (wss && inserted > 0) {
          const msg = JSON.stringify({
            type: 'NEW_ARTICLES',
            source: feed.name,
            count: inserted,
          });
          wss.clients.forEach(client => {
            if (client.readyState === 1) client.send(msg);
          });
        }
      }

      return { feed: feed.name, ...result };
    })
  );

  const results = await Promise.allSettled(promises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  console.log(`[Fetcher] Done in ${elapsed}s — ${successful}/${RSS_FEEDS.length} feeds OK`);

  return results;
}

// ── Enrich articles without images via og:image fetch ──────
export async function enrichArticlesWithOgImages(articles) {
  // Only process articles without a real image, limit to 20 per cycle
  const needsImage = articles
    .filter(a => !a.image_url && a.link)
    .slice(0, 20);

  if (needsImage.length === 0) return;

  console.log(`[OgFetcher] Enriching ${needsImage.length} articles with og:image…`);

  await Promise.allSettled(
    needsImage.map(async (article) => {
      const ogImage = await fetchOgImage(article.link);
      if (ogImage) {
        getDB().prepare('UPDATE articles SET og_image = ?, image_url = ? WHERE id = ?')
          .run(ogImage, ogImage, article.id);
      }
    })
  );
}
