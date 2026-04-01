import React, { useEffect, useState } from 'react';
import {
  SEED_PROJECTS,
  PROJECT_SOURCE_REGISTRY,
  fetchProjectsFromSources,
  computeProjectStats,
  mergeProjects,
} from './projectData.js';

const STATUSES = ['all','operating','construction','planning','ongoing'];

const STATUS_META = {
  operating:    { label:'Operating',    color:'#059669', bg:'rgba(5,150,105,0.08)' },
  construction: { label:'Under Construction', color:'#d97706', bg:'rgba(217,119,6,0.08)' },
  planning:     { label:'Planning',     color:'#1a6aff', bg:'rgba(26,106,255,0.08)' },
  ongoing:      { label:'Ongoing',      color:'#7c3aed', bg:'rgba(124,58,237,0.08)' },
};

export function ProjectsPage() {
  const [projects, setProjects] = useState(SEED_PROJECTS);
  const [sourcesUsed, setSourcesUsed] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [sector,   setSector]   = useState('all');
  const [status,   setStatus]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { projects: liveProjects, sourcesUsed: used } = await fetchProjectsFromSources();
        if (!active) return;
        if (Array.isArray(liveProjects) && liveProjects.length) {
          setProjects(mergeProjects(SEED_PROJECTS, liveProjects));
          setSourcesUsed(used || []);
        }
      } catch {
        // keep seed data
      } finally {
        if (!active) return;
        setLastSync(new Date());
        setLoadingProjects(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const sectors = [...new Set(projects.map(p => p.sector).filter(Boolean))];
  const stats = computeProjectStats(projects);

  const formatTotal = (value, currency) => {
    if (!Number.isFinite(value) || value <= 0) return 'TBD';
    const label = currency ? `${currency} ` : '';
    return `${label}${(value / 1_000_000_000).toFixed(1)}B+`;
  };

  const budgetPrimary = stats.budgetUsd > 0
    ? formatTotal(stats.budgetUsd, 'USD')
    : formatTotal(stats.budgetNpr, 'NPR');
  const budgetSecondary = stats.budgetUsd > 0 && stats.budgetNpr > 0
    ? formatTotal(stats.budgetNpr, 'NPR')
    : null;

  const hydroPipeline = stats.hydroMw > 0 ? `${Math.round(stats.hydroMw).toLocaleString()} MW` : 'TBD';
  const roadsUnderway = stats.roadKm > 0 ? `${Math.round(stats.roadKm).toLocaleString()} km` : 'TBD';

  const filtered = projects.filter(p => {
    const matchSector = sector === 'all' || p.sector === sector;
    const matchStatus = status === 'all' || p.status === status;
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.district.toLowerCase().includes(search.toLowerCase()) ||
      p.province.toLowerCase().includes(search.toLowerCase());
    return matchSector && matchStatus && matchSearch;
  });

  const operating    = stats.operating;
  const underConst   = stats.construction;

  return (
    <div className="page">
      <div className="page-title">ðŸ—ï¸ Nepal National Projects Tracker</div>
      <div style={{ fontSize:'0.72rem', color:'var(--text-4)', marginTop:4 }}>
        Sources: {PROJECT_SOURCE_REGISTRY.length} â€¢ Live sync: {sourcesUsed.length || 0} â€¢{' '}
        {loadingProjects ? 'syncing nowâ€¦' : `Last sync ${lastSync ? lastSync.toLocaleString() : 'recently'}`}
      </div>

      {/* Summary stats */}
      <div className="stats-row">
        <div className="stat-card" style={{ borderTopColor:'#1a6aff' }}>
          <div className="stat-icon">ðŸ“‹</div>
          <div className="stat-val">{stats.total}</div>
          <div className="stat-lbl">Total Projects</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#059669' }}>
          <div className="stat-icon">âœ…</div>
          <div className="stat-val">{operating}</div>
          <div className="stat-lbl">Operational</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#d97706' }}>
          <div className="stat-icon">ðŸ”¨</div>
          <div className="stat-val">{underConst}</div>
          <div className="stat-lbl">Under Construction</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#DC143C' }}>
          <div className="stat-icon">ðŸ’µ</div>
          <div className="stat-val">{budgetPrimary}</div>
          <div className="stat-lbl">Total Investment</div>
          {budgetSecondary && (
            <div style={{ fontSize:'0.62rem', color:'var(--text-4)', marginTop:2 }}>
              {budgetSecondary} tracked
            </div>
          )}
        </div>
        <div className="stat-card" style={{ borderTopColor:'#7c3aed' }}>
          <div className="stat-icon">âš¡</div>
          <div className="stat-val">{hydroPipeline}</div>
          <div className="stat-lbl">Hydro Pipeline</div>
        </div>
        <div className="stat-card" style={{ borderTopColor:'#0891b2' }}>
          <div className="stat-icon">ðŸ›£ï¸</div>
          <div className="stat-val">{roadsUnderway}</div>
          <div className="stat-lbl">Roads Underway</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input className="search-input" style={{ maxWidth:280, marginBottom:0 }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ðŸ” Search projects, districts, provincesâ€¦"/>

          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {['all',...sectors].map(s => (
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
      <div className="projects-grid">
        {filtered.map(proj => {
          const sm     = STATUS_META[proj.status];
          const isOpen = selected === proj.id;
          const timeline = Array.isArray(proj.timeline) ? proj.timeline : [];

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
                      â— {sm.label}
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
                <span>ðŸ“ {proj.district}</span>
                <span>ðŸ› {proj.agency}</span>
                <span>ðŸ“… {proj.startYear}â€“{proj.endYear}</span>
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
                  {proj.source && (
                    <div style={{ fontSize:'0.68rem', color:'var(--text-4)', marginBottom:8 }}>
                      Source: {proj.source}
                    </div>
                  )}
                  <div style={{
                    padding:'10px 12px', background:sm.bg,
                    borderRadius:8, borderLeft:`3px solid ${sm.color}`,
                    fontSize:'0.75rem', color:'var(--text-2)', lineHeight:1.7,
                  }}>
                    <strong style={{ color:sm.color, marginBottom:6, display:'block' }}>ðŸ“… Progress Timeline:</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {timeline.length ? timeline.map((event, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-3)', fontSize: '0.65rem', padding: '1px 4px', background: 'var(--bg-surface)', borderRadius: 4, flexShrink: 0 }}>
                              {event.date}
                            </span>
                            <span style={{ color: idx === 0 ? 'var(--text-1)' : 'var(--text-3)', fontWeight: idx === 0 ? 600 : 400 }}>
                              {event.text}
                            </span>
                          </div>
                        )) : (
                          <div style={{ fontSize:'0.68rem', color:'var(--text-4)' }}>
                            No timeline updates yet.
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize:'0.65rem', color:'var(--text-4)', marginTop:8, textAlign:'right' }}>
                {isOpen ? 'â–² Less' : 'â–¼ More details'}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-4)' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>ðŸ”</div>
          <div style={{ fontWeight:600 }}>No projects match your filter</div>
          <div style={{ fontSize:'0.8rem', marginTop:4 }}>Try clearing filters</div>
        </div>
      )}
    </div>
  );
}
