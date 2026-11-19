import React, { useMemo, useState as useStateInner, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell } from 'recharts';
import { CAT_COLORS, CAT_ICONS, RSS_FEEDS, FEED_TYPES, PROVINCES } from './data.js';
import { API_BASE_URL } from './config.js';

// ─────────────────────────────────────────────────────────────────
// STORY CLUSTERING UTILITIES
// ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','has','have','had','be','been','by','from',
  'that','this','it','its','as','up','out','if','about','into','than',
  'then','so','no','not','do','did','will','would','can','could','may',
  'must','shall','should','over','after','where','when','who','what',
  'how','new','says','said','will','also','nepal','nepali','report',
  'news','update','latest','today','daily','weekly','monday','tuesday',
  'wednesday','thursday','friday','saturday','sunday','am','pm',
  'government','गर्न','भएको','रहेको','छ','छन्','गरेको','भन्दा',
]);

function tokenize(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function clusterArticles(articles) {
  if (!articles || articles.length === 0) return [];

  // Build keyword → article index
  const kwIndex = {};
  articles.forEach((a, idx) => {
    const tokens = tokenize(a.title || '');
    tokens.forEach(kw => {
      if (!kwIndex[kw]) kwIndex[kw] = new Set();
      kwIndex[kw].add(idx);
    });
  });

  // Only keep keywords that appear in 2+ articles (shared signal)
  const sharedKws = Object.entries(kwIndex).filter(([, s]) => s.size >= 2);

  // Union-Find for grouping
  const parent = articles.map((_, i) => i);
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(a, b) { parent[find(a)] = find(b); }

  sharedKws.forEach(([, idxSet]) => {
    const arr = [...idxSet];
    for (let i = 1; i < arr.length; i++) union(arr[0], arr[i]);
  });

  // Group by root
  const groupMap = {};
  articles.forEach((a, idx) => {
    const root = find(idx);
    if (!groupMap[root]) groupMap[root] = [];
    groupMap[root].push(a);
  });

  // Build cluster objects, skip singletons
  return Object.values(groupMap)
    .filter(group => group.length >= 2)
    .map(group => {
      const sorted = [...group].sort((a, b) => new Date(a.date) - new Date(b.date));
      const latest = sorted[sorted.length - 1];
      const earliest = sorted[0];

      // Headline: most common token across all titles
      const tokenFreq = {};
      group.forEach(a => {
        const toks = tokenize(a.title || '');
        toks.forEach(t => { tokenFreq[t] = (tokenFreq[t] || 0) + 1; });
      });
      const topTokens = Object.entries(tokenFreq)
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([w]) => w);

      // Use the title with the most keyword overlaps as cluster headline
      let headline = latest.title;
      let maxOverlap = 0;
      group.forEach(a => {
        const toks = new Set(tokenize(a.title || ''));
        const overlap = topTokens.filter(t => toks.has(t)).length;
        if (overlap > maxOverlap) { maxOverlap = overlap; headline = a.title; }
      });

      // Story age in days
      const latestDate = new Date(latest.date);
      const ageDays = (Date.now() - latestDate.getTime()) / 86400000;
      const status = ageDays < 2 ? 'developing' : ageDays < 7 ? 'maturing' : 'archived';

      // Unique sources
      const sources = [...new Set(group.map(a => a.source))];

      // Category: most common
      const catFreq = {};
      group.forEach(a => { catFreq[a.category] = (catFreq[a.category] || 0) + 1; });
      const category = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'politics';

      return { headline, articles: sorted, status, sources, category, ageDays, latestDate, earliestDate: new Date(earliest.date) };
    })
    .sort((a, b) => {
      // Sort: developing first, then by article count
      const statusOrder = { developing: 0, maturing: 1, archived: 2 };
      const sd = statusOrder[a.status] - statusOrder[b.status];
      return sd !== 0 ? sd : b.articles.length - a.articles.length;
    });
}

// ─────────────────────────────────────────────────────────────────
// STORY STATUS CONFIG
// ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  developing: { label: '🔴 Developing', color: '#ef4444', bg: '#ef444415', border: '#ef444430' },
  maturing:   { label: '🟡 Maturing',   color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30' },
  archived:   { label: '⚫ Archived',    color: '#64748b', bg: '#64748b15', border: '#64748b30' },
};

// ─────────────────────────────────────────────────────────────────
// SINGLE STORY CLUSTER CARD
// ─────────────────────────────────────────────────────────────────
function StoryClusterCard({ cluster, idx }) {
  const [expanded, setExpanded] = useStateInner(false);
  const st = STATUS_CONFIG[cluster.status];
  const catColor = CAT_COLORS[cluster.category] || '#64748b';
  const catIcon  = CAT_ICONS[cluster.category]  || '📰';

  const shown = expanded ? cluster.articles : cluster.articles.slice(-3);
  const hidden = cluster.articles.length - shown.length;

  // Span label
  const spanLabel = (() => {
    const d = Math.round(cluster.ageDays);
    if (d < 1) return 'Today';
    if (d === 1) return '1 day span';
    return `${d}-day story`;
  })();

  return (
    <div className="story-cluster" style={{ '--accent': catColor }}>
      {/* Header */}
      <div className="story-cluster-head">
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, flex:1, minWidth:0 }}>
          <div className="story-cluster-num">{idx + 1}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="story-cluster-headline">{cluster.headline}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6, alignItems:'center' }}>
              {/* Status badge */}
              <span className="story-status-badge" style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                {st.label}
              </span>
              {/* Category badge */}
              <span className="badge" style={{ background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}30`, fontSize:'0.62rem' }}>
                {catIcon} {cluster.category}
              </span>
              {/* Sources count */}
              <span style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600 }}>
                📡 {cluster.sources.length} source{cluster.sources.length > 1 ? 's' : ''}
              </span>
              {/* Article count */}
              <span style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600 }}>
                📰 {cluster.articles.length} articles
              </span>
              {/* Span */}
              <span style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600 }}>
                🕐 {spanLabel}
              </span>
            </div>
          </div>
        </div>

        <button className="story-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? '▲ Collapse' : `▼ Show all ${cluster.articles.length}`}
        </button>
      </div>

      {/* Depth bar */}
      <div className="story-depth-wrap">
        <div className="story-depth-label">Story depth</div>
        <div className="story-depth-bar">
          <div className="story-depth-fill" style={{
            width:`${Math.min(100, cluster.articles.length * 14)}%`,
            background: `linear-gradient(90deg, ${catColor}80, ${catColor})`,
          }} />
        </div>
        <div className="story-depth-count">{cluster.articles.length}</div>
      </div>

      {/* Timeline */}
      <div className="story-timeline">
        {!expanded && cluster.articles.length > 3 && (
          <div className="timeline-gap-indicator">
            <span>···  {hidden} earlier article{hidden !== 1 ? 's' : ''} hidden</span>
            <button className="story-expand-btn-inline" onClick={() => setExpanded(true)}>Show all</button>
          </div>
        )}
        {shown.map((article, aIdx) => {
          const isFirst  = !expanded && cluster.articles.length > 3 ? false : aIdx === 0;
          const isLatest = aIdx === shown.length - 1;
          const nodeDate = new Date(article.date);
          const timeStr  = nodeDate.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

          return (
            <div key={article.id || aIdx} className={`timeline-node ${isLatest ? 'present' : 'past'}`}>
              {/* connector line + dot */}
              <div className="timeline-track">
                <div className="timeline-dot" style={{ background: isLatest ? catColor : undefined }} />
                {aIdx < shown.length - 1 && <div className="timeline-line" />}
              </div>

              {/* content */}
              <div className="timeline-content">
                <div className="timeline-meta">
                  <span className="timeline-time">{timeStr}</span>
                  <span className="timeline-source">{article.source}</span>
                  {isLatest && (
                    <span className="timeline-latest-pill" style={{ background:`${catColor}20`, color:catColor, border:`1px solid ${catColor}35` }}>
                      Latest
                    </span>
                  )}
                  {isFirst && cluster.articles.length > 1 && (
                    <span className="timeline-first-pill">First report</span>
                  )}
                </div>
                <a
                  href={article.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`timeline-title ${isLatest ? 'present' : ''}`}
                >
                  {article.title}
                </a>
                {article.description && (
                  <div className="timeline-desc">{article.description.slice(0, 120)}{article.description.length > 120 ? '…' : ''}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sources footer */}
      <div className="story-sources-footer">
        <span style={{ fontSize:'0.62rem', color:'var(--text-4)', fontWeight:700 }}>Covered by:</span>
        {cluster.sources.map((s, i) => (
          <span key={i} className="story-source-chip">{s}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STORIES TAB
// ─────────────────────────────────────────────────────────────────
function StoriesTab({ articles }) {
  const [filterCat,  setFilterCat]  = useStateInner('all');
  const [filterStatus, setFilterStatus] = useStateInner('all');
  const [sortBy,     setSortBy]     = useStateInner('status');
  const [search,     setSearch]     = useStateInner('');



  const allCats = useMemo(() => {
    const cats = new Set(clusters.map(c => c.category));
    return ['all', ...cats];
  }, [clusters]);

  const filtered = useMemo(() => {
    let list = clusters;
    if (filterCat !== 'all')    list = list.filter(c => c.category === filterCat);
    if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.headline.toLowerCase().includes(q) ||
        c.sources.some(s => s.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'depth')   list = [...list].sort((a, b) => b.articles.length - a.articles.length);
    if (sortBy === 'recency') list = [...list].sort((a, b) => b.latestDate - a.latestDate);
    return list;
  }, [clusters, filterCat, filterStatus, sortBy, search]);

  const stats = useMemo(() => ({
    total:      clusters.length,
    developing: clusters.filter(c => c.status === 'developing').length,
    maturing:   clusters.filter(c => c.status === 'maturing').length,
    archived:   clusters.filter(c => c.status === 'archived').length,
  }), [clusters]);

  if (articles.length === 0) {
    return (
      <div className="card" style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📰</div>
        <div style={{ fontWeight:700 }}>No articles loaded yet</div>
        <div style={{ fontSize:'0.8rem', marginTop:6 }}>Wait for feeds to load and try again</div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12, marginBottom:16 }}>
        {[
          { label:'Story Threads', val:stats.total,      icon:'🧵', color:'#7c3aed' },
          { label:'Developing',    val:stats.developing, icon:'🔴', color:'#ef4444' },
          { label:'Maturing',      val:stats.maturing,   icon:'🟡', color:'#f59e0b' },
          { label:'Archived',      val:stats.archived,   icon:'⚫', color:'#64748b' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ borderTopColor: s.color }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="story-filter-bar">
        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:160 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-4)', fontSize:'0.85rem' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stories…"
            className="story-search-input"
          />
        </div>

        {/* Category filter */}
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="story-select">
          {allCats.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : `${CAT_ICONS[c] || '📰'} ${c}`}</option>)}
        </select>

        {/* Status filter */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="story-select">
          <option value="all">All statuses</option>
          <option value="developing">🔴 Developing</option>
          <option value="maturing">🟡 Maturing</option>
          <option value="archived">⚫ Archived</option>
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="story-select">
          <option value="status">Sort: Status</option>
          <option value="depth">Sort: Depth</option>
          <option value="recency">Sort: Recency</option>
        </select>

        <span style={{ fontSize:'0.72rem', color:'var(--text-4)', flexShrink:0 }}>
          {filtered.length} story thread{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Story List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>🔍</div>
          <div>No story threads match your filters</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map((cluster, idx) => (
            <StoryClusterCard key={idx} cluster={cluster} idx={idx} />
          ))}
        </div>
      )}
    </>
  );
}

const POLICIES = [
  { title:'100-Day Governance Reform Agenda', ministry:'PMO', status:'implementing', progress:15 },
  { title:'Ministry Restructuring (17 limit)', ministry:'PMO', status:'in committee', progress:30 },
  { title:'Digital Signature System Rollout', ministry:'MoCIT', status:'approved', progress:40 },
  { title:'Free Blue Bus for Women', ministry:'MoPIT', status:'announced', progress:10 },
  { title:'Anti-Corruption & Assets Probe', ministry:'CIAA/Gov', status:'implementing', progress:25 },
  { title:'Local Govt Pilot Projects Scaling', ministry:'NPC', status:'approved', progress:45 },
];

const OFFICIALS = [
  { name:'Balendra Shah', role:'Prime Minister & Home Affairs', type:'Cabinet', score:92, trend:'+5', decisions:45 },
  { name:'Swarnim Wagle', role:'Finance Minister', type:'Cabinet', score:88, trend:'+3', decisions:32 },
  { name:'Shishir Khanal', role:'Foreign Affairs Minister', type:'Cabinet', score:85, trend:'+1', decisions:28 },
  { name:'Sobita Gautam', role:'Law, Justice & Parl. Affairs', type:'Cabinet', score:82, trend:'+4', decisions:19 },
  { name:'Biraj Bhakta Shrestha', role:'Energy, Water & Irrigation', type:'Cabinet', score:79, trend:'+2', decisions:15 },
  { name:'Sasmit Pokharel', role:'Education, Science & Tech', type:'Cabinet', score:77, trend:'+3', decisions:11 },
  { name:'Sunil Lamsal', role:'Physical Infra. & Transport', type:'Cabinet', score:75, trend:'+1', decisions:9 },
  { name:'Bikram Timilsina', role:'Communication & IT', type:'Cabinet', score:74, trend:'+2', decisions:8 },
  { name:'Pratibha Rawal', role:'Federal Affairs & Gen. Admin', type:'Cabinet', score:72, trend:'-1', decisions:7 },
  { name:'Sita Badi', role:'Women, Children & Sr. Citizens', type:'Cabinet', score:70, trend:'0', decisions:5 },
  { name:'Nisha Mehta', role:'Health & Population', type:'Cabinet', score:68, trend:'+1', decisions:6 },
  { name:'Gita Chaudhary', role:'Agriculture & Livestock Dev.', type:'Cabinet', score:65, trend:'+2', decisions:4 },
  { name:'Khadka Raj Paudel', role:'Culture, Tourism & Civil Aviation', type:'Cabinet', score:64, trend:'-2', decisions:3 },
  { name:'Ram Chandra Paudel', role:'President', type:'State Head', score:80, trend:'0', decisions:12 },
  { name:'Ramsahay Prasad Yadav', role:'Vice President', type:'State Head', score:75, trend:'0', decisions:4 },
  { name:'Sapana Pradhan Malla', role:'Acting Chief Justice', type:'Constitutional', score:85, trend:'+2', decisions:18 },
  { name:'Dol Prasad Aryal', role:'Speaker, House of Reps', type:'State Head', score:82, trend:'+3', decisions:22 },
  { name:'Prem Kumar Rai', role:'Chief Commissioner, CIAA', type:'Constitutional', score:78, trend:'+1', decisions:15 },
  { name:'Toyam Raya', role:'Auditor General', type:'Constitutional', score:81, trend:'+2', decisions:10 },
  { name:'Ram Prasad Bhandari', role:'Acting Chief Election Comm.', type:'Constitutional', score:76, trend:'0', decisions:8 },
];

const TTip = ({active,payload}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:12,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
      <div style={{color:'#111827',fontWeight:700}}>{payload[0]?.name||payload[0]?.payload?.name}</div>
      <div style={{color:'#6b7280'}}>{payload[0].value} articles</div>
    </div>
  );
};

export function AnalyticsPage({ articles, feedStatus = {} }) {
  const [tab, setTab] = React.useState('overview');
  const [clusters, setClusters] = React.useState([]);
  React.useEffect(() => {
    fetch(`${API_BASE_URL}/api/clusters?limit=500`).then(r=>r.json()).then(d=>setClusters(d.clusters||[])).catch(e=>console.error(e));
  }, []);

  const catData = useMemo(() => {
    const m = {};
    articles.forEach(a => { m[a.category]=(m[a.category]||0)+1; });
    return Object.entries(m)
      .map(([name,value])=>({name, value, fill:CAT_COLORS[name]||'#64748b'}))
      .sort((a,b)=>b.value-a.value);
  }, [articles]);

  const srcData = useMemo(() => {
    const m = {};
    articles.forEach(a => { m[a.source]=(m[a.source]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [articles]);

  const sourceMetrics = useMemo(() => {
    const total = RSS_FEEDS.length;
    const verified = RSS_FEEDS.filter(f => f.verified).length;
    const facebookLinked = RSS_FEEDS.filter(f => f.fb).length;
    const youtubeFeeds = RSS_FEEDS.filter(f => String(f.url || '').includes('youtube.com/feeds/videos.xml')).length;
    const live = Object.values(feedStatus).filter(s => s?.ok).length;
    const failed = Object.values(feedStatus).filter(s => s && s.ok === false).length;
    const pending = Math.max(total - live - failed, 0);

    const byType = RSS_FEEDS.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {});

    const byProvince = RSS_FEEDS.reduce((acc, f) => {
      const key = f.province || 'National';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const provinceRows = PROVINCES.map(p => ({
      name: p.name,
      count: byProvince[p.name] || 0,
      color: p.color,
    })).filter(p => p.count > 0);

    return {
      total, verified, facebookLinked, youtubeFeeds, live, failed, pending, byType, provinceRows,
    };
  }, [feedStatus]);

  return (
    <div className="page">
      <div className="page-title">📈 Analytics & Intelligence</div>

      {/* Tab buttons */}
      <div className="tabs">
        {[
          { id:'overview',  label:'📊 Overview'  },
          { id:'stories',   label:'🧵 Stories'   },
          { id:'policies',  label:'📋 Policies'  },
          { id:'officials', label:'🏆 Officials' },
          { id:'sources',   label:'📡 Sources'   },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stories' && <StoriesTab articles={articles} />}

      {tab === 'overview' && (
        <>
          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <span className="card-title">📊 Articles by Category</span>
                <span className="card-sub">{articles.length} total</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={catData} margin={{left:-15}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,150,0.15)"/>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-30} textAnchor="end" height={50}/>
                  <YAxis stroke="#64748b" fontSize={11}/>
                  <Tooltip content={<TTip/>}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {catData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title">📡 Source Performance</span></div>
              <div style={{overflowY:'auto',maxHeight:240}}>
                {srcData.map((s,i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{fontSize:'0.75rem',color:'#94a3b8',width:130,flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {s.name}
                    </div>
                    <div style={{flex:1,height:6,background:'#1e2a3a',borderRadius:3,overflow:'hidden'}}>
                      <div style={{
                        width:`${(s.value/Math.max(...srcData.map(x=>x.value)))*100}%`,
                        height:'100%',background:'linear-gradient(90deg,#3b82f6,#10b981)',
                        borderRadius:3,transition:'width 1s',
                      }}/>
                    </div>
                    <div style={{fontSize:'0.72rem',color:'#f1f5f9',fontWeight:700,width:28,textAlign:'right'}}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head"><span className="card-title">📶 Source Dashboard</span></div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                <div className="stat-card" style={{ borderTopColor:'#1a6aff' }}>
                  <div className="stat-icon">🧭</div>
                  <div className="stat-val">{sourceMetrics.total}</div>
                  <div className="stat-lbl">Total Sources</div>
                </div>
                <div className="stat-card" style={{ borderTopColor:'#059669' }}>
                  <div className="stat-icon">✅</div>
                  <div className="stat-val">{sourceMetrics.verified}</div>
                  <div className="stat-lbl">Verified</div>
                </div>
                <div className="stat-card" style={{ borderTopColor:'#10b981' }}>
                  <div className="stat-icon">🟢</div>
                  <div className="stat-val">{sourceMetrics.live}</div>
                  <div className="stat-lbl">Live</div>
                </div>
                <div className="stat-card" style={{ borderTopColor:'#ef4444' }}>
                  <div className="stat-icon">🔴</div>
                  <div className="stat-val">{sourceMetrics.failed}</div>
                  <div className="stat-lbl">Failed</div>
                </div>
                <div className="stat-card" style={{ borderTopColor:'#f59e0b' }}>
                  <div className="stat-icon">⏳</div>
                  <div className="stat-val">{sourceMetrics.pending}</div>
                  <div className="stat-lbl">Pending</div>
                </div>
                <div className="stat-card" style={{ borderTopColor:'#0ea5e9' }}>
                  <div className="stat-icon">📘</div>
                  <div className="stat-val">{sourceMetrics.facebookLinked}</div>
                  <div className="stat-lbl">Facebook-Linked</div>
                </div>
                <div className="stat-card" style={{ borderTopColor:'#7c3aed' }}>
                  <div className="stat-icon">▶️</div>
                  <div className="stat-val">{sourceMetrics.youtubeFeeds}</div>
                  <div className="stat-lbl">YouTube Feeds</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title">🧩 Province Source Coverage</span></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {sourceMetrics.provinceRows.map((p) => (
                  <div key={p.name} style={{
                    display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
                    background:'var(--bg-raised)', borderRadius:8, border:'1px solid var(--border)',
                  }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:p.color }} />
                    <div style={{ fontSize:'0.72rem', color:'var(--text-2)', fontWeight:600 }}>{p.name}</div>
                    <div style={{ marginLeft:'auto', fontWeight:800, color:'var(--text-3)' }}>{p.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Latest articles table */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">📰 Latest Articles</span>
              <span className="card-sub">{articles.length} fetched</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead><tr>
                  <th>Title</th><th>Category</th><th>Source</th><th>Province</th><th>Time</th>
                </tr></thead>
                <tbody>
                  {articles.slice(0,20).map((a,i)=>(
                    <tr key={i}>
                      <td style={{maxWidth:300}}>
                        <a href={a.link||'#'} target="_blank" rel="noopener">
                          {a.title.length>65?a.title.slice(0,65)+'…':a.title}
                        </a>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background:`${CAT_COLORS[a.category]}22`,
                          color:CAT_COLORS[a.category],
                          border:`1px solid ${CAT_COLORS[a.category]}44`,
                        }}>
                          {CAT_ICONS[a.category]} {a.category}
                        </span>
                      </td>
                      <td className="muted small">{a.source}</td>
                      <td className="muted small">{a.province}</td>
                      <td className="muted smaller">{a.timeAgo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'policies' && (
        <div className="card">
          <div className="card-head"><span className="card-title">📋 Policy Tracker</span></div>
          <table className="tbl">
            <thead><tr><th>Policy</th><th>Ministry</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              {POLICIES.map((p,i)=>(
                <tr key={i}>
                  <td style={{fontWeight:600}}>{p.title}</td>
                  <td className="muted small">{p.ministry}</td>
                  <td>
                    <span className={`badge ${p.status==='implementing'||p.status==='approved'?'badge-green':p.status==='announced'?'badge-blue':'badge-amber'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{minWidth:160}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="prog-bar" style={{flex:1}}>
                        <div className="prog-fill" style={{width:`${p.progress}%`}}/>
                      </div>
                      <span className="smaller mono dim">{p.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'officials' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-head"><span className="card-title">🏛️ Cabinet Ministers</span></div>
            <table className="tbl">
              <thead><tr><th>Official</th><th>Role</th><th>Score</th><th>Trend</th><th>Decisions</th></tr></thead>
              <tbody>
                {OFFICIALS.filter(o=>o.type==='Cabinet').map((o,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:700}}>{o.name}</td>
                    <td className="muted small">{o.role}</td>
                    <td>
                      <span style={{fontWeight:800,fontFamily:'var(--mono)',
                        color:o.score>=80?'#10b981':o.score>=65?'#f59e0b':'#ef4444'}}>
                        {o.score}/100
                      </span>
                    </td>
                    <td>
                      <span style={{fontWeight:700,fontSize:'0.78rem',
                        color:o.trend.startsWith('+')?'#10b981':'#ef4444'}}>
                        {o.trend.startsWith('+')?'↑':'↓'} {o.trend}
                      </span>
                    </td>
                    <td className="muted small">{o.decisions} decisions</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">⚖️ Constitutional & State Heads</span></div>
            <table className="tbl">
              <thead><tr><th>Official</th><th>Role</th><th>Score</th><th>Trend</th><th>Decisions</th></tr></thead>
              <tbody>
                {OFFICIALS.filter(o=>o.type!=='Cabinet').map((o,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:700}}>{o.name}</td>
                    <td className="muted small">{o.role}</td>
                    <td>
                      <span style={{fontWeight:800,fontFamily:'var(--mono)',
                        color:o.score>=80?'#10b981':o.score>=65?'#f59e0b':'#ef4444'}}>
                        {o.score}/100
                      </span>
                    </td>
                    <td>
                      <span style={{fontWeight:700,fontSize:'0.78rem',
                        color:o.trend.startsWith('+')?'#10b981':'#ef4444'}}>
                        {o.trend.startsWith('+')?'↑':'↓'} {o.trend}
                      </span>
                    </td>
                    <td className="muted small">{o.decisions} decisions</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">📡 All Feed Sources ({RSS_FEEDS.length} total)</span>
            <div style={{display:'flex',gap:6}}>
              {[{l:'Media',c:'#1a6aff'},{l:'Govt',c:'#DC143C'},{l:'Intl',c:'#7c3aed'}].map((t,i)=>(
                <span key={i} style={{fontSize:'0.65rem',fontWeight:700,padding:'2px 8px',borderRadius:10,background:`${t.c}12`,color:t.c,border:`1px solid ${t.c}30`}}>{t.l}</span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
            {Object.entries(sourceMetrics.byType).map(([type, count]) => (
              <div key={type} style={{
                padding:'6px 10px', borderRadius:10,
                background:`${(FEED_TYPES[type]?.color || '#64748b')}15`,
                border:`1px solid ${(FEED_TYPES[type]?.color || '#64748b')}30`,
                fontSize:'0.68rem', fontWeight:700, color:(FEED_TYPES[type]?.color || '#64748b'),
              }}>
                {FEED_TYPES[type]?.icon || '📰'} {FEED_TYPES[type]?.label || type}: {count}
              </div>
            ))}
            <div style={{ marginLeft:'auto', fontSize:'0.7rem', color:'var(--text-4)' }}>
              Facebook-linked: {sourceMetrics.facebookLinked}
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead><tr>
                <th>#</th><th>Source</th><th>Type</th><th>Status</th><th>Articles</th><th>Social</th><th>Province</th>
              </tr></thead>
              <tbody>
                {RSS_FEEDS.map((f,i) => {
                  const s     = feedStatus[f.id];
                  const count = articles.filter(a => a.source === f.name).length;
                  const typeColors = {media:'#1a6aff',govt:'#DC143C',intl:'#7c3aed',dev:'#059669',regional:'#d97706',tv:'#ef4444'};
                  const typeIcons  = {media:'📰',govt:'🏛️',intl:'🌐',dev:'🌱',regional:'📍',tv:'📺'};
                  return (
                    <tr key={i}>
                      <td className="muted smaller mono">{i+1}</td>
                      <td style={{fontWeight:600,maxWidth:200}}>{f.name}</td>
                      <td>
                        <span style={{
                          fontSize:'0.62rem',fontWeight:700,padding:'2px 7px',borderRadius:8,
                          background:`${typeColors[f.type]||'#666'}15`,
                          color:typeColors[f.type]||'#666',
                          border:`1px solid ${typeColors[f.type]||'#666'}30`,
                        }}>{typeIcons[f.type]||'📰'} {f.type}</span>
                      </td>
                      <td>
                        {s ? (
                          <span className={`badge ${s.ok?'badge-green':'badge-red'}`}>
                            {s.ok ? '✓ Live' : '✗ Failed'}
                          </span>
                        ) : (
                          <span className="badge badge-amber">⏳ Pending</span>
                        )}
                      </td>
                      <td>
                        <span style={{fontWeight:700,color:count>0?'#059669':'#9ca3af'}}>{count}</span>
                      </td>
                      <td className="muted small">{f.fb ? 'Facebook' : '—'}</td>
                      <td className="muted small">{f.province || 'National'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
