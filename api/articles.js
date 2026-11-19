import { getTursoClient } from './lib/turso.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { limit = 400, offset = 0, category, province, search } = req.query;

  try {
    const db = getTursoClient();
    let query = 'SELECT * FROM articles WHERE 1=1';
    const args = [];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      args.push(`%${search}%`, `%${search}%`);
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
    args.push(Math.min(parseInt(limit) || 400, 600), parseInt(offset) || 0);

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
      return {
        ...a,
        timeAgo,
        imageUrl: a.og_image || a.image_url || null,
        hasRealImage: !!(a.og_image || a.image_url),
      };
    });

    return res.status(200).json({
      articles: enriched,
      feedStatus: statusRes.rows,
      total: enriched.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
