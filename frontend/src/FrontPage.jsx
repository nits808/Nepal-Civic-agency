import React from 'react';
import { CAT_COLORS, CAT_ICONS, resolveArticleImage } from './data.js';
import { FeedItem, articleLocation } from './Dashboard.jsx';
import { useModal } from './ModalContext.jsx';
import { SkeletonCard } from './UIComponents.jsx';

export function ImageCard({ article }) {
  const clr = CAT_COLORS[article.category] || '#64748b';
  const { openModal } = useModal();
  const img = resolveArticleImage(article);
  return (
    <a
      className="img-card"
      href={article.link || '#'}
      onClick={e => { e.preventDefault(); openModal({ ...article, imageUrl: img.url }); }}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="img-card-top" style={{ backgroundImage: `url(${img.url})` }}>
        <div className="img-card-overlay">
          <span className="cat-pill" style={{ background: clr }}>
            {CAT_ICONS[article.category] || ''} {article.category || 'News'}
          </span>
          {img.type === 'rss' && <span className="real-img-badge" title="Real article photo">📸</span>}
        </div>
      </div>
      <div className="img-card-body">
        <h3 className="ic-title">{article.title}</h3>
        <p className="ic-desc">{(article.description || '').substring(0, 100)}…</p>
        <div className="ic-foot">
          <span style={{ color: clr, fontWeight: 800 }}>{article.source || 'Unknown'}</span>
          <span style={{ color: 'var(--text-4)' }}>&bull; {article.timeAgo || 'just now'}</span>
        </div>
      </div>
    </a>
  );
}

export function NewsCarousel({ articles }) {
  const hot = [...articles].slice(0, 8);
  if (!hot.length) return null;
  return (
    <div className="news-carousel">
      {hot.map((a, i) => (
        <SlideWrapper key={i} a={a} clr={CAT_COLORS[a.category] || '#64748b'} />
      ))}
    </div>
  );
}

function SlideWrapper({ a, clr }) {
  const { openModal } = useModal();
  const img = resolveArticleImage(a);
  return (
    <a
      className="carousel-slide hero-slide"
      href={a.link || '#'}
      onClick={e => { e.preventDefault(); openModal({ ...a, imageUrl: img.url }); }}
      target="_blank"
      rel="noopener noreferrer"
      style={{ backgroundImage: `url(${img.url})` }}
    >
      <div className="slide-gradient">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div className="slide-tag blur-pill" style={{ color: clr }}>
            {(a.category || 'news').toUpperCase()} &bull; {a.source || 'RSS'}
          </div>
          <div className="hot-indicator">🔥 HOT</div>
        </div>
        <div className="slide-title mega-text">{a.title}</div>
        <div className="slide-foot dim-foot" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:'15px' }}>
            <span>{articleLocation(a)}</span>
            <span>{a.timeAgo}</span>
          </div>
          <button className="frosted-btn small">Read Brief &rarr;</button>
        </div>
      </div>
    </a>
  );
}

// ── Skeleton carousel placeholders ──────────────────────────
function SkeletonCarousel() {
  return (
    <div className="news-carousel">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="carousel-slide skel-slide">
          <div className="skel-slide-inner">
            <div className="skel skel-pill" style={{ width: 120 }} />
            <div className="skel skel-line long" style={{ height: 28, marginTop: 'auto' }} />
            <div className="skel skel-line medium" style={{ height: 16 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FrontPage({ articles, loading, setPage, backendOnline }) {
  const disasterList = (articles || []).filter(a => a.category === 'disaster').slice(0, 4);
  const techList     = (articles || []).filter(a => a.category === 'technology').slice(0, 4);

  return (
    <div className="frontpage-wrapper">
      <header className="front-header">
        <div className="front-logo">
          <img className="logo-flag" src="https://giwmscdntwo.gov.np/static/grapejs/img/Nepal-flag.gif" alt="Nepal Flag" />
          <div className="logo-title">
            <span className="logo-main">Nepal Civic Intelligence</span>
            <span className="logo-sub">Public Information Portal</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {backendOnline !== undefined && (
            <div className={`backend-badge ${backendOnline ? 'backend-online' : 'backend-offline'}`}>
              <span className={`conn-dot ${backendOnline ? 'ok' : 'error'}`} />
              {backendOnline ? 'Backend Online' : 'RSS Mode'}
            </div>
          )}
          <button className="enter-btn" onClick={() => setPage('dashboard')}>
            Enter Dashboards &rarr;
          </button>
        </div>
      </header>

      <main className="front-main">
        <div className="front-section-title">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'10px' }}>
            <div>
              <h2>🔥 The Hottest Briefs</h2>
              <p>Real-time breaking intelligence across all sectors</p>
            </div>
            <div className="live-intel-counter">
              <span className="heartbeat" />
              <strong>{loading ? '—' : articles.length}</strong> Intelligence Nodes Monitored
            </div>
          </div>
        </div>

        {/* Hero Carousel — skeleton while loading */}
        {loading ? <SkeletonCarousel /> : <NewsCarousel articles={articles} />}

        <div className="front-grid">
          {/* Latest News grid */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">⚡ Latest Top Stories</span>
              {!loading && <span className="card-sub">{articles.length} live articles</span>}
            </div>
            <div className="img-card-grid">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : articles.length === 0
                  ? <div className="empty-state">No intelligence collected yet.</div>
                  : articles.slice(0, 6).map(a => <ImageCard key={a.id} article={a} />)
              }
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            {/* Disaster Alerts */}
            {(loading || disasterList.length > 0) && (
              <div className="card" style={{ borderTop:'4px solid #ef4444' }}>
                <div className="card-head">
                  <span className="card-title" style={{ color:'#ef4444' }}>🚨 Active Disaster Alerts</span>
                </div>
                <div className="img-card-grid-small">
                  {loading
                    ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                    : disasterList.map(a => <ImageCard key={a.id} article={a} />)
                  }
                </div>
              </div>
            )}

            {/* Tech */}
            {(loading || techList.length > 0) && (
              <div className="card" style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.02),rgba(37,99,235,0.02))', borderTop:'4px solid #6366f1' }}>
                <div className="card-head">
                  <span className="card-title" style={{ color:'#6366f1' }}>💻 Technology & Innovation</span>
                </div>
                <div className="img-card-grid-small">
                  {loading
                    ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                    : techList.map(a => <ImageCard key={a.id} article={a} />)
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
