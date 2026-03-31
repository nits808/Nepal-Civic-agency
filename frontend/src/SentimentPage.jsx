// ═══════════════════════════════════════════════════════════════
// NCIG Frontend — Nepal Civic Sentiment Dashboard
// Real-time structured sentiment analytics powered by backend
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, BarChart, Bar, RadialBarChart, RadialBar,
} from 'recharts';
import { CAT_ICONS, CAT_COLORS, resolveArticleImage } from './data.js';
import { ANALYTICS_API_BASE_URL } from './config.js';

const BACKEND = ANALYTICS_API_BASE_URL;

// ── Gauge Component ─────────────────────────────────────────
function MoodGauge({ score }) {
  const clamped = Math.max(-100, Math.min(100, score));
  const pct = (clamped + 100) / 2; // 0–100
  const color = clamped >= 30 ? '#10b981' : clamped >= 10 ? '#84cc16' :
                clamped >= -10 ? '#94a3b8' : clamped >= -30 ? '#f59e0b' : '#ef4444';
  const label = clamped >= 30 ? 'Very Positive' : clamped >= 10 ? 'Positive' :
                clamped >= -10 ? 'Neutral' : clamped >= -30 ? 'Negative' : 'Very Negative';
  const rotation = -90 + (pct / 100) * 180;

  return (
    <div className="mood-gauge-wrap">
      <svg viewBox="0 0 200 110" width="200" height="110" className="mood-gauge-svg">
        {/* Track */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--bg-raised)" strokeWidth="14" strokeLinecap="round" />
        {/* Segments */}
        {[
          { color:'#ef4444', pct:0, len:20 },
          { color:'#f59e0b', pct:20, len:20 },
          { color:'#94a3b8', pct:40, len:20 },
          { color:'#84cc16', pct:60, len:20 },
          { color:'#10b981', pct:80, len:20 },
        ].map(({ color: c, pct: start, len }, i) => {
          const startAngle = -90 + (start / 100) * 180;
          const endAngle   = -90 + ((start + len) / 100) * 180;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad   = (endAngle * Math.PI) / 180;
          const x1 = 100 + 80 * Math.cos(startRad);
          const y1 = 100 + 80 * Math.sin(startRad);
          const x2 = 100 + 80 * Math.cos(endRad);
          const y2 = 100 + 80 * Math.sin(endRad);
          return (
            <path key={i}
              d={`M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`}
              fill="none" stroke={c} strokeWidth="14" strokeLinecap="round" opacity={0.3}
            />
          );
        })}
        {/* Active fill */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="14"
          strokeLinecap="round" strokeDasharray={`${pct * 2.52} 252`} style={{ transition:'stroke-dasharray 1s ease' }} />
        {/* Needle */}
        <g transform={`rotate(${rotation}, 100, 100)`} style={{ transition:'transform 1s ease' }}>
          <line x1="100" y1="100" x2="100" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill={color} />
        </g>
        {/* Score */}
        <text x="100" y="96" textAnchor="middle" fontSize="22" fontWeight="900" fill={color}>{clamped > 0 ? '+' : ''}{clamped}</text>
      </svg>
      <div className="mood-gauge-label" style={{ color }}>{label}</div>
      <div className="mood-gauge-sub">Nepal Civic Mood Index</div>
    </div>
  );
}

// ── Sentiment Bar for category / province ───────────────────
function SentimentBar({ label, score, count, color }) {
  const pct = Math.max(0, ((score + 100) / 200) * 100);
  const c = score >= 20 ? '#10b981' : score >= 5 ? '#84cc16' :
            score >= -5 ? '#94a3b8' : score >= -20 ? '#f59e0b' : '#ef4444';
  return (
    <div className="sent-bar-row">
      <div className="sent-bar-label">{label}</div>
      <div className="sent-bar-track">
        <div className="sent-bar-fill" style={{ width: `${pct}%`, background: c }} />
        <div className="sent-bar-center" />
      </div>
      <div className="sent-bar-score" style={{ color: c }}>
        {score > 0 ? '+' : ''}{score}
      </div>
      <div className="sent-bar-count">{count}</div>
    </div>
  );
}

// ── Article Signal Card ─────────────────────────────────────
function ArticleSignalCard({ article, type }) {
  const img = resolveArticleImage(article);
  const s = article.sentiment;
  return (
    <a href={article.link || '#'} target="_blank" rel="noopener noreferrer" className="signal-card">
      <div className="signal-card-img" style={{ backgroundImage: `url(${img.url})` }} />
      <div className="signal-card-body">
        <div className="signal-card-meta">
          <span className="signal-type-pill" style={{ background: type === 'positive' ? '#10b98115' : '#ef444415', color: type === 'positive' ? '#10b981' : '#ef4444', border: `1px solid ${type === 'positive' ? '#10b98130' : '#ef444430'}` }}>
            {s.emoji} {s.label}
          </span>
          <span className="signal-impact">⚡{s.impact} impact</span>
        </div>
        <div className="signal-card-title">{article.title}</div>
        <div className="signal-card-foot">
          <span>{article.source}</span>
          <span>{article.timeAgo}</span>
        </div>
        <div className="signal-keywords">
          {(s.topSignals || []).slice(0, 3).map((sig, i) => (
            <span key={i} className="kw-chip" style={{ color: sig.weight > 0 ? '#10b981' : '#ef4444', background: sig.weight > 0 ? '#10b98112' : '#ef444412' }}>
              {sig.weight > 0 ? '+' : ''}{sig.phrase}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
}

// ── Main Sentiment Page ─────────────────────────────────────
export default function SentimentPage({ articles }) {
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');     // province filter
  const [view, setView]         = useState('overview'); // overview | category | province | signals

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      // Try backend first
      const res = await fetch(`${BACKEND}/api/sentiment?limit=400`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        setReport(await res.json());
        setLoading(false);
        return;
      }
    } catch { /* backend offline, use client-side analysis */ }

    // Client-side fallback: compute in-browser
    const { computeSentimentReport } = await import('./sentimentClient.js');
    const r = computeSentimentReport(articles);
    setReport(r);
    setLoading(false);
  }, [articles]);

  useEffect(() => { loadReport(); }, [loadReport]);

  if (loading) return (
    <div className="sent-loading">
      <div className="sent-loading-spinner" />
      <div>Analyzing {articles.length} articles for Nepal civic sentiment…</div>
    </div>
  );

  if (!report) return <div className="sent-loading">Failed to compute sentiment report.</div>;

  const catEntries = Object.entries(report.byCategory || {})
    .sort((a, b) => b[1].avg - a[1].avg);
  const provEntries = Object.entries(report.byProvince || {})
    .filter(([k]) => k !== 'International')
    .sort((a, b) => b[1].avg - a[1].avg);

  const gaugeLabelOverall = report.label;
  const scoreColor = report.overall >= 20 ? '#10b981' : report.overall >= 5 ? '#84cc16' :
                     report.overall >= -5 ? '#94a3b8' : report.overall >= -20 ? '#f59e0b' : '#ef4444';

  return (
    <div className="sent-page">
      {/* ── Header */}
      <div className="sent-hero">
        <div className="sent-hero-left">
          <h1 className="sent-title">🧠 Nepal Civic Mood Intelligence</h1>
          <p className="sent-subtitle">
            Structured sentiment analysis across {report.totalArticles} live articles from {Object.keys(report.byCategory || {}).length} sectors
          </p>
          <div className="sent-meta-pills">
            <span className="sent-meta-pill" style={{ color: scoreColor, borderColor: `${scoreColor}30`, background: `${scoreColor}12` }}>
              {gaugeLabelOverall?.emoji} {gaugeLabelOverall?.label || 'Analyzing'}
            </span>
            <span className="sent-meta-pill">📅 {new Date(report.generatedAt).toLocaleTimeString()}</span>
            <span className="sent-meta-pill">📰 {report.totalArticles} articles</span>
          </div>
        </div>
        <MoodGauge score={report.overall} />
      </div>

      {/* ── Tab bar */}
      <div className="sent-tabs">
        {[
          { id:'overview',  label:'📊 Overview' },
          { id:'category',  label:'🗂 By Category' },
          { id:'province',  label:'🗺 By Province' },
          { id:'signals',   label:'⚡ Top Signals' },
          { id:'trend',     label:'📈 24h Trend' },
        ].map(t => (
          <button key={t.id} className={`sent-tab-btn ${view === t.id ? 'active' : ''}`} onClick={() => setView(t.id)}>
            {t.label}
          </button>
        ))}
        <button className="sent-refresh-btn" onClick={loadReport} title="Refresh analysis">↻</button>
      </div>

      {/* ── Overview ────────────────────────────────────────── */}
      {view === 'overview' && (
        <div className="sent-grid">
          {/* Score summary cards */}
          <div className="sent-score-cards">
            {[
              { label:'Overall Mood',     val:`${report.overall > 0 ? '+' : ''}${report.overall}`, color:scoreColor, icon:'🧭' },
              { label:'Positive Articles', val:`${report.topPositive?.length || 0}`, color:'#10b981', icon:'⬆️' },
              { label:'Negative Articles', val:`${report.topNegative?.length || 0}`, color:'#ef4444', icon:'⬇️' },
              { label:'Sectors Tracked',  val:`${Object.keys(report.byCategory || {}).length}`,   color:'#818cf8', icon:'📋' },
              { label:'Provinces Tracked',val:`${Object.keys(report.byProvince || {}).length}`,   color:'#f59e0b', icon:'🗺️' },
            ].map((c, i) => (
              <div key={i} className="sent-score-card" style={{ borderTop: `3px solid ${c.color}` }}>
                <div className="sent-score-icon">{c.icon}</div>
                <div className="sent-score-val" style={{ color: c.color }}>{c.val}</div>
                <div className="sent-score-lbl">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Top keywords */}
          {report.topKeywords?.length > 0 && (
            <div className="card">
              <div className="card-head"><span className="card-title">🔑 Dominant Sentiment Signals</span></div>
              <div className="keyword-cloud">
                {report.topKeywords.slice(0, 16).map((kw, i) => {
                  const kc = kw.weight > 0 ? '#10b981' : '#ef4444';
                  const size = Math.max(0.7, Math.min(1.3, 0.7 + (kw.count / (report.topKeywords[0]?.count || 1)) * 0.6));
                  return (
                    <span key={i} className="kw-cloud-item"
                      style={{ fontSize: `${size}rem`, color: kc, border: `1px solid ${kc}30`, background: `${kc}10` }}>
                      {kw.phrase}
                      <sup style={{ fontSize: '0.55rem', opacity: 0.7 }}>{kw.count}</sup>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── By Category ─────────────────────────────────────── */}
      {view === 'category' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">🗂 Sentiment by News Category</span>
            <span className="card-sub">Ranked by mood score</span>
          </div>
          <div className="sent-bar-list">
            <div className="sent-bar-header">
              <span>Category</span><span>Sentiment Scale (–100 to +100)</span><span>Score</span><span>Articles</span>
            </div>
            {catEntries.map(([cat, data]) => (
              <SentimentBar key={cat} label={`${CAT_ICONS[cat] || '📰'} ${cat}`} score={data.avg} count={data.count} />
            ))}
          </div>
        </div>
      )}

      {/* ── By Province ─────────────────────────────────────── */}
      {view === 'province' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">🗺 Provincial Civic Mood</span>
            <span className="card-sub">All 7 provinces</span>
          </div>
          <div className="sent-bar-list">
            <div className="sent-bar-header">
              <span>Province</span><span>Sentiment Scale</span><span>Score</span><span>Articles</span>
            </div>
            {provEntries.map(([prov, data]) => (
              <SentimentBar key={prov} label={`📍 ${prov}`} score={data.avg} count={data.count} />
            ))}
          </div>
        </div>
      )}

      {/* ── Top Signals ─────────────────────────────────────── */}
      {view === 'signals' && (
        <div className="sent-signals-grid">
          <div className="card" style={{ borderTop: '3px solid #10b981' }}>
            <div className="card-head"><span className="card-title">⬆️ Most Positive Articles</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 16px 16px' }}>
              {(report.topPositive || []).map((a, i) => <ArticleSignalCard key={i} article={a} type="positive" />)}
            </div>
          </div>
          <div className="card" style={{ borderTop: '3px solid #ef4444' }}>
            <div className="card-head"><span className="card-title">⬇️ Most Negative Articles</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 16px 16px' }}>
              {(report.topNegative || []).map((a, i) => <ArticleSignalCard key={i} article={a} type="negative" />)}
            </div>
          </div>
        </div>
      )}

      {/* ── 24h Trend ────────────────────────────────────────── */}
      {view === 'trend' && (
        <div className="card">
          <div className="card-head">
            <span className="card-title">📈 24-Hour Nepal Mood Trend</span>
            <span className="card-sub">Hourly civic sentiment index</span>
          </div>
          <div style={{ padding: '8px 0 16px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={report.trend?.filter(d => d.score !== null)} margin={{ left: -16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" stroke="var(--text-4)" fontSize={10} interval={2} />
                <YAxis stroke="var(--text-4)" fontSize={11} domain={[-100, 100]} />
                <ReferenceLine y={0} stroke="var(--border-hi)" strokeDasharray="4 4" label={{ value:'Neutral', fill:'var(--text-4)', fontSize:10 }} />
                <ReferenceLine y={20}  stroke="#10b98130" />
                <ReferenceLine y={-20} stroke="#ef444430" />
                <Tooltip
                  contentStyle={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }}
                  formatter={(val) => [`${val > 0 ? '+' : ''}${val}`, 'Mood Score']}
                />
                <Line
                  type="monotone" dataKey="score"
                  stroke="#818cf8" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#818cf8' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
