import React, { useState, useMemo } from 'react';
import { RSS_FEEDS, FEED_TYPES, TIER_META } from './data.js';

// ── Province color map ───────────────────────────────────────
const PROV_COLORS = {
  'Bagmati':'#f59e0b', 'Province No. 1':'#3b82f6',
  'Madhesh':'#10b981',  'Gandaki':'#8b5cf6',
  'Lumbini':'#ec4899',  'Karnali':'#ef4444',
  'Sudurpashchim':'#06b6d4', 'National':'#6b7280',
  'International':'#7c3aed',
};

// ── Source type icon ─────────────────────────────────────────
function TypeBadge({ type }) {
  const t = FEED_TYPES[type] || { label: type, color:'#6b7280', icon:'📡' };
  return (
    <span style={{
      fontSize:'0.52rem', fontWeight:900, letterSpacing:'0.06em',
      padding:'2px 6px', borderRadius:4, textTransform:'uppercase',
      background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}30`,
      display:'inline-flex', alignItems:'center', gap:3, flexShrink:0,
    }}>
      {t.icon} {t.label}
    </span>
  );
}

// ── Individual source card ────────────────────────────────────
function SourceCard({ feed, feedStatus }) {
  const status = feedStatus?.[feed.id];
  const isLive = status?.ok;
  const tierMeta = TIER_META[feed.tier] || {};
  const typeInfo = FEED_TYPES[feed.type] || {};
  const provColor = PROV_COLORS[feed.province] || '#6b7280';
  const isGoogle = feed.url?.includes('news.google.com');

  return (
    <div className="source-card" style={{ borderLeft:`3px solid ${typeInfo.color || '#6b7280'}` }}>
      {/* Header row */}
      <div className="source-card-header">
        <div className="source-card-status">
          <span className={`source-dot ${isLive ? 'live' : status ? 'dead' : 'unknown'}`} />
        </div>
        <div className="source-card-name">
          {feed.name}
          {feed.verified && <span className="verified-tick" title="Verified Source"> ✓</span>}
        </div>
        <TypeBadge type={feed.type} />
      </div>

      {/* Meta row */}
      <div className="source-card-meta">
        <span className="source-prov-tag" style={{ background:`${provColor}15`, color:provColor, border:`1px solid ${provColor}25` }}>
          📍 {feed.province}
        </span>
        {isGoogle && (
          <span className="source-gnews-tag">G News</span>
        )}
        {status && (
          <span className="source-articles-tag">
            {status.count || 0} articles
          </span>
        )}
      </div>

      {/* Feed URL */}
      <div className="source-card-url" title={feed.url}>
        {feed.url?.replace('https://', '').replace('http://', '').slice(0, 55)}…
      </div>

      {/* Action links */}
      <div className="source-card-links">
        {feed.website && (
          <a href={feed.website} target="_blank" rel="noopener noreferrer"
            className="source-link" style={{ color: typeInfo.color }}>
            🌐 Website
          </a>
        )}
        {feed.fb && (
          <a href={feed.fb} target="_blank" rel="noopener noreferrer"
            className="source-link" style={{ color:'#1877f2' }}>
            Facebook
          </a>
        )}
        <a href={feed.url} target="_blank" rel="noopener noreferrer"
          className="source-link" style={{ color:'#6b7280' }}>
          RSS ↗
        </a>
      </div>
    </div>
  );
}

// ── Tier section ─────────────────────────────────────────────
function TierSection({ tier, feeds, feedStatus, search, activeType }) {
  const meta = TIER_META[tier];
  const filtered = useMemo(() => feeds.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
      || (f.province || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !activeType || f.type === activeType;
    return matchSearch && matchType;
  }), [feeds, search, activeType]);

  if (filtered.length === 0) return null;

  const liveCount = filtered.filter(f => feedStatus?.[f.id]?.ok).length;

  return (
    <div className="tier-section">
      {/* Tier header */}
      <div className="tier-header" style={{ borderLeft:`4px solid ${meta.color}` }}>
        <div className="tier-header-main">
          <span className="tier-icon">{meta.icon}</span>
          <div>
            <div className="tier-label" style={{ color: meta.color }}>{meta.label}</div>
            <div className="tier-desc">{meta.desc}</div>
          </div>
        </div>
        <div className="tier-stats">
          <span className="tier-live-badge" style={{ background:`${meta.color}15`, color:meta.color, border:`1px solid ${meta.color}30` }}>
            {liveCount}/{filtered.length} live
          </span>
        </div>
      </div>

      {/* Source grid */}
      <div className="source-grid">
        {filtered.map(f => (
          <SourceCard key={f.id} feed={f} feedStatus={feedStatus} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Source Discovery Engine — Main Page
// ═══════════════════════════════════════════════════════════════
export default function SourceManager({ feedStatus }) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState(null);
  const [activeProvince, setActiveProvince] = useState(null);

  // Group feeds by tier
  const byTier = useMemo(() => {
    const groups = { 1:[], 2:[], 3:[], 4:[] };
    RSS_FEEDS.forEach(f => {
      const tier = f.tier || 2;
      if (groups[tier]) groups[tier].push(f);
    });
    return groups;
  }, []);

  // Overall stats
  const totalFeeds = RSS_FEEDS.length;
  const liveFeeds  = RSS_FEEDS.filter(f => feedStatus?.[f.id]?.ok).length;
  const tvFeeds    = RSS_FEEDS.filter(f => f.type === 'tv').length;
  const portalFeeds= RSS_FEEDS.filter(f => f.type === 'media').length;
  const regionFeeds= RSS_FEEDS.filter(f => f.type === 'regional').length;
  const govtFeeds  = RSS_FEEDS.filter(f => f.type === 'govt' || f.type === 'intl').length;

  // Unique types for filter chips
  const typeKeys = [...new Set(RSS_FEEDS.map(f => f.type))];

  return (
    <div className="page source-manager-page">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="sm-header">
        <div className="sm-header-text">
          <h1 className="sm-title">📡 Source Discovery Engine</h1>
          <p className="sm-subtitle">
            Nepal's 4-tier media ecosystem — {totalFeeds} sources across TV, digital portals & govt (dead/inactive sources &gt; 2 months auto-removed)
          </p>
        </div>
        <div className="sm-header-stats">
          <div className="sm-stat" style={{ borderTop:'2px solid #22c55e' }}>
            <div className="sm-stat-val" style={{ color:'#22c55e' }}>{liveFeeds}</div>
            <div className="sm-stat-lbl">Live Now</div>
          </div>
          <div className="sm-stat" style={{ borderTop:'2px solid #dc2626' }}>
            <div className="sm-stat-val" style={{ color:'#dc2626' }}>{tvFeeds}</div>
            <div className="sm-stat-lbl">TV Channels</div>
          </div>
          <div className="sm-stat" style={{ borderTop:'2px solid #1a6aff' }}>
            <div className="sm-stat-val" style={{ color:'#1a6aff' }}>{portalFeeds}</div>
            <div className="sm-stat-lbl">Portals</div>
          </div>
          <div className="sm-stat" style={{ borderTop:'2px solid #d97706' }}>
            <div className="sm-stat-val" style={{ color:'#d97706' }}>{regionFeeds}</div>
            <div className="sm-stat-lbl">Regional</div>
          </div>
          <div className="sm-stat" style={{ borderTop:'2px solid #7c3aed' }}>
            <div className="sm-stat-val" style={{ color:'#7c3aed' }}>{govtFeeds}</div>
            <div className="sm-stat-lbl">Govt/Intl</div>
          </div>
        </div>
      </div>

      {/* ── Architecture diagram ───────────────────────────────── */}
      <div className="sm-arch-row">
        {[1,2,3,4].map(t => {
          const meta = TIER_META[t];
          const count = byTier[t].length;
          const live = byTier[t].filter(f => feedStatus?.[f.id]?.ok).length;
          return (
            <div key={t} className="sm-arch-card" style={{ borderTop:`3px solid ${meta.color}` }}>
              <div className="sm-arch-icon">{meta.icon}</div>
              <div className="sm-arch-label" style={{ color: meta.color }}>{meta.label.split('—')[0].trim()}</div>
              <div className="sm-arch-desc">{meta.desc.split(' (')[0]}</div>
              <div className="sm-arch-count">
                <span style={{ color: meta.color, fontWeight:900 }}>{count}</span>
                <span style={{ color:'#6b7280', fontSize:'0.65rem' }}> sources</span>
                <span style={{ marginLeft:6, fontSize:'0.6rem', padding:'1px 6px', borderRadius:8,
                  background:`${meta.color}15`, color:meta.color }}>
                  {live} live
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Search + filter bar ─────────────────────────────────── */}
      <div className="sm-filter-bar">
        <input
          className="search-input"
          placeholder="🔍 Search sources by name or province…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, maxWidth:380 }}
        />
        <div className="sm-type-chips">
          <button
            className={`sm-chip ${!activeType ? 'active' : ''}`}
            onClick={() => setActiveType(null)}>
            All {totalFeeds}
          </button>
          {typeKeys.map(type => {
            const meta = FEED_TYPES[type];
            const count = RSS_FEEDS.filter(f => f.type === type).length;
            return (
              <button key={type}
                className={`sm-chip ${activeType === type ? 'active' : ''}`}
                onClick={() => setActiveType(activeType === type ? null : type)}
                style={activeType === type ? { background: meta.color, color:'white', borderColor: meta.color } : {}}>
                {meta.icon} {meta.label} <span className="chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tier sections ──────────────────────────────────────── */}
      <div className="sm-tiers">
        {[1,2,3,4].map(tier => (
          <TierSection
            key={tier}
            tier={tier}
            feeds={byTier[tier]}
            feedStatus={feedStatus}
            search={search}
            activeType={activeType}
          />
        ))}
      </div>

      {/* ── Insight box ──────────────────────────────────────────── */}
      <div className="sm-insight-box">
        <div className="sm-insight-title">⚡ Critical Upgrade Path</div>
        <div className="sm-insight-grid">
          <div className="sm-insight-item">
            <div className="sm-insight-step">Step 1</div>
            <div className="sm-insight-body">
              <strong>Source Discovery</strong> — Crawl Facebook Pages with keywords "News", "TV", "Khabar", "Samachar" targeting Nepal's 77 districts
            </div>
          </div>
          <div className="sm-insight-item">
            <div className="sm-insight-step">Step 2</div>
            <div className="sm-insight-body">
              <strong>Content Ingestion</strong> — RSS for portals, YouTube feed for TV channels, Google News as fallback for sources without RSS
            </div>
          </div>
          <div className="sm-insight-item">
            <div className="sm-insight-step">Step 3</div>
            <div className="sm-insight-body">
              <strong>og:image Scraping</strong> — Backend fetches actual article pages to extract real Nepal-specific photos from each article
            </div>
          </div>
          <div className="sm-insight-item">
            <div className="sm-insight-step">Step 4</div>
            <div className="sm-insight-body">
              <strong>Story Clustering</strong> — Group articles from multiple sources covering same event, show "X sources covering this story"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
