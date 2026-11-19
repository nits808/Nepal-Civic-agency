// Auto-extracted Constants Config
export const FEED_TYPES = {
  tv:       { label:'National TV',  color:'#dc2626', icon:'📺' },
  regional: { label:'Regional',     color:'#d97706', icon:'📡' },
  media:    { label:'Digital Media', color:'#1a6aff', icon:'📰' },
  govt:     { label:'Government',   color:'#059669', icon:'🏛️' },
  intl:     { label:'International', color:'#7c3aed', icon:'🌐' },
  dev:      { label:'Development',  color:'#0891b2', icon:'🌱' },
};

export const TIER_META = {
  1: { label:'Tier 1 — National TV',        color:'#dc2626', icon:'📺', desc:'Government & private national broadcasters' },
  2: { label:'Tier 2 — Digital Portals',    color:'#1a6aff', icon:'📰', desc:'Digital-first online news portals (highest reach)' },
  3: { label:'Tier 3 — Regional Stations',  color:'#d97706', icon:'📡', desc:'Provincial & local TV channels (grassroots coverage)' },
  4: { label:'Tier 4 — Govt & International', color:'#7c3aed', icon:'🌐', desc:'Government agencies, intl media, dev organizations' },
};

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

export const KEYWORDS = {
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
