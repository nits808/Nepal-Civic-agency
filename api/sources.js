import { getTursoClient } from './lib/turso.js';
import crypto from 'crypto';

function cleanText(str) {
  if (!str) return '';
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = getTursoClient();

  if (req.method === 'GET') {
    try {
      const result = await db.execute("SELECT * FROM sources WHERE status = 'active' ORDER BY tier ASC, name ASC");
      return res.status(200).json({ sources: result.rows, total: result.rows.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { url, name, province = 'National', type = 'media', tier = 4 } = req.body || {};
      if (!url) return res.status(400).json({ error: 'URL required' });

      let finalUrl = url.trim();
      let detectedType = type;
      let sourceName = name;
      let homepage = finalUrl;

      // 1. Resolve Clean Homepage Domain (Never deep article link)
      try {
        const parsed = new URL(finalUrl);
        if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
          if (parsed.pathname.startsWith('/@')) {
            homepage = `https://www.youtube.com/${parsed.pathname.split('/')[1]}`;
          } else if (parsed.pathname.startsWith('/channel/')) {
            homepage = `https://www.youtube.com/channel/${parsed.pathname.split('/')[2]}`;
          } else {
            homepage = 'https://www.youtube.com';
          }
        } else {
          homepage = `${parsed.protocol}//${parsed.host}`;
        }
      } catch (e) {}

      // 2. YouTube Channel Resolution
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
              if (!homepage.includes('/channel/') && !homepage.includes('/@')) {
                homepage = `https://www.youtube.com/channel/${channelIdMatch[1]}`;
              }
            }
            if (!sourceName) {
              const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
              if (titleMatch) sourceName = titleMatch[1].replace(/ - YouTube$/, '').trim();
            }
          } catch (e) {}
        }
      } else if (!finalUrl.includes('.xml') && !finalUrl.includes('/rss') && !finalUrl.includes('/feed')) {
        // 3. Web News Portal Resolution: Try direct /feed first, fallback to Google News RSS
        try {
          const u = new URL(finalUrl);
          const domain = u.hostname.replace(/^www\./, '');
          if (!sourceName) sourceName = domain.split('.')[0].toUpperCase();

          let discoveredFeed = false;
          try {
            const testRss = await fetch(`${homepage}/feed`, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(3000)
            });
            if (testRss.ok) {
              const text = await testRss.text();
              if (text.includes('<rss') || text.includes('<feed') || text.includes('<xml')) {
                finalUrl = `${homepage}/feed`;
                discoveredFeed = true;
              }
            }
          } catch (e) {}

          if (!discoveredFeed) {
            finalUrl = `https://news.google.com/rss/search?q=site:${domain}`;
          }
        } catch (e) {}
      }

      if (!sourceName) {
        try { sourceName = new URL(finalUrl).hostname.replace(/^www\./, ''); } catch (e) { sourceName = 'New Source'; }
      }

      const id = `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Save source to Turso
      await db.execute({
        sql: `INSERT INTO sources (id, name, type, tier, province, url, fb, website, verified, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            tier = excluded.tier,
            province = excluded.province,
            url = excluded.url,
            website = excluded.website,
            status = excluded.status`,
        args: [id, sourceName, detectedType, parseInt(tier) || 4, province, finalUrl, null, homepage, 0, 'active']
      });

      // 4. Immediately Ingest Articles for this source on the spot
      let ingestedCount = 0;
      try {
        const feedRes = await fetch(finalUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(8000)
        });
        const xml = await feedRes.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];

        for (const raw of items.slice(0, 25)) {
          const titleM = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const linkM = raw.match(/<link[^>]*href=["']([^"']+)["']/i) || raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
          const descM = raw.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || raw.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
          const dateM = raw.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || raw.match(/<published[^>]*>([\s\S]*?)<\/published>/i);

          let title = cleanText(titleM ? titleM[1] : '');
          let link = cleanText(linkM ? (linkM[1] || linkM[2]) : '');
          let desc = cleanText(descM ? descM[1] : '');
          let pubDate = dateM ? dateM[1].trim() : new Date().toISOString();

          // Strip HTML & Google News redirect artifacts
          title = title.replace(/<[^>]+>/g, '').trim();
          desc = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

          if (!desc || desc === sourceName || desc.includes('news.google.com') || desc.length < 15) {
            const cleanT = title.split(' - ')[0].trim();
            desc = `${cleanT} — Read full coverage on ${sourceName}.`;
          }

          if (!title || !link) continue;
          const articleId = crypto.createHash('md5').update(link || title).digest('hex');

          await db.execute({
            sql: `INSERT INTO articles (
              id, title, link, description, category, district, province,
              date, time_ago, source, feed_type, image_url, has_real_image, og_image, fetched_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              category = excluded.category,
              province = excluded.province`,
            args: [
              articleId, title, link, desc, 'general', 'Kathmandu', province || 'National',
              pubDate, 'recently', sourceName, detectedType || 'media', null, 0, null, Math.floor(Date.now() / 1000)
            ]
          });
          ingestedCount++;
        }
      } catch (ingestErr) {
        console.warn('Immediate feed ingestion warning:', ingestErr.message);
      }

      return res.status(200).json({
        ok: true,
        message: `✓ Added "${sourceName}" and immediately ingested ${ingestedCount} articles!`,
        source: { id, name: sourceName, type: detectedType, province, tier, url: finalUrl, website: homepage },
        ingestedCount
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
