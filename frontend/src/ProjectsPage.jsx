import React, { useState } from 'react';

const PROJECTS = [
  // Infrastructure / Hydro
  { id:1, name:'Upper Tamakoshi Hydropower', sector:'Hydro Energy', capacity:'456 MW', budget:'$1.6B', spent:100, status:'operating', province:'Bagmati', district:'Dolakha', startYear:2011, endYear:2021, agency:'NTDC', description:'Nepal\'s largest domestic hydropower plant, contributing significantly to electricity supply.', 
    timeline: [
      { date: '2026-01', text: 'Sustained full capacity generation during dry season using optimized reservoir management.' },
      { date: '2024-05', text: 'Completed minor post-construction structural reviews.' },
      { date: '2021-09', text: 'Plant fully operational.' }
    ] 
  },
  { id:2, name:'Budhigandaki Hydropower', sector:'Hydro Energy', capacity:'1200 MW', budget:'$2.5B', spent:25, status:'construction', province:'Bagmati', district:'Gorkha/Dhading', startYear:2019, endYear:2030, agency:'BKHPC', description:'Under-construction mega hydro project to address Nepal\'s energy deficit.', 
    timeline: [
      { date: '2026-03', text: 'Tunnel boring advancing steadily. Resettlement compensation 85% complete.' },
      { date: '2025-11', text: 'Contractual disputes resolved; civil works resumed.' },
      { date: '2024-08', text: 'Land acquisition in primary zone finalized.' }
    ] 
  },
  { id:3, name:'Arun III Hydropower', sector:'Hydro Energy', capacity:'900 MW', budget:'$1.04B', spent:65, status:'construction', province:'Province No. 1', district:'Sankhuwasabha', startYear:2018, endYear:2027, agency:'SJVN', description:'India-Nepal joint hydropower project in eastern Nepal. Delayed from 2025 target.', 
    timeline: [
      { date: '2026-02', text: 'Electromechanical equipment installation started at the powerhouse.' },
      { date: '2025-06', text: 'Civil works crossed 60% completion. Dam construction delayed by monsoons.' },
      { date: '2024-12', text: 'Power house excavation completed.' }
    ] 
  },
  { id:4, name:'West Seti Hydropower', sector:'Hydro Energy', capacity:'750 MW', budget:'$1.2B', spent:12, status:'planning', province:'Sudurpashchim', district:'Doti/Achham', startYear:2025, endYear:2032, agency:'NHPC', description:'Major export-oriented hydro project in far-western Nepal.', 
    timeline: [
      { date: '2026-01', text: 'Finalizing PPA (Power Purchase Agreement) terms with regional buyers.' },
      { date: '2025-09', text: 'DPR finalized and environmental clearance secured.' }
    ] 
  },
  { id:5, name:'Trishuli-3A Hydropower', sector:'Hydro Energy', capacity:'60 MW', budget:'$160M', spent:100, status:'operating', province:'Bagmati', district:'Nuwakot', startYear:2012, endYear:2017, agency:'NEA', description:'Run-of-river project serving central grid.', 
    timeline: [
      { date: '2026-03', text: 'Routine decadal maintenance and silt clearance underway.' },
      { date: '2017-08', text: 'Fully operational.' }
    ] 
  },

  // Road & Transport
  { id:6, name:'Kathmandu-Terai Fast Track', sector:'Roads', capacity:'72.5 km', budget:'$1.1B', spent:65, status:'construction', province:'Bagmati', district:'Chitwan/Lalitpur', startYear:2017, endYear:2028, agency:'Nepal Army', description:'Expressway cutting travel from Kathmandu to Terai from 4.5h to 1.5h. Target shifted to 2028.', 
    timeline: [
      { date: '2026-03', text: 'Mahadevtar twin tunnels officially pierced. 65% total physical progress.' },
      { date: '2025-10', text: 'High bridges construction ongoing over difficult terrain.' },
      { date: '2024-05', text: 'Tunnel boring and sub-grade preparation across 5 sections.' }
    ] 
  },
  { id:7, name:'Nagdhunga Tunnel', sector:'Roads', capacity:'2.68 km', budget:'$108M', spent:95, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2019, endYear:2026, agency:'DoR', description:'Twin-tube tunnel to ease Kathmandu valley congestion westward.', 
    timeline: [
      { date: '2026-02', text: 'Trial runs successful. Final safety audits and ventilation checks ongoing.' },
      { date: '2025-08', text: 'Lighting, asphalt, and emergency extraction systems installed.' },
      { date: '2024-04', text: 'Main tunnel breakthrough achieved.' }
    ] 
  },
  { id:8, name:'Mid-Hill Highway', sector:'Roads', capacity:'1,776 km', budget:'$800M', spent:52, status:'construction', province:'National', district:'Multiple', startYear:2013, endYear:2029, agency:'DoR', description:'East-west highway connecting hilly districts.', 
    timeline: [
      { date: '2026-01', text: 'Over 900km blacktopped. Working on critical bridges in Karnali.' },
      { date: '2025-07', text: 'Budget allocation increased for remaining highly challenging vertical cliffs.' }
    ] 
  },
  { id:9, name:'Postal Highway (Hulaki)', sector:'Roads', capacity:'1,027 km', budget:'$500M', spent:80, status:'construction', province:'Madhesh', district:'Multiple Terai', startYear:2015, endYear:2027, agency:'DoR', description:'Southern belt road improving Terai connectivity.', 
    timeline: [
      { date: '2026-02', text: '800km+ blacktopped. Remaining segments delayed by land compensation issues.' },
      { date: '2025-01', text: 'Major bridge across Kamala river resumed post-redesign.' }
    ] 
  },
  { id:10, name:'Kathmandu Ring Road Upgrade', sector:'Roads', capacity:'27 km', budget:'$210M', spent:85, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2020, endYear:2026, agency:'KUKL/DoR', description:'Widening Kathmandu Ring Road to 8 lanes total with service tracks.', 
    timeline: [
      { date: '2026-03', text: 'Final northern stretch near Balaju nearing completion. Tree planting initiated.' },
      { date: '2025-09', text: 'Kalanki to Maharajgunj phase 2 structural widening completed.' }
    ] 
  },

  // Airport & Aviation
  { id:11, name:'Nijgadh International Airport', sector:'Aviation', capacity:'15M passengers', budget:'$1.5B', spent:10, status:'planning', province:'Madhesh', district:'Bara', startYear:2026, endYear:2035, agency:'CAAN', description:'Second international airport to decongest TIA, heavily redesigned for ecological compliance.', 
    timeline: [
      { date: '2026-03', text: 'Supreme Court approved revised ecological boundary. Core site prep beginning.' },
      { date: '2025-04', text: 'Redesign submitted reducing forest area consumption by 40%.' }
    ] 
  },
  { id:12, name:'TIA Expansion Project', sector:'Aviation', capacity:'+8M capacity', budget:'$415M', spent:75, status:'construction', province:'Bagmati', district:'Kathmandu', startYear:2020, endYear:2026, agency:'CAAN', description:'New passenger terminal and apron expansion at Tribhuvan International Airport.', 
    timeline: [
      { date: '2026-02', text: 'New international terminal roof closed. Interior boarding gates being fitted.' },
      { date: '2025-08', text: 'Apron expansion completed, adding 12 new parking bays.' }
    ] 
  },

  // Water & Irrigation
  { id:13, name:'Melamchi Water Supply', sector:'Water Supply', capacity:'510 MLD', budget:'$500M', spent:98, status:'operating', province:'Bagmati', district:'Sindhupalchok', startYear:2000, endYear:2021, agency:'MWSDB', description:'Diversion of Melamchi river to Kathmandu valley water supply.', 
    timeline: [
      { date: '2026-01', text: 'Stable supply maintained. Yangri and Larke rivers phase DPR updated.' },
      { date: '2024-10', text: 'Headworks permanently rebuilt and reinforced post-2021 floods.' }
    ] 
  },
  { id:14, name:'Bheri Babai Diversion', sector:'Irrigation', capacity:'40 cumecs', budget:'$130M', spent:92, status:'construction', province:'Lumbini', district:'Surkhet/Dang', startYear:2015, endYear:2026, agency:'DoI', description:'Inter-basin water transfer from Karnali zone to Dang district.', 
    timeline: [
      { date: '2026-03', text: 'Powerhouse structure 95% complete. Hydro-mechanical equipment testing.' },
      { date: '2025-02', text: 'Primary distribution canal civil works finished.' }
    ] 
  },
  { id:15, name:'Sikta Irrigation Project', sector:'Irrigation', capacity:'121,500 ha', budget:'$200M', spent:78, status:'construction', province:'Lumbini', district:'Banke', startYear:2008, endYear:2027, agency:'DoI', description:'One of Nepal\'s largest irrigation canal systems in western Terai.', 
    timeline: [
      { date: '2026-02', text: 'Western main canal operating. Eastern branch extension pushing towards 78%.' },
      { date: '2024-11', text: 'Repairs on previously eroded sections completed with new concrete formulation.' }
    ] 
  },

  // Digital / IT
  { id:16, name:'Digital Nepal Framework', sector:'Digital', capacity:'8 domains', budget:'$250M', spent:45, status:'ongoing', province:'National', district:'National', startYear:2019, endYear:2028, agency:'MoICT', description:'National digital transformation across 8 service domains.', 
    timeline: [
      { date: '2026-03', text: 'National ID linked to banking & taxation. Over 15M IDs issued.' },
      { date: '2025-07', text: 'Central e-Governance interoperability bus deployed.' }
    ] 
  },
  { id:17, name:'National Broadband Policy', sector:'Digital', capacity:'100% target', budget:'$120M', spent:80, status:'ongoing', province:'National', district:'National', startYear:2021, endYear:2027, agency:'NTA', description:'Universal broadband access including rural Nepal.', 
    timeline: [
      { date: '2026-01', text: 'Fiber reached 68 of 77 districts. Satellite backup for remote mountains active.' },
      { date: '2025-05', text: 'Completed backbone connectivity for all rural municipalities in Gandaki/Lumbini.' }
    ] 
  },

  // Urban Development
  { id:18, name:'Smart Biratnagar Project', sector:'Urban', capacity:'10 smart zones', budget:'$45M', spent:65, status:'ongoing', province:'Province No. 1', district:'Morang', startYear:2022, endYear:2027, agency:'MoUD', description:'Smart city infrastructure for Biratnagar metropolitan.', 
    timeline: [
      { date: '2026-02', text: 'Traffic AI grid active. Underground fiber and drain systems completed in zone 1-5.' },
      { date: '2024-09', text: 'Smart surveillance and unified control center went live.' }
    ] 
  },
  { id:19, name:'Integrated Urban Resilience', sector:'Urban', capacity:'6 cities', budget:'$80M', spent:40, status:'ongoing', province:'National', district:'Multiple', startYear:2021, endYear:2028, agency:'MoUD/WB', description:'Earthquake resilience and climate adaptation for 6 cities.', 
    timeline: [
      { date: '2026-03', text: 'Dharan & Pokhara flood-management infrastructure upgrades completed.' },
      { date: '2025-11', text: 'Kathmandu critical hospital retrofitting phase finalized.' }
    ] 
  },

  // Government 100-Day Action Plan (Pratipakchya)
  { id:20, name:'100-Day Plan: Ministry Restructuring', sector:'Governance', capacity:'17 Ministries', budget:'Administrative', spent:15, status:'ongoing', province:'National', district:'Kathmandu', startYear:2026, endYear:2026, agency:'PMO', description:'Limit the number of federal ministries to 17 and amend work division regulations. (Commitment #008/#009)', 
    timeline: [
      { date: '2026-10', text: 'Targeted completion within the first 100 days. Currently under cabinet review.' }
    ] 
  },
  { id:21, name:'100-Day Plan: Anti-Corruption & Assets Probe', sector:'Governance', capacity:'National Audit', budget:'N/A', spent:5, status:'ongoing', province:'National', district:'National', startYear:2026, endYear:2026, agency:'CIAA/Gov', description:'Form empowered asset investigation committee and enforce zero-tolerance policy against corruption. (Commitment #043/#045)', 
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

const SECTORS  = [...new Set(PROJECTS.map(p => p.sector))];
const STATUSES = ['all','operating','construction','planning','ongoing'];

const STATUS_META = {
  operating:    { label:'Operating',    color:'#059669', bg:'rgba(5,150,105,0.08)' },
  construction: { label:'Under Construction', color:'#d97706', bg:'rgba(217,119,6,0.08)' },
  planning:     { label:'Planning',     color:'#1a6aff', bg:'rgba(26,106,255,0.08)' },
  ongoing:      { label:'Ongoing',      color:'#7c3aed', bg:'rgba(124,58,237,0.08)' },
};

export function ProjectsPage() {
  const [sector,   setSector]   = useState('all');
  const [status,   setStatus]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = PROJECTS.filter(p => {
    const matchSector = sector === 'all' || p.sector === sector;
    const matchStatus = status === 'all' || p.status === status;
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.district.toLowerCase().includes(search.toLowerCase()) ||
      p.province.toLowerCase().includes(search.toLowerCase());
    return matchSector && matchStatus && matchSearch;
  });

  const totalBudget  = PROJECTS.reduce((s,p) => s + parseFloat(p.budget.replace(/[^0-9.]/g,'')), 0);
  const operating    = PROJECTS.filter(p => p.status === 'operating').length;
  const underConst   = PROJECTS.filter(p => p.status === 'construction').length;

  return (
    <div className="page">
      <div className="page-title">🏗️ Nepal National Projects Tracker</div>

      {/* Summary stats */}
      <div className="stats-row">
        <div className="stat-card" style={{ borderTopColor:'#1a6aff' }}>
          <div className="stat-icon">📋</div>
          <div className="stat-val">{PROJECTS.length}</div>
          <div className="stat-lbl">Total Projects</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#059669' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-val">{operating}</div>
          <div className="stat-lbl">Operational</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#d97706' }}>
          <div className="stat-icon">🔨</div>
          <div className="stat-val">{underConst}</div>
          <div className="stat-lbl">Under Construction</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#DC143C' }}>
          <div className="stat-icon">💵</div>
          <div className="stat-val">${totalBudget.toFixed(1)}B+</div>
          <div className="stat-lbl">Total Investment</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#7c3aed' }}>
          <div className="stat-icon">⚡</div>
          <div className="stat-val">3,366 MW</div>
          <div className="stat-lbl">Hydro Pipeline</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#0891b2' }}>
          <div className="stat-icon">🛣️</div>
          <div className="stat-val">2,800+ km</div>
          <div className="stat-lbl">Roads Underway</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input className="search-input" style={{ maxWidth:280, marginBottom:0 }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search projects, districts, provinces…"/>

          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['all',...SECTORS].map(s => (
              <button key={s} className={`chip ${sector===s?'on':''}`}
                onClick={() => setSector(s)}
                style={{ fontSize:'0.68rem', padding:'4px 10px' }}>
                {s === 'all' ? 'All Sectors' : s}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', gap:5 }}>
            {STATUSES.map(st => (
              <button key={st} className={`chip ${status===st?'on':''}`}
                onClick={() => setStatus(st)}
                style={{
                  fontSize:'0.68rem', padding:'4px 10px',
                  ...(status===st && st !== 'all'
                    ? { background: STATUS_META[st]?.bg, color: STATUS_META[st]?.color, borderColor: STATUS_META[st]?.color + '55' }
                    : {}
                  )
                }}>
                {st === 'all' ? 'All Status' : STATUS_META[st]?.label || st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px,1fr))', gap:14 }}>
        {filtered.map(proj => {
          const sm     = STATUS_META[proj.status];
          const isOpen = selected === proj.id;

          return (
            <div key={proj.id} className="card"
              style={{ borderTop:`3px solid ${sm.color}`, cursor:'pointer', transition:'all 0.2s' }}
              onClick={() => setSelected(isOpen ? null : proj.id)}>

              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0, paddingRight:8 }}>
                  <div style={{ fontWeight:800, fontSize:'0.85rem', color:'var(--text-1)', lineHeight:1.4, marginBottom:4 }}>
                    {proj.name}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:8,
                      background:sm.bg, color:sm.color, border:`1px solid ${sm.color}30` }}>
                      ● {sm.label}
                    </span>
                    <span style={{ fontSize:'0.62rem', color:'var(--text-4)', padding:'2px 6px',
                      background:'var(--bg-raised)', borderRadius:6, border:'1px solid var(--border)' }}>
                      {proj.sector}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:900, fontSize:'1rem', color:'var(--crimson)' }}>{proj.budget}</div>
                  <div style={{ fontSize:'0.6rem', color:'var(--text-4)' }}>Budget</div>
                </div>
              </div>

              {/* Details row */}
              <div style={{ display:'flex', gap:16, fontSize:'0.7rem', color:'var(--text-3)', marginBottom:10 }}>
                <span>📍 {proj.district}</span>
                <span>🏛 {proj.agency}</span>
                <span>📅 {proj.startYear}–{proj.endYear}</span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', marginBottom:4 }}>
                  <span style={{ color:'var(--text-3)' }}>Progress</span>
                  <span style={{ fontWeight:800, color:sm.color }}>{proj.spent}%</span>
                </div>
                <div style={{ height:7, background:'var(--bg-raised)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:4, transition:'width 1.2s',
                    width:`${proj.spent}%`,
                    background: proj.spent >= 90 ? '#059669'
                               : proj.spent >= 50 ? sm.color
                               : `linear-gradient(90deg,${sm.color},${sm.color}99)`,
                  }}/>
                </div>
              </div>

              {/* Capacity */}
              <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginBottom: isOpen ? 10 : 0 }}>
                <strong style={{ color:'var(--text-2)' }}>Capacity:</strong> {proj.capacity} &nbsp;|&nbsp;
                <strong style={{ color:'var(--text-2)' }}>Province:</strong> {proj.province.replace('Province No. ','P')}
              </div>

              {/* Expanded view */}
              {isOpen && (
                <div style={{
                  marginTop:10, paddingTop:10,
                  borderTop:'1px solid var(--border)',
                  animation: 'msgIn 0.2s ease',
                }}>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-2)', lineHeight:1.7, marginBottom:8 }}>
                    {proj.description}
                  </div>
                  <div style={{
                    padding:'10px 12px', background:sm.bg,
                    borderRadius:8, borderLeft:`3px solid ${sm.color}`,
                    fontSize:'0.75rem', color:'var(--text-2)', lineHeight:1.7,
                  }}>
                    <strong style={{ color:sm.color, marginBottom:6, display:'block' }}>📅 Progress Timeline:</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {proj.timeline.map((event, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-3)', fontSize: '0.65rem', padding: '1px 4px', background: 'var(--bg-surface)', borderRadius: 4, flexShrink: 0 }}>
                            {event.date}
                          </span>
                          <span style={{ color: idx === 0 ? 'var(--text-1)' : 'var(--text-3)', fontWeight: idx === 0 ? 600 : 400 }}>
                            {event.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize:'0.65rem', color:'var(--text-4)', marginTop:8, textAlign:'right' }}>
                {isOpen ? '▲ Less' : '▼ More details'}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-4)' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>🔍</div>
          <div style={{ fontWeight:600 }}>No projects match your filter</div>
          <div style={{ fontSize:'0.8rem', marginTop:4 }}>Try clearing filters</div>
        </div>
      )}
    </div>
  );
}
