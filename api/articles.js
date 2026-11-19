import { getTursoClient } from './lib/turso.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { limit = 800, offset = 0, category, province, search, source } = req.query;

  try {
    const db = getTursoClient();
    let query = 'SELECT * FROM articles WHERE 1=1';
    const args = [];

    if (source) {
      query += ' AND source = ?';
      args.push(source);
    }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR source LIKE ?)';
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND category = ?';
      args.push(category);
    }
    if (province) {
      query += ' AND province = ?';
      args.push(province);
    }

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    args.push(Math.min(parseInt(limit) || 800, 1200), parseInt(offset) || 0);

    const [articlesRes, statusRes] = await Promise.all([
      db.execute({ sql: query, args }),
      db.execute('SELECT * FROM feed_status ORDER BY feed_name')
    ]);

    const now = Date.now();
    const enriched = articlesRes.rows.map(a => {
      const mins = Math.floor((now - new Date(a.date).getTime()) / 60000);
      let timeAgo = 'recently';
      if (!isNaN(mins) && mins >= 0) {
        if (mins < 1) timeAgo = 'just now';
        else if (mins < 60) timeAgo = `${mins}m ago`;
        else if (mins < 1440) timeAgo = `${Math.floor(mins / 60)}h ago`;
        else timeAgo = `${Math.floor(mins / 1440)}d ago`;
      }

      let cleanDesc = (a.description || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      if (!cleanDesc || cleanDesc === a.source || cleanDesc.includes('news.google.com') || cleanDesc.length < 15) {
        cleanDesc = `${(a.title || '').split(' - ')[0].trim()} — Read full coverage on ${a.source || 'News'}.`;
      }

      return {
        ...a,
        description: cleanDesc,
        timeAgo,
        imageUrl: a.og_image || a.image_url || null,
        hasRealImage: !!(a.og_image || a.image_url),
      };
    });

    const statusMap = {};
    if (Array.isArray(statusRes.rows)) {
      statusRes.rows.forEach(r => {
        const key = r.feed_id || r.id;
        if (key) {
          statusMap[key] = {
            ok: r.status === 'ok' || r.ok === 1 || r.ok === true || (r.article_count || 0) > 0,
            count: r.article_count || 0,
            name: r.feed_name || r.name,
            type: r.feed_type || r.type
          };
        }
      });
    }

    return res.status(200).json({
      articles: enriched,
      feedStatus: statusMap,
      total: enriched.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
