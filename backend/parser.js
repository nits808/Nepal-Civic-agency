// ═══════════════════════════════════════════════════════════════
// NCIG Backend — RSS Parser + Image Extractor
// Runs server-side: no CORS issues, can fetch og:image from pages
// ═══════════════════════════════════════════════════════════════

const KEYWORDS = {
  disaster:    ['flood','earthquake','landslide','disaster','fire','cyclone','rescue','emergency','killed','damage','warning','death','casualty','avalanche'],
  health:      ['health','hospital','disease','covid','vaccine','medical','doctor','patient','dengue','cholera','virus','outbreak'],
  economy:     ['economy','budget','trade','inflation','tax','revenue','gdp','investment','bank','loan','export','import','remittance','rupee'],
  politics:    ['election','parliament','minister','party','government','vote','president','coalition','opposition','bill','constitution','cabinet'],
  education:   ['school','university','education','student','teacher','exam','scholarship','campus','TU','UGC'],
  infrastructure:['road','bridge','construction','highway','airport','project','hydro','dam','electricity','power','metro','tunnel'],
  sports:      ['cricket','football','sports','athlete','match','tournament','game','team','cup','league'],
  tourism:     ['tourism','tourist','trekking','everest','hotel','travel','heritage','mountain','himalaya'],
  environment: ['environment','pollution','forest','climate','wildlife','conservation','park','river','carbon'],
  law:         ['court','justice','police','crime','arrest','jail','judge','verdict','corruption','murder'],
  technology:  ['technology','startup','software','app','cyber','AI','digital','internet','broadband'],
  international:['US','China','India','Russia','global','UN','NATO','war','international','foreign','embassy'],
};

const DIST_MAP = {
  'Kathmandu':'Bagmati','Lalitpur':'Bagmati','Bhaktapur':'Bagmati','Chitwan':'Bagmati','Makwanpur':'Bagmati',
  'Sindhuli':'Bagmati','Dolakha':'Bagmati','Sindhupalchok':'Bagmati','Kavrepalanchok':'Bagmati','Nuwakot':'Bagmati',
  'Biratnagar':'Province No. 1','Morang':'Province No. 1','Jhapa':'Province No. 1','Sunsari':'Province No. 1','Dhankuta':'Province No. 1',
  'Ilam':'Province No. 1','Taplejung':'Province No. 1','Sankhuwasabha':'Province No. 1',
  'Janakpur':'Madhesh','Birgunj':'Madhesh','Parsa':'Madhesh','Dhanusha':'Madhesh','Mahottari':'Madhesh','Sarlahi':'Madhesh',
  'Rautahat':'Madhesh','Bara':'Madhesh','Saptari':'Madhesh',
  'Pokhara':'Gandaki','Kaski':'Gandaki','Mustang':'Gandaki','Lamjung':'Gandaki','Gorkha':'Gandaki',
  'Butwal':'Lumbini','Rupandehi':'Lumbini','Nepalgunj':'Lumbini','Banke':'Lumbini','Dang':'Lumbini',
  'Surkhet':'Karnali','Jumla':'Karnali','Dolpa':'Karnali','Humla':'Karnali','Jajarkot':'Karnali',
  'Dhangadhi':'Sudurpashchim','Kailali':'Sudurpashchim','Kanchanpur':'Sudurpashchim','Doti':'Sudurpashchim',
};

export function classify(text) {
  const t = text.toLowerCase();
  let best = 'politics', max = 0;
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    const hits = kws.filter(k => t.includes(k)).length;
    if (hits > max) { max = hits; best = cat; }
  }
  return best;
}

export function geoTag(text) {
  for (const [dist, prov] of Object.entries(DIST_MAP)) {
    if (text.includes(dist)) return { district: dist, province: prov };
  }
  if (text.includes('Koshi') || text.includes('Province 1')) return { district:'Morang', province:'Province No. 1' };
  if (text.includes('Madhesh') || text.includes('Terai')) return { district:'Janakpur', province:'Madhesh' };
  if (text.includes('Lumbini')) return { district:'Rupandehi', province:'Lumbini' };
  if (text.includes('Gandaki')) return { district:'Kaski', province:'Gandaki' };
  if (text.includes('Karnali')) return { district:'Surkhet', province:'Karnali' };
  if (text.includes('Sudurpashchim') || text.includes('Far West')) return { district:'Kailali', province:'Sudurpashchim' };
  return { district:'Kathmandu', province:'Bagmati' };
}

export function timeAgo(isoDate) {
  if (!isoDate) return 'recently';
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (isNaN(mins) || mins < 0) return 'just now';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
}

// ── Multi-Strategy Image Extraction from RSS XML string ──────────
export function extractImage(item) {
  // Strategy 1: media:content
  const mediaContent = item.querySelector?.('[url]');
  if (mediaContent) {
    const u = mediaContent.getAttribute('url');
    if (u && /\.(jpg|jpeg|png|webp|gif)/i.test(u)) return u;
  }
  return null; // Server-side DOMParser not used; parsing done in parseRSSText()
}

// ── Parse RSS XML text (runs in Node.js) ─────────────────────────
export function parseRSSText(xmlText, feed) {
  const results = [];
  try {
    // Extract items using regex (no DOM in Node.js without jsdom)
    const itemRegex = /<(item|entry)([\s\S]*?)<\/(item|entry)>/gi;
    const matches = [...xmlText.matchAll(itemRegex)];

    for (let i = 0; i < Math.min(matches.length, 15); i++) {
      const raw = matches[i][0];

      // Title
      let title = extractTag(raw, 'title');
      title = stripCDATA(title).trim();
      if (!title || title.length < 5) continue;

      // Link
      let link = extractAttr(raw, 'link', 'href') ||
                 extractTag(raw, 'link') ||
                 extractTag(raw, 'origLink') || '';
      link = link.trim();

      // Description
      const rawDesc = extractTag(raw, 'description') ||
                      extractTag(raw, 'summary') ||
                      extractTag(raw, 'content') || '';

      // ── Image Extraction (10 strategies, server-side regex) ──
      let imageUrl = null;

      // 1. media:content url="..."
      const mediaMatch = raw.match(/media:content[^>]+url=["']([^"']+)["']/i);
      if (mediaMatch) imageUrl = mediaMatch[1];

      // 2. media:thumbnail url="..."
      if (!imageUrl) {
        const thumbMatch = raw.match(/media:thumbnail[^>]+url=["']([^"']+)["']/i);
        if (thumbMatch) imageUrl = thumbMatch[1];
      }

      // 3. enclosure type="image/..." url="..."
      if (!imageUrl) {
        const encMatch = raw.match(/enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i) ||
                         raw.match(/enclosure[^>]+url=["']([^"']+\.(jpg|jpeg|png|webp|gif))["']/i);
        if (encMatch) imageUrl = encMatch[1];
      }

      // 4. content:encoded first <img src="...">
      if (!imageUrl) {
        const encodedMatch = raw.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
        if (encodedMatch) {
          const imgMatch = encodedMatch[1].match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch) imageUrl = imgMatch[1];
        }
      }

      // 5. <img> in description CDATA
      if (!imageUrl) {
        const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"'> ]+)["']/i);
        if (imgMatch) imageUrl = imgMatch[1];
      }

      // 6. Any direct image URL in raw description text
      if (!imageUrl) {
        const urlMatch = rawDesc.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)(\?[^\s"'<>]*)?/i);
        if (urlMatch) imageUrl = urlMatch[0];
      }

      // 7. YouTube embed → thumbnail
      if (!imageUrl) {
        const ytMatch = rawDesc.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (ytMatch) imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }

      // Validate extracted URL
      if (imageUrl && (imageUrl.startsWith('data:') || imageUrl.includes('pixel') || imageUrl.includes('1x1'))) {
        imageUrl = null;
      }

      // Pub date
      const pub = extractTag(raw, 'pubDate') ||
                  extractTag(raw, 'published') ||
                  extractTag(raw, 'updated') || '';

      let date;
      try {
        const pd = new Date(pub.trim());
        date = isNaN(pd.getTime()) ? new Date().toISOString() : pd.toISOString();
      } catch { date = new Date().toISOString(); }

      const desc = stripCDATA(rawDesc)
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);

      const combined = title + ' ' + desc;
      const cat = classify(combined);
      const geo = geoTag(combined);

      results.push({
        id: `${feed.id}-${i}`,
        title,
        link,
        description: desc,
        category: cat,
        district: geo.district,
        province: geo.province,
        date,
        timeAgo: timeAgo(date),
        source: feed.name,
        feedType: feed.type || 'media',
        imageUrl,
        hasRealImage: !!imageUrl,
      });
    }
  } catch (e) {
    console.warn(`[${feed.name}] parse error:`, e.message);
  }
  return results;
}

// ── Helpers ────────────────────────────────────────────────────
function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1] : '';
}

function extractAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function stripCDATA(str) {
  return str.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}
