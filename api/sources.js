import { getTursoClient } from './lib/turso.js';

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

      // YouTube Resolution
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
            }
            if (!sourceName) {
              const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/);
              if (titleMatch) sourceName = titleMatch[1];
            }
          } catch (e) {}
        }
      } else if (!finalUrl.includes('.xml') && !finalUrl.includes('/rss') && !finalUrl.includes('/feed')) {
        // Fallback for general website
        try {
          const u = new URL(finalUrl);
          const domain = u.hostname.replace(/^www\./, '');
          if (!sourceName) sourceName = domain.split('.')[0].toUpperCase();
          finalUrl = `https://news.google.com/rss/search?q=site:${domain}`;
        } catch (e) {}
      }

      if (!sourceName) {
        try { sourceName = new URL(finalUrl).hostname.replace(/^www\./, ''); } catch (e) { sourceName = 'New Source'; }
      }

      const id = `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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
        args: [id, sourceName, detectedType, parseInt(tier) || 4, province, finalUrl, null, url, 0, 'active']
      });

      return res.status(200).json({
        ok: true,
        message: 'Source added successfully',
        source: { id, name: sourceName, type: detectedType, province, tier, url: finalUrl, website: url }
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
