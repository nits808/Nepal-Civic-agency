/**
 * MapPage.jsx — Nepal Intelligence Map v3
 *
 * ZERO external GeoJSON fetch — all province shapes use the
 * existing nepalMapPaths.js SVG paths baked into the build.
 * A CartoDB tile basemap provides beautiful terrain + city labels.
 * District-level stats populate the side panel and map dots.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { PROVINCES, CAT_COLORS, CAT_ICONS } from './data.js';
import {
  NEPAL_MAP_VIEWBOX,
  NEPAL_PROVINCE_PATHS,
  NEPAL_PROVINCE_CENTROIDS,
} from './nepalMapPaths.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

// ─── All 77 districts and their province ──────────────────────────
const DIST_PROVINCE = {
  // Province No. 1 (Koshi)
  'Taplejung':'Province No. 1','Panchthar':'Province No. 1','Ilam':'Province No. 1',
  'Jhapa':'Province No. 1','Morang':'Province No. 1','Sunsari':'Province No. 1',
  'Dhankuta':'Province No. 1','Terhathum':'Province No. 1','Sankhuwasabha':'Province No. 1',
  'Solukhumbu':'Province No. 1','Bhojpur':'Province No. 1','Okhaldhunga':'Province No. 1',
  'Khotang':'Province No. 1','Udayapur':'Province No. 1',
  // Madhesh
  'Saptari':'Madhesh','Siraha':'Madhesh','Dhanusha':'Madhesh','Mahottari':'Madhesh',
  'Sarlahi':'Madhesh','Rautahat':'Madhesh','Bara':'Madhesh','Parsa':'Madhesh',
  // Bagmati
  'Sindhuli':'Bagmati','Ramechhap':'Bagmati','Dolakha':'Bagmati',
  'Sindhupalchok':'Bagmati','Kavrepalanchok':'Bagmati','Lalitpur':'Bagmati',
  'Bhaktapur':'Bagmati','Kathmandu':'Bagmati','Nuwakot':'Bagmati',
  'Rasuwa':'Bagmati','Dhading':'Bagmati','Makwanpur':'Bagmati','Chitwan':'Bagmati',
  // Gandaki
  'Gorkha':'Gandaki','Manang':'Gandaki','Mustang':'Gandaki','Myagdi':'Gandaki',
  'Kaski':'Gandaki','Lamjung':'Gandaki','Tanahun':'Gandaki','Nawalpur':'Gandaki',
  'Syangja':'Gandaki','Parbat':'Gandaki','Baglung':'Gandaki',
  // Lumbini
  'Gulmi':'Lumbini','Palpa':'Lumbini','Arghakhanchi':'Lumbini','Kapilvastu':'Lumbini',
  'Rupandehi':'Lumbini','Nawalparasi':'Lumbini','Pyuthan':'Lumbini','Rolpa':'Lumbini',
  'Dang':'Lumbini','Banke':'Lumbini','Bardiya':'Lumbini',
  // Karnali
  'Dolpa':'Karnali','Mugu':'Karnali','Humla':'Karnali','Jumla':'Karnali',
  'Kalikot':'Karnali','Dailekh':'Karnali','Jajarkot':'Karnali',
  'Rukum East':'Karnali','Salyan':'Karnali','Surkhet':'Karnali',
  // Sudurpashchim
  'Kailali':'Sudurpashchim','Achham':'Sudurpashchim','Doti':'Sudurpashchim',
  'Bajhang':'Sudurpashchim','Bajura':'Sudurpashchim','Kanchanpur':'Sudurpashchim',
  'Dadeldhura':'Sudurpashchim','Baitadi':'Sudurpashchim','Darchula':'Sudurpashchim',
};

// Province color map
const PROV_COLOR = Object.fromEntries(PROVINCES.map(p => [p.name, p.color]));

export function MapPage({ articles }) {
  const mapRef  = useRef(null);
  const leafRef = useRef(null);
  const tileRef = useRef(null);

  const [selected,  setSelected]  = useState(null);
  const [catFilter, setCatFilter] = useState('all');
  const [viewMode,  setViewMode]  = useState('volume');
  const [hovered,   setHovered]   = useState(null);

  // ── District stats from article CONTENT location (geoTag already ran) ─────
  const distStats = useMemo(() => {
    const stats = {};
    Object.keys(DIST_PROVINCE).forEach(d => {
      stats[d] = { total: 0, byCategory: {}, topCategory: null, articles: [] };
    });
    articles.forEach(a => {
      const dist = a.district;
      if (!dist || !stats[dist]) return;
      stats[dist].total++;
      const cat = a.category || 'other';
      stats[dist].byCategory[cat] = (stats[dist].byCategory[cat] || 0) + 1;
      stats[dist].articles.push(a);
    });
    Object.values(stats).forEach(s => {
      const top = Object.entries(s.byCategory).sort((a,b)=>b[1]-a[1])[0];
      s.topCategory = top?.[0] || null;
    });
    return stats;
  }, [articles]);

  const maxDist = Math.max(...Object.values(distStats).map(s=>s.total), 1);

  // Province rollup
  const provStats = useMemo(() => {
    const stats = {};
    PROVINCES.forEach(p => { stats[p.name] = { total:0, byCategory:{}, topCategory:null }; });
    Object.entries(distStats).forEach(([d, s]) => {
      const prov = DIST_PROVINCE[d];
      if (!prov || !stats[prov]) return;
      stats[prov].total += s.total;
      Object.entries(s.byCategory).forEach(([cat,n]) => {
        stats[prov].byCategory[cat] = (stats[prov].byCategory[cat]||0)+n;
      });
    });
    PROVINCES.forEach(p => {
      const top = Object.entries(stats[p.name].byCategory).sort((a,b)=>b[1]-a[1])[0];
      stats[p.name].topCategory = top?.[0]||null;
    });
    return stats;
  }, [distStats]);

  const maxProv = Math.max(...Object.values(provStats).map(s=>s.total), 1);

  const selectedArticles = useMemo(() => {
    if (!selected) return [];
    const pool = selected.type === 'district'
      ? distStats[selected.name]?.articles || []
      : articles.filter(a => DIST_PROVINCE[a.district] === selected.name);
    return pool.filter(a => catFilter==='all' || a.category===catFilter).slice(0,25);
  }, [selected, distStats, articles, catFilter]);

  // ── Initialise Leaflet once ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafRef.current) return;

    leafRef.current = L.map(mapRef.current, {
      center: [28.39, 84.12],
      zoom: 7,
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(leafRef.current);

    // CartoDB Voyager — shows city names, roads at zoom
    tileRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd' }
    ).addTo(leafRef.current);

    return () => {
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }
    };
  }, []);

  // ── Add circle markers for districts whenever stats change ─────────────────
  useEffect(() => {
    if (!leafRef.current) return;

    // Remove old markers
    leafRef.current.eachLayer(layer => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        leafRef.current.removeLayer(layer);
      }
    });

    // Nepal district approximate centroids [lat, lng]
    const DIST_COORDS = {
      // Province No. 1
      'Taplejung':[27.35,87.67],'Panchthar':[27.20,87.77],'Ilam':[26.91,87.92],
      'Jhapa':[26.64,87.86],'Morang':[26.67,87.35],'Sunsari':[26.73,87.16],
      'Dhankuta':[27.00,87.35],'Terhathum':[27.12,87.55],'Sankhuwasabha':[27.45,87.28],
      'Solukhumbu':[27.70,86.60],'Bhojpur':[27.17,87.05],'Okhaldhunga':[27.30,86.51],
      'Khotang':[27.02,86.84],'Udayapur':[26.90,86.58],
      // Madhesh
      'Saptari':[26.60,86.76],'Siraha':[26.65,86.20],'Dhanusha':[26.82,85.93],
      'Mahottari':[26.63,85.73],'Sarlahi':[26.76,85.39],'Rautahat':[26.79,85.06],
      'Bara':[27.02,85.00],'Parsa':[27.18,84.86],
      // Bagmati
      'Sindhuli':[27.25,85.97],'Ramechhap':[27.40,86.13],'Dolakha':[27.63,86.07],
      'Sindhupalchok':[27.95,85.68],'Kavrepalanchok':[27.55,85.58],'Lalitpur':[27.67,85.32],
      'Bhaktapur':[27.67,85.43],'Kathmandu':[27.71,85.32],'Nuwakot':[28.00,85.17],
      'Rasuwa':[28.24,85.29],'Dhading':[27.86,84.90],'Makwanpur':[27.43,84.99],'Chitwan':[27.53,84.36],
      // Gandaki
      'Gorkha':[28.23,84.62],'Manang':[28.80,83.96],'Mustang':[29.18,83.77],
      'Myagdi':[28.37,83.56],'Kaski':[28.22,83.98],'Lamjung':[28.14,84.40],
      'Tanahun':[27.93,84.36],'Nawalpur':[27.71,84.16],'Syangja':[28.02,83.77],
      'Parbat':[28.23,83.68],'Baglung':[28.27,83.57],
      // Lumbini
      'Gulmi':[28.06,83.27],'Palpa':[27.86,83.55],'Arghakhanchi':[27.93,83.19],
      'Kapilvastu':[27.60,83.06],'Rupandehi':[27.49,83.44],'Nawalparasi':[27.67,83.68],
      'Pyuthan':[28.07,82.76],'Rolpa':[28.23,82.65],'Dang':[28.06,82.27],
      'Banke':[28.00,81.62],'Bardiya':[28.32,81.34],
      // Karnali
      'Dolpa':[29.10,82.91],'Mugu':[29.72,82.24],'Humla':[29.93,81.82],
      'Jumla':[29.28,82.18],'Kalikot':[29.15,81.62],'Dailekh':[28.85,81.73],
      'Jajarkot':[28.70,82.19],'Rukum East':[28.59,82.62],'Salyan':[28.38,82.16],'Surkhet':[28.60,81.62],
      // Sudurpashchim
      'Kailali':[28.72,80.93],'Achham':[29.10,81.27],'Doti':[29.27,80.99],
      'Bajhang':[29.61,81.27],'Bajura':[29.50,81.59],'Kanchanpur':[28.89,80.34],
      'Dadeldhura':[29.30,80.59],'Baitadi':[29.43,80.55],'Darchula':[29.84,80.56],
    };

    Object.entries(DIST_COORDS).forEach(([dist, [lat, lng]]) => {
      const s = distStats[dist];
      if (!s || s.total === 0) return; // only show districts with news
      const prov  = DIST_PROVINCE[dist] || 'Unknown';
      const color = PROV_COLOR[prov] || '#94a3b8';
      const t = s.total / maxDist;
      const radius = 6 + t * 22; // 6–28px

      const circle = L.circleMarker([lat, lng], {
        radius,
        fillColor:   color,
        color:       '#fff',
        weight:      2,
        opacity:     1,
        fillOpacity: 0.75,
      }).addTo(leafRef.current);

      // Tooltip
      circle.bindTooltip(
        `<div style="font-family:Inter,sans-serif;min-width:120px">
          <b style="color:${color}">${dist}</b>
          <span style="color:#64748b;font-size:11px"> · ${prov}</span><br>
          <span style="font-size:16px;font-weight:900;color:#1e293b">${s.total}</span>
          <span style="font-size:10px;color:#94a3b8"> incidents</span>
          ${s.topCategory ? `<br><span style="font-size:10px;font-weight:700;color:${CAT_COLORS[s.topCategory]}">${CAT_ICONS[s.topCategory]} ${s.topCategory}</span>` : ''}
        </div>`,
        { sticky: true, className: 'ncig-tip', direction: 'top', offset: [0, -radius] }
      );

      circle.on('click', () => {
        setSelected({ type:'district', name:dist, color, prov });
        setCatFilter('all');
      });

      // Small count label
      if (s.total >= 3) {
        const lbl = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div style="font-family:Inter,sans-serif;font-size:9px;font-weight:900;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.7);white-space:nowrap">${s.total}</div>`,
            className: '',
            iconSize: [20, 12],
            iconAnchor: [10, 6],
          }),
          interactive: false,
          zIndexOffset: 500,
        }).addTo(leafRef.current);
      }
    });
  }, [distStats, maxDist]);

  const cats = ['all', ...Object.keys(CAT_ICONS).filter(c=>c!=='all')];
  const selStats = selected?.type==='district' ? distStats[selected.name] : provStats[selected?.name];

  // ── Province SVG overlay data ──────────────────────────────────────────────
  // Render as a separate SVG panel below the map header with province-level heatmap
  const [svgMode, setSvgMode] = useState('svg'); // 'svg' | 'leaflet'

  const withAlpha = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return hex;
    const a = Math.round(Math.max(0,Math.min(1,alpha))*255).toString(16).padStart(2,'0');
    return `${hex}${a}`;
  };

  return (
    <div className="page">
      <div className="page-title">🗺️ Nepal Intelligence Map</div>
      <p style={{ fontSize:'0.72rem', color:'var(--text-4)', marginTop:-8, marginBottom:12 }}>
        📍 Incident locations from article content · <b>{articles.length}</b> articles ·{' '}
        <b>{Object.values(distStats).filter(s=>s.total>0).length}</b> active districts
      </p>

      {/* ── View mode toggle ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:3, background:'var(--bg-raised)', padding:3, borderRadius:8, border:'1px solid var(--border)' }}>
          {[{id:'svg',label:'🗺️ Province Map'},{id:'leaflet',label:'📡 Live Tiles'}].map(m => (
            <button key={m.id} onClick={() => setSvgMode(m.id)} style={{
              fontSize:'0.7rem', padding:'5px 12px', border:'none', cursor:'pointer',
              borderRadius:6, fontWeight:700, fontFamily:'Inter,sans-serif',
              background: svgMode===m.id ? 'var(--text-1)' : 'transparent',
              color: svgMode===m.id ? '#fff' : 'var(--text-3)',
              transition:'all 0.2s',
            }}>{m.label}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:3, background:'var(--bg-raised)', padding:3, borderRadius:8, border:'1px solid var(--border)' }}>
          {['volume','dominant'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              fontSize:'0.7rem', padding:'5px 12px', border:'none', cursor:'pointer',
              borderRadius:6, fontWeight:700, fontFamily:'Inter,sans-serif',
              background: viewMode===m ? 'var(--crimson)' : 'transparent',
              color: viewMode===m ? '#fff' : 'var(--text-3)',
              transition:'all 0.2s',
            }}>{m==='volume' ? '🔥 Heatmap' : '👑 Dominant'}</button>
          ))}
        </div>
      </div>

      <div className="map-layout">
        {/* ── LEFT: Map panel ─────────────────────────────────────────────── */}
        <div className="map-panel" style={{ display:'flex', flexDirection:'column' }}>

          {svgMode === 'svg' ? (
            /* ── Province SVG choropleth ── */
            <div style={{ flex:1, position:'relative', minHeight:460, overflow:'hidden' }}>
              <svg
                width="100%" height="100%"
                viewBox={NEPAL_MAP_VIEWBOX}
                preserveAspectRatio="xMidYMid meet"
                style={{ display:'block', background:'linear-gradient(160deg,#e8effe 0%,#f0f5ff 100%)' }}
              >
                <defs>
                  <filter id="provglow">
                    <feGaussianBlur stdDeviation="3" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M30 0L0 0 0 30" fill="none" stroke="rgba(0,56,147,0.04)" strokeWidth="0.5"/>
                  </pattern>
                </defs>

                {/* Map decorations */}
                <rect width="820" height="320" fill="url(#grid)"/>
                <path d="M0,50L60,36L120,44L200,30L280,40L360,26L440,34L520,24L600,32L680,22L760,30L820,26L820,0L0,0Z"
                  fill="rgba(200,220,255,0.3)"/>
                <text x="410" y="13" textAnchor="middle" fill="rgba(0,56,147,0.3)"
                  fontSize="6.5" fontFamily="Inter,sans-serif" fontWeight="700" letterSpacing="3">
                  ❄ HIMALAYAN RANGE ❄
                </text>
                <path d="M0,290L820,290L820,320L0,320Z" fill="rgba(0,160,80,0.06)"/>
                <text x="410" y="308" textAnchor="middle" fill="rgba(0,120,50,0.35)"
                  fontSize="6.5" fontFamily="Inter,sans-serif" letterSpacing="2">TERAI PLAINS</text>

                {/* Province shapes */}
                {PROVINCES.map(prov => {
                  const s     = provStats[prov.name] || { total:0, topCategory:null };
                  const t     = s.total / maxProv;
                  const isSel = selected?.name === prov.name;
                  const isHov = hovered === prov.name;
                  const c     = NEPAL_PROVINCE_CENTROIDS[prov.name];
                  const pathD = NEPAL_PROVINCE_PATHS[prov.name];
                  const domColor = CAT_COLORS[s.topCategory] || prov.color;

                  const baseFill = viewMode==='dominant'
                    ? withAlpha(domColor, 0.20 + t*0.70)
                    : withAlpha(prov.color, 0.35 + t*0.55);

                  const fillColor = isSel ? prov.color+'cc' : isHov ? prov.color+'99' : baseFill;
                  const strokeColor = isSel||isHov ? prov.color : withAlpha(prov.color, 0.6);

                  return (
                    <g key={prov.code} style={{ cursor:'pointer' }}
                      onClick={() => setSelected(s => s?.name===prov.name&&s.type==='province' ? null : { type:'province', name:prov.name, color:prov.color })}
                      onMouseEnter={() => setHovered(prov.name)}
                      onMouseLeave={() => setHovered(null)}>
                      <path d={pathD}
                        fill={fillColor} stroke={strokeColor}
                        strokeWidth={isSel ? 2.5 : isHov ? 1.8 : 1}
                        filter={isSel ? 'url(#provglow)' : undefined}
                        style={{ transition:'all 0.2s' }}/>

                      {/* Pulse ring for high activity */}
                      {s.total > 5 && c && (
                        <circle cx={c.x} cy={c.y} r={8+t*14} fill={prov.color} opacity="0.12">
                          <animate attributeName="r" from={6} to={14+t*16} dur="2.5s" repeatCount="indefinite"/>
                          <animate attributeName="opacity" from="0.18" to="0" dur="2.5s" repeatCount="indefinite"/>
                        </circle>
                      )}

                      {/* Province dot */}
                      {c && (
                        <>
                          <circle cx={c.x} cy={c.y} r={isSel||isHov ? 7 : 5}
                            fill={prov.color} stroke="#fff" strokeWidth="1.5"
                            filter="url(#provglow)" style={{ transition:'r 0.2s' }}/>

                          {/* Label */}
                          <text x={c.x} y={c.y-10} textAnchor="middle"
                            fill={isSel||isHov ? prov.color : '#1f2937'}
                            fontSize={isSel ? 8.5 : 7.5} fontFamily="Inter,sans-serif" fontWeight="800"
                            style={{ pointerEvents:'none' }}>
                            {prov.name.replace('Province No. ','P')}
                          </text>
                          <text x={c.x} y={c.y+4} textAnchor="middle"
                            fill={prov.color} fontSize="6.5" fontFamily="Inter,sans-serif" fontWeight="700"
                            style={{ pointerEvents:'none' }}>
                            {s.total} incidents
                          </text>
                          {viewMode==='dominant' && s.topCategory && (
                            <text x={c.x} y={c.y+15} textAnchor="middle"
                              fill={CAT_COLORS[s.topCategory]||'#475569'} fontSize="6"
                              fontFamily="Inter,sans-serif" fontWeight="700"
                              style={{ pointerEvents:'none' }}>
                              {s.topCategory}
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}

                <text x="410" y="317" textAnchor="middle" fill="rgba(0,0,0,0.12)"
                  fontSize="7" fontFamily="Inter,sans-serif" fontWeight="900" letterSpacing="5">
                  NEPAL
                </text>
              </svg>

              {/* Province legend */}
              <div style={{
                position:'absolute', bottom:0, left:0, right:0,
                background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)',
                display:'flex', flexWrap:'wrap', gap:8, padding:'7px 14px',
                borderTop:'1px solid rgba(0,0,0,0.06)',
              }}>
                {PROVINCES.map(p => (
                  <div key={p.code}
                    onClick={() => setSelected(s => s?.name===p.name&&s.type==='province' ? null : { type:'province', name:p.name, color:p.color })}
                    style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer',
                      opacity: selected && selected.name!==p.name ? 0.4 : 1, transition:'opacity 0.2s' }}>
                    <div style={{ width:9, height:9, borderRadius:2, background:p.color }}/>
                    <span style={{ fontSize:'0.62rem', color:'var(--text-3)', fontWeight:700 }}>
                      {p.name.replace('Province No. ','P')} <b style={{ color:p.color }}>({provStats[p.name]?.total||0})</b>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Leaflet tile map with district circles ── */
            <div style={{ flex:1, position:'relative' }}>
              <div ref={mapRef} style={{ width:'100%', height:'480px' }}/>

              {/* Category filter overlay */}
              <div style={{
                position:'absolute', bottom:10, left:10, zIndex:1200, maxWidth:'55%',
                background:'rgba(255,255,255,0.95)', backdropFilter:'blur(10px)',
                padding:'7px 9px', borderRadius:10,
                boxShadow:'0 4px 16px rgba(0,0,0,0.12)', border:'1px solid rgba(255,255,255,0.8)',
                display:'flex', gap:4, flexWrap:'wrap',
              }}>
                <div style={{ width:'100%', fontSize:'0.58rem', fontWeight:800, color:'#94a3b8',
                  textTransform:'uppercase', letterSpacing:1, marginBottom:1 }}>Filter</div>
                {cats.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} style={{
                    fontSize:'0.6rem', padding:'3px 7px', border:'none', cursor:'pointer',
                    borderRadius:5, fontFamily:'Inter,sans-serif', fontWeight:600,
                    background: catFilter===c ? '#1e293b' : 'rgba(100,116,139,0.1)',
                    color: catFilter===c ? '#fff' : '#475569', transition:'all 0.15s',
                  }}>
                    {c==='all' ? 'All' : `${CAT_ICONS[c]||''} ${c}`}
                  </button>
                ))}
              </div>

              {/* Province legend */}
              <div style={{
                position:'absolute', bottom:0, left:0, right:0, zIndex:1100,
                background:'rgba(255,255,255,0.92)', backdropFilter:'blur(6px)',
                display:'flex', flexWrap:'wrap', gap:8, padding:'6px 12px',
                borderTop:'1px solid rgba(0,0,0,0.06)',
              }}>
                {PROVINCES.map(p => (
                  <div key={p.code} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:p.color }}/>
                    <span style={{ fontSize:'0.6rem', color:'var(--text-3)', fontWeight:600 }}>
                      {p.name.replace('Province No. ','P')} ({provStats[p.name]?.total||0})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Side panel ─────────────────────────────────────────── */}
        <div className="map-side">
          {selected ? (
            <>
              {/* Detail card */}
              <div className="card" style={{ borderTop:`3px solid ${selected.color}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:'0.95rem', color:selected.color }}>
                      {selected.name}
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-4)', marginTop:2 }}>
                      {selected.type==='district'
                        ? `District · ${DIST_PROVINCE[selected.name]||''}`
                        : `Province · Nepal`}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{
                    background:'none', border:'none', fontSize:'1rem',
                    color:'var(--text-4)', cursor:'pointer',
                  }}>✕</button>
                </div>

                <div style={{ margin:'12px 0 8px', display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontSize:'2.4rem', fontWeight:900, color:'var(--text-1)', lineHeight:1 }}>
                    {selStats?.total || 0}
                  </span>
                  <span style={{ fontSize:'0.72rem', color:'var(--text-4)' }}>incidents</span>
                </div>

                {/* Category bars */}
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                  {Object.entries(selStats?.byCategory||{})
                    .sort((a,b)=>b[1]-a[1]).slice(0,6)
                    .map(([cat, n]) => (
                      <div key={cat} onClick={() => setCatFilter(cat)} style={{ cursor:'pointer' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <span style={{ fontSize:'0.67rem', fontWeight:700, color:CAT_COLORS[cat] }}>
                            {CAT_ICONS[cat]} {cat}
                          </span>
                          <span style={{ fontSize:'0.67rem', fontWeight:800, color:'var(--text-1)' }}>{n}</span>
                        </div>
                        <div style={{ height:3, background:'var(--bg-raised)', borderRadius:2 }}>
                          <div style={{
                            width:`${n/(selStats.total||1)*100}%`, height:'100%',
                            background:CAT_COLORS[cat], borderRadius:2, transition:'width 0.6s',
                          }}/>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Category filter pills */}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} style={{
                    fontSize:'0.6rem', padding:'3px 7px', border:'none', cursor:'pointer',
                    borderRadius:5, fontFamily:'Inter,sans-serif', fontWeight:600,
                    background: catFilter===c ? '#1e293b' : 'rgba(100,116,139,0.1)',
                    color: catFilter===c ? '#fff' : '#475569',
                  }}>{c==='all'?'All':`${CAT_ICONS[c]} ${c}`}</button>
                ))}
              </div>

              <div style={{ fontSize:'0.67rem', color:'var(--text-4)' }}>
                📰 {selectedArticles.length} articles · filtered by: <b>{catFilter}</b>
              </div>

              {/* Articles */}
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {selectedArticles.length === 0
                  ? <div style={{ color:'var(--text-4)', textAlign:'center', padding:20, fontSize:'0.8rem' }}>No matching articles</div>
                  : selectedArticles.map((a,i) => (
                    <a key={a.id||i} href={a.link||'#'} target="_blank" rel="noopener noreferrer"
                      style={{
                        display:'block', padding:'9px 11px',
                        background:'var(--bg-raised)', borderRadius:8,
                        borderLeft:`3px solid ${CAT_COLORS[a.category]||'#ccc'}`,
                        textDecoration:'none', transition:'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background='var(--bg-raised)'}>
                      <div style={{ fontSize:'0.65rem', color:CAT_COLORS[a.category], fontWeight:700, marginBottom:2 }}>
                        {CAT_ICONS[a.category]} {a.category}
                      </div>
                      <div style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-1)', lineHeight:1.4, marginBottom:3 }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize:'0.62rem', color:'var(--text-4)' }}>
                        {a.source} · {a.timeAgo}
                      </div>
                    </a>
                  ))
                }
              </div>
            </>
          ) : (
            <>
              <div className="card" style={{
                background:'linear-gradient(135deg,rgba(220,20,60,0.04),rgba(0,56,147,0.04))',
              }}>
                <div style={{ fontWeight:700, marginBottom:5, fontSize:'0.88rem' }}>
                  👆 Click any province or district
                </div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-3)', lineHeight:1.65 }}>
                  Districts are coloured by <b>incident count</b> — location extracted
                  from article text, not the source newspaper's city.
                </div>
              </div>

              {/* Top districts ranking */}
              <div style={{ fontWeight:700, fontSize:'0.78rem', color:'var(--text-2)', marginBottom:4 }}>
                🏆 Top Districts by Incidents
              </div>
              {Object.entries(distStats)
                .filter(([,s])=>s.total>0)
                .sort((a,b)=>b[1].total-a[1].total)
                .slice(0,15)
                .map(([dist, s], i) => {
                  const prov  = DIST_PROVINCE[dist]||'';
                  const color = PROV_COLOR[prov]||'#94a3b8';
                  const pct   = Math.round(s.total/maxDist*100);
                  return (
                    <div key={dist} className="card" style={{ padding:'9px 11px', cursor:'pointer', borderTop:`2px solid ${color}` }}
                      onClick={() => { setSelected({ type:'district', name:dist, color, prov }); setCatFilter('all'); }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:'0.62rem', fontWeight:900, color:'var(--text-4)', width:16 }}>#{i+1}</span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontWeight:800, fontSize:'0.8rem', color }}>{dist}</span>
                          <span style={{ fontSize:'0.62rem', color:'var(--text-4)', marginLeft:6 }}>{prov.replace('Province No. ','P')}</span>
                        </div>
                        <b style={{ fontSize:'0.9rem', color:'var(--text-1)' }}>{s.total}</b>
                      </div>
                      <div style={{ height:3, background:'var(--bg-raised)', borderRadius:2 }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2, transition:'width 1s' }}/>
                      </div>
                    </div>
                  );
                })
              }

              {/* Province summary */}
              <div style={{ fontWeight:700, fontSize:'0.78rem', color:'var(--text-2)', marginTop:4, marginBottom:4 }}>
                📊 Province Summary
              </div>
              {PROVINCES.map(p => {
                const s   = provStats[p.name]||{ total:0 };
                const pct = Math.round(s.total/maxProv*100);
                return (
                  <div key={p.code} className="card" style={{ padding:'11px 13px', cursor:'pointer', borderTop:`2px solid ${p.color}` }}
                    onClick={() => setSelected({ type:'province', name:p.name, color:p.color })}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'0.8rem', color:p.color }}>{p.name}</div>
                        <div style={{ fontSize:'0.62rem', color:'var(--text-4)' }}>{p.ne} · {p.capital}</div>
                      </div>
                      <b style={{ fontSize:'1.1rem', color:'var(--text-1)' }}>{s.total}</b>
                    </div>
                    <div style={{ height:4, background:'var(--bg-raised)', borderRadius:2 }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:p.color, borderRadius:2, transition:'width 1s' }}/>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <style>{`
        .ncig-tip {
          background: rgba(255,255,255,0.97) !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.14) !important;
          padding: 8px 11px !important;
          pointer-events: none !important;
          font-family: Inter, sans-serif !important;
        }
        .ncig-tip::before { display: none !important; }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.95) !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          color: #1e293b !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
}
