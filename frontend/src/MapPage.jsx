import React, { useMemo, useRef, useState } from 'react';
import { PROVINCES, CAT_COLORS, CAT_ICONS } from './data.js';
import {
  NEPAL_MAP_VIEWBOX,
  NEPAL_PROVINCE_PATHS,
  NEPAL_PROVINCE_CENTROIDS,
} from './nepalMapPaths.js';

export function MapPage({ articles }) {
  const [selected, setSelected]   = useState(null);
  const [catFilter, setCatFilter] = useState('all');
  const [hovering, setHovering]   = useState(null);
  const [viewMode, setViewMode]   = useState('volume');
  const [hoverInfo, setHoverInfo] = useState(null);
  const mapRef = useRef(null);

  const provStats = useMemo(() => {
    const stats = {};
    PROVINCES.forEach(p => {
      stats[p.name] = { total: 0, byCategory: {}, topCategory: null, latest: null };
    });
    articles.forEach(a => {
      const prov = a.province || 'Unknown';
      if (!stats[prov]) stats[prov] = { total: 0, byCategory: {}, topCategory: null, latest: null };
      stats[prov].total += 1;
      const cat = a.category || 'other';
      stats[prov].byCategory[cat] = (stats[prov].byCategory[cat] || 0) + 1;
      const date = a.date ? new Date(a.date) : null;
      if (date && (!stats[prov].latest || date > stats[prov].latest)) stats[prov].latest = date;
    });
    Object.values(stats).forEach((s) => {
      const top = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1])[0];
      s.topCategory = top ? top[0] : null;
    });
    return stats;
  }, [articles]);

  const maxCount = Math.max(...Object.values(provStats).map(s => s.total), 1);

  const selectedArticles = useMemo(() => {
    if (!selected) return [];
    return articles
      .filter(a => a.province === selected.name && (catFilter==='all' || a.category===catFilter))
      .slice(0, 20);
  }, [articles, selected, catFilter]);

  const cats = ['all', ...Object.keys(CAT_ICONS).filter(c => c !== 'all')];

  const withAlpha = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return hex;
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2,'0');
    return `${hex}${a}`;
  };

  const updateHover = (evt, prov) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const stats = provStats[prov.name] || { total: 0, byCategory: {}, topCategory: null };
    setHoverInfo({
      name: prov.name,
      count: stats.total,
      topCategory: stats.topCategory,
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
      latest: stats.latest,
    });
  };

  return (
    <div className="page">
      <div className="page-title">🗺️ Nepal Interactive Province Map</div>

      <div className="map-layout">

        {/* ── SVG Map panel ───────────────────────────────────────── */}
        <div className="map-panel">

          {/* Category filter bar */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'10px 14px',
            borderBottom:'1px solid var(--border)', background:'var(--bg-raised)', flexShrink:0 }}>
            {cats.map(c => (
              <button key={c} className={`chip ${catFilter===c?'on':''}`}
                onClick={() => setCatFilter(c)}
                style={{ fontSize:'0.68rem', padding:'3px 10px' }}>
                {c === 'all' ? 'All Categories' : `${CAT_ICONS[c]||''} ${c}`}
              </button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
              {['volume','dominant'].map(m => (
                <button key={m} className={`chip ${viewMode===m?'on':''}`}
                  onClick={() => setViewMode(m)}
                  style={{ fontSize:'0.65rem', padding:'3px 9px' }}>
                  {m === 'volume' ? 'Heatmap' : 'Dominant Category'}
                </button>
              ))}
            </div>
          </div>

          {/* SVG fills remaining space */}
          <div ref={mapRef} className="map-canvas">
            <svg width="100%" height="100%" viewBox={NEPAL_MAP_VIEWBOX} preserveAspectRatio="xMidYMid meet"
              style={{ background:'linear-gradient(160deg,#eef3ff 0%,#f5f8ff 100%)', display:'block' }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0,56,147,0.05)" strokeWidth="0.5"/>
                </pattern>
                <linearGradient id="nepalFlag" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#DC143C" stopOpacity="0.08"/>
                  <stop offset="100%" stopColor="#003893" stopOpacity="0.05"/>
                </linearGradient>
              </defs>

              {/* Background */}
              <rect width="820" height="320" fill="url(#grid)"/>
              <rect width="820" height="320" fill="url(#nepalFlag)"/>

              {/* Himalayan range hint (top decorative) */}
              <path d="M 0,52 L 60,38 L 120,46 L 200,32 L 280,42 L 360,28 L 440,36 L 520,26 L 600,34 L 680,24 L 760,32 L 820,28 L 820,0 L 0,0 Z"
                fill="rgba(200,220,255,0.35)"/>
              <text x="410" y="14" textAnchor="middle" fill="rgba(0,56,147,0.35)"
                fontSize="7" fontFamily="Inter,sans-serif" fontWeight="600" letterSpacing="3">
                ❄ HIMALAYAN RANGE ❄
              </text>

              {/* Terai hint (bottom) */}
              <path d="M 0,288 L 820,288 L 820,320 L 0,320 Z" fill="rgba(0,180,100,0.06)"/>
              <text x="410" y="308" textAnchor="middle" fill="rgba(0,120,60,0.4)"
                fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="2">TERAI PLAINS</text>

              {/* Province shapes */}
              {PROVINCES.map(prov => {
                const stats      = provStats[prov.name] || { total: 0, topCategory: null };
                const count      = stats.total || 0;
                const intensity  = count / maxCount;
                const isSelected = selected?.name === prov.name;
                const isHover    = hovering === prov.name;
                const c          = NEPAL_PROVINCE_CENTROIDS[prov.name];
                const lp         = c ? { x: c.x, y: c.y, nx: c.x, ny: c.y } : { x: 410, y: 160, nx: 410, ny: 160 };
                const pathD      = NEPAL_PROVINCE_PATHS[prov.name];
                const dominant   = stats.topCategory;
                const dominantColor = CAT_COLORS[dominant] || prov.color;
                const baseFill   = viewMode === 'dominant'
                  ? withAlpha(dominantColor, 0.18 + intensity * 0.65)
                  : withAlpha(prov.fill, 0.4 + intensity * 0.5);

                return (
                  <g key={prov.code} style={{ cursor:'pointer' }}
                    onClick={() => setSelected(isSelected ? null : prov)}
                    onMouseEnter={(e) => { setHovering(prov.name); updateHover(e, prov); }}
                    onMouseMove={(e) => updateHover(e, prov)}
                    onMouseLeave={() => { setHovering(null); setHoverInfo(null); }}>

                    {/* Province fill */}
                    <path
                      d={pathD}
                      fill={isSelected
                        ? prov.color + 'cc'
                        : isHover
                          ? prov.color + '88'
                          : baseFill}
                      stroke={isSelected || isHover ? prov.color : withAlpha(prov.color, 0.5)}
                      strokeWidth={isSelected ? 2 : isHover ? 1.5 : 0.8}
                      filter={isSelected ? 'url(#glow)' : undefined}
                      style={{ transition:'all 0.2s' }}
                    />

                    {/* Article count heat circle */}
                    {count > 0 && (
                      <circle cx={lp.x} cy={lp.y} r={5 + intensity * 12}
                        fill={prov.color} opacity="0.15">
                        <animate attributeName="r" from={5} to={10+intensity*14}
                          dur="3s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" from="0.2" to="0"
                          dur="3s" repeatCount="indefinite"/>
                      </circle>
                    )}

                    {/* Province dot */}
                    <circle cx={lp.x} cy={lp.y}
                      r={isSelected || isHover ? 6 : 4}
                      fill={prov.color}
                      stroke="white" strokeWidth="1.5"
                      filter="url(#glow)"
                      style={{ transition:'r 0.2s' }}
                    />

                    {/* Province label */}
                    <text x={lp.nx} y={lp.ny - 10}
                      textAnchor="middle"
                      fill={isSelected || isHover ? prov.color : '#1f2937'}
                      fontSize={isSelected ? 8 : 7}
                      fontFamily="Inter,sans-serif" fontWeight="700"
                      style={{ pointerEvents:'none' }}>
                      {prov.name.replace('Province No. ','P')}
                    </text>
                    <text x={lp.nx} y={lp.ny + 4}
                      textAnchor="middle"
                      fill={prov.color} fontSize="6.5"
                      fontFamily="Inter,sans-serif" fontWeight="600"
                      style={{ pointerEvents:'none' }}>
                      {prov.capital} · {count} articles
                    </text>
                    {viewMode === 'dominant' && dominant && (
                      <text x={lp.nx} y={lp.ny + 16}
                        textAnchor="middle"
                        fill={CAT_COLORS[dominant] || '#475569'} fontSize="6"
                        fontFamily="Inter,sans-serif" fontWeight="700"
                        style={{ pointerEvents:'none' }}>
                        {dominant}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Country label */}
              <text x="410" y="318" textAnchor="middle"
                fill="rgba(0,0,0,0.15)" fontSize="8"
                fontFamily="Inter,sans-serif" fontWeight="800" letterSpacing="4">
                NEPAL
              </text>
            </svg>

            {/* Hover tooltip */}
            {hoverInfo && (
              <div style={{
                position:'absolute',
                left: Math.min(hoverInfo.x + 12, 620),
                top: Math.max(hoverInfo.y - 8, 8),
                background:'rgba(255,255,255,0.95)',
                border:'1px solid rgba(15,23,42,0.08)',
                borderRadius:10,
                padding:'8px 10px',
                boxShadow:'0 8px 18px rgba(15,23,42,0.12)',
                pointerEvents:'none',
                minWidth:160,
              }}>
                <div style={{ fontWeight:700, fontSize:'0.78rem', color:'var(--text-1)', marginBottom:2 }}>
                  {hoverInfo.name}
                </div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-4)' }}>
                  {hoverInfo.count} articles
                </div>
                {hoverInfo.topCategory && (
                  <div style={{ fontSize:'0.68rem', marginTop:4, color:CAT_COLORS[hoverInfo.topCategory] }}>
                    Dominant: {CAT_ICONS[hoverInfo.topCategory]} {hoverInfo.topCategory}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom legend */}
          <div style={{ display:'flex', gap:12, padding:'8px 14px',
            borderTop:'1px solid var(--border)', background:'var(--bg-raised)',
            flexWrap:'wrap', flexShrink:0 }}>
            {PROVINCES.map(p => (
              <div key={p.code} style={{ display:'flex', alignItems:'center', gap:5,
                cursor:'pointer', opacity: selected && selected.name!==p.name ? 0.45 : 1 }}
                onClick={() => setSelected(selected?.name===p.name ? null : p)}>
                <div style={{ width:10, height:10, borderRadius:2, background:p.color, flexShrink:0 }}/>
                <span style={{ fontSize:'0.68rem', color:'var(--text-2)', fontWeight:600 }}>
                  {p.name.replace('Province No. ','P')} ({provStats[p.name]?.total||0})
                </span>
              </div>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', color:'var(--text-4)' }}>
              <span>Low</span>
              <div style={{ width:60, height:6, borderRadius:6,
                background:'linear-gradient(90deg, rgba(0,56,147,0.15), rgba(0,56,147,0.6))' }} />
              <span>High</span>
            </div>
          </div>
        </div>

        {/* ── Side panel ───────────────────────────────────────── */}
        <div className="map-side">
          {selected ? (
            <>
              {/* Province detail card */}
              <div className="card" style={{ borderTop:`3px solid ${selected.color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:'1rem', color:selected.color }}>{selected.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-4)', marginTop:2 }}>{selected.ne} · Capital: {selected.capital}</div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    style={{ background:'none', border:'none', fontSize:'1.1rem', color:'var(--text-4)', cursor:'pointer' }}>✕</button>
                </div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-4)', marginBottom:8 }}>
                  Dominant category: {provStats[selected.name]?.topCategory ? `${CAT_ICONS[provStats[selected.name].topCategory]} ${provStats[selected.name].topCategory}` : 'N/A'}
                </div>

                {/* Category breakdown for province */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                  {Object.entries(CAT_ICONS).map(([cat, icon]) => {
                    const n = articles.filter(a => a.province===selected.name && a.category===cat).length;
                    if (n === 0) return null;
                    return (
                      <div key={cat} style={{
                        display:'flex', alignItems:'center', gap:5, padding:'4px 8px',
                        borderRadius:6, background:`${CAT_COLORS[cat]}12`,
                        border:`1px solid ${CAT_COLORS[cat]}25`, cursor:'pointer',
                      }} onClick={() => setCatFilter(cat)}>
                        <span style={{ fontSize:'0.8rem' }}>{icon}</span>
                        <span style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--text-2)' }}>{cat}</span>
                        <span style={{ marginLeft:'auto', fontSize:'0.68rem', fontWeight:800, color:CAT_COLORS[cat] }}>{n}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize:'0.7rem', color:'var(--text-4)', marginBottom:8 }}>
                  📰 Showing {selectedArticles.length} articles · Filter: {catFilter}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7, overflowY:'auto', maxHeight:380 }}>
                  {selectedArticles.length === 0
                    ? <div style={{ color:'var(--text-4)', textAlign:'center', padding:20, fontSize:'0.8rem' }}>No articles match this filter</div>
                    : selectedArticles.map(a => (
                        <a key={a.id} href={a.link||'#'} target="_blank" rel="noopener"
                          style={{ display:'block', padding:'9px 11px', background:'var(--bg-raised)',
                            borderRadius:8, borderLeft:`3px solid ${CAT_COLORS[a.category]||'#ccc'}`,
                            textDecoration:'none', transition:'all 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background='var(--bg-raised)'}>
                          <div style={{ fontSize:'0.68rem', color:CAT_COLORS[a.category], fontWeight:700, marginBottom:3 }}>
                            {CAT_ICONS[a.category]} {a.category}
                          </div>
                          <div style={{ fontSize:'0.79rem', fontWeight:600, color:'var(--text-1)', lineHeight:1.4, marginBottom:3 }}>
                            {a.title}
                          </div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-4)' }}>
                            {a.source} · {a.timeAgo}
                          </div>
                        </a>
                      ))
                  }
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card" style={{ background:'linear-gradient(135deg,rgba(220,20,60,0.05),rgba(0,56,147,0.05))', border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:700, marginBottom:6, fontSize:'0.85rem' }}>👆 Click a province</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-3)', lineHeight:1.7 }}>
                  Select any province to see its news, article breakdown by category, and journalists' coverage.
                </div>
              </div>
              {PROVINCES.map(p => {
                const count = provStats[p.name]?.total || 0;
                const pct   = maxCount ? Math.round(count/maxCount*100) : 0;
                return (
                  <div key={p.code} className="card" style={{ padding:'12px 14px', cursor:'pointer', borderTop:`2px solid ${p.color}` }}
                    onClick={() => setSelected(p)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.83rem', color:p.color }}>{p.name}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-4)' }}>{p.ne} · {p.capital}</div>
                      </div>
                      <div style={{ fontWeight:900, fontSize:'1.1rem', color:'var(--text-1)' }}>{count}</div>
                    </div>
                    <div style={{ height:4, background:'var(--bg-raised)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:p.color, borderRadius:2, transition:'width 1s' }}/>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
