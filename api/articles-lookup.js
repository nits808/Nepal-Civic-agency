import { getTursoClient } from './lib/turso.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse IDs from POST body or GET query (?article_ids=... or ?ids=...)
  let article_ids = [];
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    article_ids = body.article_ids || body.ids;
  } else if (req.method === 'GET') {
    const qIds = req.query.article_ids || req.query.ids;
    if (typeof qIds === 'string') {
      article_ids = qIds.split(',').map(s => s.trim());
    } else if (Array.isArray(qIds)) {
      article_ids = qIds;
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!Array.isArray(article_ids) || article_ids.length === 0) {
    return res.status(400).json({ error: 'article_ids must be a non-empty array of strings' });
  }

  const cleanIds = [...new Set(article_ids.filter(id => typeof id === 'string' && id.trim()))].slice(0, 100);
  if (cleanIds.length === 0) {
    return res.status(400).json({ error: 'No valid article IDs provided' });
  }

  try {
    const db = getTursoClient();
    const placeholders = cleanIds.map(() => '?').join(', ');
    const query = `SELECT * FROM articles WHERE id IN (${placeholders})`;

    const articlesRes = await db.execute({
      sql: query,
      args: cleanIds
    });

    const now = Date.now();
    const articles = articlesRes.rows.map(a => {
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

    const foundIdSet = new Set(articles.map(a => a.id));
    const missing_ids = cleanIds.filter(id => !foundIdSet.has(id));

    return res.status(200).json({
      ok: true,
      count: articles.length,
      articles,
      missing_ids
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
