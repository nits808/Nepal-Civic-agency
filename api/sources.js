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

const KEYWORDS = {
  disaster: ['flood','earthquake','landslide','disaster','fire','rescue','casualty','मृत्यु','बाढी','पहिरो','भूकम्प','दुर्घटना'],
  health: ['health','hospital','disease','covid','vaccine','medical','doctor','patient','स्वास्थ्य','अस्पताल','बिरामी','उपचार'],
  economy: ['economy','budget','trade','inflation','tax','bank','remittance','market','gold','share','अर्थतन्त्र','बजेट','बैंक','रेमिट्यान्स','सेयर'],
  politics: ['election','parliament','minister','government','vote','cabinet','party','oli','prachanda','deuba','राजनीति','मन्त्री','सरकार','निर्वाचन','संसद'],
  infrastructure: ['road','bridge','highway','airport','project','hydro','electricity','construction','सडक','पुल','विद्युत','आयोजना','विमानस्थल'],
  technology: ['tech','ai','software','telecom','digital','startup','technology','app','cyber','प्रविधि','इन्टरनेट','दूरसञ्चार'],
  sports: ['cricket','football','sports','match','score','league','खेलकुद','क्रिकेट','फुटबल'],
};

function classify(text) {
  const t = (text || '').toLowerCase();
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => t.includes(k))) return cat;
  }
  return 'politics';
}

function getTimeAgo(isoDate) {
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (isNaN(mins) || mins < 0) return 'just now';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
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

      // 1. Resolve Clean Homepage Domain
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
            const channelIdMatch = html.match(/channel_id=([a-zA-Z0-9_-]+)/) ||
                                   html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/) ||
                                   html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/) ||
                                   html.match(/"browseId":"(UC[a-zA-Z0-9_-]+)"/) ||
                                   html.match(/itemprop="channelId" content="(UC[a-zA-Z0-9_-]+)"/);
            if (channelIdMatch) {
              const chId = channelIdMatch[1];
              finalUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${chId}`;
              if (!homepage.includes('/channel/') && !homepage.includes('/@')) {
                homepage = `https://www.youtube.com/channel/${chId}`;
              }
            }
            if (!sourceName) {
              const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
              if (titleMatch) sourceName = titleMatch[1].replace(/ - YouTube$/, '').trim();
            }
          } catch (e) {}
        }
      } else if (!finalUrl.includes('.xml') && !finalUrl.includes('/rss') && !finalUrl.includes('/feed')) {
        // 3. Web News Portal Resolution: Try direct /feed or /rss first, fallback to Google News with when:7d
        try {
          const u = new URL(finalUrl);
          const domain = u.hostname.replace(/^www\./, '');
          if (!sourceName) sourceName = domain.split('.')[0].toUpperCase();

          let discoveredFeed = false;
          for (const path of ['/feed', '/rss', '/feed.xml', '/rss.xml', '/s/rss']) {
            try {
              const testRss = await fetch(`${homepage}${path}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(3000)
              });
              if (testRss.ok) {
                const text = await testRss.text();
                if (text.includes('<rss') || text.includes('<feed') || text.includes('<xml')) {
                  finalUrl = `${homepage}${path}`;
                  discoveredFeed = true;
                  break;
                }
              }
            } catch (e) {}
          }

          if (!discoveredFeed) {
            finalUrl = `https://news.google.com/rss/search?q=site:${domain}+when:7d&hl=en-NP&gl=NP&ceid=NP:en`;
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
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          },
          signal: AbortSignal.timeout(8000)
        });
        const xml = await feedRes.text();
        const items = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

        for (const raw of items.slice(0, 30)) {
          const titleM = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const linkM = raw.match(/<link[^>]+href=["']([^"']+)["']/i) || raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
          const descM = raw.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || raw.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
          const dateM = raw.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || raw.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || raw.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);

          let title = cleanText(titleM ? titleM[1] : '');
          let link = cleanText(linkM ? (linkM[1] || linkM[2]) : '');
          let desc = cleanText(descM ? descM[1] : '');
          let rawDate = dateM ? dateM[1].trim() : '';

          let isoDate;
          try {
            const pd = rawDate ? new Date(rawDate) : new Date();
            isoDate = isNaN(pd.getTime()) ? new Date().toISOString() : pd.toISOString();
          } catch {
            isoDate = new Date().toISOString();
          }

          // Strip HTML & Google News redirect artifacts
          title = title.replace(/<[^>]+>/g, '').trim();
          desc = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

          if (!desc || desc === sourceName || desc.includes('news.google.com') || desc.length < 15) {
            const cleanT = title.split(' - ')[0].trim();
            desc = `${cleanT} — Coverage by ${sourceName}.`;
          }

          if (!title || !link) continue;

          // Extract image
          let imageUrl = null;
          const thumbM = raw.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
                         raw.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
                         raw.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (thumbM) imageUrl = thumbM[1];
          if (!imageUrl && link.includes('youtube.com/watch')) {
            const ytId = link.match(/v=([a-zA-Z0-9_-]+)/)?.[1];
            if (ytId) imageUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          }

          const articleId = crypto.createHash('md5').update(link || title).digest('hex');
          const category = classify(`${title} ${desc}`);
          const timeAgo = getTimeAgo(isoDate);

          await db.execute({
            sql: `INSERT INTO articles (
              id, title, link, description, category, district, province,
              date, time_ago, source, feed_type, image_url, has_real_image, og_image, fetched_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              category = excluded.category,
              province = excluded.province,
              date = excluded.date,
              time_ago = excluded.time_ago`,
            args: [
              articleId, title, link, desc, category, 'Kathmandu', province || 'National',
              isoDate, timeAgo, sourceName, detectedType || 'media', imageUrl, imageUrl ? 1 : 0, imageUrl, Math.floor(Date.now() / 1000)
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
