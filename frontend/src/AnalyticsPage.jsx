import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell } from 'recharts';
import { CAT_COLORS, CAT_ICONS, RSS_FEEDS, FEED_TYPES, PROVINCES } from './data.js';

const POLICIES = [
  { title:'Digital Nepal Framework 2026-2030', ministry:'MoICT', status:'implementing', progress:35 },
  { title:'National Health Insurance Expansion', ministry:'MoHP', status:'approved', progress:60 },
  { title:'Clean Energy Act 2026', ministry:'MoEWRI', status:'in committee', progress:20 },
  { title:'Agricultural Modernization Plan', ministry:'MoALD', status:'implementing', progress:45 },
  { title:'Infrastructure Development Fund', ministry:'MoF', status:'announced', progress:10 },
  { title:'Digital Land Records System', ministry:'MoLRM', status:'implementing', progress:55 },
];

const OFFICIALS = [
  { name:'Balendra Shah', role:'Prime Minister', score:92, trend:'+5', decisions:45 },
  { name:'Swarnim Wagle', role:'Finance Minister', score:88, trend:'+3', decisions:32 },
  { name:'Rabi Lamichhane', role:'Home Affairs Minister', score:85, trend:'+1', decisions:28 },
  { name:'Sumana Shrestha', role:'Education Minister', score:82, trend:'+4', decisions:19 },
  { name:'Toshima Karki', role:'Health Minister', score:79, trend:'+2', decisions:15 },
  { name:'Sobita Gautam', role:'Law & Justice Minister', score:77, trend:'+3', decisions:11 },
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
        {['overview','policies','officials','sources'].map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

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
        <div className="card">
          <div className="card-head"><span className="card-title">🏆 Official Accountability Scorecard</span></div>
          <table className="tbl">
            <thead><tr><th>Official</th><th>Role</th><th>Score</th><th>Trend</th><th>Decisions</th></tr></thead>
            <tbody>
              {OFFICIALS.map((o,i)=>(
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
