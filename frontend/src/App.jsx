import React, { useState, useEffect } from 'react';
import { useNews } from './useNews.js';
import { Dashboard } from './Dashboard.jsx';
import { MapPage } from './MapPage.jsx';
import { AnalyticsPage } from './AnalyticsPage.jsx';
import { ChatPage } from './ChatPage.jsx';
import { ExplorerPage } from './ExplorerPage.jsx';
import { ProjectsPage } from './ProjectsPage.jsx';
import { RSS_FEEDS, FEED_TYPES } from './data.js';
import FrontPage from './FrontPage.jsx';
import FmRadioWidget from './FmRadioWidget.jsx';
import BreakingTicker from './BreakingTicker.jsx';
import EarthquakeWidget from './EarthquakeWidget.jsx';
import { NewArticleToast, BackendStatus } from './UIComponents.jsx';
import SentimentPage from './SentimentPage.jsx';
import PipelineOverview from './PipelineOverview.jsx';
import SourceManager from './SourceManager.jsx';

const NAV = [
  { id:'front',      icon:'ðŸ ', label:'Front Page' },
  { id:'dashboard',  icon:'ðŸ“Š', label:'Dashboard' },
  { id:'sources',    icon:'ðŸ“¡', label:'Source Engine' },
  { id:'map',        icon:'ðŸ—ºï¸', label:'Nepal Map' },
  { id:'projects',   icon:'ðŸ—ï¸', label:'Projects Tracker' },
  { id:'analytics',  icon:'ðŸ“ˆ', label:'Analytics' },
  { id:'sentiment',  icon:'ðŸ§ ', label:'Mood Intelligence' },
  { id:'explorer',   icon:'ðŸ”—', label:'Graph Explorer' },
  { id:'chat',       icon:'ðŸ¤–', label:'AI Assistant' },
];

const MOBILE_NAV = [
  { id:'front',     icon:'ðŸ ', label:'Home' },
  { id:'dashboard', icon:'ðŸ“Š', label:'Dash' },
  { id:'sources',   icon:'ðŸ“¡', label:'Sources' },
  { id:'map',       icon:'ðŸ—ºï¸', label:'Map' },
  { id:'projects',  icon:'ðŸ—ï¸', label:'Projects' },
  { id:'analytics', icon:'ðŸ“ˆ', label:'Analytics' },
  { id:'sentiment', icon:'ðŸ§ ', label:'Mood' },
  { id:'chat',      icon:'ðŸ¤–', label:'AI' },
];

function getInitialTheme() {
  try { const s = localStorage.getItem('ncig-theme'); if (s) return s; } catch(_) {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [page, setPage] = useState('front');
  const {
    articles, loading, isRefreshing, feedStatus, lastUpdated, refetch,
    progress, connectedFeeds, govFeeds, mediaFeeds, intlFeeds, totalFeeds,
    backendOnline, wsConnected, newArticleToast,
  } = useNews();
  const [clock, setClock] = useState(new Date());
  const [theme, setTheme] = useState(getInitialTheme);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('ncig-theme', theme); } catch(_) {}
  }, [theme]);

  // Show toast when new articles arrive via WebSocket
  useEffect(() => {
    if (newArticleToast) setToastVisible(true);
  }, [newArticleToast]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const connStatus = loading ? 'loading' : connectedFeeds > 0 ? 'ok' : 'error';
  const pct = totalFeeds > 0 ? Math.round((progress.done / totalFeeds) * 100) : 0;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':  return <Dashboard articles={articles} loading={loading} lastUpdated={lastUpdated} refetch={refetch} progress={progress} totalFeeds={totalFeeds} />;
      case 'sources':    return <SourceManager feedStatus={feedStatus} />;
      case 'map':        return <MapPage articles={articles} />;
      case 'projects':   return <ProjectsPage />;
      case 'analytics':  return <AnalyticsPage articles={articles} feedStatus={feedStatus} />;
      case 'sentiment':  return <SentimentPage articles={articles} />;
      case 'explorer':   return <ExplorerPage articles={articles} />;
      case 'chat':       return <ChatPage articles={articles} />;
      default:           return <Dashboard articles={articles} loading={loading} lastUpdated={lastUpdated} refetch={refetch} progress={progress} totalFeeds={totalFeeds} />;
    }
  };

  return (
    <>
      <FmRadioWidget />

      {/* â”€â”€ Live article toast (WebSocket push) */}
      {toastVisible && newArticleToast && (
        <NewArticleToast
          toast={newArticleToast}
          onDismiss={() => setToastVisible(false)}
        />
      )}

      {/* â”€â”€ Breaking News Ticker */}
      {articles.length > 0 && <BreakingTicker articles={articles} />}

      {page === 'front' ? (
        <div className="fade-in">
          <FrontPage articles={articles} loading={loading} setPage={setPage} backendOnline={backendOnline} />
        </div>
      ) : (
        <div className="shell fade-in">
          {/* â”€â”€ Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <img className="logo-flag" src="https://giwmscdntwo.gov.np/static/grapejs/img/Nepal-flag.gif" alt="Nepal Flag" />
              <div className="logo-text">Civic Intelligence Graph</div>
              <div className="logo-sub">v4.0 &nbsp;Â·&nbsp; {clock.toLocaleTimeString('en-US')}</div>
            </div>

            {/* Backend / WS status */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
              <BackendStatus online={backendOnline} wsConnected={wsConnected} />
            </div>

            {/* Loading progress */}
            {(loading || isRefreshing) && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginBottom: 5 }}>
                  {loading ? `Fetching ${progress.done}/${totalFeeds} feedsâ€¦` : `Syncing ${progress.done}/${totalFeeds}â€¦`}
                </div>
                <div className="progress-rail">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {/* Source breakdown */}
            {!loading && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label:`${mediaFeeds} Media`, color:'#1a6aff' },
                  { label:`${govFeeds} Govt`,   color:'#DC143C' },
                  { label:`${intlFeeds} Intl`,  color:'#7c3aed' },
                ].map((t,i) => (
                  <span key={i} className="type-pill" style={{ background:`${t.color}12`, color:t.color, border:`1px solid ${t.color}30` }}>
                    {t.label}
                  </span>
                ))}
              </div>
            )}

            <div className="nav-group">
              <div className="nav-label">Navigation</div>
              {NAV.map(n => (
                <button key={n.id} className={`nav-btn ${page===n.id?'active':''}`} onClick={() => setPage(n.id)}>
                  <span className="nav-icon">{n.icon}</span>
                  {n.label}
                  {n.id === 'dashboard' && !loading && articles.length > 0 &&
                    <span className="nav-badge blue">{articles.length}</span>}
                  {n.id === 'chat' && <span className="nav-badge green">AI</span>}
                </button>
              ))}
            </div>

            <div className="nav-group">
              <div className="nav-label">Sources ({connectedFeeds}/{totalFeeds} live)</div>
              {Object.entries(FEED_TYPES).map(([type, meta]) => {
                const feeds = RSS_FEEDS.filter(f => f.type === type);
                const live  = feeds.filter(f => feedStatus[f.id]?.ok).length;
                return (
                  <div key={type} className="source-row">
                    <span className="source-label">{meta.icon} {meta.label}</span>
                    <span className="source-badge" style={{ background:`${meta.color}15`, color:meta.color, border:`1px solid ${meta.color}30` }}>
                      {live}/{feeds.length}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ðŸ“¡ Pipeline Overview (feed health + processing) */}
            <div className="nav-group" style={{ paddingBottom: 0 }}>
              <div className="nav-label">Data Pipeline</div>
              <PipelineOverview
                feedStatus={feedStatus}
                progress={progress}
                totalFeeds={totalFeeds}
                loading={loading}
                backendOnline={backendOnline}
                articles={articles}
              />
            </div>

            {/* ðŸŒ Earthquake Widget */}
            <div className="nav-group" style={{ paddingBottom: 0 }}>
              <div className="nav-label">Seismic Monitor</div>
              <EarthquakeWidget />
            </div>

            <div className="sidebar-footer">
              <div className="conn-status">
                <span className={`conn-dot ${isRefreshing ? 'refresh' : connStatus}`} />
                {loading ? `Fetching feedsâ€¦` :
                 isRefreshing ? `Syncing live dataâ€¦` :
                 `${connectedFeeds}/${totalFeeds} connected Â· ${articles.length} articles`}
              </div>
              {lastUpdated && (
                <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', marginTop: 4 }}>
                  Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </aside>

          {/* â”€â”€ Topbar */}
          <header className="topbar">
            <div className="topbar-search">
              <span className="ico">ðŸ”</span>
              <input
                placeholder="Search Nepal civic intelligenceâ€¦"
                onKeyDown={e => { if (e.key === 'Enter' && e.target.value) setPage('explorer'); }}
              />
            </div>

            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              {!loading && [
                { icon:'ðŸ“°', count:mediaFeeds, color:'#1a6aff', label:'Media' },
                { icon:'ðŸ›ï¸', count:govFeeds,   color:'#DC143C', label:'Govt' },
                { icon:'ðŸŒ', count:intlFeeds,  color:'#7c3aed', label:'Intl' },
              ].map((t,i) => (
                <div key={i} className="topbar-pill" style={{ background:`${t.color}0f`, color:t.color, border:`1px solid ${t.color}25` }}>
                  {t.icon} {t.count} {t.label}
                </div>
              ))}
            </div>

            <div className={`live-pill ${wsConnected ? 'ws-live' : ''}`}>
              <span className="dot" />
              {loading ? `${pct}%` : wsConnected ? 'WS LIVE' : 'LIVE'}
            </div>

            <button className="topbar-icon-btn" title="Refresh all feeds" onClick={refetch}>ðŸ”„</button>
            <button className="topbar-icon-btn" title="Alerts">
              ðŸ””
              {!loading && articles.filter(a => a.category === 'disaster').length > 0 &&
                <span className="badge-dot" />}
            </button>

            {/* Dark/Light toggle */}
            <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™'}
            </button>

            <button className="topbar-icon-btn" title="Nepal">ðŸ‡³ðŸ‡µ</button>
          </header>

          {/* â”€â”€ Main content */}
          <main className="main">
            <div className="page-transition">
              {renderPage()}
            </div>
          </main>

          <nav className="mobile-nav">
            <div className="mobile-nav-scroll">
              {MOBILE_NAV.map((n) => (
                <button
                  key={n.id}
                  className={`mobile-nav-btn ${page===n.id?'active':''}`}
                  onClick={() => setPage(n.id)}
                >
                  <span className="mobile-nav-icon">{n.icon}</span>
                  <span className="mobile-nav-label">{n.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

