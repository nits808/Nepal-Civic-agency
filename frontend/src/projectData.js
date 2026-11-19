
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
    try {
      return await fetchJson(`/api/rss?url=${encodeURIComponent(url)}`);
    } catch {
      throw err;
    }
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
  if (v.includes('stalled') || v.includes('delay') || v.includes('halt')) return 'stalled';
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

  const priority = pickValue(row, ['priority', 'classification']) || 'Standard';

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
    priority: String(priority).trim(),
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
    stalled: 0,
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
    if (p.status === 'stalled') totals.stalled += 1;

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
  // Hydro Energy
  { id:1, name:'Upper Tamakoshi Hydropower', sector:'Hydro Energy', priority:'National Pride', capacity:'456 MW', budget:'USD 1.6B', spent:100, status:'operating', province:'Bagmati', district:'Dolakha', startYear:2011, endYear:2021, agency:'NTDC', description:'Nepal\'s largest domestic hydropower plant, contributing significantly to electricity supply.',
    timeline: [
      { date: '2026-04', text: 'Resumed full generation after extensive repairs following late 2024 flood damage.' },
      { date: '2024-09', text: 'Production halted temporarily due to severe flood and landslide damage.' },
      { date: '2021-09', text: 'Plant fully operational.' }
    ]
  },
  { id:2, name:'Budhigandaki Hydropower', sector:'Hydro Energy', priority:'National Pride', capacity:'1200 MW', budget:'USD 2.5B', spent:25, status:'construction', province:'Bagmati', district:'Gorkha/Dhading', startYear:2019, endYear:2030, agency:'BKHPC', description:'Under-construction mega hydro project. Financial structure approved in early 2026.',
    timeline: [
      { date: '2026-03', text: 'Government approved financial investment structure (70:30 debt-to-equity).' },
      { date: '2025-11', text: 'Contractual disputes resolved; civil works resumed.' },
      { date: '2024-08', text: 'Land acquisition in primary zone finalized.' }
    ]
  },
  { id:3, name:'Arun III Hydropower', sector:'Hydro Energy', priority:'National Pride', capacity:'900 MW', budget:'USD 1.04B', spent:65, status:'construction', province:'Province No. 1', district:'Sankhuwasabha', startYear:2018, endYear:2027, agency:'SJVN', description:'India-Nepal joint hydropower project in eastern Nepal.',
    timeline: [
      { date: '2026-04', text: 'Substantial completion of dam, tunnel, and powerhouse structures.' },
      { date: '2026-02', text: 'Electromechanical equipment installation started at the powerhouse.' }
    ]
  },
  { id:25, name:'Upper Arun Hydropower', sector:'Hydro Energy', priority:'National Pride', capacity:'1,063 MW', budget:'USD 1.3B', spent:8, status:'construction', province:'Province No. 1', district:'Sankhuwasabha', startYear:2024, endYear:2032, agency:'NEA', description:'Semi-reservoir project advancing with a domestic investment model.',
    timeline: [
      { date: '2026-03', text: 'Pre-construction 21km access road development underway.' },
      { date: '2026-01', text: 'Financing structure finalized utilizing domestic banks and public shares.' }
    ]
  },
  { id:26, name:'Lower Arun Hydropower', sector:'Hydro Energy', priority:'Strategic', capacity:'669 MW', budget:'USD 900M', spent:2, status:'planning', province:'Province No. 1', district:'Sankhuwasabha', startYear:2026, endYear:2033, agency:'SJVN', description:'Downstream cascade project of Arun III.',
    timeline: [
      { date: '2026-04', text: 'Patel Engineering declared L1 bidder for major civil works.' }
    ]
  },

  // Transport & Roads
  { id:6, name:'Kathmandu-Terai Fast Track', sector:'Roads', priority:'National Pride', capacity:'72.5 km', budget:'USD 1.1B', spent:45, status:'construction', province:'Bagmati', district:'Lalitpur/Makwanpur', startYear:2017, endYear:2027, agency:'Nepal Army', description:'Expressway managed by Nepali Army. Deadline extended to mid-April 2027.',
    timeline: [
      { date: '2026-04', text: 'Physical progress reached 45%. Over 54% work remaining.' },
      { date: '2026-03', text: 'Breakthrough achieved on Lendanda and Dhedre major tunnels.' }
    ]
  },
  { id:8, name:'Mid-Hill Highway', sector:'Roads', priority:'National Pride', capacity:'1,776 km', budget:'USD 800M', spent:82, status:'construction', province:'National', district:'Multiple', startYear:2013, endYear:2027, agency:'DoR', description:'East-west highway connecting hilly districts.',
    timeline: [
      { date: '2026-04', text: 'Physical progress reported at 81.73%.' }
    ]
  },
  { id:9, name:'Postal Highway (Hulaki)', sector:'Roads', priority:'National Pride', capacity:'1,027 km', budget:'USD 500M', spent:74, status:'construction', province:'Madhesh', district:'Multiple Terai', startYear:2015, endYear:2027, agency:'DoR', description:'Southern belt road improving Terai connectivity.',
    timeline: [
      { date: '2026-04', text: 'Overall physical progress reported at 74.35%.' }
    ]
  },
  { id:7, name:'Nagdhunga Tunnel', sector:'Roads', priority:'Strategic', capacity:'2.68 km', budget:'USD 108M', spent:97, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2019, endYear:2026, agency:'DoR', description:'Twin-tube tunnel. Nearing full operational status.',
    timeline: [
      { date: '2026-05', text: 'Scheduled for trial operations in the second week of May.' },
      { date: '2026-04', text: 'Yusin-ART JV selected for tunnel management; toll rates published in Gazette.' }
    ]
  },
  { id:27, name:'East-West Railway', sector:'Rail', priority:'National Pride', capacity:'945 km', budget:'USD 3.8B', spent:5, status:'stalled', province:'National', district:'Multiple', startYear:2010, endYear:2040, agency:'DoRW', description:'Mega electric railway project facing massive financial and land acquisition hurdles.',
    timeline: [
      { date: '2026-04', text: 'Construction largely halted. Progress limited to Bardibas-Nijgadh section due to compensation disputes.' }
    ]
  },
  { id:36, name:'Kathmandu Valley Metro Rail', sector:'Rail', priority:'Strategic', capacity:'Valley-wide', budget:'TBD', spent:2, status:'planning', province:'Bagmati', district:'Kathmandu', startYear:2026, endYear:2035, agency:'DoRW/NPC', description:'Proposed metro rail system for Kathmandu Valley.',
    timeline: [
      { date: '2026-04', text: 'NPC proposed funding for detailed feasibility study in the upcoming budget.' }
    ]
  },

  // Aviation
  { id:11, name:'Nijgadh International Airport', sector:'Aviation', priority:'National Pride', capacity:'15M passengers', budget:'USD 1.5B', spent:5, status:'stalled', province:'Madhesh', district:'Bara', startYear:2015, endYear:2035, agency:'CAAN', description:'Proposed massive international airport. Effectively on hold due to environmental and legal challenges.',
    timeline: [
      { date: '2026-04', text: 'Project remains stalled following previous Supreme Court verdict halting construction.' }
    ]
  },
  { id:28, name:'Gautam Buddha Intl Airport', sector:'Aviation', priority:'National Pride', capacity:'2M passengers', budget:'USD 76M', spent:100, status:'operating', province:'Lumbini', district:'Rupandehi', startYear:2015, endYear:2022, agency:'CAAN', description:'Operational international airport in Bhairahawa.',
    timeline: [
      { date: '2026-01', text: 'Operating and serving international flights.' }
    ]
  },
  { id:29, name:'Pokhara Regional Intl Airport', sector:'Aviation', priority:'National Pride', capacity:'1M passengers', budget:'USD 305M', spent:100, status:'operating', province:'Gandaki', district:'Kaski', startYear:2016, endYear:2023, agency:'CAAN', description:'Operational regional international airport.',
    timeline: [
      { date: '2026-01', text: 'Operating and serving domestic and international flights.' }
    ]
  },

  // Water, Irrigation & Development
  { id:13, name:'Melamchi Water Supply Phase 1', sector:'Water Supply', priority:'National Pride', capacity:'170 MLD', budget:'USD 500M', spent:95, status:'operating', province:'Bagmati', district:'Sindhupalchok', startYear:2000, endYear:2021, agency:'MWSDB', description:'Key water supply project for Kathmandu. Faces seasonal closures due to flood risks.',
    timeline: [
      { date: '2026-04', text: 'Additional Rs 4.5 billion estimated to fully restore headworks for year-round operation.' },
      { date: '2025-07', text: 'Tunnel mouth closed during monsoon to prevent flood damage.' }
    ]
  },
  { id:14, name:'Bheri Babai Diversion', sector:'Irrigation', priority:'National Pride', capacity:'40 cumecs', budget:'USD 130M', spent:69, status:'construction', province:'Karnali', district:'Surkhet/Dang', startYear:2015, endYear:2027, agency:'DoI', description:'Inter-basin water transfer project. Experiencing significant delays.',
    timeline: [
      { date: '2026-04', text: 'Physical progress at 69%. Contractor requesting fourth deadline extension.' },
      { date: '2026-03', text: 'Discussions ongoing to potentially terminate current joint venture contract due to slow work.' }
    ]
  },
  { id:15, name:'Sikta Irrigation Project', sector:'Irrigation', priority:'National Pride', capacity:'42,766 ha', budget:'USD 200M', spent:46, status:'construction', province:'Lumbini', district:'Banke', startYear:2005, endYear:2028, agency:'DoI', description:'Massive irrigation network. Slow progress over two decades.',
    timeline: [
      { date: '2026-04', text: 'Progress at 46%. Currently providing irrigation to 24,000 hectares.' }
    ]
  },
  { id:30, name:'Sunkoshi Marin Diversion', sector:'Irrigation', priority:'National Pride', capacity:'122,000 ha', budget:'USD 350M', spent:15, status:'stalled', province:'Bagmati', district:'Sindhuli', startYear:2021, endYear:2028, agency:'DoI', description:'Major irrigation and hydropower diversion project. Civil works stalled.',
    timeline: [
      { date: '2026-04', text: 'Government preparing fresh tenders for headworks following Supreme Court clearance.' },
      { date: '2025-11', text: 'Contract with Patel-Raman JV terminated due to only 10% civil works completion.' },
      { date: '2024-05', text: 'Main 13.3 km tunnel successfully completed.' }
    ]
  },
  { id:31, name:'Rani Jamara Kulariya', sector:'Irrigation', priority:'National Pride', capacity:'38,300 ha', budget:'USD 180M', spent:72, status:'construction', province:'Sudurpashchim', district:'Kailali', startYear:2011, endYear:2027, agency:'DoI', description:'Modernization of farmer-managed irrigation systems.',
    timeline: [
      { date: '2026-02', text: 'Phase 3 underway to expand services to Bhajani, Joshipur, and Ghodaghodi.' },
      { date: '2025-06', text: 'Phase 2 completed, providing year-round irrigation to 14,300 hectares and 4.71 MW hydro power.' }
    ]
  },
  { id:32, name:'Lumbini Area Development', sector:'Heritage', priority:'National Pride', capacity:'Masterplan', budget:'USD 120M', spent:88, status:'construction', province:'Lumbini', district:'Rupandehi', startYear:1978, endYear:2026, agency:'LDT', description:'Development of the birthplace of Lord Buddha according to the Kenzo Tange masterplan.',
    timeline: [
      { date: '2026-04', text: 'High-performing project with approximately 88% physical progress.' }
    ]
  },
  { id:33, name:'Pashupati Area Development', sector:'Heritage', priority:'National Pride', capacity:'Masterplan', budget:'USD 95M', spent:82, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2000, endYear:2027, agency:'PADT', description:'Conservation and development of the holy Pashupatinath area.',
    timeline: [
      { date: '2026-04', text: 'Progress reported to be over 80% complete.' }
    ]
  },

  // Urban & IT
  { id:16, name:'Digital Nepal Framework', sector:'Digital', priority:'Strategic', capacity:'8 domains', budget:'USD 250M', spent:45, status:'ongoing', province:'National', district:'National', startYear:2019, endYear:2028, agency:'MoCIT', description:'National digital transformation across 8 service domains.',
    timeline: [
      { date: '2026-03', text: 'National ID linked to banking and taxation. Over 15M IDs issued.' }
    ]
  },

  // Governance & Policy
  { id:20, name:'100-Day Plan: Ministry Restructuring', sector:'Governance', priority:'Standard', capacity:'17 Ministries', budget:'Administrative', spent:15, status:'ongoing', province:'National', district:'Kathmandu', startYear:2026, endYear:2026, agency:'PMO', description:'Limit the number of federal ministries to 17 and amend work division regulations.',
    timeline: [
      { date: '2026-04', text: 'Targeted completion within the first 100 days. Currently under cabinet review.' }
    ]
  },
  { id:21, name:'100-Day Plan: Anti-Corruption and Assets Probe', sector:'Governance', priority:'Standard', capacity:'National Audit', budget:'N/A', spent:5, status:'ongoing', province:'National', district:'National', startYear:2026, endYear:2026, agency:'CIAA/Gov', description:'Form empowered asset investigation committee and enforce zero-tolerance policy against corruption.',
    timeline: [
      { date: '2026-04', text: 'Asset investigation committee framework in progress.' }
    ]
  }
];
