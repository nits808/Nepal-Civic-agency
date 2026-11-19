import { URL } from 'url';

function isSafeUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    
    const host = u.hostname;
    if (host === 'localhost') return false;
    if (/^127\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (/^169\.254\.\d+\.\d+$/.test(host)) return false;
    if (/^10\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (/^192\.168\.\d+\.\d+$/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return false;
    if (host.includes('::')) return false;

    return true;
  } catch {
    return false;
  }
}

import { RSS_FEEDS } from './feeds.js';
import { parseRSSText } from './parser.js';
import {
  upsertArticles,
  upsertFeedStatus,
  cacheOgImage,
  getCachedOgImage,
  getDB,
  getFeedHttpCache,
  upsertFeedHttpCache,
  getAllSources,
} from './db.js';

const FETCH_TIMEOUT_MS = 8000;
const OG_FETCH_TIMEOUT = 5000;

async function fetchFeed(feed) {
  if (!isSafeUrl(feed.url)) {
    return { ok: false, notModified: false, articles: [], count: 0, error: 'Unsafe SSRF URL blocked' };
  }
  
  let targetUrl = feed.url;
  if (targetUrl.includes('youtube.com/channel/')) {
      const channelId = targetUrl.split('channel/')[1].split('/')[0].split('?')[0];
      targetUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  } else if (!targetUrl.includes('.xml') && !targetUrl.includes('/rss') && !targetUrl.includes('/feed') && !targetUrl.includes('youtube.com')) {
      try {
          const domain = new URL(targetUrl).hostname.replace('www.', '');
          targetUrl = `https://news.google.com/rss/search?q=site:${domain}`;
      } catch(e){}
  }
  
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const cache = await getFeedHttpCache(feed.id);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; NCIG-Bot/3.0; +https://ncig.np)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    };
    if (cache?.etag) headers['If-None-Match'] = cache.etag;
    if (cache?.last_modified) headers['If-Modified-Since'] = cache.last_modified;

    const res = await fetch(targetUrl, { signal: ctrl.signal, headers });
    clearTimeout(timer);

    if (res.status === 304) {
      return { ok: true, notModified: true, articles: [], count: null };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const etag = res.headers.get('etag');
    const lastModified = res.headers.get('last-modified');
    if (etag || lastModified) {
      await upsertFeedHttpCache(feed.id, etag || null, lastModified || null);
    }

    const xml = await res.text();
    if (!xml || xml.length < 100) throw new Error('Empty response');

    const articles = parseRSSText(xml, feed);
    return { ok: true, notModified: false, articles, count: articles.length };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, notModified: false, articles: [], count: 0, error: err.message };
  }
}

export async function fetchOgImage(url) {
  if (!url || url.startsWith('#') || !isSafeUrl(url)) return null;

  const cached = await getCachedOgImage(url);
  if (cached) return cached;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OG_FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NCIG-OgBot/3.0)',
        Accept: 'text/html',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const html = await res.text();
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    let ogImage = ogMatch ? ogMatch[1] : null;
    if (ogImage && !ogImage.startsWith('http')) {
        try {
            ogImage = new URL(ogImage, url).href;
        } catch(e) {
            ogImage = null;
        }
    }
    if (ogImage) await cacheOgImage(url, ogImage);
    return ogImage;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function fetchAllFeeds(wss = null) {
  const sources = await getAllSources();
  console.log(`[Fetcher] Starting fetch cycle for ${sources.length} feeds...`);
  const startTime = Date.now();

  const promises = sources.map((feed) =>
    fetchFeed(feed).then(async (result) => {
      await upsertFeedStatus(
        feed.id,
        feed.name,
        feed.type,
        result.ok,
        result.count,
        result.error || null
      );

      if (result.ok && result.articles.length > 0) {
        const inserted = await upsertArticles(result.articles);
        if (wss && inserted > 0) {
          const msg = JSON.stringify({ type: 'NEW_ARTICLES', source: feed.name, count: inserted });
          wss.clients.forEach((client) => {
            if (client.readyState === 1) client.send(msg);
          });
        }
      }
      return { feed: feed.name, ...result };
    })
  );

  const results = await Promise.allSettled(promises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  const unchanged = results.filter((r) => r.status === 'fulfilled' && r.value.notModified).length;
  console.log(
    `[Fetcher] Done in ${elapsed}s - ${successful}/${sources.length} feeds OK (${unchanged} unchanged)`
  );

  return results;
}

export async function enrichArticlesWithOgImages(articles) {
  const needsImage = articles.filter((a) => !a.image_url && a.link).slice(0, 20);
  if (needsImage.length === 0) return;

  console.log(`[OgFetcher] Enriching ${needsImage.length} articles with og:image...`);

  await Promise.allSettled(
    needsImage.map(async (article) => {
      const ogImage = await fetchOgImage(article.link);
      if (ogImage) {
        getDB()
          .prepare('UPDATE articles SET og_image = ?, image_url = ? WHERE id = ?')
          .run(ogImage, ogImage, article.id);
      }
    })
  );
}

