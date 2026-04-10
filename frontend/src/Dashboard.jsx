import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CAT_COLORS, CAT_ICONS, PROVINCES, resolveArticleImage, isSourceVerified, articleLocation } from './data.js';
import { useModal } from './ModalContext.jsx';
import { SkeletonFeedItem } from './UIComponents.jsx';


// â”€â”€ Shared sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatNewsDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  let d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-NP', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}



export function StatCard({ icon, value, label, sub, color }) {
  return (
    <div className="stat-card" style={color ? { borderTop:`2px solid ${color}` } : {}}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-val" style={color ? { color } : {}}>{value}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-chg">{sub}</div>}
    </div>
  );
}

// â”€â”€ Read time estimator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function readTime(text) {
  const words = (text || '').trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// â”€â”€ Source initials map (Online Khabar / KP style badge) â”€â”€â”€â”€â”€
const SOURCE_INITIALS = {
  'The Kathmandu Post':'KP',  'The Himalayan Times':'HT',
  'My Republica':'MR',        'Nepali Times':'NT',
  'Online Khabar':'OK',       'Setopati English':'SP',
  'Ratopati English':'RP',    'Nepal News':'NN',
  'Lokaantar':'LK',           'Baahrakhari':'BK',
  'Ujyaalo Online':'UJ',      'Gorkhapatra Daily':'GP',
  'BBC Nepali':'BBC',         'Al Jazeera Asia':'AJ',
  'The Record Nepal':'RN',    'The Annapurna Express':'AE',
  'Khabarhub English':'KH',   'Nepal Live Today':'NLT',
};
function srcInitials(name) {
  if (!name) return '?';
  return SOURCE_INITIALS[name] || name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FeedItem - Upgraded (Online Khabar + KP + MyRepublica inspired)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function FeedItem({ article, compact = false }) {
  const c   = article.category || 'politics';
  const clr = CAT_COLORS[c] || '#6b7280';
  const summary = (article.description || '').trim();
  const loc = articleLocation(article);
  const { openModal } = useModal();
  const img = resolveArticleImage(article);
  const mins = readTime(summary);

  // Breaking: < 90 min old + urgent keywords
  const dateVal = article.date ? new Date(article.date).getTime() : Date.now();
  const ageMin = Math.floor((Date.now() - dateVal) / 60000);
  const urgentKw = /killed|arrest|earthquake|flood|crash|fire|protest|storm|dead|attack|shooting|explosion/i;
  const combinedText = (article.title || '') + ' ' + (summary || '');
  const isBreaking = ageMin < 90 && urgentKw.test(combinedText);

  // Only show image if it's a real RSS-extracted image (no stock photos)
  const hasImg = article.hasRealImage && img.url;
  const verified = isSourceVerified(article.source);

  // -- COMPACT mode - MyRepublica "Latest" style high-density list --
  if (compact) {
    return (
      <a className={`feed-compact cat-${c}`}
        href={article.link || '#'}
        onClick={e => { e.preventDefault(); openModal({ ...article, imageUrl: img.url }); }}>
        <div className="feed-compact-accent" style={{ background: clr }} />
        <div className="feed-compact-body">
          <div className="feed-compact-meta">
            <span className="feed-src-badge" style={{ background:`${clr}20`, color:clr }}>
              {srcInitials(article.source)}
              {verified && <span className="verified-tick" title="Verified Source"> &#10003;</span>}
            </span>
            {isBreaking && <span className="breaking-pill">BREAKING</span>}
            <span className="feed-ct">{article.timeAgo || 'just now'}</span>
            <span className="feed-readtime"> | {mins}m</span>
          </div>
          <div className="feed-compact-title">{article.title || 'Untitled Article'}</div>
        </div>
        {hasImg && (
          <div className="feed-compact-thumb"
            style={{ backgroundImage:`url(${img.url})` }} />
        )}
      </a>
    );
  }

  // -- FEATURE card - KP + Online Khabar inspired --
  return (
    <a className={`feed-item cat-${c}`}
      href={article.link || '#'}
      onClick={e => { e.preventDefault(); openModal({ ...article, imageUrl: img.url }); }}
      target="_blank" rel="noopener noreferrer">

      {/* Left accent bar */}
      <div className="feed-accent" style={{ background: clr }} />

      {/* Main body */}
      <div className="feed-body">
        {/* Top row: source badge + name + breaking + time */}
        <div className="feed-top-row">
          <span className="feed-src-badge" style={{ background:`${clr}20`, color:clr }}>
            {srcInitials(article.source)}
          </span>
          <span className="feed-source-name">
            {article.source}
            {verified && <span className="verified-tick" title="Verified Source"> &#10003;</span>}
          </span>
          {isBreaking && <span className="breaking-pill">🔴 BREAKING</span>}
          <span className="feed-time-right">{article.timeAgo}</span>
        </div>

        {/* Title */}
        <div className="feed-title">{article.title}</div>

        {/* Summary */}
        {summary && (
          <div className="mini-summary">
            {summary.slice(0, 160)}{summary.length > 160 ? '...' : ''}
          </div>
        )}

        {/* Footer: location + read time */}
        <div className="feed-footer-row">
          <span className="feed-loc-pin">📍 {loc}</span>
          <span className="feed-readtime">⏱ {mins} min read</span>
        </div>
      </div>

      {/* Right: real image with category badge, or elegant text-card */}
      {hasImg ? (
        <div className="feed-thumb" style={{ backgroundImage:`url(${img.url})` }}>
          {/* Online Khabar style: category overlaid on image */}
          <div className="feed-img-cat-badge" style={{ background: clr }}>
            {CAT_ICONS[c]} {c}
          </div>
          <div className="feed-thumb-overlay" />
        </div>
      ) : (
        /* KP Opinion style: styled text tile - NO fake stock photos */
        <div className="feed-text-card"
          style={{ background:`linear-gradient(135deg,${clr}18,${clr}05)`, borderLeft:`3px solid ${clr}40` }}>
          <div className="feed-text-card-icon">{CAT_ICONS[c] || '📰'}</div>
          <div className="feed-text-card-cat" style={{ color: clr }}>{c.toUpperCase()}</div>
          <div className="feed-text-card-src">{srcInitials(article.source)}</div>
        </div>
      )}
    </a>
  );
}

// -- Tooltip for charts ----------------------------------------------------
const TTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ color:'#111827', fontWeight:700 }}>{p.name || p.payload?.name}</div>
      <div style={{ color:'#6b7280' }}>{p.value} articles</div>
    </div>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Tab: Overview (charts + source performance)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function OverviewTab({ articles, loading, stats }) {
  return (
    <>
      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-head">
            <span className="card-title">📊 Category Breakdown</span>
            <span className="card-sub">{articles.length} articles</span>
          </div>
          {loading ? <div className="skel" style={{ height:220 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.catData} dataKey="value" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {stats.catData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<TTip />} />
                <Legend iconType="circle" iconSize={9}
                  formatter={v => <span style={{ color:'#cbd5e1', fontSize:11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">🗺️ Coverage by Province</span>
            <span className="card-sub">7 provinces</span>
          </div>
          {loading ? <div className="skel" style={{ height:220 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.provData} margin={{ left:-16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,150,0.15)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip content={<TTip />} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {stats.provData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-head">
          <span className="card-title">📡 Source Performance</span>
          <span className="card-sub">{Object.keys(stats.bySrc).length} active sources</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {Object.entries(stats.bySrc).sort((a,b) => b[1]-a[1]).map(([src, count], i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:'0.75rem', color:'#94a3b8', width:140, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {src}
              </div>
              <div style={{ flex:1, height:7, background:'#1e2a3a', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  width:`${(count / Math.max(...Object.values(stats.bySrc)))*100}%`,
                  height:'100%', background:'linear-gradient(90deg,#3b82f6,#10b981)',
                  borderRadius:4, transition:'width 1.2s',
                }} />
              </div>
              <span style={{ fontSize:'0.72rem', color:'#f1f5f9', fontWeight:700, width:28, textAlign:'right' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Tab: Category News feed with Summary header + view-mode toggle
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function CategoryNewsTab({ articles, loading, category, search, setSearch }) {
  const [viewMode, setViewMode] = useState('feature'); // 'feature' | 'compact'

  const filtered = useMemo(() => {
    let r = articles;
    if (category === 'provincial') {
      r = articles.filter(a => a.province && a.province !== 'National' && a.province !== 'International');
    } else if (category !== 'all') {
      r = articles.filter(a => a.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q));
    }
    return r;
  }, [articles, category, search]);

  const catColor = category === 'provincial' ? '#f59e0b' : (CAT_COLORS[category] || '#1a6aff');
  const catIcon  = category === 'provincial' ? '📍' : (CAT_ICONS[category] || '📄');

  const catArticles = useMemo(() => {
    if (category === 'provincial') return articles.filter(a => a.province && a.province !== 'National' && a.province !== 'International');
    if (category === 'all') return articles;
    return articles.filter(a => a.category === category);
  }, [articles, category]);

  const topProvince = useMemo(() => {
    const m = {};
    catArticles.forEach(a => { m[a.province] = (m[a.province]||0)+1; });
    return Object.entries(m).sort((a,b) => b[1]-a[1])[0];
  }, [catArticles]);

  const topSource = useMemo(() => {
    const m = {};
    catArticles.forEach(a => { m[a.source] = (m[a.source]||0)+1; });
    return Object.entries(m).sort((a,b) => b[1]-a[1])[0];
  }, [catArticles]);

  const latest = catArticles.length ? catArticles.reduce((best, a) => {
    const t  = new Date(a.date || 0).getTime();
    const bt = new Date(best.date || 0).getTime();
    return t > bt ? a : best;
  }, catArticles[0]) : null;

  return (
    <>
      {/* Summary card */}
      {!loading && catArticles.length > 0 && (
        <div className="card mb-4" style={{ borderTop:`3px solid ${catColor}`, background:`linear-gradient(135deg,${catColor}06 0%,white 100%)` }}>
          <div className="card-head">
            <span className="card-title">
              {catIcon} {category === 'all' ? 'All Nepal News' : category === 'provincial' ? 'Provincial & Local News' : category.charAt(0).toUpperCase()+category.slice(1)} - Summary
            </span>
            <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:12, background:`${catColor}15`, color:catColor, border:`1px solid ${catColor}30` }}>
              {catArticles.length} articles
            </span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
            <div style={{ padding:'10px 14px', background:'var(--bg-raised)', borderRadius:8, borderLeft:`3px solid ${catColor}` }}>
              <div style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600, marginBottom:4 }}>TOTAL ARTICLES</div>
              <div style={{ fontSize:'1.4rem', fontWeight:900, color:catColor }}>{catArticles.length}</div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>From {[...new Set(catArticles.map(a=>a.source))].length} sources</div>
            </div>
            {topProvince && (
              <div style={{ padding:'10px 14px', background:'var(--bg-raised)', borderRadius:8, borderLeft:'3px solid #1a6aff' }}>
                <div style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600, marginBottom:4 }}>TOP PROVINCE</div>
                <div style={{ fontSize:'0.9rem', fontWeight:800, color:'var(--text-1)' }}>📍 {topProvince[0]}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>{topProvince[1]} articles</div>
              </div>
            )}
            {topSource && (
              <div style={{ padding:'10px 14px', background:'var(--bg-raised)', borderRadius:8, borderLeft:'3px solid #7c3aed' }}>
                <div style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600, marginBottom:4 }}>TOP SOURCE</div>
                <div style={{ fontSize:'0.85rem', fontWeight:800, color:'var(--text-1)' }}>📰 {topSource[0]}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-3)' }}>{topSource[1]} articles</div>
              </div>
            )}
            {latest?.title && (
              <div style={{ padding:'10px 14px', background:'var(--bg-raised)', borderRadius:8, borderLeft:'3px solid #059669' }}>
                <div style={{ fontSize:'0.65rem', color:'var(--text-4)', fontWeight:600, marginBottom:4 }}>LATEST</div>
                <div style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-1)', lineHeight:1.4 }}>
                  {latest.title.slice(0,60)}{latest.title.length>60?'...':''}
                </div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-4)', marginTop:3 }}>{latest.timeAgo}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feed card with view-mode toggle */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">
            {catIcon} {category==='all' ? 'All News' : category==='provincial' ? 'Provincial & Local News' : category.charAt(0).toUpperCase()+category.slice(1)+' News'}
            <span style={{ marginLeft:8, fontSize:'0.7rem', padding:'2px 8px', borderRadius:12,
              background:`${catColor}15`, color:catColor, border:`1px solid ${catColor}30`, fontWeight:700 }}>
              {filtered.length} articles
            </span>
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="card-sub">
              {loading ? '⏳ Fetching...' : `${catArticles.length} total`}
            </span>
            {/* View Mode Toggle - Feature / Compact */}
            <div className="view-toggle">
              <button
                className={`view-toggle-btn${viewMode==='feature'?' active':''}`}
                onClick={() => setViewMode('feature')}
                title="Feature cards - image + summary">
                GRID
              </button>
              <button
                className={`view-toggle-btn${viewMode==='compact'?' active':''}`}
                onClick={() => setViewMode('compact')}
                title="Compact list - high density">
                LIST
              </button>
            </div>
          </div>
        </div>

        <input className="search-input"
          placeholder={`🔍 Search ${category==='all'?'all news':category+' news'}...`}
          value={search} onChange={e => setSearch(e.target.value)}/>

        <div className={`feed${viewMode==='compact'?' feed-compact-list':''}`}
          style={{ maxHeight: viewMode==='compact' ? 700 : 580 }}>
          {loading
            ? Array.from({length:6}).map((_,i) => <SkeletonFeedItem key={i} />)
            : filtered.length === 0
              ? (
                <div style={{ textAlign:'center', padding:'50px 20px' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>{catIcon}</div>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-2)', marginBottom:6 }}>
                    {category === 'all' ? 'No articles found' : `No ${category} articles found`}
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'var(--text-4)', lineHeight:1.7 }}>
                    {search
                      ? `No results for "${search}" - try different keywords`
                      : articles.length === 0
                        ? 'Feeds are loading. Click 🔄 Refresh in the topbar.'
                        : `None of the ${articles.length} loaded articles matched this category. Try the "All News" tab.`
                    }
                  </div>
                </div>
              )
              : filtered.map(a => <FeedItem key={a.id} article={a} compact={viewMode==='compact'} />)
          }
        </div>
      </div>
    </>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Dashboard
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const TABS = [
  { id:'overview',       label:'Overview',         icon:'📊' },
  { id:'all',            label:'All News',         icon:'📰' },
  { id:'provincial',     label:'Provincial',       icon:'📍' },
  { id:'international',  label:'International',    icon:'🌎' },
  { id:'politics',       label:'Politics',         icon:'🏛️' },
  { id:'economy',        label:'Economy',          icon:'💰' },
  { id:'technology',     label:'Technology',       icon:'💻' },
  { id:'disaster',       label:'Disaster',         icon:'🚨' },
  { id:'health',         label:'Health',           icon:'🏥' },
  { id:'infrastructure', label:'Infrastructure',   icon:'🏗️' },
  { id:'education',      label:'Education',        icon:'🎓' },
  { id:'sports',         label:'Sports',           icon:'⚽' },
  { id:'tourism',        label:'Tourism',          icon:'✈️' },
  { id:'environment',    label:'Environment',      icon:'🌍' },
  { id:'law',            label:'Law & Crime',      icon:'⚖️' },
];

export function Dashboard({ articles, loading, lastUpdated, refetch }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch]       = useState('');
  const [dismissed, setDismissed] = useState(false);

  const stats = useMemo(() => {
    const byCat = {}, byProv = {}, bySrc = {};
    articles.forEach(a => {
      byCat[a.category]  = (byCat[a.category]  || 0) + 1;
      byProv[a.province] = (byProv[a.province] || 0) + 1;
      bySrc[a.source]    = (bySrc[a.source]    || 0) + 1;
    });
    const catData = Object.entries(byCat)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#64748b' }))
      .sort((a, b) => b.value - a.value);
    const provData = PROVINCES.map(p => ({
      name: p.name.replace('Province No. ', 'P'),
      value: byProv[p.name] || 0,
      fill: p.color,
    }));
    return { byCat, byProv, bySrc, catData, provData };
  }, [articles]);

  const disasterArticles = articles.filter(a => a.category === 'disaster');

  const handleTab = (id) => { setActiveTab(id); setSearch(''); };

  return (
    <div className="page">
      {/* Disaster banner */}
      {!dismissed && disasterArticles.length > 0 && (
        <div className="alert-strip">
          <span className="a-icon">🚨</span>
          <span className="a-text">{disasterArticles[0].title}</span>
          <span className="a-time">{disasterArticles[0].timeAgo}</span>
          <button className="a-close" onClick={() => setDismissed(true)}>✕</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-row">
        <StatCard icon="📰" value={loading?'...':articles.length} label="Total Articles" sub="Live feeds" />
        <StatCard icon="🚨" value={loading?'...':(stats.byCat.disaster||0)} label="Disaster" sub="Auto-detected" color="#ef4444" />
        <StatCard icon="🏛️" value={loading?'...':(stats.byCat.politics||0)} label="Politics" sub="Tracked" color="#3b82f6" />
        <StatCard icon="💰" value={loading?'...':(stats.byCat.economy||0)} label="Economy" sub="Analyzed" color="#f59e0b" />
        <StatCard icon="🏥" value={loading?'...':(stats.byCat.health||0)} label="Health" sub="Monitored" color="#ec4899" />
        <StatCard icon="🏗️" value={loading?'...':(stats.byCat.infrastructure||0)} label="Infrastructure" sub="Tracked" color="#8b5cf6" />
      </div>

      {/* Tab bar */}
      <div style={{ overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
        <div style={{ display:'flex', gap:2, padding:3, background:'var(--bg-raised)', borderRadius:'var(--r)', border:'1px solid var(--border)', width:'max-content', minWidth:'100%' }}>
          {TABS.map(t => {
            const count = t.id === 'provincial'
              ? articles.filter(a => a.province && a.province !== 'National' && a.province !== 'International').length
              : t.id !== 'overview' && t.id !== 'all' ? stats.byCat[t.id] : null;
            const isActive = activeTab === t.id;
            const tColor = t.id === 'provincial' ? '#f59e0b' : (CAT_COLORS[t.id] || 'var(--blue-600)');
            return (
              <button key={t.id} onClick={() => handleTab(t.id)} style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'7px 13px', borderRadius:7, border:'none',
                background: isActive ? tColor : 'none',
                color: isActive ? 'white' : 'var(--text-3)',
                fontSize:'0.78rem', fontWeight:600, fontFamily:'var(--font)',
                cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.14s',
                boxShadow: isActive ? `0 2px 10px ${tColor}66` : 'none',
              }}>
                {t.icon} {t.label}
                {count ? (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : `${tColor}22`,
                    color: isActive ? 'white' : tColor,
                    fontSize:'0.6rem', fontWeight:800,
                    padding:'1px 5px', borderRadius:8, minWidth:16, textAlign:'center',
                  }}>{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Refresh bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:'0.78rem', color:'var(--text-4)' }}>
          {loading ? '⏳ Fetching live news...' : `✅ ${articles.length} articles loaded from ${Object.keys(stats.bySrc).length} sources`}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {lastUpdated && <span style={{ fontSize:'0.68rem', color:'var(--text-4)' }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={refetch} style={{
            padding:'5px 13px', borderRadius:6, fontSize:'0.72rem', fontWeight:700,
            background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)',
            color:'#60a5fa', cursor:'pointer',
          }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview'
        ? <OverviewTab articles={articles} loading={loading} stats={stats} />
        : <CategoryNewsTab
            articles={articles}
            loading={loading}
            category={activeTab}
            search={search}
            setSearch={setSearch}
          />
      }
    </div>
  );
}

