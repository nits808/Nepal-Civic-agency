// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph — RSS Feed Sources (Backend)
// 4-Tier Nepal Media Ecosystem:
//   Tier 1: National TV Channels (NTV, Kantipur, AP1, News24…)
//   Tier 2: Digital-first portals (OnlineKhabar, Setopati, Ratopati…)
//   Tier 3: Regional / Provincial TV & Stations
//   Tier 4: Government + International + Development Agencies
// ═══════════════════════════════════════════════════════════════

export const RSS_FEEDS = [

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — NATIONAL TV CHANNELS
  // NTV & Himalaya TV have RSS; others covered via Google News
  // ═══════════════════════════════════════════════════════════════

  // --- Government broadcaster ---
  { id:'ntv',          name:'Nepal Television (NTV)',   tier:1, type:'tv',   province:'Bagmati', verified: true,
    url:'https://ntv.org.np/feed',
    fb:'https://www.facebook.com/nepaltelevision',
    website:'https://ntv.org.np' },

  // --- Private national TV channels (Auto-Verified YouTube RSS) ---
  { id:'kantipurtv',   name:'Kantipur TV HD',          tier:1, type:'tv',   province:'Bagmati', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UC7y5G-N2j2X2bB5e_r06oaw',
    fb:'https://www.facebook.com/kantipurtelevision',
    website:'https://kantipurtv.com' },

  { id:'news24nepal',  name:'News24 Nepal',            tier:1, type:'tv',   province:'Bagmati', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCUa5H93t7fW27Q6M2LdJ6qQ',
    fb:'https://www.facebook.com/news24nepaltv',
    website:'https://news24nepal.tv' },

  { id:'ap1tv',        name:'AP1HD',                   tier:1, type:'tv',   province:'Bagmati', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UC7yFm2Yt8-JbYxG_S56l5AA',
    fb:'https://www.facebook.com/ap1tv',
    website:'https://ap1.tv' },

  { id:'avenueskhabar', name:'Avenues Khabar',         tier:1, type:'tv',   province:'Bagmati', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCf9jFj-N5O6n-r1s36f6-Sg',
    fb:'https://www.facebook.com/avenueskhabar',
    website:'https://avenues.tv' },

  { id:'himalayatv',   name:'Himalaya TV',             tier:1, type:'tv',   province:'Bagmati', verified: true,
    url:'https://www.himalayatv.com/feed',
    fb:'https://www.facebook.com/himalayatv',
    website:'https://www.himalayatv.com' },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — MAJOR DIGITAL-FIRST ONLINE PORTALS (VERY IMPORTANT)
  // ═══════════════════════════════════════════════════════════════

  // --- English language portals ---
  { id:'kpost',        name:'The Kathmandu Post',      tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://kathmandupost.com/rss',
    fb:'https://www.facebook.com/kathmandupost',
    website:'https://kathmandupost.com' },

  { id:'htimes',       name:'The Himalayan Times',     tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://thehimalayantimes.com/feed',
    fb:'https://www.facebook.com/thehimalayantimes',
    website:'https://thehimalayantimes.com' },

  { id:'republica',    name:'My Republica',            tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://myrepublica.nagariknetwork.com/rss',
    fb:'https://www.facebook.com/myrepublica',
    website:'https://myrepublica.nagariknetwork.com' },

  { id:'ntimes',       name:'Nepali Times',            tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://www.nepalitimes.com/feed/',
    website:'https://www.nepalitimes.com' },

  { id:'record',       name:'The Record Nepal',        tier:2, type:'media', province:'Bagmati',
    url:'https://www.recordnepal.com/feed',
    website:'https://www.recordnepal.com' },

  { id:'annapurna',    name:'The Annapurna Express',   tier:2, type:'media', province:'Bagmati',
    url:'https://theannapurnaexpress.com/feed',
    website:'https://theannapurnaexpress.com' },

  { id:'khabarhub',    name:'Khabarhub English',       tier:2, type:'media', province:'Bagmati',
    url:'https://english.khabarhub.com/feed',
    website:'https://english.khabarhub.com' },

  { id:'nepallive',    name:'Nepal Live Today',        tier:2, type:'media', province:'Bagmati',
    url:'https://nepallivetoday.com/feed',
    website:'https://nepallivetoday.com' },

  // --- Nepali-language portals (biggest digital reach) ---
  { id:'onlinekhabar', name:'Online Khabar',           tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://english.onlinekhabar.com/feed',
    fb:'https://www.facebook.com/Onlinekhabar',
    website:'https://www.onlinekhabar.com' },

  { id:'setopati',     name:'Setopati',                tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://en.setopati.com/feed',
    fb:'https://www.facebook.com/setopati',
    website:'https://www.setopati.com' },

  { id:'ratopati',     name:'Ratopati',                tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://english.ratopati.com/feed',
    fb:'https://www.facebook.com/ratopati',
    website:'https://www.ratopati.com' },

  { id:'ekantipur',    name:'Kantipur Daily (eKantipur)', tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://ekantipur.com/feed',
    fb:'https://www.facebook.com/kantipur',
    website:'https://ekantipur.com' },

  { id:'nagariknews',  name:'Nagarik News',            tier:2, type:'media', province:'Bagmati', verified: true,
    url:'https://nagariknews.nagariknetwork.com/feed',
    fb:'https://www.facebook.com/nagariknews',
    website:'https://nagariknews.nagariknetwork.com' },

  { id:'lokaantar',    name:'Lokaantar',               tier:2, type:'media', province:'National',
    url:'https://lokaantar.com/feed',
    website:'https://lokaantar.com' },

  { id:'ujyaalo',      name:'Ujyaalo Online',          tier:2, type:'media', province:'National',
    url:'https://ujyaaloonline.com/feed',
    website:'https://ujyaaloonline.com' },

  { id:'baahrakhari',  name:'Baahrakhari',             tier:2, type:'media', province:'National',
    url:'https://baahrakhari.com/feed',
    website:'https://baahrakhari.com' },

  { id:'nepalnews',    name:'Nepal News',              tier:2, type:'media', province:'Bagmati',
    url:'https://nepalnews.com/s/rss',
    website:'https://nepalnews.com' },

  { id:'nepalpress',   name:'Nepal Press',             tier:2, type:'media', province:'Bagmati',
    url:'https://www.nepalpress.com/en/feed',
    website:'https://www.nepalpress.com' },

  { id:'deshsanchar',  name:'DeshSanchar',             tier:2, type:'media', province:'Bagmati',
    url:'https://deshsanchar.com/feed',
    website:'https://deshsanchar.com' },

  // --- Business / Economy portals ---
  { id:'bizage',       name:'Business Age Nepal',      tier:2, type:'media', province:'Bagmati',
    url:'https://www.businessage.com.np/feed',
    website:'https://www.businessage.com.np' },

  { id:'bizmandu',     name:'Bizmandu',                tier:2, type:'media', province:'Bagmati',
    url:'https://bizmandu.com/feed',
    website:'https://bizmandu.com' },

  { id:'karobar',      name:'Karobar Daily',           tier:2, type:'media', province:'Bagmati',
    url:'https://www.karobardaily.com/feed',
    website:'https://www.karobardaily.com' },

  { id:'newbiz',       name:'New Business Age',        tier:2, type:'media', province:'Bagmati',
    url:'https://newbusinessage.com/rss',
    website:'https://newbusinessage.com' },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — REGIONAL / PROVINCIAL TV & STATIONS
  // Note: Most inactive/dead regional feeds removed (>2 mos inactive)
  // ═══════════════════════════════════════════════════════════════

  { id:'kalikatv',     name:'Kalika TV (Pokhara)',     tier:3, type:'regional', province:'Gandaki',
    url:'https://news.google.com/rss/search?q=Kalika+TV+Pokhara+Gandaki+Nepal&hl=en-NP&gl=NP&ceid=NP:en',
    fb:'https://www.facebook.com/kalikatv',
    website:'https://kalikatv.com' },

  // ═══════════════════════════════════════════════════════════════
  // TIER 4 — GOVERNMENT SOURCES & AGENCIES
  // ═══════════════════════════════════════════════════════════════

  { id:'gorkhapatra',  name:'Gorkhapatra Daily',       tier:4, type:'govt',    province:'Bagmati', verified: true,
    url:'https://gorkhapatraonline.com/feed',
    website:'https://gorkhapatraonline.com' },

  { id:'rss_nepal',    name:'RSS National News Agency', tier:4, type:'govt',   province:'National', verified: true,
    url:'https://rss.com.np/feed-en',
    website:'https://rss.com.np' },

  { id:'gnews_disaster',name:'Disaster Alerts (NDRRMA)', tier:4, type:'govt',  province:'National', verified: true,
    url:'https://news.google.com/rss/search?q=Nepal+disaster+flood+earthquake+landslide+NDRRMA&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_ppmo',   name:'PPMO Gov Tenders',        tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=PPMO+Nepal+procurement+tender&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_police', name:'Nepal Police Updates',    tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+Police+arrest+crime+investigation&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_ciaa',   name:'CIAA Anti-Corruption',   tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+CIAA+corruption+investigation&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_moh',    name:'Ministry of Health',      tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+ministry+health+hospital&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_infra',  name:'Infrastructure (DoR)',    tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+road+bridge+construction+infrastructure&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_election',name:'Election Commission',   tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+election+commission+vote&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_moud',   name:'Urban Development (MoUD)',tier:4, type:'govt',   province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+Ministry+Urban+Development+DUDBC&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_nrb',    name:'Nepal Rastra Bank',       tier:4, type:'govt',    province:'Bagmati',
    url:'https://news.google.com/rss/search?q=Nepal+Rastra+Bank+NRB&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_loksewa',name:'Public Service Com.',     tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+Lok+Sewa+Aayog+Public+Service+Commission&hl=en-NP&gl=NP&ceid=NP:en' },

  { id:'gnews_dhm',    name:'Weather (DHM)',           tier:4, type:'govt',    province:'National',
    url:'https://news.google.com/rss/search?q=Nepal+weather+DHM+monsoon+rainfall&hl=en-NP&gl=NP&ceid=NP:en' },

  // ── International / Development ──────────────────────────────
  { id:'bbc_nepali',   name:'BBC Nepali',              tier:4, type:'intl',    province:'National', verified: true,
    url:'https://feeds.bbci.co.uk/nepali/rss.xml',
    website:'https://bbc.com/nepali' },

  { id:'aljazeera',    name:'Al Jazeera Asia',         tier:4, type:'intl',    province:'International', verified: true,
    url:'https://www.aljazeera.com/xml/rss/all.xml',
    website:'https://aljazeera.com' },

  { id:'bbc_world',    name:'BBC World News',          tier:4, type:'intl',    province:'International', verified: true,
    url:'http://feeds.bbci.co.uk/news/world/rss.xml',
    website:'https://bbc.com/news/world' },

  { id:'reliefweb',    name:'ReliefWeb Nepal',         tier:4, type:'intl',    province:'National', verified: true,
    url:'https://reliefweb.int/updates/rss.xml?country=153',
    website:'https://reliefweb.int' },

  { id:'undp_np',      name:'UNDP Nepal',              tier:4, type:'intl',    province:'National', verified: true,
    url:'https://news.google.com/rss/search?q=UNDP+Nepal+development&hl=en&gl=NP&ceid=NP:en' },
];
