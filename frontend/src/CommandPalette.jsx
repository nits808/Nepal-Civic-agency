import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { CAT_COLORS, CAT_ICONS } from './data.js';

// Lazily resolve ModalContext — if it doesn't exist, openModal is simply a no-op
// We import synchronously but catch any error at the hook call site


/* ── Page navigation shortcuts ─────────────────────────────────── */
const PAGE_SHORTCUTS = [
  { id: 'dashboard',  icon: '📊', label: 'Dashboard',          desc: 'Live news feed & charts' },
  { id: 'map',        icon: '🗺️', label: 'Nepal Map',           desc: 'Province-level article heatmap' },
  { id: 'analytics',  icon: '📈', label: 'Analytics',           desc: 'Category & source intelligence' },
  { id: 'explorer',   icon: '🔍', label: 'Graph Explorer',      desc: 'Government decisions & Cypher' },
  { id: 'projects',   icon: '🏗️', label: 'Projects Tracker',    desc: 'Infrastructure project tracker' },
  { id: 'sentiment',  icon: '🧠', label: 'Mood Intelligence',   desc: 'NLP sentiment analysis' },
  { id: 'sources',    icon: '📡', label: 'Source Engine',       desc: 'RSS feed registry & health' },
  { id: 'chat',       icon: '🤖', label: 'AI Assistant',        desc: 'Civic AI chat interface' },
  { id: 'front',      icon: '🏠', label: 'Front Page',          desc: 'News homepage & hero highlights' },
];

/* ── Fuzzy match — returns true if all chars of query appear in order ── */
function fuzzyMatch(text, query) {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/* ── Score match — exact substring scores higher than fuzzy ──────── */
function scoreMatch(text, query) {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.includes(q))   return 2;
  if (fuzzyMatch(t, q)) return 1;
  return 0;
}

export default function CommandPalette({ articles = [], setPage, isOpen, onClose, onOpenArticle }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);


  /* Reset query when opened */
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  /* Build result list */
  const results = useMemo(() => {
    const q = query.trim();
    const out = [];

    /* 1. Page navigation shortcuts */
    PAGE_SHORTCUTS.forEach(p => {
      const score = Math.max(
        scoreMatch(p.label, q),
        scoreMatch(p.desc, q),
        scoreMatch(p.id, q)
      );
      if (!q || score > 0) {
        out.push({ type: 'page', score, ...p });
      }
    });

    /* 2. Article matches (only when query present) */
    if (q.length >= 2) {
      const matched = articles
        .map(a => {
          const score = Math.max(
            scoreMatch(a.title, q) * 2,
            scoreMatch(a.category || '', q),
            scoreMatch(a.province || '', q),
            scoreMatch(a.source || '', q)
          );
          return { type: 'article', score, article: a };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      out.push(...matched);
    }

    /* Sort: pages first when no query, articles first when query present */
    out.sort((a, b) => {
      if (!q) return a.type === 'page' ? -1 : 1;
      if (a.type !== b.type) return a.type === 'article' ? -1 : 1;
      return b.score - a.score;
    });

    return out.slice(0, 10);
  }, [query, articles]);

  /* Reset cursor when results change */
  useEffect(() => setCursor(0), [results]);

  /* Scroll active item into view */
  useEffect(() => {
    const el = listRef.current?.children[cursor];
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const selectItem = useCallback((item) => {
    if (item.type === 'page') {
      setPage(item.id);
    } else if (item.type === 'article') {
      setPage('dashboard');
      onOpenArticle?.(item.article);
    }
    onClose();
  }, [setPage, onOpenArticle, onClose]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter'  && results[cursor]) selectItem(results[cursor]);
    if (e.key === 'Escape') onClose();
  }, [cursor, results, selectItem, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="cmd-backdrop" onClick={onClose} />

      {/* Palette */}
      <div className="cmd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        {/* Search input */}
        <div className="cmd-input-row">
          <span className="cmd-search-ico">🔍</span>
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, articles, provinces…"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button className="cmd-clear-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
              ✕
            </button>
          )}
          <kbd className="cmd-esc-hint">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="cmd-results">
          {results.length === 0 && (
            <div className="cmd-empty">
              <div className="cmd-empty-ico">🔎</div>
              No results for "{query}"
            </div>
          )}

          {results.map((item, i) => (
            <button
              key={i}
              className={`cmd-item ${i === cursor ? 'cmd-item-active' : ''} cmd-item-${item.type}`}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setCursor(i)}
            >
              {item.type === 'page' ? (
                <>
                  <span className="cmd-item-icon">{item.icon}</span>
                  <span className="cmd-item-body">
                    <span className="cmd-item-title">{item.label}</span>
                    <span className="cmd-item-sub">{item.desc}</span>
                  </span>
                  <span className="cmd-item-tag">Page</span>
                </>
              ) : (
                <>
                  <span className="cmd-item-icon" style={{ color: CAT_COLORS[item.article.category] || '#64748b' }}>
                    {CAT_ICONS[item.article.category] || '📰'}
                  </span>
                  <span className="cmd-item-body">
                    <span className="cmd-item-title">{item.article.title}</span>
                    <span className="cmd-item-sub">
                      {item.article.source} · {item.article.timeAgo}
                      {item.article.province ? ` · ${item.article.province}` : ''}
                    </span>
                  </span>
                  <span className="cmd-item-tag"
                    style={{ background:`${CAT_COLORS[item.article.category]}18`, color: CAT_COLORS[item.article.category] }}>
                    {item.article.category}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>Esc</kbd> Close</span>
          <span style={{ marginLeft:'auto', opacity:0.5 }}>{results.length} results</span>
        </div>
      </div>
    </>
  );
}
