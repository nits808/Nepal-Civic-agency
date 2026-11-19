import crypto from 'crypto';
import { RSS_FEEDS } from '../frontend/src/config/feeds.js';
import { getTursoClient } from './lib/turso.js';

const KEYWORDS = {
  disaster: ['flood','earthquake','landslide','disaster','fire','rescue','casualty','मृत्यु','बाढी','पहिरो','भूकम्प'],
  health: ['health','hospital','disease','covid','vaccine','medical','doctor','patient','स्वास्थ्य','अस्पताल','बिरामी'],
  economy: ['economy','budget','trade','inflation','tax','bank','remittance','अर्थतन्त्र','बजेट','बैंक','रेमिट्यान्स'],
  politics: ['election','parliament','minister','government','vote','cabinet','राजनीति','मन्त्री','सरकार','निर्वाचन'],
  infrastructure: ['road','bridge','highway','airport','project','hydro','electricity','सडक','पुल','विद्युत','आयोजना'],
  sports: ['cricket','football','sports','match','खेलकुद','क्रिकेट','फुटबल'],
};

const PROV_KEYWORDS = {
  'Bagmati': ['kathmandu', 'lalitpur', 'bhaktapur', 'chitwan', 'काठमाडौँ', 'ललितपुर', 'भक्तपुर', 'चितवन'],
  'Gandaki': ['pokhara', 'kaski', 'gorkha', 'पोखरा', 'कास्की', 'गोरखा'],
  'Lumbini': ['butwal', 'rupandehi', 'nepalgunj', 'dang', 'बुटवल', 'रुपन्देही', 'नेपालगन्ज', 'दाङ'],
  'Koshi': ['biratnagar', 'morang', 'jhapa', 'dharan', 'विराटनगर', 'झापा', 'धरान'],
  'Madhesh': ['janakpur', 'birgunj', 'parsa', 'जनकपुर', 'वीरगन्ज', 'पर्सा'],
  'Karnali': ['surkhet', 'jumla', 'सुर्खेत', 'जुम्ला'],
  'Sudurpashchim': ['dhangadhi', 'kailali', 'धनगढी', 'कैलाली'],
};

function classify(text) {
  const t = (text || '').toLowerCase();
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => t.includes(k))) return cat;
  }
  return 'politics';
}

function detectProvince(text, defaultProv = 'National') {
  const t = (text || '').toLowerCase();
  for (const [prov, kws] of Object.entries(PROV_KEYWORDS)) {
    if (kws.some(k => t.includes(k))) return prov;
  }
  return defaultProv;
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function parseFeedXml(xml, feed) {
  const items = [];
  const matches = [...xml.matchAll(/<(item|entry)([\s\S]*?)<\/(item|entry)>/gi)];

  for (const match of matches.slice(0, 20)) {
    const raw = match[0];
    let title = extractTag(raw, 'title');
    if (!title || title.length < 5) continue;

    let link = raw.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
               raw.match(/<link>([^<]+)<\/link>/i)?.[1] ||
               extractTag(raw, 'link') || '';

    let description = extractTag(raw, 'description') || extractTag(raw, 'summary') || '';
    let pubDate = extractTag(raw, 'pubDate') || extractTag(raw, 'published') || extractTag(raw, 'updated') || new Date().toISOString();

    let imageUrl = raw.match(/media:content[^>]+url=["']([^"']+)["']/i)?.[1] ||
                   raw.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ||
                   raw.match(/enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ||
                   raw.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || null;

    const hash = crypto.createHash('md5').update(link || title).digest('hex');
    const id = `${feed.id}_${hash}`;
    const fullText = `${title} ${description}`;
    const category = classify(fullText);
    const province = detectProvince(fullText, feed.province || 'National');

    let isoDate;
    try {
      const pd = new Date(pubDate);
      isoDate = isNaN(pd.getTime()) ? new Date().toISOString() : pd.toISOString();
    } catch {
      isoDate = new Date().toISOString();
    }

    items.push({
      id,
      title,
      link,
      description: description.replace(/<[^>]+>/g, '').slice(0, 300),
      category,
      district: feed.province || 'Kathmandu',
      province,
      date: isoDate,
      time_ago: 'recently',
      source: feed.name,
      feed_type: feed.type || 'media',
      image_url: imageUrl,
      has_real_image: imageUrl ? 1 : 0
    });
  }
  return items;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NCIG-Bot/4.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeedXml(xml, feed);
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const client = getTursoClient();

    let customSources = [];
    try {
      const srcRes = await client.execute("SELECT * FROM sources WHERE status = 'active'");
      customSources = srcRes.rows || [];
    } catch (_) {}

    const allFeeds = [...RSS_FEEDS, ...customSources];
    let totalParsed = 0;
    let totalInserted = 0;

    const BATCH_SIZE = 8;
    for (let i = 0; i < allFeeds.length; i += BATCH_SIZE) {
      const chunk = allFeeds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(chunk.map(f => fetchFeed(f)));
      const articles = results.flat();
      totalParsed += articles.length;

      if (articles.length > 0) {
        const statements = articles.map(a => ({
          sql: `INSERT OR IGNORE INTO articles
                (id, title, link, description, category, district, province, date, time_ago, source, feed_type, image_url, has_real_image, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
          args: [
            a.id, a.title, a.link, a.description, a.category, a.district,
            a.province, a.date, a.time_ago, a.source, a.feed_type,
            a.image_url, a.has_real_image
          ]
        }));

        try {
          const batchRes = await client.batch(statements, 'write');
          totalInserted += batchRes.filter(r => r.rowsAffected > 0).length;
        } catch (e) {
          console.error('Batch error:', e.message);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      feedsCrawled: allFeeds.length,
      articlesParsed: totalParsed,
      newArticlesArchived: totalInserted
    });
  } catch (err) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
