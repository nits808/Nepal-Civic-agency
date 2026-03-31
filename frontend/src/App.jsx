import React, { useEffect, useState } from 'react';
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
  { id: 'front', icon: 'HOME', label: 'Front Page' },
  { id: 'dashboard', icon: 'OPS', label: 'Operations' },
  { id: 'sources', icon: 'SRC', label: 'Source Engine' },
  { id: 'map', icon: 'MAP', label: 'Regional Map' },
  { id: 'projects', icon: 'LAB', label: 'Projects' },
  { id: 'analytics', icon: 'ANA', label: 'Analytics' },
  { id: 'sentiment', icon: 'MOOD', label: 'Sentiment' },
  { id: 'explorer', icon: 'GRAPH', label: 'Graph Explorer' },
  { id: 'chat', icon: 'AI', label: 'Assistant' },
];

const MOBILE_NAV = [
  { id: 'front', icon: 'HOME', label: 'Home' },
  { id: 'dashboard', icon: 'OPS', label: 'Ops' },
  { id: 'sources', icon: 'SRC', label: 'Sources' },
  { id: 'map', icon: 'MAP', label: 'Map' },
  { id: 'analytics', icon: 'ANA', label: 'Analytics' },
  { id: 'explorer', icon: 'GRAPH', label: 'Graph' },
  { id: 'chat', icon: 'AI', label: 'AI' },
];

const PAGE_META = {
  front: {
    eyebrow: 'National signal desk',
    title: 'Front page briefing',
    subtitle: 'A curated landing surface for the biggest civic movements, regional tension, and public-interest shifts.',
    searchHint: 'stories, provinces, and sectors',
  },
  dashboard: {
    eyebrow: 'Operations floor',
    title: 'Live intelligence operations',
    subtitle: 'High-density monitoring for emerging issues, sector heat, and source performance across the country.',
    searchHint: 'operations data',
  },
  sources: {
    eyebrow: 'Acquisition network',
    title: 'Source discovery engine',
    subtitle: 'Track coverage strength, identify blind spots, and keep the ingestion network trustworthy.',
    searchHint: 'publishers and source health',
  },
  map: {
    eyebrow: 'Regional view',
    title: 'Geospatial signal map',
    subtitle: 'Read how civic activity is clustering across provinces, districts, and local flashpoints.',
    searchHint: 'districts and provinces',
  },
  projects: {
    eyebrow: 'Execution layer',
    title: 'Projects tracker',
    subtitle: 'Move from awareness to action by organizing interventions, initiatives, and ongoing response work.',
    searchHint: 'projects and initiatives',
  },
  analytics: {
    eyebrow: 'Pattern analysis',
    title: 'Analytics lab',
    subtitle: 'Surface structural trends, recurring themes, and the strongest directional shifts in the data.',
    searchHint: 'metrics and patterns',
  },
  sentiment: {
    eyebrow: 'Public mood',
    title: 'Mood intelligence',
    subtitle: 'Quantify confidence, pressure, and social temperature from the live article stream.',
    searchHint: 'sentiment signals',
  },
  explorer: {
    eyebrow: 'Knowledge graph',
    title: 'Graph explorer',
    subtitle: 'Investigate how actors, regions, issues, and institutions connect across the information graph.',
    searchHint: 'entities and relationships',
  },
  chat: {
    eyebrow: 'Decision support',
    title: 'AI assistant',
    subtitle: 'Ask questions across the signal network and turn raw monitoring into fast strategic understanding.',
    searchHint: 'questions for the assistant',
  },
};

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('ncig-theme');
    if (stored) return stored;
  } catch (_) {}

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function titleCase(value) {
  if (!value) return 'No signal yet';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function topEntry(map) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || null;
}

export default function App() {
  const [page, setPage] = useState('front');
  const {
    articles,
    loading,
    isRefreshing,
    feedStatus,
    lastUpdated,
    refetch,
    progress,
    connectedFeeds,
    govFeeds,
    mediaFeeds,
    intlFeeds,
    totalFeeds,
    backendOnline,
    wsConnected,
    newArticleToast,
  } = useNews();
  const [clock, setClock] = useState(new Date());
  const [theme, setTheme] = useState(getInitialTheme);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ncig-theme', theme);
    } catch (_) {}
  }, [theme]);

  useEffect(() => {
    if (newArticleToast) setToastVisible(true);
  }, [newArticleToast]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  const categoryCounts = {};
  const provinceCounts = {};
  const sourceCounts = {};

  for (const article of articles) {
    categoryCounts[article.category || 'uncategorized'] = (categoryCounts[article.category || 'uncategorized'] || 0) + 1;
    provinceCounts[article.province || 'National'] = (provinceCounts[article.province || 'National'] || 0) + 1;
    sourceCounts[article.source || 'Unknown source'] = (sourceCounts[article.source || 'Unknown source'] || 0) + 1;
  }

  const leadCategory = topEntry(categoryCounts);
  const leadProvince = topEntry(provinceCounts);
  const leadSource = topEntry(sourceCounts);
  const activeProvinceCount = Object.values(provinceCounts).filter(Boolean).length;
  const riskCount = articles.filter((article) => ['disaster', 'law', 'health'].includes(article.category)).length;
  const pct = totalFeeds > 0 ? Math.round((progress.done / totalFeeds) * 100) : 0;
  const connStatus = loading ? 'loading' : connectedFeeds > 0 ? 'ok' : 'error';
  const pageMeta = PAGE_META[page] || PAGE_META.dashboard;

  const shellMetrics = [
    {
      label: 'Live nodes',
      value: loading ? '...' : String(articles.length),
      note: `${Object.keys(sourceCounts).length} sources`,
      tone: 'blue',
    },
    {
      label: 'Coverage',
      value: loading ? '...' : `${activeProvinceCount}/7`,
      note: 'provinces active',
      tone: 'gold',
    },
    {
      label: 'Priority',
      value: loading ? '...' : String(riskCount),
      note: 'high-risk items',
      tone: 'red',
    },
    {
      label: 'Mode',
      value: backendOnline ? 'Live' : 'Fallback',
      note: backendOnline ? 'backend connected' : 'client-side intelligence',
      tone: 'green',
    },
  ];

  const radarCards = [
    {
      title: 'Lead sector',
      value: loading ? 'Preparing view' : titleCase(leadCategory?.[0]),
      note: loading ? 'Compiling sector mix' : `${leadCategory?.[1] || 0} live stories`,
      tone: 'blue',
    },
    {
      title: 'Top geography',
      value: loading ? 'Mapping coverage' : leadProvince?.[0] || 'National',
      note: loading ? 'Scanning regional spread' : `${leadProvince?.[1] || 0} articles surfaced`,
      tone: 'gold',
    },
    {
      title: 'Lead source',
      value: loading ? 'Indexing sources' : leadSource?.[0] || 'Warming up',
      note: loading ? 'Waiting for signal' : `${leadSource?.[1] || 0} contributions`,
      tone: 'red',
    },
  ];

  const topbarChips = [
    {
      label: 'Network',
      value: `${connectedFeeds}/${totalFeeds}`,
    },
    {
      label: 'Sectors',
      value: String(Object.keys(categoryCounts).length || 0),
    },
    {
      label: 'Sources',
      value: String(Object.keys(sourceCounts).length || 0),
    },
  ];

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard articles={articles} loading={loading} lastUpdated={lastUpdated} refetch={refetch} progress={progress} totalFeeds={totalFeeds} />;
      case 'sources':
        return <SourceManager feedStatus={feedStatus} />;
      case 'map':
        return <MapPage articles={articles} />;
      case 'projects':
        return <ProjectsPage />;
      case 'analytics':
        return <AnalyticsPage articles={articles} feedStatus={feedStatus} />;
      case 'sentiment':
        return <SentimentPage articles={articles} />;
      case 'explorer':
        return <ExplorerPage articles={articles} />;
      case 'chat':
        return <ChatPage articles={articles} />;
      default:
        return <Dashboard articles={articles} loading={loading} lastUpdated={lastUpdated} refetch={refetch} progress={progress} totalFeeds={totalFeeds} />;
    }
  };

  return (
    <>
      <FmRadioWidget />

      {toastVisible && newArticleToast && (
        <NewArticleToast
          toast={newArticleToast}
          onDismiss={() => setToastVisible(false)}
        />
      )}

      {articles.length > 0 && <BreakingTicker articles={articles} />}

      {page === 'front' ? (
        <div className="fade-in">
          <FrontPage articles={articles} loading={loading} setPage={setPage} backendOnline={backendOnline} />
        </div>
      ) : (
        <div className="shell shell-upgraded fade-in">
          <aside className="sidebar">
            <div className="sidebar-logo sidebar-brand-panel">
              <button className="sidebar-home-btn" onClick={() => setPage('front')}>
                <img className="logo-flag" src="https://giwmscdntwo.gov.np/static/grapejs/img/Nepal-flag.gif" alt="Nepal Flag" />
                <div className="logo-text-block">
                  <div className="logo-text">Civic Intelligence Graph</div>
                  <div className="logo-sub">National command surface</div>
                </div>
              </button>
              <p className="sidebar-brand-copy">
                Track civic movement, regional concentration, and narrative pressure from one shared operations floor.
              </p>
              <div className="sidebar-mini-grid">
                {shellMetrics.map((metric) => (
                  <div key={metric.label} className={`sidebar-mini-card tone-${metric.tone}`}>
                    <span className="sidebar-mini-label">{metric.label}</span>
                    <strong className="sidebar-mini-value">{metric.value}</strong>
                    <span className="sidebar-mini-note">{metric.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sidebar-status-wrap">
              <BackendStatus online={backendOnline} wsConnected={wsConnected} />
            </div>

            {(loading || isRefreshing) && (
              <div className="sidebar-progress-panel">
                <div className="sidebar-progress-head">
                  <span>{loading ? 'Building live view' : 'Refreshing network'}</span>
                  <strong>{pct}%</strong>
                </div>
                <div className="progress-rail">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="nav-group">
              <div className="nav-label">Navigation</div>
              {NAV.map((navItem) => (
                <button
                  key={navItem.id}
                  className={`nav-btn ${page === navItem.id ? 'active' : ''}`}
                  onClick={() => setPage(navItem.id)}
                >
                  <span className="nav-icon">{navItem.icon}</span>
                  {navItem.label}
                  {navItem.id === 'dashboard' && !loading && articles.length > 0 && (
                    <span className="nav-badge blue">{articles.length}</span>
                  )}
                  {navItem.id === 'chat' && <span className="nav-badge green">Live</span>}
                </button>
              ))}
            </div>

            <div className="nav-group">
              <div className="nav-label">Signal radar</div>
              <div className="sidebar-radar-list">
                {radarCards.map((card) => (
                  <div key={card.title} className={`sidebar-radar-card tone-${card.tone}`}>
                    <span className="sidebar-radar-title">{card.title}</span>
                    <strong className="sidebar-radar-value">{card.value}</strong>
                    <span className="sidebar-radar-note">{card.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {!loading && (
              <div className="nav-group">
                <div className="nav-label">Source mix</div>
                <div className="sidebar-source-pills">
                  {[
                    { label: `${mediaFeeds} Media`, color: '#1a6aff' },
                    { label: `${govFeeds} Govt`, color: '#dc143c' },
                    { label: `${intlFeeds} Intl`, color: '#b45309' },
                  ].map((token) => (
                    <span
                      key={token.label}
                      className="type-pill"
                      style={{
                        background: `${token.color}12`,
                        color: token.color,
                        border: `1px solid ${token.color}30`,
                      }}
                    >
                      {token.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="nav-group">
              <div className="nav-label">Feed architecture</div>
              {Object.entries(FEED_TYPES).map(([type, meta]) => {
                const feeds = RSS_FEEDS.filter((feed) => feed.type === type);
                const live = feeds.filter((feed) => feedStatus[feed.id]?.ok).length;

                return (
                  <div key={type} className="source-row">
                    <span className="source-label">{meta.label}</span>
                    <span
                      className="source-badge"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                        border: `1px solid ${meta.color}30`,
                      }}
                    >
                      {live}/{feeds.length}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="nav-group" style={{ paddingBottom: 0 }}>
              <div className="nav-label">Pipeline</div>
              <PipelineOverview
                feedStatus={feedStatus}
                progress={progress}
                totalFeeds={totalFeeds}
                loading={loading}
                backendOnline={backendOnline}
                articles={articles}
              />
            </div>

            <div className="nav-group" style={{ paddingBottom: 0 }}>
              <div className="nav-label">Seismic monitor</div>
              <EarthquakeWidget />
            </div>

            <div className="sidebar-footer">
              <div className="conn-status">
                <span className={`conn-dot ${isRefreshing ? 'refresh' : connStatus}`} />
                {loading
                  ? 'Building live intelligence'
                  : isRefreshing
                    ? 'Refreshing live network'
                    : `${connectedFeeds}/${totalFeeds} feeds connected`}
              </div>
              <div className="sidebar-footer-meta">
                {clock.toLocaleTimeString('en-US')}
                {lastUpdated ? ` | Updated ${lastUpdated.toLocaleTimeString()}` : ''}
              </div>
            </div>
          </aside>

          <header className="topbar topbar-upgraded">
            <div className="topbar-copy">
              <div className="section-eyebrow topbar-eyebrow">{pageMeta.eyebrow}</div>
              <div className="topbar-title-row">
                <div className="topbar-title-block">
                  <h1 className="topbar-title">{pageMeta.title}</h1>
                  <p className="topbar-subtitle">{pageMeta.subtitle}</p>
                </div>
                <div className={`live-pill ${wsConnected ? 'ws-live' : ''}`}>
                  <span className="dot" />
                  {loading ? `${pct}% synced` : backendOnline ? 'Backend live' : 'Client intelligence mode'}
                </div>
              </div>
            </div>

            <div className="topbar-search">
              <span className="ico">Search</span>
              <input
                placeholder={`Search ${pageMeta.searchHint}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.currentTarget.value) setPage('explorer');
                }}
              />
            </div>

            <div className="topbar-action-cluster">
              {topbarChips.map((chip) => (
                <div key={chip.label} className="topbar-pill topbar-kpi-pill">
                  <span>{chip.label}</span>
                  <strong>{chip.value}</strong>
                </div>
              ))}

              <button className="topbar-ghost-btn" onClick={() => setPage('map')}>
                Regional map
              </button>
              <button className="topbar-ghost-btn" onClick={() => setPage('explorer')}>
                Graph view
              </button>
              <button className="topbar-icon-btn" title="Refresh all feeds" onClick={refetch}>
                Refresh
              </button>
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </header>

          <main className="main main-upgraded">
            <div className="page-transition">{renderPage()}</div>
          </main>

          <nav className="mobile-shell-nav" aria-label="Mobile navigation">
            {MOBILE_NAV.map((item) => (
              <button
                key={item.id}
                className={`mobile-shell-nav-btn ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <span className="mobile-shell-nav-icon">{item.icon}</span>
                <span className="mobile-shell-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
