import { getTursoClient } from './lib/turso.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Support POST body or GET query param (?ids=1,2,3 or ?article_ids=1,2,3)
  let requestedIds = [];
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    requestedIds = body.article_ids || body.ids || [];
  } else if (req.method === 'GET') {
    const qIds = req.query.article_ids || req.query.ids;
    if (typeof qIds === 'string') {
      requestedIds = qIds.split(',').map(s => s.trim());
    } else if (Array.isArray(qIds)) {
      requestedIds = qIds;
    }
  }

  if (!Array.isArray(requestedIds)) {
    requestedIds = [requestedIds];
  }

  const cleanIds = requestedIds
    .filter(id => id && typeof id === 'string' && id.trim().length > 0)
    .map(id => id.trim())
    .slice(0, 100); // Cap at 100 IDs per request for security & performance

  if (cleanIds.length === 0) {
    return res.status(200).json({
      ok: true,
      count: 0,
      articles: [],
      message: 'No valid article_ids provided'
    });
  }

  try {
    const db = getTursoClient();
    const placeholders = cleanIds.map(() => '?').join(',');
    const query = `SELECT * FROM articles WHERE id IN (${placeholders})`;

    const articlesRes = await db.execute({
      sql: query,
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

    return res.status(200).json({
      ok: true,
      count: enriched.length,
      articles: enriched
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
