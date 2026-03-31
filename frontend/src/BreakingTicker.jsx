import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isSourceVerified } from './data.js';

const BREAKING_KEYWORDS = [
  'earthquake', 'flood', 'landslide', 'killed', 'dead', 'death', 'fire',
  'blast', 'explosion', 'arrested', 'breaking', 'urgent', 'alert', 'emergency',
  'disaster', 'rescue', 'missing', 'collapsed', 'avalanche', 'cyclone', 'storm',
  'shooting', 'attack', 'crisis', 'blackout', 'shutdown', 'protest', 'resign',
  'impeach', 'suspend', 'ban', 'strike', 'riot', 'violence', 'rape', 'murder',
];

const URGENT_KEYWORDS = [
  'earthquake', 'flood', 'landslide', 'killed', 'fire', 'blast', 'explosion',
  'avalanche', 'cyclone', 'shooting', 'attack', 'collapse',
];

function isBreaking(article) {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  return BREAKING_KEYWORDS.some(kw => text.includes(kw));
}

function isUrgent(article) {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  return URGENT_KEYWORDS.some(kw => text.includes(kw));
}

// Source name → 2-3 char initials badge
function srcInitials(source = '') {
  const MAP = {
    'kathmandu post': 'KP', 'himalayan times': 'HT', 'my republica': 'MR',
    'republica': 'MR', 'nepali times': 'NT', 'record nepal': 'RN',
    'online khabar': 'OK', 'setopati': 'SP', 'ratopati': 'RP',
    'lokaantar': 'LK', 'khabarhub': 'KH', 'annapurna': 'AE',
    'nagarik': 'NG', 'gorkhapatra': 'GP', 'bbc': 'BBC',
    'al jazeera': 'AJ', 'ntv': 'NTV', 'himalaya tv': 'HTV',
    'kantipur': 'KTV', 'news24': 'N24', 'ap1': 'AP1',
    'avenues': 'AV', 'image channel': 'IMG', 'rss': 'RSS',
    'reliefweb': 'RW', 'baahrakhari': 'BK', 'ujyaalo': 'UJ',
  };
  const lower = source.toLowerCase();
  for (const [key, val] of Object.entries(MAP)) {
    if (lower.includes(key)) return val;
  }
  return source.replace(/[^A-Z]/g, '').slice(0, 3) ||
    source.slice(0, 2).toUpperCase();
}

// ── Ticker item display ──────────────────────────────────────
function TickerItem({ article, onClick }) {
  const urgent = isUrgent(article);
  const initials = srcInitials(article.source);
  const verified = isSourceVerified(article.source);
  return (
    <span
      className={`ticker-item ${urgent ? 'ticker-urgent' : ''}`}
      onClick={() => onClick(article)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(article)}
    >
      <span className="ticker-src-badge">
        {initials}
        {verified && <span className="verified-tick" style={{ fontSize:'0.7em', marginLeft:'1px', color:'white' }}>✓</span>}
      </span>
      {urgent && <span className="ticker-fire">🔥</span>}
      <span className="ticker-title">{article.title}</span>
      <span className="ticker-sep">·</span>
      <span className="ticker-time">{article.timeAgo || 'just now'}</span>
      <span className="ticker-dot-sep">⬥</span>
    </span>
  );
}

export default function BreakingTicker({ articles }) {
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [activeArticle, setActiveArticle] = useState(null);
  const scrollRef = useRef(null);

  // Show top 15 breaking articles (up from 5)
  const breaking = articles
    .filter(isBreaking)
    .slice(0, 15);

  // Play subtle Web Audio beep on first breaking detection
  useEffect(() => {
    if (breaking.length > 0 && !hasPlayed) {
      setHasPlayed(true);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (_) { /* audio not available */ }
    }
  }, [breaking.length, hasPlayed]);

  const handleArticleClick = useCallback((article) => {
    setActiveArticle(a => a?.link === article.link ? null : article);
  }, []);

  if (!visible || breaking.length === 0) return null;

  return (
    <>
      {/* ── Breaking ticker bar ─────────────────────────────── */}
      <div
        className={`breaking-ticker-bar ${paused ? 'paused' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="breaking-label">
          <span className="breaking-dot" />
          BREAKING
        </div>

        <div className="breaking-scroll-wrap" ref={scrollRef}>
          <div className={`breaking-scroll-inner ${paused ? 'scroll-paused' : ''}`}>
            {/* Duplicate for seamless loop */}
            {[0, 1].map(pass => (
              <span key={pass} aria-hidden={pass === 1}>
                {breaking.map((a, i) => (
                  <TickerItem
                    key={`${pass}-${i}`}
                    article={a}
                    onClick={handleArticleClick}
                  />
                ))}
              </span>
            ))}
          </div>
        </div>

        <div className="breaking-controls">
          <button
            className={`ticker-pause-btn ${paused ? 'active' : ''}`}
            onClick={() => setPaused(p => !p)}
            title={paused ? 'Resume ticker' : 'Pause ticker'}
          >
            {paused ? '▶' : '⏸'}
          </button>
          <span className="ticker-count">{breaking.length}</span>
          <button
            className="breaking-close"
            onClick={() => setVisible(false)}
            title="Dismiss ticker"
          >✕</button>
        </div>
      </div>

      {/* ── Inline article preview on click ────────────────── */}
      {activeArticle && (
        <div className="ticker-preview-bar">
          <div className="ticker-preview-src">
            <span className="ticker-preview-badge">
              {srcInitials(activeArticle.source)}
              {isSourceVerified(activeArticle.source) && ' ✓'}
            </span>
            {activeArticle.source}
          </div>
          <div className="ticker-preview-title">{activeArticle.title}</div>
          <div className="ticker-preview-actions">
            <a href={activeArticle.link} target="_blank" rel="noopener noreferrer"
              className="ticker-preview-btn">Read full ↗</a>
            <button className="ticker-preview-close" onClick={() => setActiveArticle(null)}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}
