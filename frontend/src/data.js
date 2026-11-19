// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — Data Layer
// 40+ news agencies + government feeds
// ═══════════════════════════════════════════════════════════════

// ── Feed Categories ──────────────────────────────────────────
// type: 'media' | 'govt' | 'intl' | 'dev'

// ── 4-Tier Nepal Media Ecosystem ─────────────────────────────
// tier 1: National TV | tier 2: Digital Portals
// tier 3: Regional stations | tier 4: Govt + Intl
import { RSS_FEEDS, NEPAL_FM_STATIONS } from './config/feeds.js';
export { RSS_FEEDS, NEPAL_FM_STATIONS };

export function isSourceVerified(sourceName) {
  if (!sourceName) return false;
  const feed = RSS_FEEDS.find(f => f.name.toLowerCase() === sourceName.toLowerCase());
  return feed ? !!feed.verified : false;
}


// ── Feed type display info ────────────────────────────────────


// ── Tier display info ──────────────────────────────────────────


// ── Category Colors (light theme) ────────────────────────────




import { PROVINCES, DIST_MAP, PLACE_TO_DISTRICT } from './config/geography.js';
export { PROVINCES };

// ── Sorted place keys (longest first for greedy matching) ──────
const PLACE_KEYS_SORTED = Object.keys(PLACE_TO_DISTRICT).sort((a, b) => b.length - a.length);

// ── Combined district→province lookup (district name + all places) ──
function districtToProvince(district) {
  return DIST_MAP[district] || null;
}

// ── Full District → Province map ──────────────────────────────


import { FEED_TYPES, TIER_META, CAT_COLORS, CAT_ICONS, KEYWORDS } from './config/constants.js';
export { FEED_TYPES, TIER_META, CAT_COLORS, CAT_ICONS };

// ═══════════════════════════════════════════════════════════════
// LOCAL FALLBACK IMAGES
// ═══════════════════════════════════════════════════════════════

export const FALLBACK_IMAGES = {
  disaster: '/images/disaster-fallback.png',
  health: '/images/health-fallback.png',
  economy: '/images/economy-fallback.png',
  politics: '/images/politics-fallback.png',
  infrastructure: '/images/infrastructure-fallback.png',
  sports: '/images/sports-fallback.png',
  tourism: '/images/tourism-fallback.png',
  environment: '/images/environment-fallback.png',
  education: '/images/education-fallback.png',
  law: '/images/law-fallback.png',
  technology: '/images/technology-fallback.png',
  international: '/images/international-fallback.png',
};

// Fallback logic
export function fallbackImageUrl(article) {
  const cat = article?.category || 'politics';
  return FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.politics || '/images/default-fallback.svg';
}

/**
 * resolveArticleImage — always returns { url, type }
 * type = 'rss' if from feed XML or crawler, 'editorial' if using curated Nepal category banner
 */
export function resolveArticleImage(article) {
  if (!article) {
    return { url: FALLBACK_IMAGES.politics, type: 'editorial' };
  }

  // Tier 1: Real image extracted from the RSS feed XML, og:image or crawler
  const rawUrl = article.imageUrl || article.image_url || article.og_image;
  if (rawUrl && _isValidImageUrl(rawUrl)) {
    return { url: rawUrl, type: 'rss' };
  }

  // Tier 2: Curated Nepal editorial category photography banner
  const cat = article.category || 'politics';
  const fallback = FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.politics || '/images/default-fallback.svg';
  return { url: fallback, type: 'editorial' };
}

function _isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:')) return false;
  if (/1x1|pixel|spacer|tracking|blank/i.test(url)) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url) ||
    url.includes('images.unsplash.com') ||
    url.includes('cdn.') ||
    url.includes('/photo') ||
    url.includes('img.') ||
    url.includes('media.') ||
    url.includes('upload') ||
    url.includes('wp-content') ||
    url.includes('ytimg.com');
}


// ── Classification & geo-tagging ─────────────────────────────

export function classify(text) {
  const t = text.toLowerCase();
  let best = 'politics', max = 0;
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    const hits = kws.filter(k => t.includes(k)).length;
    if (hits > max) { max = hits; best = cat; }
  }
  return best;
}

/**
 * geoTag — extracts the STORY location (not the publisher address)
 *
 * Strategy (in priority order):
 *  1. Scan the combined title+description for 400+ place names using
 *     longest-match-first to avoid false positives.
 *  2. Scan for the 77 district names directly.
 *  3. Province-level signal words as a last resort.
 *  4. Default to Kathmandu / Bagmati.
 *
 * @param {string} title - Article headline
 * @param {string} [desc=''] - Article description / summary
 */
export function geoTag(title, desc = '') {
  // Combine title + description; title has higher semantic weight so scan it first
  const titleL = (title || '').toLowerCase();
  const descL  = (desc  || '').toLowerCase();
  const combined = `${title || ''} ${desc || ''}`;
  const combinedL = combined.toLowerCase();

  // ── Pass 1: named place lookup (longest match first) ────────────
  for (const place of PLACE_KEYS_SORTED) {
    const placeL = place.toLowerCase();
    // Check title first (higher priority), then description
    if (titleL.includes(placeL) || descL.includes(placeL)) {
      const district = PLACE_TO_DISTRICT[place];
      const province = districtToProvince(district);
      if (district && province) return { district, province };
    }
  }

  // ── Pass 2: direct district name scan ───────────────────────────
  for (const [district, province] of Object.entries(DIST_MAP)) {
    const dL = district.toLowerCase();
    if (titleL.includes(dL) || descL.includes(dL)) {
      return { district, province };
    }
  }

  // ── Pass 3: province-level signal words ─────────────────────────
  if (combinedL.includes('koshi') || combinedL.includes('province 1') || combinedL.includes('province no. 1'))
    return { district: 'Morang', province: 'Province No. 1' };
  if (combinedL.includes('madhesh') || combinedL.includes('terai plains') || combinedL.includes('madhesi'))
    return { district: 'Janakpur', province: 'Madhesh' };
  if (combinedL.includes('lumbini province') || combinedL.includes('province 5') || combinedL.includes('province no. 5'))
    return { district: 'Rupandehi', province: 'Lumbini' };
  if (combinedL.includes('gandaki') || combinedL.includes('province 4') || combinedL.includes('province no. 4'))
    return { district: 'Kaski', province: 'Gandaki' };
  if (combinedL.includes('karnali') || combinedL.includes('province 6') || combinedL.includes('province no. 6'))
    return { district: 'Surkhet', province: 'Karnali' };
  if (combinedL.includes('sudurpashchim') || combinedL.includes('far-west') || combinedL.includes('far west') || combinedL.includes('province 7'))
    return { district: 'Kailali', province: 'Sudurpashchim' };
  if (combinedL.includes('bagmati') || combinedL.includes('province 3') || combinedL.includes('province no. 3'))
    return { district: 'Kathmandu', province: 'Bagmati' };

  // ── Pass 4: default (national/unspecified) ───────────────────────
  return { district: 'Kathmandu', province: 'Bagmati' };
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'recently';
  try {
    const timestamp = new Date(dateStr).getTime();
    if (Number.isNaN(timestamp)) return 'recently';
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 0)    return 'just now';
    if (mins < 1)    return 'just now';
    if (mins < 60)   return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return `${Math.floor(mins/1440)}d ago`;
  } catch { return 'recently'; }
}

/** Heuristic: article likely describes a state / executive / policy action. */
const GOV_DECISION_SIGNALS = [
  'cabinet', 'ministry', 'minister', 'ordinance', 'budget', 'fiscal', 'policy', 'parliament',
  'bill', 'constitution', 'government', 'nepal government', 'public procurement', 'circular',
  'directive', 'amendment', 'subsidy', 'relief package', 'prime minister', 'local government',
  'federal', 'commission', 'regulation', 'tax ', 'vat ', 'mof ', 'mohp ', 'ppmo',
  'nepal rastra', 'tender', 'gorkhapatra', 'rss national',
];

export function isLikelyGovDecisionArticle(article) {
  if (article.feedType === 'govt') return true;
  const t = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  return GOV_DECISION_SIGNALS.some((k) => t.includes(k.trim()));
}

const IMPACT_POSITIVE_HINTS = [
  'relief', 'subsidy', 'grant', 'scholarship', 'expansion', 'coverage extension', 'free treatment',
  'waiver', 'pension', 'employment', 'job creation', 'salary increase', 'minimum wage', 'allowance',
  'easier access', 'digital service', 'compensation', 'aid package', 'health insurance',
  'road opening', 'electrification', 'drinking water supply', 'social security', 'student quota',
];

const IMPACT_NEGATIVE_HINTS = [
  'tax hike', 'price hike', 'shortage', 'blackout', 'load shedding', 'budget cut', 'layoff',
  'corruption', 'bribery scandal', 'penalty', 'crackdown', 'restrict access', 'scrapped',
  'rolled back', 'delayed project', 'surge in price', 'inflation', 'protest against',
  'strike against', 'citizens protest', 'unpopular', 'burden on',
];

export function scorePublicImpact(text) {
  const t = (text || '').toLowerCase();
  let posHits = 0, negHits = 0;
  for (const k of IMPACT_POSITIVE_HINTS) { if (t.includes(k)) posHits++; }
  for (const k of IMPACT_NEGATIVE_HINTS) { if (t.includes(k)) negHits++; }
  const net = posHits - negHits;
  let impact;
  if (posHits === 0 && negHits === 0) impact = 'unclear';
  else if (net >= 2) impact = 'positive';
  else if (net <= -2) impact = 'negative';
  else impact = 'mixed';

  const effectLine = {
    positive: 'Framing and wording often signal benefits for households, workers, or public services — confirm numbers and eligibility in the full notice.',
    negative: 'Reporting emphasises costs, scarcity, constraints, or discontent — check official texts and local impacts before concluding.',
    mixed:    'Trade-offs are visible (e.g. reform helping some groups while straining others); effects vary by place, sector, and income.',
    unclear:  'The excerpt does not contain enough cues to classify impact automatically; read the policy or circular for specifics.',
  }[impact];

  return { impact, posHits, negHits, net, effectLine };
}

export function parseRSS(xml, feed) {
  const results = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = doc.querySelectorAll('item, entry');

    items.forEach((item, i) => {
      if (i >= 15) return;

      let title = (
        item.querySelector('title')?.textContent ||
        item.querySelector('title')?.innerHTML || ''
      ).trim().replace(/<!\[CDATA\[|\]\]>/g, '');

      const link = (
        item.querySelector('link')?.getAttribute('href') ||
        item.querySelector('link')?.textContent ||
        item.querySelector('origLink')?.textContent || ''
      ).trim();

      const rawDesc = (
        item.querySelector('description')?.textContent ||
        item.querySelector('summary')?.textContent ||
        item.querySelector('content')?.textContent || ''
      );

      // ── Ultra-aggressive image extraction (10 strategies) ────
      let imageUrl = null;

      // 1: <media:content url="..." medium="image">
      const mediaContents = item.getElementsByTagNameNS('*', 'content');
      for (let m = 0; m < mediaContents.length; m++) {
        const u = mediaContents[m].getAttribute('url');
        const medium = mediaContents[m].getAttribute('medium');
        if (u && (medium === 'image' || /\.(jpg|jpeg|png|webp|gif)/i.test(u))) {
          imageUrl = u; break;
        }
      }
      // 2: <media:thumbnail>
      if (!imageUrl) {
        const thumbEl = item.getElementsByTagNameNS('*', 'thumbnail')[0];
        if (thumbEl) imageUrl = thumbEl.getAttribute('url') || thumbEl.getAttribute('src');
      }
      // 3: <enclosure type="image/*">
      if (!imageUrl) {
        const enc = item.querySelector('enclosure[type^="image"]') || item.querySelector('enclosure[url]');
        if (enc) { const u = enc.getAttribute('url'); if (u && /\.(jpg|jpeg|png|webp)/i.test(u)) imageUrl = u; }
      }
      // 4: <content:encoded> HTML
      if (!imageUrl) {
        const encoded = item.getElementsByTagNameNS('*', 'encoded')[0];
        if (encoded) {
          const html = encoded.textContent || encoded.innerHTML || '';
          const m1 = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (m1) imageUrl = m1[1];
        }
      }
      // 5: <img> in description CDATA
      if (!imageUrl) {
        const m2 = rawDesc.match(/<img[^>]+src=["']([^"'> ]+)["']/i);
        if (m2) imageUrl = m2[1];
      }
      // 6: og:image inside item
      if (!imageUrl) {
        const ogImg = item.querySelector('[property="og:image"], [name="twitter:image"]');
        if (ogImg) imageUrl = ogImg.getAttribute('content');
      }
      // 7: <itunes:image>
      if (!imageUrl) {
        const itunes = item.getElementsByTagNameNS('*', 'image')[0];
        if (itunes) imageUrl = itunes.getAttribute('href') || itunes.getAttribute('url');
      }
      // 8: raw image URL in description
      if (!imageUrl) {
        const urlMatch = rawDesc.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)(\?[^\s"'<>]*)?/i);
        if (urlMatch) imageUrl = urlMatch[0];
      }
      // 9: <source url="...">
      if (!imageUrl) {
        const src = item.querySelector('source');
        if (src) { const u = src.getAttribute('url'); if (u && /\.(jpg|jpeg|png|webp)/i.test(u)) imageUrl = u; }
      }
      // 10: YouTube thumbnail
      if (!imageUrl) {
        const ytMatch = rawDesc.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (ytMatch) imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }

      // Reject tracking pixels
      if (imageUrl && (imageUrl.startsWith('data:') || /pixel|tracking/i.test(imageUrl))) {
        imageUrl = null;
      }

      let desc = rawDesc
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);

      const pub =
        item.querySelector('pubDate')?.textContent?.trim() ||
        item.querySelector('published')?.textContent?.trim() ||
        item.querySelector('updated')?.textContent?.trim() ||
        item.querySelector('dc\\:date')?.textContent?.trim() || '';

      if (!title || title.length < 5) return;

      const combined = title + ' ' + desc;
      const cat = classify(combined);
      const geo = geoTag(title, desc);
      const forcedProvince = feed?.forceProvince;
      const forcedDistrict = feed?.forceDistrict;

      let date = '';
      try {
        const pd = new Date(pub);
        date = Number.isNaN(pd.getTime()) ? new Date().toISOString() : pd.toISOString();
      } catch {
        date = new Date().toISOString();
      }

      results.push({
        id: `${feed.id}-${i}`,
        title,
        link,
        description: desc,
        category: cat,
        district: forcedDistrict || geo.district,
        province: forcedProvince || geo.province,
        date,
        timeAgo: timeAgo(date),
        source: feed.name,
        feedType: feed.type || 'media',
        imageUrl: imageUrl || null,
        hasRealImage: !!imageUrl,
      });
    });
  } catch(e) {
    console.warn(`[${feed.name}] parse error:`, e.message);
  }
  return results;
}



// Note: isSourceVerified is defined once above (uses RSS_FEEDS lookup).
// NEPAL_FM_STATIONS is defined below for the FM Radio widget.

export function articleLocation(article) {
  const parts = [article?.district, article?.province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Nepal (inferred)';
}
