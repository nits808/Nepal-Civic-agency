import React, { useState, useMemo } from 'react';
import { isLikelyGovDecisionArticle, scorePublicImpact } from './data.js';
import { FeedItem } from './Dashboard.jsx';
import { EXPLORER_CASES, EXPLORER_POLICIES, EXPLORER_HISTORY } from './explorerData.js';

function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ExplorerPage({ articles }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState('search');
  const [expanded, setExpanded] = useState(false);
  
  // Scoped states for new tabs
  const [expandedCase, setExpandedCase] = useState(null);
  const [policyType, setPolicyType] = useState('domestic');
  const [aiSummaries, setAiSummaries] = useState({});
  const [isSummarizing, setIsSummarizing] = useState({});

  const generateAiSummary = async (caseId, caseTitle, caseArticles) => {
    if (!caseArticles || caseArticles.length === 0) return;
    setIsSummarizing(prev => ({ ...prev, [caseId]: true }));
    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!API_KEY) {
          throw new Error("VITE_GEMINI_API_KEY is not defined. Please check your .env.local file.");
      }

      const prompt = `You are a professional investigative journalist for Nepal Civic Intelligence.\nThe case is: "${caseTitle}".\nRead the following latest news headlines. Write a concise, natural, 2-3 sentence summary explaining the newest developments based on these articles.\n\nLatest News Feed:\n${caseArticles.map(a => `- ${a.title}: ${a.description}`).join('\n')}`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to generate');
      
      const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiSummaries(prev => ({ ...prev, [caseId]: summaryText }));
    } catch (err) {
      console.error(err);
      setAiSummaries(prev => ({ ...prev, [caseId]: `⚠️ AI generation failed: ${err.message}` }));
    } finally {
      setIsSummarizing(prev => ({ ...prev, [caseId]: false }));
    }
  };

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
    const cleanQ = q.replace(/^[^a-z]+/,'').trim();
    let matched = articles.filter(a =>
      (a.title && a.title.toLowerCase().includes(cleanQ)) ||
      (a.description && a.description.toLowerCase().includes(cleanQ)) ||
      (a.category && a.category.toLowerCase().includes(cleanQ)) ||
      (a.province && a.province.toLowerCase().includes(cleanQ)) ||
      (a.district && a.district.toLowerCase().includes(cleanQ)) ||
      (a.source && a.source.toLowerCase().includes(cleanQ))
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

  const totalPolicies = EXPLORER_POLICIES.domestic.length + EXPLORER_POLICIES.foreign.length;

  return (
    <div className="page">
      <div className="page-title">🔗 Policy & News Explorer</div>

      {/* ── Progressive Summary Header ───────────────────────── */}
      <div className="explorer-summary-row" style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div className="card" style={{ flex:1, padding:'12px 16px', minWidth:180, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:'1.8rem', opacity:0.8 }}>📊</div>
          <div>
            <div style={{ fontSize:'1.2rem', fontWeight:800, color:'var(--text-1)' }}>{articles.length}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>Total Indexed Articles</div>
          </div>
        </div>
        <div className="card" style={{ flex:1, padding:'12px 16px', minWidth:180, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:'1.8rem', opacity:0.8 }}>🏛️</div>
          <div>
            <div style={{ fontSize:'1.2rem', fontWeight:800, color:'var(--crimson)' }}>{govDecisions.length}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>Government Signals</div>
          </div>
        </div>
        <div className="card" style={{ flex:1, padding:'12px 16px', minWidth:180, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:'1.8rem', opacity:0.8 }}>📋</div>
          <div>
            <div style={{ fontSize:'1.2rem', fontWeight:800, color:'var(--text-1)' }}>{totalPolicies}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-3)' }}>Tracked Policies</div>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { id: 'search', label: '🔍 Search' },
          { id: 'decisions', label: '🏛️ Gov Decisions' },
          { id: 'cases', label: '⚖️ Investigated Cases' },
          { id: 'policies', label: '📋 Policy Tracker' },
          { id: 'history', label: '📜 Civic History' }
        ].map(({ id, label }) => (
          <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────
          TAB: SEARCH
          ────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────
          TAB: GOV DECISIONS
          ────────────────────────────────────────────────────────── */}
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
              <>
                {govDecisions.slice(0, expanded ? 40 : 5).map(({ article, impact, effectLine, posHits, negHits }) => {
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
               })}
               {govDecisions.length > 5 && (
                 <button onClick={() => setExpanded(e => !e)} className="btn-full">
                   {expanded ? 'Show less' : `Show all ${govDecisions.length} government signals`}
                 </button>
               )}
              </>
            )}
          </div>
        </>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB: INVESTIGATED CASES
          ────────────────────────────────────────────────────────── */}
      {tab === 'cases' && (
        <div className="cases-grid">
          {EXPLORER_CASES.map(c => {
            const isOpen = expandedCase === c.id;
            
            // Find live news mapping to this case
            const caseNews = articles.filter(a => {
              const lowerT = a.title.toLowerCase();
              const lowerD = (a.description || '').toLowerCase();
              return c.keywords.some(kw => lowerT.includes(kw) || lowerD.includes(kw));
            }).slice(0, 5);

            return (
              <div key={c.id} className="card" style={{ borderLeft: '4px solid #b91c1c', cursor: 'pointer' }} onClick={() => setExpandedCase(isOpen ? null : c.id)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-1)' }}>{c.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                      {c.summary}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.keywords.slice(0, 4).map(kw => (
                    <span key={kw} style={{ fontSize:'0.65rem', background:'var(--bg-raised)', color:'var(--text-4)', padding:'2px 8px', borderRadius:10, border:'1px solid var(--border)' }}>
                      #{kw}
                    </span>
                  ))}
                  {caseNews.length > 0 && (
                    <span style={{ fontSize:'0.65rem', background:'rgba(220, 20, 60, 0.1)', color:'var(--crimson)', padding:'2px 8px', borderRadius:10, border:'1px solid rgba(220,20,60,0.3)', fontWeight: 'bold' }}>
                      🔥 {caseNews.length} live updates
                    </span>
                  )}
                </div>

                {isOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', animation: 'msgIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>⏳ Case Timeline</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {c.timeline.map((event, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 4, flexShrink: 0 }}>
                            {event.date}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{event.text}</span>
                        </div>
                      ))}
                    </div>

                    {caseNews.length > 0 && (
                      <div style={{ marginTop: 24, padding: 16, background: 'rgba(124, 58, 237, 0.05)', borderRadius: 8, border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}>
                            ✨ AI Live Case Analysis
                          </h4>
                          <button 
                            onClick={() => generateAiSummary(c.id, c.title, caseNews)}
                            disabled={isSummarizing[c.id]}
                            style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.7rem', fontWeight: 600, cursor: isSummarizing[c.id] ? 'not-allowed' : 'pointer', opacity: isSummarizing[c.id] ? 0.7 : 1 }}>
                            {isSummarizing[c.id] ? 'Synthesizing...' : 'Generate AI Update'}
                          </button>
                        </div>
                        
                        {aiSummaries[c.id] ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-1)', lineHeight: 1.6, padding: '12px', background: 'var(--bg-base)', borderRadius: 6, borderLeft: '3px solid #7c3aed' }}>
                            {aiSummaries[c.id]}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>
                            Click generate to have Gemini read the latest overlapping articles and synthesize a fresh investigation update.
                          </div>
                        )}
                        
                        <div style={{ marginTop: 16 }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>Raw Sources:</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {caseNews.map(a => (
                              <a key={a.id} href={a.link || '#'} target="_blank" rel="noopener noreferrer" 
                                 style={{ display: 'block', textDecoration: 'none', color: 'var(--text-2)', fontSize: '0.75rem' }}>
                                • <span style={{ textDecoration: 'underline' }}>{a.title}</span> <span style={{ color: 'var(--text-4)' }}>({a.source})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{ fontSize:'0.65rem', color:'var(--text-4)', marginTop:12, textAlign:'right' }}>
                  {isOpen ? 'Close' : 'View full timeline'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB: POLICY TRACKER
          ────────────────────────────────────────────────────────── */}
      {tab === 'policies' && (
        <div className="card">
          <div className="card-head" style={{ marginBottom: 16 }}>
            <span className="card-title">📋 Policy Tracking Hub</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPolicyType('domestic')} 
                      className={`chip ${policyType === 'domestic' ? 'on' : ''}`} 
                      style={{ margin: 0, padding: '4px 12px', fontSize: '0.75rem' }}>🇳🇵 Domestic</button>
              <button onClick={() => setPolicyType('foreign')} 
                      className={`chip ${policyType === 'foreign' ? 'on' : ''}`} 
                      style={{ margin: 0, padding: '4px 12px', fontSize: '0.75rem' }}>🌐 Foreign Relations</button>
            </div>
          </div>

          <table className="tbl">
            <thead><tr><th>Policy Title</th><th>Ministry</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              {(EXPLORER_POLICIES[policyType] || []).map((p,i) => (
                <tr key={i}>
                  <td>
                    <div style={{fontWeight:600}}>{p.title}</div>
                    <div style={{fontSize:'0.7rem', color:'var(--text-4)', marginTop: 4}}>{p.desc}</div>
                  </td>
                  <td className="muted small">{p.ministry}</td>
                  <td>
                    <span className={`badge ${
                      p.status==='approved'||p.status==='implementing' ? 'badge-green' :
                      p.status==='ongoing' ? 'badge-blue' : 'badge-amber'
                    }`}>{p.status}</span>
                  </td>
                  <td style={{minWidth:140}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="prog-bar" style={{flex:1}}>
                        <div className="prog-fill" style={{width:`${p.progress}%`, background: policyType === 'foreign' ? '#7c3aed' : ''}}/>
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

      {/* ──────────────────────────────────────────────────────────
          TAB: CIVIC HISTORY
          ────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="history-grid" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.05), rgba(22,101,52,0.05))' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              📜 National Security & Civic Milestones
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
              A definitive timeline of crucial interventions and structural formations by Nepal's security apparatus and government bodies. Organized for accurate historical tracking.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {EXPLORER_HISTORY.map((agency, i) => (
              <div key={i} className="card" style={{ borderTop: `4px solid ${agency.color}` }}>
                <h4 style={{ margin: '0 0 16px 0', color: agency.color }}>{agency.agency}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {agency.events.map((evt, j) => (
                    <div key={j} style={{ position: 'relative', paddingLeft: 16, borderLeft: `2px solid ${agency.color}40` }}>
                      <div style={{ position: 'absolute', left: -5, top: 2, width: 8, height: 8, borderRadius: '50%', background: agency.color }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 2 }}>{evt.year}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{evt.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-4)', lineHeight: 1.4 }}>{evt.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
