import React, { useState, useMemo } from 'react';
import { isLikelyGovDecisionArticle, scorePublicImpact } from './data.js';
import { FeedItem } from './Dashboard.jsx';

function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

const POLICIES = [
  { title:'Digital Nepal Framework 2026-2030', ministry:'MoICT', status:'implementing', progress:35 },
  { title:'National Health Insurance Expansion', ministry:'MoHP', status:'approved', progress:60 },
  { title:'Clean Energy Act 2026', ministry:'MoEWRI', status:'in committee', progress:20 },
  { title:'Agricultural Modernization Plan', ministry:'MoALD', status:'implementing', progress:45 },
  { title:'Infrastructure Development Fund', ministry:'MoF', status:'announced', progress:10 },
];

export function ExplorerPage({ articles }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState('search');

  const govDecisions = useMemo(() => {
    const rows = articles.filter(isLikelyGovDecisionArticle).map((a) => {
      const analysis = scorePublicImpact(`${a.title} ${a.description || ''}`);
      return { article: a, ...analysis };
    });
    rows.sort((a, b) => {
      const ta = new Date(a.article.date || 0).getTime();
      const tb = new Date(b.article.date || 0).getTime();
      return tb - ta;
    });
    return rows;
  }, [articles]);

  const impactStyle = {
    positive: { label: 'Likely positive for public', icon: '✓', className: 'impact-pos' },
    negative: { label: 'Likely negative for public', icon: '✗', className: 'impact-neg' },
    mixed: { label: 'Mixed / trade-offs', icon: '◐', className: 'impact-mix' },
    unclear: { label: 'Impact unclear from excerpt', icon: '?', className: 'impact-unc' },
  };

  const search = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    // strip emoji prefix if user clicked a sample chip
    const cleanQ = q.replace(/^[^a-z]+/,'').trim();
    let matched = articles.filter(a =>
      a.title.toLowerCase().includes(cleanQ) ||
      a.description?.toLowerCase().includes(cleanQ) ||
      a.category.toLowerCase().includes(cleanQ) ||
      a.province?.toLowerCase().includes(cleanQ) ||
      a.district?.toLowerCase().includes(cleanQ) ||
      a.source?.toLowerCase().includes(cleanQ)
    );
    setResults({ query, articles: matched.slice(0, 30), total: matched.length });
  };

  const samples = [
    '🏛️ Show political news',
    '🚨 Disaster reports',
    '💰 Economic news',
    '📍 News in Bagmati',
    '🏥 Health updates',
    '⚖️ cabinet minister policy',
  ];

  const cypher = query
    ? `MATCH (e:Event)\nWHERE toLower(e.title) CONTAINS '${query.toLowerCase()}'\n   OR toLower(e.content) CONTAINS '${query.toLowerCase()}'\nRETURN e.title, e.category, e.province, e.date\nORDER BY e.date DESC LIMIT 30`
    : '// Enter a search query above to generate a Cypher query';

  const cypherGovImpact = `// Example: government decisions → public impact (graph model)
MATCH (d:GovernmentDecision)-[r:AFFECTS]->(g:PublicGroup)
WHERE r.polarity IN ['positive','negative','mixed']
RETURN d.title, d.date, r.polarity, g.segment
ORDER BY d.date DESC LIMIT 25`;

  return (
    <div className="page">
      <div className="page-title">🔗 Knowledge Graph Explorer</div>

      <div className="tabs">
        {[
          { id: 'search', label: '🔍 Search' },
          { id: 'decisions', label: '🏛️ Gov decisions' },
          { id: 'policies', label: '📋 Policies' },
          { id: 'graph', label: '🔗 Cypher' },
        ].map(({ id, label }) => (
          <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <div className="card mb-4">
            <div style={{display:'flex',gap:10,marginBottom:12}}>
              <input className="search-input" style={{marginBottom:0,flex:1}}
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key==='Enter' && search()}
                placeholder="Search articles by keyword, category, province, district…"/>
              <button onClick={search} style={{
                padding:'9px 20px',background:'linear-gradient(135deg,#3b82f6,#2563eb)',
                border:'none',borderRadius:'var(--r)',color:'white',fontWeight:700,
                cursor:'pointer',whiteSpace:'nowrap',fontSize:'0.82rem',
              }}>Search 🔍</button>
            </div>
            <div className="chips">
              {samples.map((s,i) => (
                <button key={i} className="chip" onClick={() => {
                  const q = s.replace(/^[^\s]+\s/,'');
                  setQuery(q); 
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {results && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">
                  📊 {results.total} results for "{results.query}"
                </span>
                <span className="badge badge-blue">{results.articles.length} shown</span>
              </div>
              <div className="feed" style={{maxHeight:550}}>
                {results.articles.length === 0
                  ? <div style={{textAlign:'center',padding:'40px 0',color:'#64748b'}}>No results found</div>
                  : results.articles.map(a => <FeedItem key={a.id} article={a} />)
                }
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'decisions' && (
        <>
          <div className="card mb-4" style={{
            borderTop: '3px solid #DC143C',
            background: 'linear-gradient(135deg, rgba(220,20,60,0.04), rgba(0,56,147,0.04))',
          }}>
            <div className="card-head">
              <span className="card-title">🏛️ Latest government decisions & public impact</span>
              <span className="card-sub">{govDecisions.length} items from live feeds</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.65, marginBottom: 0 }}>
              Pulled from government-tagged sources and headlines that mention cabinet, ministries, budget, and similar signals.
              <strong> Impact labels are automated keyword hints only</strong> — not policy analysis; always read the official source.
            </p>
          </div>

          <div className="decision-grid">
            {govDecisions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-3)' }}>
                No government-flavoured items yet. Refresh feeds or try the Search tab with “cabinet”, “budget”, or “ministry”.
              </div>
            ) : (
              govDecisions.slice(0, 40).map(({ article, impact, effectLine, posHits, negHits }) => {
                const meta = impactStyle[impact] || impactStyle.unclear;
                const loc = [article.district, article.province].filter(Boolean).join(', ') || 'Nepal';
                return (
                  <article key={article.id} className={`decision-card ${meta.className}`}>
                    <div className="decision-card-top">
                      <span className={`impact-pill ${meta.className}`} title="Automated hint from headline + excerpt">
                        <span className="impact-pill-icon">{meta.icon}</span>
                        {meta.label}
                      </span>
                      <time className="decision-date" dateTime={article.date}>
                        {formatShortDate(article.date)} · {article.timeAgo}
                      </time>
                    </div>
                    <a className="decision-title" href={article.link || '#'} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                    <p className="decision-effect">{effectLine}</p>
                    {(article.description || '').trim() && (
                      <p className="decision-summary">{(article.description || '').slice(0, 220)}{(article.description || '').length > 220 ? '…' : ''}</p>
                    )}
                    <div className="decision-foot">
                      <span>📍 {loc}</span>
                      <span>📰 {article.source}</span>
                      <span className="decision-signal muted">
                        cues +{posHits} / −{negHits}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}

      {tab === 'policies' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">📋 Nepal Policy Tracker</span>
            <span className="card-sub">{POLICIES.length} active policies</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Policy Title</th><th>Ministry</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              {POLICIES.map((p,i) => (
                <tr key={i}>
                  <td style={{fontWeight:600}}>{p.title}</td>
                  <td className="muted small">{p.ministry}</td>
                  <td>
                    <span className={`badge ${
                      p.status==='approved'||p.status==='implementing' ? 'badge-green' :
                      p.status==='announced' ? 'badge-blue' : 'badge-amber'
                    }`}>{p.status}</span>
                  </td>
                  <td style={{minWidth:140}}>
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

      {tab === 'graph' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><span className="card-title">⚡ Cypher Query Generator</span></div>
            <input className="search-input" value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Type query topic to generate Cypher…"/>
            <pre style={{
              padding:14, background:'var(--bg-base)',
              borderRadius:'var(--r)', fontSize:'0.75rem',
              fontFamily:'var(--mono)', color:'#60a5fa',
              overflowX:'auto', lineHeight:1.8,
              border:'1px solid var(--border)', whiteSpace:'pre-wrap',
              wordBreak:'break-word',
            }}>{cypher}</pre>
            <div className="card-head" style={{ marginTop: 14 }}><span className="card-title">🏛️ Gov decision → impact (template)</span></div>
            <pre style={{
              padding:14, background:'var(--bg-base)',
              borderRadius:'var(--r)', fontSize:'0.75rem',
              fontFamily:'var(--mono)', color:'#34d399',
              overflowX:'auto', lineHeight:1.8,
              border:'1px solid var(--border)', whiteSpace:'pre-wrap',
              wordBreak:'break-word',
            }}>{cypherGovImpact}</pre>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">🔗 Graph Schema</span></div>
            <div style={{fontSize:'0.78rem',lineHeight:2,color:'#94a3b8',fontFamily:'var(--mono)'}}>
              <div style={{color:'#60a5fa',fontWeight:700,marginBottom:8}}>Node Types</div>
              {['(:Event {title, category, date, province})','(:GovernmentDecision {title, date, impactHint})','(:Location {name, type, lat, lng})','(:Person {name, role, score})','(:Organization {name, type})','(:Policy {title, status, ministry})','(:PublicGroup {segment}) — e.g. citizens, workers, farmers'].map((n,i)=>(
                <div key={i} style={{marginBottom:4,color:'#c4b5fd'}}>{n}</div>
              ))}
              <div style={{color:'#60a5fa',fontWeight:700,margin:'12px 0 8px'}}>Relationships</div>
              {['(:GovernmentDecision)-[:AFFECTS {polarity}]->(:PublicGroup)','-[:LOCATED_IN]->','-[:ISSUED_BY]->(:Organization)','-[:RELATED_TO]->','-[:MENTIONS]->'].map((r,i)=>(
                <div key={i} style={{marginBottom:4,color:'#6ee7b7'}}>{r}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
