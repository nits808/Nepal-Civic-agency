import { CORS_PROXIES } from './data.js';

const CKAN_PORTALS = [
  {
    id: 'opendatanepal',
    name: 'Open Data Nepal',
    base: 'https://opendatanepal.com/api/3/action',
    kind: 'ckan',
    coverage: 'National',
  },
];

export const PROJECT_SOURCE_REGISTRY = [
  {
    id: 'opendatanepal-ckan',
    name: 'Open Data Nepal (CKAN)',
    type: 'open-data',
    url: 'https://opendatanepal.com',
    coverage: 'National',
    note: 'Primary open data catalog (CKAN).',
  },
  {
    id: 'ppmo-ocp',
    name: 'PPMO Procurement (OCP registry)',
    type: 'procurement',
    url: 'https://data.open-contracting.org/en/publication/36',
    coverage: 'National',
    note: 'Historic procurement dataset (2016-2018).',
  },
  {
    id: 'ppmo-ppip',
    name: 'PPMO PPTIN Portal',
    type: 'procurement',
    url: 'http://ppip.gov.np/downloads',
    coverage: 'National',
    note: 'Procurement downloads referenced by the OCP registry.',
  },
];

const CKAN_SEARCH_TERMS = [
  'project',
  'procurement',
  'hydropower',
  'road',
  'airport',
  'irrigation',
  'municipality',
  'rural municipality',
];

const MAX_DATASETS = 6;
const MAX_ROWS = 200;
const REQUEST_TIMEOUT = 7000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithFallback(url) {
  try {
    return await fetchJson(url);
  } catch (err) {
    for (const proxy of CORS_PROXIES) {
      try {
        return await fetchJson(proxy + encodeURIComponent(url));
      } catch {
        await sleep(100);
      }
    }
    throw err;
  }
}

function pickValue(row, keys) {
  for (const key of keys) {
    const val = row?.[key];
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && val.trim().length === 0) continue;
    return val;
  }
  return undefined;
}

function parseNumber(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val !== 'string') return null;
  const cleaned = val.replace(/[, ]/g, '').replace(/[^\d.\-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function inferCurrency(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const v = raw.toLowerCase();
  if (v.includes('$') || v.includes('usd')) return 'USD';
  if (v.includes('rs') || v.includes('npr') || v.includes('रु')) return 'NPR';
  return null;
}

function parseBudgetWithUnits(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const base = parseNumber(raw);
  if (!Number.isFinite(base)) return null;
  const lower = raw.toLowerCase();
  let scale = 1;
  if (lower.includes('b')) scale = 1_000_000_000;
  else if (lower.includes('m')) scale = 1_000_000;
  return { value: base * scale, currency: inferCurrency(raw) };
}

function formatBudget(value, currency) {
  if (!Number.isFinite(value)) return 'TBD';
  const unit = currency || '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${unit ? unit + ' ' : ''}${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${unit ? unit + ' ' : ''}${(value / 1_000_000).toFixed(1)}M`;
  }
  return `${unit ? unit + ' ' : ''}${value.toLocaleString()}`;
}

function parseYear(val) {
  if (!val) return null;
  if (typeof val === 'number') return val;
  const match = String(val).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function mapStatus(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v.includes('operat') || v.includes('complete') || v.includes('commission')) return 'operating';
  if (v.includes('construct') || v.includes('implement') || v.includes('work')) return 'construction';
  if (v.includes('plan') || v.includes('design') || v.includes('feasibility')) return 'planning';
  if (v.includes('ongoing') || v.includes('active')) return 'ongoing';
  return null;
}

function normalizeProject(row, source, idx = 0) {
  const name = pickValue(row, [
    'project',
    'project_name',
    'project title',
    'project_title',
    'name',
    'title',
    'scheme',
    'program',
  ]);
  if (!name) return null;

  const budgetRaw = pickValue(row, [
    'budget',
    'total_cost',
    'project_cost',
    'estimated_cost',
    'cost',
    'amount',
    'allocation',
    'contract_value',
    'contract amount',
  ]);
  const currency = inferCurrency(typeof budgetRaw === 'string' ? budgetRaw : '');
  const budgetValue = parseNumber(budgetRaw);
  const budget = budgetValue ? formatBudget(budgetValue, currency || 'NPR') : 'TBD';

  const status = mapStatus(pickValue(row, ['status', 'stage', 'phase', 'progress_status'])) || 'ongoing';

  const sector = pickValue(row, ['sector', 'category', 'type', 'subsector', 'sub_sector']) || 'General';
  const province = pickValue(row, ['province', 'state', 'region']) || 'National';
  const district = pickValue(row, ['district', 'location', 'site', 'address']) || 'Multiple';
  const agency = pickValue(row, ['agency', 'ministry', 'department', 'office', 'implementing_agency', 'authority']) || 'Govt/Agency';

  const startYear = parseYear(pickValue(row, ['start', 'start_year', 'start_date', 'commencement']));
  const endYear = parseYear(pickValue(row, ['end', 'end_year', 'completion', 'end_date', 'target_year']));

  const capacity = pickValue(row, ['capacity', 'output', 'length', 'size']) || 'TBD';

  const spentRaw = pickValue(row, ['progress', 'completion', 'percent_complete', 'progress_percent', 'spent']);
  let spent = parseNumber(spentRaw);
  if (!Number.isFinite(spent)) spent = 0;
  if (spent > 100) spent = Math.min(100, spent);

  const description =
    pickValue(row, ['description', 'details', 'remarks', 'summary']) ||
    'Open data record. Refer to the source portal for full documentation.';

  return {
    id: `${source.id}-${idx}`,
    name: String(name).trim(),
    sector: String(sector).trim(),
    capacity: String(capacity).trim(),
    budget,
    budgetValue,
    budgetCurrency: currency || (budgetValue ? 'NPR' : null),
    spent,
    status,
    province: String(province).trim(),
    district: String(district).trim(),
    startYear: startYear || 2000,
    endYear: endYear || 2030,
    agency: String(agency).trim(),
    description: String(description).trim(),
    timeline: [],
    source: source.name,
  };
}

function normalizeRows(rows, source) {
  if (!Array.isArray(rows)) return [];
  const projects = [];
  rows.forEach((row, idx) => {
    const proj = normalizeProject(row, source, idx);
    if (proj) projects.push(proj);
  });
  return projects;
}

function pickResource(resources = []) {
  if (!Array.isArray(resources)) return null;
  const preferred = resources.find((r) => r.datastore_active);
  if (preferred) return preferred;
  return resources.find((r) => String(r.format || '').match(/json|csv|xls/i));
}

async function fetchCkanRows(base, resource) {
  if (!resource) return [];
  if (resource.datastore_active && resource.id) {
    const url = `${base}/datastore_search?resource_id=${resource.id}&limit=${MAX_ROWS}`;
    const data = await fetchJsonWithFallback(url);
    return data?.result?.records || [];
  }
  if (resource.url && String(resource.format || '').toLowerCase().includes('json')) {
    const data = await fetchJsonWithFallback(resource.url);
    if (Array.isArray(data)) return data.slice(0, MAX_ROWS);
    if (Array.isArray(data?.records)) return data.records.slice(0, MAX_ROWS);
  }
  return [];
}

async function fetchCkanProjects(portal) {
  const results = [];
  const seen = new Set();
  for (const term of CKAN_SEARCH_TERMS) {
    const url = `${portal.base}/package_search?q=${encodeURIComponent(term)}&rows=${MAX_DATASETS}`;
    const data = await fetchJsonWithFallback(url);
    const datasets = data?.result?.results || [];
    for (const ds of datasets) {
      if (!ds?.id || seen.has(ds.id)) continue;
      seen.add(ds.id);
      const resource = pickResource(ds.resources || []);
      const rows = await fetchCkanRows(portal.base, resource);
      results.push(...normalizeRows(rows, {
        id: `${portal.id}-${ds.id}`,
        name: portal.name,
      }));
    }
  }
  return results;
}

export async function fetchProjectsFromSources() {
  const projects = [];
  const sourcesUsed = [];

  for (const portal of CKAN_PORTALS) {
    try {
      const data = await fetchCkanProjects(portal);
      if (data.length) {
        projects.push(...data);
        sourcesUsed.push(portal.name);
      }
    } catch {
      // ignore portal failures, we will fall back to seed data
    }
  }

  return { projects, sourcesUsed };
}

export function computeProjectStats(projects) {
  const totals = {
    total: projects.length,
    operating: 0,
    construction: 0,
    planning: 0,
    ongoing: 0,
    budgetUsd: 0,
    budgetNpr: 0,
    hydroMw: 0,
    roadKm: 0,
  };

  projects.forEach((p) => {
    if (p.status === 'operating') totals.operating += 1;
    if (p.status === 'construction') totals.construction += 1;
    if (p.status === 'planning') totals.planning += 1;
    if (p.status === 'ongoing') totals.ongoing += 1;

    const parsedBudget = Number.isFinite(p.budgetValue) ? null : parseBudgetWithUnits(p.budget);
    const budgetValue = Number.isFinite(p.budgetValue)
      ? p.budgetValue
      : (parsedBudget?.value || null);
    const currency = p.budgetCurrency || parsedBudget?.currency || 'NPR';
    if (Number.isFinite(budgetValue)) {
      if (currency === 'USD') totals.budgetUsd += budgetValue;
      else totals.budgetNpr += budgetValue;
    }

    const cap = String(p.capacity || '').toLowerCase();
    const capNum = parseNumber(cap);
    if (capNum) {
      if (cap.includes('mw') || String(p.sector || '').toLowerCase().includes('hydro')) {
        totals.hydroMw += capNum;
      }
      if (cap.includes('km') || String(p.sector || '').toLowerCase().includes('road')) {
        totals.roadKm += capNum;
      }
    }
  });

  return totals;
}

export function mergeProjects(seed, incoming) {
  const seen = new Set(seed.map((p) => `${p.name}-${p.district}-${p.sector}`));
  const merged = [...seed];
  incoming.forEach((p) => {
    const key = `${p.name}-${p.district}-${p.sector}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(p);
    }
  });
  return merged;
}

export const SEED_PROJECTS = [
  // Infrastructure / Hydro
  { id:1, name:'Upper Tamakoshi Hydropower', sector:'Hydro Energy', capacity:'456 MW', budget:'USD 1.6B', spent:100, status:'operating', province:'Bagmati', district:'Dolakha', startYear:2011, endYear:2021, agency:'NTDC', description:'Nepal\'s largest domestic hydropower plant, contributing significantly to electricity supply.',
    timeline: [
      { date: '2026-01', text: 'Sustained full capacity generation during dry season using optimized reservoir management.' },
      { date: '2024-05', text: 'Completed minor post-construction structural reviews.' },
      { date: '2021-09', text: 'Plant fully operational.' }
    ]
  },
  { id:2, name:'Budhigandaki Hydropower', sector:'Hydro Energy', capacity:'1200 MW', budget:'USD 2.5B', spent:25, status:'construction', province:'Bagmati', district:'Gorkha/Dhading', startYear:2019, endYear:2030, agency:'BKHPC', description:'Under-construction mega hydro project to address Nepal\'s energy deficit.',
    timeline: [
      { date: '2026-03', text: 'Tunnel boring advancing steadily. Resettlement compensation 85% complete.' },
      { date: '2025-11', text: 'Contractual disputes resolved; civil works resumed.' },
      { date: '2024-08', text: 'Land acquisition in primary zone finalized.' }
    ]
  },
  { id:3, name:'Arun III Hydropower', sector:'Hydro Energy', capacity:'900 MW', budget:'USD 1.04B', spent:65, status:'construction', province:'Province No. 1', district:'Sankhuwasabha', startYear:2018, endYear:2027, agency:'SJVN', description:'India-Nepal joint hydropower project in eastern Nepal. Delayed from 2025 target.',
    timeline: [
      { date: '2026-02', text: 'Electromechanical equipment installation started at the powerhouse.' },
      { date: '2025-06', text: 'Civil works crossed 60% completion. Dam construction delayed by monsoons.' },
      { date: '2024-12', text: 'Power house excavation completed.' }
    ]
  },
  { id:4, name:'West Seti Hydropower', sector:'Hydro Energy', capacity:'750 MW', budget:'USD 1.2B', spent:12, status:'planning', province:'Sudurpashchim', district:'Doti/Achham', startYear:2025, endYear:2032, agency:'NHPC', description:'Major export-oriented hydro project in far-western Nepal.',
    timeline: [
      { date: '2026-01', text: 'Finalizing PPA (Power Purchase Agreement) terms with regional buyers.' },
      { date: '2025-09', text: 'DPR finalized and environmental clearance secured.' }
    ]
  },
  { id:5, name:'Trishuli-3A Hydropower', sector:'Hydro Energy', capacity:'60 MW', budget:'USD 160M', spent:100, status:'operating', province:'Bagmati', district:'Nuwakot', startYear:2012, endYear:2017, agency:'NEA', description:'Run-of-river project serving central grid.',
    timeline: [
      { date: '2026-03', text: 'Routine decadal maintenance and silt clearance underway.' },
      { date: '2017-08', text: 'Fully operational.' }
    ]
  },

  // Road & Transport
  { id:6, name:'Kathmandu-Terai Fast Track', sector:'Roads', capacity:'72.5 km', budget:'USD 1.1B', spent:65, status:'construction', province:'Bagmati', district:'Chitwan/Lalitpur', startYear:2017, endYear:2028, agency:'Nepal Army', description:'Expressway cutting travel from Kathmandu to Terai from 4.5h to 1.5h. Target shifted to 2028.',
    timeline: [
      { date: '2026-03', text: 'Mahadevtar twin tunnels officially pierced. 65% total physical progress.' },
      { date: '2025-10', text: 'High bridges construction ongoing over difficult terrain.' },
      { date: '2024-05', text: 'Tunnel boring and sub-grade preparation across 5 sections.' }
    ]
  },
  { id:7, name:'Nagdhunga Tunnel', sector:'Roads', capacity:'2.68 km', budget:'USD 108M', spent:95, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2019, endYear:2026, agency:'DoR', description:'Twin-tube tunnel to ease Kathmandu valley congestion westward.',
    timeline: [
      { date: '2026-02', text: 'Trial runs successful. Final safety audits and ventilation checks ongoing.' },
      { date: '2025-08', text: 'Lighting, asphalt, and emergency extraction systems installed.' },
      { date: '2024-04', text: 'Main tunnel breakthrough achieved.' }
    ]
  },
  { id:8, name:'Mid-Hill Highway', sector:'Roads', capacity:'1,776 km', budget:'USD 800M', spent:52, status:'construction', province:'National', district:'Multiple', startYear:2013, endYear:2029, agency:'DoR', description:'East-west highway connecting hilly districts.',
    timeline: [
      { date: '2026-01', text: 'Over 900km blacktopped. Working on critical bridges in Karnali.' },
      { date: '2025-07', text: 'Budget allocation increased for remaining highly challenging vertical cliffs.' }
    ]
  },
  { id:9, name:'Postal Highway (Hulaki)', sector:'Roads', capacity:'1,027 km', budget:'USD 500M', spent:80, status:'construction', province:'Madhesh', district:'Multiple Terai', startYear:2015, endYear:2027, agency:'DoR', description:'Southern belt road improving Terai connectivity.',
    timeline: [
      { date: '2026-02', text: '800km+ blacktopped. Remaining segments delayed by land compensation issues.' },
      { date: '2025-01', text: 'Major bridge across Kamala river resumed post-redesign.' }
    ]
  },
  { id:10, name:'Kathmandu Ring Road Upgrade', sector:'Roads', capacity:'27 km', budget:'USD 210M', spent:85, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2020, endYear:2026, agency:'KUKL/DoR', description:'Widening Kathmandu Ring Road to 8 lanes total with service tracks.',
    timeline: [
      { date: '2026-03', text: 'Final northern stretch near Balaju nearing completion. Tree planting initiated.' },
      { date: '2025-09', text: 'Kalanki to Maharajgunj phase 2 structural widening completed.' }
    ]
  },

  // Airport & Aviation
  { id:11, name:'Nijgadh International Airport', sector:'Aviation', capacity:'15M passengers', budget:'USD 1.5B', spent:10, status:'planning', province:'Madhesh', district:'Bara', startYear:2026, endYear:2035, agency:'CAAN', description:'Second international airport to decongest TIA, heavily redesigned for ecological compliance.',
    timeline: [
      { date: '2026-03', text: 'Supreme Court approved revised ecological boundary. Core site prep beginning.' },
      { date: '2025-04', text: 'Redesign submitted reducing forest area consumption by 40%.' }
    ]
  },
  { id:12, name:'TIA Expansion Project', sector:'Aviation', capacity:'+8M capacity', budget:'USD 415M', spent:75, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2020, endYear:2026, agency:'CAAN', description:'New passenger terminal and apron expansion at Tribhuvan International Airport.',
    timeline: [
      { date: '2026-02', text: 'New international terminal roof closed. Interior boarding gates being fitted.' },
      { date: '2025-08', text: 'Apron expansion completed, adding 12 new parking bays.' }
    ]
  },

  // Water & Irrigation
  { id:13, name:'Melamchi Water Supply', sector:'Water Supply', capacity:'510 MLD', budget:'USD 500M', spent:98, status:'operating', province:'Bagmati', district:'Sindhupalchok', startYear:2000, endYear:2021, agency:'MWSDB', description:'Diversion of Melamchi river to Kathmandu valley water supply.',
    timeline: [
      { date: '2026-01', text: 'Stable supply maintained. Yangri and Larke rivers phase DPR updated.' },
      { date: '2024-10', text: 'Headworks permanently rebuilt and reinforced post-2021 floods.' }
    ]
  },
  { id:14, name:'Bheri Babai Diversion', sector:'Irrigation', capacity:'40 cumecs', budget:'USD 130M', spent:92, status:'construction', province:'Lumbini', district:'Surkhet/Dang', startYear:2015, endYear:2026, agency:'DoI', description:'Inter-basin water transfer from Karnali zone to Dang district.',
    timeline: [
      { date: '2026-03', text: 'Powerhouse structure 95% complete. Hydro-mechanical equipment testing.' },
      { date: '2025-02', text: 'Primary distribution canal civil works finished.' }
    ]
  },
  { id:15, name:'Sikta Irrigation Project', sector:'Irrigation', capacity:'121,500 ha', budget:'USD 200M', spent:78, status:'construction', province:'Lumbini', district:'Banke', startYear:2008, endYear:2027, agency:'DoI', description:'One of Nepal\'s largest irrigation canal systems in western Terai.',
    timeline: [
      { date: '2026-02', text: 'Western main canal operating. Eastern branch extension pushing towards 78%.' },
      { date: '2024-11', text: 'Repairs on previously eroded sections completed with new concrete formulation.' }
    ]
  },

  // Digital / IT
  { id:16, name:'Digital Nepal Framework', sector:'Digital', capacity:'8 domains', budget:'USD 250M', spent:45, status:'ongoing', province:'National', district:'National', startYear:2019, endYear:2028, agency:'MoICT', description:'National digital transformation across 8 service domains.',
    timeline: [
      { date: '2026-03', text: 'National ID linked to banking and taxation. Over 15M IDs issued.' },
      { date: '2025-07', text: 'Central e-Governance interoperability bus deployed.' }
    ]
  },
  { id:17, name:'National Broadband Policy', sector:'Digital', capacity:'100% target', budget:'USD 120M', spent:80, status:'ongoing', province:'National', district:'National', startYear:2021, endYear:2027, agency:'NTA', description:'Universal broadband access including rural Nepal.',
    timeline: [
      { date: '2026-01', text: 'Fiber reached 68 of 77 districts. Satellite backup for remote mountains active.' },
      { date: '2025-05', text: 'Completed backbone connectivity for all rural municipalities in Gandaki/Lumbini.' }
    ]
  },

  // Urban Development
  { id:18, name:'Smart Biratnagar Project', sector:'Urban', capacity:'10 smart zones', budget:'USD 45M', spent:65, status:'ongoing', province:'Province No. 1', district:'Morang', startYear:2022, endYear:2027, agency:'MoUD', description:'Smart city infrastructure for Biratnagar metropolitan.',
    timeline: [
      { date: '2026-02', text: 'Traffic AI grid active. Underground fiber and drain systems completed in zone 1-5.' },
      { date: '2024-09', text: 'Smart surveillance and unified control center went live.' }
    ]
  },
  { id:19, name:'Integrated Urban Resilience', sector:'Urban', capacity:'6 cities', budget:'USD 80M', spent:40, status:'ongoing', province:'National', district:'Multiple', startYear:2021, endYear:2028, agency:'MoUD/WB', description:'Earthquake resilience and climate adaptation for 6 cities.',
    timeline: [
      { date: '2026-03', text: 'Dharan and Pokhara flood-management infrastructure upgrades completed.' },
      { date: '2025-11', text: 'Kathmandu critical hospital retrofitting phase finalized.' }
    ]
  },

  // Government 100-Day Action Plan (Pratipakchya)
  { id:20, name:'100-Day Plan: Ministry Restructuring', sector:'Governance', capacity:'17 Ministries', budget:'Administrative', spent:15, status:'ongoing', province:'National', district:'Kathmandu', startYear:2026, endYear:2026, agency:'PMO', description:'Limit the number of federal ministries to 17 and amend work division regulations. (Commitment #008/#009)',
    timeline: [
      { date: '2026-10', text: 'Targeted completion within the first 100 days. Currently under cabinet review.' }
    ]
  },
  { id:21, name:'100-Day Plan: Anti-Corruption and Assets Probe', sector:'Governance', capacity:'National Audit', budget:'N/A', spent:5, status:'ongoing', province:'National', district:'National', startYear:2026, endYear:2026, agency:'CIAA/Gov', description:'Form empowered asset investigation committee and enforce zero-tolerance policy against corruption. (Commitment #043/#045)',
    timeline: [
      { date: '2026-10', text: 'Asset investigation committee framework in progress.' }
    ]
  },
  { id:22, name:'100-Day Plan: Digital Signature System', sector:'Digital', capacity:'Nationwide', budget:'TBD', spent:0, status:'planning', province:'National', district:'National', startYear:2026, endYear:2026, agency:'MoCIT', description:'Implement digital signature system via National ID Card/Biometric. (Commitment #033)',
    timeline: [
      { date: '2026-10', text: 'Technical feasibility and biometric integration study commenced.' }
    ]
  },
  { id:23, name:'100-Day Plan: Free Blue Bus for Women', sector:'Urban', capacity:'25 Buses', budget:'Subsidized', spent:0, status:'planning', province:'Bagmati', district:'Kathmandu Valley', startYear:2026, endYear:2026, agency:'MoPIT', description:'Introduce free Blue Bus service for women within the first 100 days. (Commitment #097)',
    timeline: [
      { date: '2026-10', text: 'Tendering process for 25 electronic blue buses planned.' }
    ]
  },
  { id:24, name:'100-Day Plan: PM Delivery Unit', sector:'Governance', capacity:'Executive Oversight', budget:'Administrative', spent:10, status:'ongoing', province:'National', district:'Kathmandu', startYear:2026, endYear:2026, agency:'PMO', description:'Establish a Prime Minister Delivery Unit immediately to ensure timely project execution. (Commitment #064)',
    timeline: [
      { date: '2026-10', text: 'Delivery unit formation and staffing process initiated.' }
    ]
  }
];
