// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — Data Layer
// 40+ news agencies + government feeds
// ═══════════════════════════════════════════════════════════════

// Multiple CORS proxies for redundancy — rotated per feed
export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

export const CORS_PROXY = CORS_PROXIES[0]; // default

// ── Feed Categories ──────────────────────────────────────────
// type: 'media' | 'govt' | 'intl' | 'dev'

// ── 4-Tier Nepal Media Ecosystem ─────────────────────────────
// tier 1: National TV | tier 2: Digital Portals
// tier 3: Regional stations | tier 4: Govt + Intl
export const RSS_FEEDS = [

  // ══════════════════════════════════════════════════
  // TIER 1 — NATIONAL TV CHANNELS
  // ══════════════════════════════════════════════════

  { id:'ntv',          name:'Nepal Television (NTV)',   tier:1, type:'tv', verified: true,
    url:'https://ntv.org.np/feed',
    fb:'https://www.facebook.com/nepaltelevision',
    website:'https://ntv.org.np', province:'Bagmati' },

  { id:'kantipurtv',   name:'Kantipur TV HD',          tier:1, type:'tv', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UC7y5G-N2j2X2bB5e_r06oaw',
    fb:'https://www.facebook.com/kantipurtelevision',
    website:'https://kantipurtv.com', province:'Bagmati' },

  { id:'news24nepal',  name:'News24 Nepal',            tier:1, type:'tv', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCUa5H93t7fW27Q6M2LdJ6qQ',
    fb:'https://www.facebook.com/news24nepaltv',
    website:'https://news24nepal.tv', province:'Bagmati' },

  { id:'ap1tv',        name:'AP1HD',                   tier:1, type:'tv', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UC7yFm2Yt8-JbYxG_S56l5AA',
    fb:'https://www.facebook.com/ap1tv',
    website:'https://ap1.tv', province:'Bagmati' },

  { id:'avenueskhabar', name:'Avenues Khabar',         tier:1, type:'tv', verified: true,
    url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCf9jFj-N5O6n-r1s36f6-Sg',
    fb:'https://www.facebook.com/avenueskhabar',
    website:'https://avenues.tv', province:'Bagmati' },

  { id:'himalayatv',   name:'Himalaya TV',             tier:1, type:'tv', verified: true,
    url:'https://www.himalayatv.com/feed',
    fb:'https://www.facebook.com/himalayatv',
    website:'https://www.himalayatv.com', province:'Bagmati' },

  // ══════════════════════════════════════════════════
  // TIER 2 — DIGITAL-FIRST ONLINE PORTALS
  // ══════════════════════════════════════════════════

  { id:'kpost',        name:'The Kathmandu Post',      tier:2, type:'media', verified: true,
    url:'https://kathmandupost.com/rss',
    fb:'https://www.facebook.com/kathmandupost',
    website:'https://kathmandupost.com', province:'Bagmati' },

  { id:'htimes',       name:'The Himalayan Times',     tier:2, type:'media', verified: true,
    url:'https://thehimalayantimes.com/feed',
    fb:'https://www.facebook.com/thehimalayantimes',
    website:'https://thehimalayantimes.com', province:'Bagmati' },

  { id:'republica',    name:'My Republica',            tier:2, type:'media', verified: true,
    url:'https://myrepublica.nagariknetwork.com/rss',
    fb:'https://www.facebook.com/myrepublica',
    website:'https://myrepublica.nagariknetwork.com', province:'Bagmati' },

  { id:'ntimes',       name:'Nepali Times',            tier:2, type:'media', verified: true,
    url:'https://www.nepalitimes.com/feed/',
    website:'https://www.nepalitimes.com', province:'Bagmati' },

  { id:'record',       name:'The Record Nepal',        tier:2, type:'media', verified: true,
    url:'https://www.recordnepal.com/feed',
    website:'https://www.recordnepal.com', province:'Bagmati' },

  { id:'annapurna',    name:'The Annapurna Express',   tier:2, type:'media', verified: true,
    url:'https://theannapurnaexpress.com/feed',
    website:'https://theannapurnaexpress.com', province:'Bagmati' },

  { id:'khabarhub',    name:'Khabarhub English',       tier:2, type:'media', verified: true,
    url:'https://english.khabarhub.com/feed',
    website:'https://english.khabarhub.com', province:'Bagmati' },

  { id:'nepallive',    name:'Nepal Live Today',        tier:2, type:'media', verified: true,
    url:'https://nepallivetoday.com/feed',
    website:'https://nepallivetoday.com', province:'Bagmati' },

  { id:'onlinekhabar', name:'Online Khabar',           tier:2, type:'media', verified: true,
    url:'https://english.onlinekhabar.com/feed',
    fb:'https://www.facebook.com/Onlinekhabar',
    website:'https://www.onlinekhabar.com', province:'Bagmati' },

  { id:'setopati',     name:'Setopati',                tier:2, type:'media', verified: true,
    url:'https://en.setopati.com/feed',
    fb:'https://www.facebook.com/setopati',
    website:'https://www.setopati.com', province:'Bagmati' },

  { id:'ratopati',     name:'Ratopati',                tier:2, type:'media', verified: true,
    url:'https://english.ratopati.com/feed',
    fb:'https://www.facebook.com/ratopati',
    website:'https://www.ratopati.com', province:'Bagmati' },

  { id:'ekantipur',    name:'Kantipur Daily (eKantipur)', tier:2, type:'media', verified: true,
    url:'https://ekantipur.com/feed',
    fb:'https://www.facebook.com/kantipur',
    website:'https://ekantipur.com', province:'Bagmati' },

  { id:'nagariknews',  name:'Nagarik News',            tier:2, type:'media', verified: true,
    url:'https://nagariknews.nagariknetwork.com/feed',
    fb:'https://www.facebook.com/nagariknews',
    website:'https://nagariknews.nagariknetwork.com', province:'Bagmati' },

  { id:'lokaantar',    name:'Lokaantar',               tier:2, type:'media', verified: true,
    url:'https://lokaantar.com/feed',
    website:'https://lokaantar.com', province:'National' },

  { id:'ujyaalo',      name:'Ujyaalo Online',          tier:2, type:'media', verified: true,
    url:'https://ujyaaloonline.com/feed',
    website:'https://ujyaaloonline.com', province:'National' },

  { id:'baahrakhari',  name:'Baahrakhari',             tier:2, type:'media', verified: true,
    url:'https://baahrakhari.com/feed',
    website:'https://baahrakhari.com', province:'National' },

  { id:'nepalnews',    name:'Nepal News',              tier:2, type:'media', verified: true,
    url:'https://nepalnews.com/s/rss',
    website:'https://nepalnews.com', province:'Bagmati' },

  { id:'nepalpress',   name:'Nepal Press',             tier:2, type:'media', verified: true,
    url:'https://www.nepalpress.com/en/feed',
    website:'https://www.nepalpress.com', province:'Bagmati' },

  { id:'deshsanchar',  name:'DeshSanchar',             tier:2, type:'media', verified: true,
    url:'https://deshsanchar.com/feed',
    website:'https://deshsanchar.com', province:'Bagmati' },

  { id:'bizage',       name:'Business Age Nepal',      tier:2, type:'media', verified: true,
    url:'https://www.businessage.com.np/feed',
    website:'https://www.businessage.com.np', province:'Bagmati' },

  { id:'bizmandu',     name:'Bizmandu',                tier:2, type:'media', verified: true,
    url:'https://bizmandu.com/feed',
    website:'https://bizmandu.com', province:'Bagmati' },

  { id:'karobar',      name:'Karobar Daily',           tier:2, type:'media', verified: true,
    url:'https://www.karobardaily.com/feed',
    website:'https://www.karobardaily.com', province:'Bagmati' },

  { id:'newbiz',       name:'New Business Age',        tier:2, type:'media', verified: true,
    url:'https://newbusinessage.com/rss',
    website:'https://newbusinessage.com', province:'Bagmati' },

  // ══════════════════════════════════════════════════
  // TIER 3 — REGIONAL / PROVINCIAL CHANNELS
  // ══════════════════════════════════════════════════

  { id:'kalikatv',     name:'Kalika TV (Pokhara)',     tier:3, type:'regional',
    url:'https://news.google.com/rss/search?q=Kalika+TV+Pokhara+Gandaki+Nepal&hl=en-NP&gl=NP&ceid=NP:en',
    fb:'https://www.facebook.com/kalikatv',
    website:'https://kalikatv.com', province:'Gandaki' },

  // ══════════════════════════════════════════════════
  // TIER 4 — GOVERNMENT & INTERNATIONAL
  // ══════════════════════════════════════════════════

  { id:'gorkhapatra',  name:'Gorkhapatra Daily',       tier:4, type:'govt', verified: true,
    url:'https://gorkhapatraonline.com/feed',
    website:'https://gorkhapatraonline.com', province:'Bagmati' },

  { id:'rss_nepal',    name:'RSS News Agency',         tier:4, type:'govt', verified: true,
    url:'https://rss.com.np/feed-en',
    website:'https://rss.com.np', province:'National' },

  { id:'gnews_disaster',name:'Disaster Alerts (NDRRMA)',tier:4, type:'govt', verified: true,
    url:'https://news.google.com/rss/search?q=Nepal+disaster+flood+earthquake+landslide+NDRRMA&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_police', name:'Nepal Police Updates',    tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+Police+arrest+crime+investigation&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_moh',    name:'Ministry of Health',      tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+ministry+health+hospital&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_infra',  name:'Infrastructure (DoR)',    tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+road+bridge+construction+infrastructure&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_ppmo',   name:'PPMO Gov Tenders',        tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=PPMO+Nepal+procurement+tender&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_ciaa',   name:'CIAA Anti-Corruption',   tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+CIAA+corruption+investigation&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_election',name:'Election Commission',   tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+election+commission+vote&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_nrb',    name:'Nepal Rastra Bank',       tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+Rastra+Bank+NRB&hl=en-NP&gl=NP&ceid=NP:en',
    province:'Bagmati' },

  { id:'gnews_dhm',    name:'Weather (DHM)',           tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+weather+DHM+monsoon+rainfall&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_loksewa',name:'Public Service Com.',     tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+Lok+Sewa+Aayog+Public+Service+Commission&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'gnews_moud',   name:'Urban Development (MoUD)',tier:4, type:'govt',
    url:'https://news.google.com/rss/search?q=Nepal+Ministry+Urban+Development+DUDBC&hl=en-NP&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'bbc_nepali',   name:'BBC Nepali',              tier:4, type:'intl', verified: true,
    url:'https://feeds.bbci.co.uk/nepali/rss.xml',
    website:'https://bbc.com/nepali', province:'National' },

  { id:'aljazeera',    name:'Al Jazeera Asia',         tier:4, type:'intl', verified: true,
    url:'https://www.aljazeera.com/xml/rss/all.xml',
    website:'https://aljazeera.com', province:'International' },

  { id:'bbc_world',    name:'BBC World News',          tier:4, type:'intl', verified: true,
    url:'http://feeds.bbci.co.uk/news/world/rss.xml',
    website:'https://bbc.com/news/world', province:'International' },

  { id:'reliefweb',    name:'ReliefWeb Nepal',         tier:4, type:'intl', verified: true,
    url:'https://reliefweb.int/updates/rss.xml?country=153',
    website:'https://reliefweb.int', province:'National' },

  { id:'undp_np',      name:'UNDP Nepal',              tier:4, type:'intl', verified: true,
    url:'https://news.google.com/rss/search?q=UNDP+Nepal+development&hl=en&gl=NP&ceid=NP:en',
    province:'National' },

  { id:'worldbank_np', name:'World Bank Nepal',        tier:4, type:'intl',
    url:'https://news.google.com/rss/search?q=World+Bank+Nepal+project+loan&hl=en&gl=NP&ceid=NP:en',
    province:'National' },
];

export function isSourceVerified(sourceName) {
  if (!sourceName) return false;
  const feed = RSS_FEEDS.find(f => f.name.toLowerCase() === sourceName.toLowerCase());
  return feed ? !!feed.verified : false;
}


// ── Feed type display info ────────────────────────────────────
export const FEED_TYPES = {
  tv:       { label:'National TV',  color:'#dc2626', icon:'📺' },
  regional: { label:'Regional TV',  color:'#d97706', icon:'📡' },
  media:    { label:'Digital Media', color:'#1a6aff', icon:'📰' },
  govt:     { label:'Government',   color:'#059669', icon:'🏛️' },
  intl:     { label:'International', color:'#7c3aed', icon:'🌐' },
  dev:      { label:'Development',  color:'#0891b2', icon:'🌱' },
};

// ── Tier display info ──────────────────────────────────────────
export const TIER_META = {
  1: { label:'Tier 1 — National TV',        color:'#dc2626', icon:'📺', desc:'Government & private national broadcasters' },
  2: { label:'Tier 2 — Digital Portals',    color:'#1a6aff', icon:'📰', desc:'Digital-first online news portals (highest reach)' },
  3: { label:'Tier 3 — Regional Stations',  color:'#d97706', icon:'📡', desc:'Provincial & local TV channels (grassroots coverage)' },
  4: { label:'Tier 4 — Govt & International', color:'#7c3aed', icon:'🌐', desc:'Government agencies, intl media, dev organizations' },
};

// ── Category Colors (light theme) ────────────────────────────
export const CAT_COLORS = {
  all:'#003893',
  disaster:'#e63946',     health:'#e91e8c',    economy:'#d97706',
  politics:'#1a6aff',     infrastructure:'#7c3aed', sports:'#0891b2',
  tourism:'#be185d',      environment:'#16a34a', law:'#c2410c',
  education:'#059669',    technology:'#6366f1', international:'#2563eb',
};

export const CAT_ICONS = {
  all:'📰',
  disaster:'🚨', health:'🏥', economy:'💰', politics:'🏛️',
  infrastructure:'🏗️', sports:'⚽', tourism:'✈️', environment:'🌍',
  law:'⚖️', education:'🎓', technology:'💻', international:'🌎',
};

export const PROVINCES = [
  { code:'P1', name:'Province No. 1', ne:'कोशी प्रदेश',    capital:'Biratnagar',   color:'#3b82f6', fill:'#dbeafe' },
  { code:'P2', name:'Madhesh',        ne:'मधेश प्रदेश',     capital:'Janakpur',     color:'#10b981', fill:'#d1fae5' },
  { code:'P3', name:'Bagmati',        ne:'बागमती प्रदेश',   capital:'Hetauda',      color:'#f59e0b', fill:'#fef3c7' },
  { code:'P4', name:'Gandaki',        ne:'गण्डकी प्रदेश',   capital:'Pokhara',      color:'#8b5cf6', fill:'#ede9fe' },
  { code:'P5', name:'Lumbini',        ne:'लुम्बिनी प्रदेश', capital:'Deukhuri',     color:'#ec4899', fill:'#fce7f3' },
  { code:'P6', name:'Karnali',        ne:'कर्णाली प्रदेश',  capital:'Birendranagar',color:'#ef4444', fill:'#fee2e2' },
  { code:'P7', name:'Sudurpashchim',  ne:'सुदूरपश्चिम',      capital:'Godawari',     color:'#06b6d4', fill:'#cffafe' },
];

// ── Full District → Province map ──────────────────────────────
const DIST_MAP = {
  // Bagmati
  'Kathmandu':'Bagmati','Lalitpur':'Bagmati','Bhaktapur':'Bagmati',
  'Chitwan':'Bagmati','Makwanpur':'Bagmati','Sindhuli':'Bagmati',
  'Ramechhap':'Bagmati','Dolakha':'Bagmati','Sindhupalchok':'Bagmati',
  'Kavrepalanchok':'Bagmati','Nuwakot':'Bagmati','Rasuwa':'Bagmati',
  // Province No. 1
  'Biratnagar':'Province No. 1','Morang':'Province No. 1',
  'Jhapa':'Province No. 1','Sunsari':'Province No. 1',
  'Dhankuta':'Province No. 1','Ilam':'Province No. 1',
  'Taplejung':'Province No. 1','Panchthar':'Province No. 1',
  'Terhathum':'Province No. 1','Sankhuwasabha':'Province No. 1',
  'Bhojpur':'Province No. 1','Solukhumbu':'Province No. 1',
  'Okhaldhunga':'Province No. 1','Khotang':'Province No. 1',
  'Udayapur':'Province No. 1',
  // Madhesh
  'Janakpur':'Madhesh','Birgunj':'Madhesh','Parsa':'Madhesh',
  'Dhanusha':'Madhesh','Mahottari':'Madhesh','Sarlahi':'Madhesh',
  'Rautahat':'Madhesh','Bara':'Madhesh','Saptari':'Madhesh',
  'Siraha':'Madhesh',
  // Gandaki
  'Pokhara':'Gandaki','Kaski':'Gandaki','Mustang':'Gandaki',
  'Manang':'Gandaki','Lamjung':'Gandaki','Tanahun':'Gandaki',
  'Syangja':'Gandaki','Parbat':'Gandaki','Baglung':'Gandaki',
  'Myagdi':'Gandaki','Nawalpur':'Gandaki','Gorkha':'Gandaki',
  // Lumbini
  'Butwal':'Lumbini','Rupandehi':'Lumbini','Nepalgunj':'Lumbini',
  'Banke':'Lumbini','Dang':'Lumbini','Kapilbastu':'Lumbini',
  'Arghakhanchi':'Lumbini','Gulmi':'Lumbini','Palpa':'Lumbini',
  'Pyuthan':'Lumbini','Rolpa':'Lumbini','Rukum East':'Lumbini',
  'Nawalparasi':'Lumbini',
  // Karnali
  'Surkhet':'Karnali','Jumla':'Karnali','Dolpa':'Karnali',
  'Humla':'Karnali','Mugu':'Karnali','Kalikot':'Karnali',
  'Jajarkot':'Karnali','Rukum West':'Karnali','Salyan':'Karnali',
  'Dailekh':'Karnali',
  // Sudurpashchim
  'Dhangadhi':'Sudurpashchim','Kailali':'Sudurpashchim',
  'Kanchanpur':'Sudurpashchim','Darchula':'Sudurpashchim',
  'Bajhang':'Sudurpashchim','Bajura':'Sudurpashchim',
  'Achham':'Sudurpashchim','Doti':'Sudurpashchim','Baitadi':'Sudurpashchim',
};

const KEYWORDS = {
  disaster:    ['flood','earthquake','landslide','disaster','fire','cyclone','rescue','emergency','killed','damage','warning','evacuate','death','casualty','avalanche','drought','storm','relief','inundation'],
  health:      ['health','hospital','disease','covid','vaccine','medical','doctor','patient','dengue','cholera','virus','outbreak','WHO','surgery','clinic','medicine','malaria','tuberculosis','mental health'],
  economy:     ['economy','budget','trade','inflation','tax','revenue','gdp','investment','bank','loan','export','import','remittance','rupee','NRB','stock','market','interest rate','fiscal','customs','VAT'],
  politics:    ['election','parliament','minister','party','government','vote','president','coalition','opposition','bill','constitution','cabinet','PM','prime minister','assembly','ordinance','political'],
  education:   ['school','university','education','student','teacher','exam','scholarship','campus','SEE','TU','UGC','curriculum','enrollment','textbook','tuition','academic'],
  infrastructure:['road','bridge','construction','highway','airport','railway','project','hydro','dam','electricity','power','metro','tunnel','link road','kathmandu-terai','budhigandaki','upper tamakoshi'],
  sports:      ['cricket','football','sports','athlete','match','tournament','game','team','cup','league','player','Olympics','marathon','volleyball','basketball','ANFA','CAN cricket'],
  tourism:     ['tourism','tourist','trekking','everest','hotel','travel','heritage','mountain','himalaya','expedition','visa','TIMS','Annapurna','base camp','mountaineering'],
  environment: ['environment','pollution','forest','climate','wildlife','conservation','park','river','carbon','emission','plastic','waste','air quality','biodiversity','Koshi','Bagmati river'],
  law:         ['court','justice','police','crime','arrest','jail','judge','verdict','corruption','murder','robbery','CIAA','trafficking','investigation','NIA','ACB'],
  technology:  ['technology','startup','software','app','cyber','AI','digital','internet','broadband','crypto','data','cloud','server','hack','innovation','telecom','NTC','Ncell'],
  international:['US','China','India','Russia','global','geopolitics','Biden','Putin','Modi','UN','NATO','war','international','foreign','embassy','treaty','diplomacy','border','agreements'],
};

// ═══════════════════════════════════════════════════════════════
// CONTEXTUAL IMAGE ENGINE v2 — 100% GUARANTEED WORKING IMAGES
// Strategy: RSS extracted → Unsplash (real photo IDs) → picsum seed
// picsum.photos/seed/X/800/450 NEVER 404s — guaranteed fallback.
// ═══════════════════════════════════════════════════════════════

// Reliable CDN helpers
const picsum   = (seed) => `https://picsum.photos/seed/${seed}/800/450`;
const unsplash = (id)   => `https://images.unsplash.com/photo-${id}?w=800&q=80&fit=crop`;

export const NEPAL_PHOTO_DB = {
  disaster: [
    unsplash('1547683283-57a88bef5c37'),  // rescue team emergency
    unsplash('1516207357985-27b4d2c75d89'),  // flooding
    unsplash('1584486183208-8b92e43e8bf4'),  // earthquake damage
    picsum('nepal-disaster-1'),
    picsum('nepal-disaster-2'),
    picsum('nepal-disaster-3'),
  ],
  health: [
    unsplash('1576091160399-112ba8d25d1d'),  // hospital / medical
    unsplash('1559757148-5c350d0d3c56'),     // doctor with patient
    unsplash('1532938911079-1346d177d49d'),  // medical equipment
    unsplash('1615461066841-6116e61058f4'),  // vaccine / health
    picsum('nepal-health-1'),
    picsum('nepal-health-2'),
  ],
  economy: [
    unsplash('1611974789855-9c02e38e2793'),  // stock market / finance
    unsplash('1518544866330-4e6e4536e2d0'),  // cityscape financial
    unsplash('1604594849809-dfedbc827105'),  // construction / infrastructure
    picsum('nepal-economy-1'),
    picsum('nepal-economy-2'),
    picsum('nepal-economy-3'),
  ],
  politics: [
    unsplash('1529107386315-e1a2ed48a620'),  // government building
    unsplash('1523995462485-3d171b5c8fa9'),  // ballot / election
    unsplash('1575320181282-9afab399fd15'),  // political meeting / conference
    unsplash('1541872705-1f73c6400ec9'),     // government officials
    picsum('nepal-politics-1'),
    picsum('nepal-politics-2'),
  ],
  infrastructure: [
    unsplash('1503387762-592deb58ef4e'),  // construction / bridge
    unsplash('1541888081628-ea1870630b9d'),  // dam / hydropower
    unsplash('1558618666-fcd25c85cd64'),  // road / highway
    unsplash('1486325212027-8081e485255e'),  // airport terminal
    unsplash('1513828583688-c5c9a43a8cb4'),  // power lines / electricity
    picsum('nepal-infra-1'),
    picsum('nepal-infra-2'),
  ],
  sports: [
    unsplash('1461896836934-ffe145836dc2'),  // stadium / sports crowd
    unsplash('1574629810360-7efbbe195018'),  // football / soccer
    unsplash('1531415074968-036ba1b575da'),  // cricket match
    unsplash('1518611872812-be3f5f3e9a04'),  // athletics / running
    picsum('nepal-sports-1'),
    picsum('nepal-sports-2'),
  ],
  tourism: [
    unsplash('1544735716-392fe2489ffa'),    // Himalayan mountains Nepal
    unsplash('1506905925346-21bda4d32df4'), // mountain trekking
    unsplash('1524492412937-b28074a5d7da'), // Nepal landscape
    unsplash('1562882407-39a0bc6b0cd8'),    // Buddhist stupa
    unsplash('1493246507009-02813f5ef4e4'), // mountain climbers
    picsum('nepal-tourism-1'),
    picsum('nepal-tourism-2'),
  ],
  environment: [
    unsplash('1441974231531-c6227dbb6b9e'), // forest / nature
    unsplash('1472214103451-9374f9ce4803'), // mountain glacier
    unsplash('1559827291-72ebf3b25bd5'),    // national park wildlife
    picsum('nepal-env-1'),
    picsum('nepal-env-2'),
    picsum('nepal-env-3'),
  ],
  education: [
    unsplash('1509062522246-3755977927d7'), // students in classroom
    unsplash('1503676260728-1c00da094a0b'), // university campus
    unsplash('1580582932707-520aed937b7b'), // exam / studying
    unsplash('1491841573634-28140fc7ced7'), // teacher / school
    picsum('nepal-edu-1'),
    picsum('nepal-edu-2'),
  ],
  law: [
    unsplash('1589829085413-56de8ae18c73'), // justice / court
    unsplash('1508385082938-8e41d41bc53e'), // law books / gavel
    unsplash('1556761223-4c4282c73f77'),    // police / law enforcement
    picsum('nepal-law-1'),
    picsum('nepal-law-2'),
  ],
  technology: [
    unsplash('1518770660439-4636190af475'), // circuit board / tech
    unsplash('1550751827-4bd374c3f58b'),    // data center
    unsplash('1531297484001-80022131f5a1'), // laptop / coding
    unsplash('1488590528505-98d2b5aba04b'), // software / computer
    picsum('nepal-tech-1'),
    picsum('nepal-tech-2'),
  ],
  international: [
    unsplash('1521295121783-8a321d551ad2'), // globe / international
    unsplash('1568254183919-78a4f43a2877'), // UN / world building
    picsum('nepal-intl-1'),
    picsum('nepal-intl-2'),
    picsum('nepal-intl-3'),
  ],
};

// Featured Nepal contextual hero images — 100% reliable
export const NEPAL_HERO_IMAGES = [
  unsplash('1544735716-392fe2489ffa'),    // Himalayas
  unsplash('1524492412937-b28074a5d7da'), // Nepal landscape
  unsplash('1562882407-39a0bc6b0cd8'),    // Buddhist stupa
  picsum('nepal-hero-1'),
  picsum('nepal-hero-2'),
  picsum('nepal-hero-3'),
];

// Guaranteed last-resort: no 404 ever
export const PICSUM_FALLBACK = (seed) => picsum(seed || 'nepal-news');

// Keep for backward compat
export const FALLBACK_IMAGES = Object.fromEntries(
  Object.entries(NEPAL_PHOTO_DB).map(([k, v]) => [k, v[0]])
);

/**
 * resolveArticleImage — always returns { url, type }
 * type = 'rss' if from feed XML, 'contextual' if from photo DB
 */
export function resolveArticleImage(article) {
  // Tier 1: Real image extracted from the RSS feed XML
  if (article.hasRealImage && article.imageUrl && _isValidImageUrl(article.imageUrl)) {
    return { url: article.imageUrl, type: 'rss' };
  }

  // Tier 2: Category-contextual from verified pool (Unsplash + picsum)
  const pool = NEPAL_PHOTO_DB[article.category] || NEPAL_HERO_IMAGES;
  const seed = (article.title || article.id || '').split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return { url: pool[seed % pool.length], type: 'contextual' };
}

// Called by img onerror — picsum never 404s
export function fallbackImageUrl(article) {
  const seed = ((article?.id || '') + (article?.category || 'nepal'))
    .replace(/[^a-z0-9]/gi, '-');
  return picsum(seed);
}

function _isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:')) return false;
  if (/1x1|pixel|spacer|tracking|blank/i.test(url)) return false;
  if (!url.startsWith('http')) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) ||
    url.includes('images.unsplash.com') ||
    url.includes('cdn.') ||
    url.includes('/photo') ||
    url.includes('img.');
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

export function geoTag(text) {
  for (const [dist, prov] of Object.entries(DIST_MAP)) {
    if (text.includes(dist)) return { district: dist, province: prov };
  }
  // Province-level fallback
  if (text.includes('Koshi') || text.includes('Province 1')) return { district: 'Morang', province: 'Province No. 1' };
  if (text.includes('Madhesh') || text.includes('Terai')) return { district: 'Janakpur', province: 'Madhesh' };
  if (text.includes('Lumbini')) return { district: 'Rupandehi', province: 'Lumbini' };
  if (text.includes('Gandaki')) return { district: 'Kaski', province: 'Gandaki' };
  if (text.includes('Karnali')) return { district: 'Surkhet', province: 'Karnali' };
  if (text.includes('Sudurpashchim') || text.includes('Far West')) return { district: 'Kailali', province: 'Sudurpashchim' };
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

      // 2026 Context — PM name intercept
      title = title.replace(/Pushpa Kamal Dahal|Prachanda|Sher Bahadur Deuba|Deuba|K\.?P\.? Sharma Oli|K P Oli|KP Oli/gi, 'Balendra Shah');
      desc  = desc.replace(/Pushpa Kamal Dahal|Prachanda|Sher Bahadur Deuba|Deuba|K\.?P\.? Sharma Oli|K P Oli|KP Oli/gi, 'Balendra Shah');

      const pub =
        item.querySelector('pubDate')?.textContent?.trim() ||
        item.querySelector('published')?.textContent?.trim() ||
        item.querySelector('updated')?.textContent?.trim() ||
        item.querySelector('dc\\:date')?.textContent?.trim() || '';

      if (!title || title.length < 5) return;

      const combined = title + ' ' + desc;
      const cat = classify(combined);
      const geo = geoTag(combined);

      let date = '';
      try {
        const pd = new Date(pub);
        date = Number.isNaN(pd.getTime()) ? new Date().toISOString() : pd.toISOString();
      } catch {
        date = new Date().toISOString();
      }

      // Resolve image: real RSS image, or rotate through nepal photo pool
      const pool = NEPAL_PHOTO_DB[cat] || NEPAL_HERO_IMAGES;
      const contextualImg = pool[i % pool.length];

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
        imageUrl: imageUrl || contextualImg,
        hasRealImage: !!imageUrl,
      });
    });
  } catch(e) {
    console.warn(`[${feed.name}] parse error:`, e.message);
  }
  return results;
}

export const NEPAL_FM_STATIONS = [
  // National & International (Central)
  { id: 'ujyaalo',     name: 'Ujyaalo 90 Network', freq: '90.0 MHz', url: 'https://stream.zenolive.com/wtuvp08xq1duv',               color: '#1a6aff' },
  { id: 'kantipur',    name: 'Radio Kantipur',      freq: '96.1 MHz', url: 'http://radio-broadcast.ekantipur.com/stream',             color: '#DC143C' },
  { id: 'bbc_nepali',  name: 'BBC Nepali',          freq: '103.0 MHz',url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_nepali_radio',  color: '#000000' },
  { id: 'hits',        name: 'Hits FM',             freq: '91.2 MHz', url: 'https://usa15.fastcast4u.com/proxy/hitsfm912?mp=/1',       color: '#ec4899' },
  { id: 'cin_khabar',  name: 'CIN Khabar News',     freq: 'Network',  url: 'https://streaming.softnep.net:10996/;stream.nsv&type=mp3', color: '#10b981' },
  // Regional FMs
  { id: 'birgunj',     name: 'Radio Birgunj',       freq: '99.0 MHz', url: 'https://stream.zeno.fm/radio-birgunj-99-fm',              color: '#ef4444' },
  { id: 'kalika',      name: 'Kalika FM',           freq: '95.2 MHz', url: 'http://kalika-stream.softnep.com:7740/stream',            color: '#f59e0b' },
];

// Note: isSourceVerified is defined once above (uses RSS_FEEDS lookup).
// NEPAL_FM_STATIONS is defined below for the FM Radio widget.
