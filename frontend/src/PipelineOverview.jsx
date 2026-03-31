// ═══════════════════════════════════════════════════════════════
// Pipeline Overview Panel
// Shows live feed fetch status, processing time, source health
// Inspired by news-room monitoring dashboards + KP layout
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { RSS_FEEDS, CAT_COLORS, FEED_TYPES } from './data.js';

const BACKEND = 'http://localhost:4000';

export default function PipelineOverview({ feedStatus, progress, totalFeeds, loading, backendOnline, articles }) {
  const [feedDetails, setFeedDetails] = useState([]);
  const [expanded, setExpanded]       = useState(false);
  const [filter, setFilter]           = useState('all'); // all | failed | live

  // Fetch backend feed status for richer data
  useEffect(() => {
    if (!backendOnline) return;
    fetch(`${BACKEND}/api/feeds`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.feeds) setFeedDetails(data.feeds); })
      .catch(() => {});
  }, [backendOnline, loading]);

  // Merge RSS_FEEDS with live status
  const enriched = RSS_FEEDS.map(feed => {
    const status   = feedStatus[feed.id];
    const detail   = feedDetails.find(d => d.feed_id === feed.id);
    const ok       = status?.ok ?? false;
    const count    = status?.count ?? detail?.article_count ?? 0;
    const type     = feed.type || 'media';
    const typeInfo = FEED_TYPES[type] || FEED_TYPES.media;

    return { ...feed, ok, count, type, typeInfo, lastFetch: detail?.last_fetched };
  });

  const visible = filter === 'all'   ? enriched
                : filter === 'live'  ? enriched.filter(f => f.ok)
                : filter === 'failed'? enriched.filter(f => !f.ok)
                : enriched;

  const liveCount   = enriched.filter(f => f.ok).length;
  const failedCount = enriched.filter(f => !f.ok).length;
  const totalArts   = articles?.length || 0;
  const pct         = Math.round((progress?.done || 0) / (totalFeeds || 1) * 100);

  // Group by type for the mini summary
  const byType = {};
  for (const f of enriched) {
    if (!byType[f.type]) byType[f.type] = { live: 0, total: 0 };
    byType[f.type].total++;
    if (f.ok) byType[f.type].live++;
  }

  return (
    <div className="pipeline-wrap">
      {/* ── Header row */}
      <div className="pipeline-header" onClick={() => setExpanded(e => !e)}>
        <div className="pipeline-title">
          <span className="pipeline-icon">{loading ? '⏳' : '📡'}</span>
          <span>Data Pipeline</span>
          {loading && <div className="pipeline-spinner" />}
        </div>

        <div className="pipeline-stats">
          <span className="pipeline-stat ok"  title="Live feeds">✔ {liveCount}</span>
          <span className="pipeline-stat err" title="Failed feeds">✖ {failedCount}</span>
          <span className="pipeline-stat art" title="Total articles">📰 {totalArts}</span>
        </div>

        <div className="pipeline-expand-btn">{expanded ? '▲' : '▼'}</div>
      </div>

      {/* ── Progress bar (always visible) */}
      {loading && (
        <div className="pipeline-progress-wrap">
          <div className="pipeline-progress-fill" style={{ width: `${pct}%` }} />
          <span className="pipeline-pct">{pct}%</span>
        </div>
      )}

      {/* ── Type summary pills */}
      <div className="pipeline-type-row">
        {Object.entries(byType).map(([type, { live, total }]) => {
          const info = FEED_TYPES[type] || FEED_TYPES.media;
          const allOk = live === total;
          return (
            <div key={type} className="pipeline-type-pill"
              style={{ background: `${info.color}12`, border: `1px solid ${info.color}30`, color: info.color }}>
              {info.icon} {live}/{total}
              <span style={{ fontSize: '0.55rem', opacity: 0.7 }}> {info.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Expanded feed list */}
      {expanded && (
        <div className="pipeline-list-wrap">
          {/* Filter bar */}
          <div className="pipeline-filter-row">
            {[
              { id:'all',    label:`All (${enriched.length})` },
              { id:'live',   label:`✔ Live (${liveCount})` },
              { id:'failed', label:`✖ Failed (${failedCount})` },
            ].map(f => (
              <button key={f.id} className={`pipeline-filter-btn ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Feed rows */}
          <div className="pipeline-feed-list">
            {visible.map(feed => (
              <div key={feed.id} className={`pipeline-feed-row ${feed.ok ? 'ok' : 'err'}`}>
                <div className={`pipeline-dot ${feed.ok ? 'ok' : 'err'}`} />
                <div className="pipeline-feed-name">{feed.name}</div>
                <div className="pipeline-feed-type"
                  style={{ color: feed.typeInfo.color, background: `${feed.typeInfo.color}12` }}>
                  {feed.typeInfo.icon}
                </div>
                <div className="pipeline-feed-count">{feed.ok ? `${feed.count} arts` : '—'}</div>
                <div className={`pipeline-feed-status ${feed.ok ? 'ok' : 'err'}`}>
                  {feed.ok ? 'LIVE' : 'FAIL'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
