import { getTursoClient } from './lib/turso.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST /api/articles or /api/articles/lookup (Batch ID Lookup)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const article_ids = body.article_ids || body.ids;

      if (!Array.isArray(article_ids) || article_ids.length === 0) {
        return res.status(400).json({ error: 'article_ids must be a non-empty array of strings' });
      }

      const cleanIds = [...new Set(article_ids.filter(id => typeof id === 'string' && id.trim()))].slice(0, 100);
      if (cleanIds.length === 0) {
        return res.status(400).json({ error: 'No valid article IDs provided' });
      }

      const db = getTursoClient();
      const placeholders = cleanIds.map(() => '?').join(', ');
      const articlesRes = await db.execute({
        sql: `SELECT * FROM articles WHERE id IN (${placeholders})`,
        args: cleanIds
      });

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
          imageUrl: a.og_image || a.image_url || `/images/${a.category || 'politics'}-fallback.svg`,
          hasRealImage: !!(a.og_image || a.image_url),
        };
      });

      const foundIdSet = new Set(enriched.map(a => a.id));
      const missing_ids = cleanIds.filter(id => !foundIdSet.has(id));

      return res.status(200).json({
        ok: true,
        count: enriched.length,
        articles: enriched,
        missing_ids
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
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
        imageUrl: a.og_image || a.image_url || `/images/${a.category || 'politics'}-fallback.svg`,
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
