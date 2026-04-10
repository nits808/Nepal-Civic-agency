import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNews } from './useNews.js';
import { RSS_FEEDS, FEED_TYPES } from './data.js';
import FrontPage from './FrontPage.jsx';
import FmRadioWidget from './FmRadioWidget.jsx';
import BreakingTicker from './BreakingTicker.jsx';
import EarthquakeWidget from './EarthquakeWidget.jsx';
import { NewArticleToast, BackendStatus } from './UIComponents.jsx';
import CommandPalette from './CommandPalette.jsx';

const DashboardPage = lazy(() =>
  import('./Dashboard.jsx').then((m) => ({ default: m.Dashboard }))
);
const MapPage = lazy(() =>
  import('./MapPage.jsx').then((m) => ({ default: m.MapPage }))
);
const AnalyticsPage = lazy(() =>
  import('./AnalyticsPage.jsx').then((m) => ({ default: m.AnalyticsPage }))
);
const ChatPage = lazy(() =>
  import('./ChatPage.jsx').then((m) => ({ default: m.ChatPage }))
);
const ExplorerPage = lazy(() =>
  import('./ExplorerPage.jsx').then((m) => ({ default: m.ExplorerPage }))
);
const ProjectsPage = lazy(() =>
  import('./ProjectsPage.jsx').then((m) => ({ default: m.ProjectsPage }))
);
const SentimentPage = lazy(() => import('./SentimentPage.jsx'));
const SourceManager  = lazy(() => import('./SourceManager.jsx'));

function PageLoader() {
  return (
    <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>
      Loading page...
    </div>
  );
}

// Full desktop sidebar nav items
const NAV = [
  { id:'front',      icon:'🏠', label:'Front Page'        },
  { id:'dashboard',  icon:'📊', label:'Dashboard'         },
  { id:'sources',    icon:'📡', label:'Source Engine'     },
  { id:'map',        icon:'🗺️', label:'Nepal Map'          },
  { id:'projects',   icon:'🏗️', label:'Projects Tracker'  },
  { id:'analytics',  icon:'📈', label:'Analytics'         },
  { id:'sentiment',  icon:'🧠', label:'Sentiment Tracker' },
  { id:'explorer',   icon:'🔍', label:'Policy & News Explorer'    },
  { id:'chat',       icon:'🤖', label:'News Assistant'      },
];

// Compact bottom-bar items (mobile)
const MOBILE_NAV = [
  { id:'front',     icon:'🏠', label:'Home'     },
  { id:'dashboard', icon:'📊', label:'Dash'     },
  { id:'map',       icon:'🗺️', label:'Map'       },
  { id:'projects',  icon:'🏗️', label:'Projects' },
  { id:'analytics', icon:'📈', label:'Stats'    },
  { id:'sentiment', icon:'🧠', label:'Mood'     },
  { id:'chat',      icon:'🤖', label:'News'       },
];

function getInitialTheme() {
  try { const s = localStorage.getItem('ncig-theme'); if (s) return s; } catch (_) {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialSidebar() {
  try { const s = localStorage.getItem('ncig-sidebar'); if (s !== null) return s === 'open'; } catch (_) {}
  return typeof window !== 'undefined' && window.innerWidth > 768;
}

export default function App() {
  const [page, setPage] = useState('front');
  const {
    articles, loading, isRefreshing, feedStatus, lastUpdated, refetch,
    progress, connectedFeeds, govFeeds, mediaFeeds, intlFeeds, totalFeeds,
    backendOnline, wsConnected, newArticleToast,
  } = useNews();

  const [clock,          setClock]          = useState(new Date());
  const [theme,          setTheme]          = useState(getInitialTheme);
  const [toastVisible,   setToastVisible]   = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(getInitialSidebar); // desktop collapse
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);             // mobile drawer
  const [cmdOpen,        setCmdOpen]        = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('ncig-theme', theme); } catch (_) {}
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem('ncig-sidebar', sidebarOpen ? 'open' : 'closed'); } catch (_) {}
  }, [sidebarOpen]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); }
      if (e.key === 'Escape') { setCmdOpen(false); setMobileMenuOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (newArticleToast) setToastVisible(true); }, [newArticleToast]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const toggleTheme     = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  const toggleSidebar   = useCallback(() => setSidebarOpen(o => !o), []);
  const openMobileMenu  = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Navigate and always close the mobile drawer
  const navigate = useCallback((id) => {
    setPage(id);
    setMobileMenuOpen(false);
  }, []);

  const connStatus = loading ? 'loading' : connectedFeeds > 0 ? 'ok' : 'error';
  const pct = totalFeeds > 0 ? Math.min(100, Math.round((progress.done / totalFeeds) * 100)) : 0;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage articles={articles} loading={loading} lastUpdated={lastUpdated} refetch={refetch} progress={progress} totalFeeds={totalFeeds} />;
      case 'sources':   return <SourceManager feedStatus={feedStatus} />;
      case 'map':       return <MapPage articles={articles} />;
      case 'projects':  return <ProjectsPage />;
      case 'analytics': return <AnalyticsPage articles={articles} feedStatus={feedStatus} />;
      case 'sentiment': return <SentimentPage articles={articles} />;
      case 'explorer':  return <ExplorerPage articles={articles} />;
      case 'chat':      return <ChatPage articles={articles} />;
      default:          return <DashboardPage articles={articles} loading={loading} lastUpdated={lastUpdated} refetch={refetch} progress={progress} totalFeeds={totalFeeds} />;
    }
  };

  // Shared nav content — used in both desktop sidebar and mobile drawer
  const SidebarContent = ({ onNavigate }) => (
    <>
      <div className="sidebar-logo">
        <img className="logo-flag" src="https://giwmscdntwo.gov.np/static/grapejs/img/Nepal-flag.gif" alt="Nepal Flag" />
        <div className="logo-text">Civic Intelligence Graph</div>
        <div className="logo-sub">v4.0&nbsp;&middot;&nbsp;{clock.toLocaleTimeString('en-US')}</div>
      </div>

      <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
        <BackendStatus online={backendOnline} wsConnected={wsConnected} />
      </div>

      {(loading || isRefreshing) && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginBottom: 5 }}>
            {loading ? `Fetching ${progress.done}/${totalFeeds} feeds…` : `Syncing ${progress.done}/${totalFeeds}…`}
          </div>
          <div className="progress-rail">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {!loading && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label:`${mediaFeeds} Media`, color:'#1a6aff' },
            { label:`${govFeeds} Govt`,    color:'#DC143C' },
            { label:`${intlFeeds} Intl`,   color:'#7c3aed' },
          ].map((t, i) => (
            <span key={i} className="type-pill" style={{ background:`${t.color}12`, color:t.color, border:`1px solid ${t.color}30` }}>
              {t.label}
            </span>
          ))}
        </div>
      )}

      <div className="nav-group">
        <div className="nav-label">Navigation</div>
        {NAV.map(n => (
          <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`}
            onClick={() => onNavigate(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            {n.id === 'dashboard' && !loading && articles.length > 0 &&
              <span className="nav-badge blue">{articles.length}</span>}
            {n.id === 'chat' && <span className="nav-badge green">News</span>}
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



      <div className="nav-group" style={{ paddingBottom: 0 }}>
        <div className="nav-label">Seismic Monitor</div>
        <EarthquakeWidget />
      </div>

      <div className="sidebar-footer">
        <div className="conn-status">
          <span className={`conn-dot ${isRefreshing ? 'refresh' : connStatus}`} />
          {loading ? 'Fetching feeds…' :
           isRefreshing ? 'Syncing live data…' :
           `${connectedFeeds}/${totalFeeds} connected | ${articles.length} articles`}
        </div>
        {lastUpdated && (
          <div style={{ fontSize: '0.62rem', color: 'var(--text-4)', marginTop: 4 }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <FmRadioWidget />
      <CommandPalette articles={articles} setPage={setPage} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      {toastVisible && newArticleToast && (
        <NewArticleToast toast={newArticleToast} onDismiss={() => setToastVisible(false)} />
      )}

      {articles.length > 0 && <BreakingTicker articles={articles} />}

      {/* ══════════════════════════════════════════════════════════
          MOBILE DRAWER — always in DOM, z-index 3000
          Shown via 'mobile-drawer-open' class, ≤768px only
          ══════════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={closeMobileMenu} aria-hidden="true" />
      )}
      <nav className={`mobile-drawer ${mobileMenuOpen ? 'mobile-drawer-open' : ''}`}
        aria-label="Mobile navigation drawer">
        <button className="mobile-drawer-close" onClick={closeMobileMenu} aria-label="Close menu">✕</button>
        {SidebarContent({ onNavigate: navigate })}
      </nav>

      {/* ══════════════════════════════════════════════════════════
          MOBILE-ONLY PERSISTENT HEADER — always visible on ≤768px
          Contains hamburger + app title + theme toggle + search
          Hidden on desktop via CSS
          ══════════════════════════════════════════════════════════ */}
      <header className="mobile-topbar" aria-label="Mobile header">
        <button className="hamburger-btn" onClick={openMobileMenu}
          aria-label="Open navigation menu" aria-expanded={mobileMenuOpen}>
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
          <span className="hamburger-bar" />
        </button>
        <span className="mobile-topbar-title">🇳🇵 Civic Intelligence</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className="topbar-icon-btn" onClick={() => setCmdOpen(true)} title="Search">🔍</button>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MOBILE-ONLY BOTTOM QUICK-NAV — always visible on ≤768px
          Hidden on desktop via CSS
          ══════════════════════════════════════════════════════════ */}
      <nav className="mobile-nav" aria-label="Quick navigation">
        <div className="mobile-nav-scroll">
          {MOBILE_NAV.map((n) => (
            <button key={n.id}
              className={`mobile-nav-btn ${page === n.id ? 'active' : ''}`}
              onClick={() => navigate(n.id)}>
              <span className="mobile-nav-icon">{n.icon}</span>
              <span className="mobile-nav-label">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          PAGE CONTENT
          ══════════════════════════════════════════════════════════ */}
      {page === 'front' ? (
        <div className="front-mobile-wrap fade-in">
          <FrontPage articles={articles} loading={loading} setPage={navigate} backendOnline={backendOnline} />
        </div>
      ) : (
        <div className={`shell fade-in${sidebarOpen ? '' : ' sidebar-collapsed'}`}>

          {/* Desktop sidebar — hidden on mobile */}
          <aside className="sidebar">
            {SidebarContent({ onNavigate: navigate })}
          </aside>

          {/* Desktop topbar */}
          <header className="topbar">
            <button className="sidebar-toggle-btn desktop-only" onClick={toggleSidebar}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label="Toggle sidebar">
              {sidebarOpen ? '◀' : '▶'}
            </button>

            {/* Hamburger in topbar (mobile fallback — mobile-topbar is hidden on inner pages by .main offset) */}
            <button className="hamburger-btn mobile-only" onClick={openMobileMenu}
              aria-label="Open navigation menu">
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
              <span className="hamburger-bar" />
            </button>

            <div className="topbar-search">
              <span className="ico">🔍</span>
              <input placeholder="Search… (or press ⌘K)" readOnly
                onClick={() => setCmdOpen(true)} style={{ cursor: 'pointer' }} />
            </div>

            <button className="cmd-palette-btn desktop-only" onClick={() => setCmdOpen(true)}>
              🔍 Search <span className="cmd-kbd">⌘K</span>
            </button>

            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              {!loading && [
                { icon:'📰', count:mediaFeeds, color:'#1a6aff', label:'Media' },
                { icon:'🏛️', count:govFeeds,   color:'#DC143C', label:'Govt'  },
                { icon:'🌐', count:intlFeeds,  color:'#7c3aed', label:'Intl'  },
              ].map((t, i) => (
                <div key={i} className="topbar-pill"
                  style={{ background:`${t.color}0f`, color:t.color, border:`1px solid ${t.color}25` }}>
                  {t.icon} {t.count} {t.label}
                </div>
              ))}
            </div>

            <div className={`live-pill ${wsConnected ? 'ws-live' : ''}`}>
              <span className="dot" />
              {loading ? `${pct}%` : wsConnected ? 'WS LIVE' : 'LIVE'}
            </div>

            <button className="topbar-icon-btn" title="Refresh" onClick={refetch}>🔄</button>
            <button className="topbar-icon-btn" title="Alerts">
              🔔
              {!loading && articles.filter(a => a.category === 'disaster').length > 0 &&
                <span className="badge-dot" />}
            </button>
            <button className="theme-toggle-btn desktop-only" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="topbar-icon-btn" title="Nepal">🇳🇵</button>
          </header>

          <main className="main">
            <div className="page-transition">
              <Suspense fallback={<PageLoader />}>
                {renderPage()}
              </Suspense>
            </div>
          </main>
        </div>
      )}
    </>
  );
}

