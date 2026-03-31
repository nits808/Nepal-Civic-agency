import React from 'react';

// ── Skeleton Shimmer Card (mimics ImageCard shape) ────────────
export function SkeletonCard() {
  return (
    <div className="skel-card">
      <div className="skel skel-img" />
      <div className="skel-body">
        <div className="skel skel-pill" />
        <div className="skel skel-line long" />
        <div className="skel skel-line medium" />
        <div className="skel skel-line short" />
        <div className="skel-foot">
          <div className="skel skel-line tiny" />
          <div className="skel skel-line tiny" />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton FeedItem (mimics Dashboard feed row) ─────────────
export function SkeletonFeedItem() {
  return (
    <div className="skel-feed-item">
      <div className="skel skel-feed-thumb" />
      <div className="skel-feed-body">
        <div className="skel-feed-top">
          <div className="skel skel-pill" />
          <div className="skel skel-line tiny" />
        </div>
        <div className="skel skel-line long" />
        <div className="skel skel-line medium" />
        <div className="skel-feed-foot">
          <div className="skel skel-line tiny" />
          <div className="skel skel-line tiny" />
        </div>
      </div>
    </div>
  );
}

// ── New Article Toast (shown on WebSocket push) ───────────────
export function NewArticleToast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="new-article-toast" onClick={onDismiss}>
      <div className="toast-icon">📡</div>
      <div className="toast-text">
        <strong>{toast.count} new article{toast.count > 1 ? 's' : ''}</strong>
        <span>from {toast.source}</span>
      </div>
      <div className="toast-badge">LIVE</div>
    </div>
  );
}

// ── Backend Status Indicator ───────────────────────────────────
export function BackendStatus({ online, wsConnected }) {
  return (
    <div className="backend-status-pill" title={online ? 'Connected to NCIG backend server' : 'Using client-side RSS fallback'}>
      <span className={`conn-dot ${online ? (wsConnected ? 'ok' : 'refresh') : 'error'}`} />
      <span>{online ? (wsConnected ? 'WebSocket Live' : 'Backend REST') : 'RSS Proxy'}</span>
    </div>
  );
}
