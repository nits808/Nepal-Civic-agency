import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CAT_COLORS, CAT_ICONS, PROVINCES, resolveArticleImage, isSourceVerified } from './data.js';
import { useModal } from './ModalContext.jsx';
import { SkeletonFeedItem } from './UIComponents.jsx';

export function articleLocation(article) {
  const parts = [article.district, article.province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Nepal (inferred)';
}

export function StatCard({ icon, value, label, sub, color }) {
  return (
    <div className="stat-card" style={color ? { borderTop: `2px solid ${color}` } : {}}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-val" style={color ? { color } : {}}>{value}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-chg">{sub}</div>}
    </div>
  );
}

function readTime(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const SOURCE_INITIALS = {
  'The Kathmandu Post': 'KP',
  'The Himalayan Times': 'HT',
  'My Republica': 'MR',
  'Nepali Times': 'NT',
  'Online Khabar': 'OK',
  'Setopati English': 'SP',
  'Ratopati English': 'RP',
  'Nepal News': 'NN',
  'Lokaantar': 'LK',
  'Baahrakhari': 'BK',
  'Ujyaalo Online': 'UJ',
  'Gorkhapatra Daily': 'GP',
  'BBC Nepali': 'BBC',
  'Al Jazeera Asia': 'AJ',
  'The Record Nepal': 'RN',
  'The Annapurna Express': 'AE',
  'Khabarhub English': 'KH',
  'Nepal Live Today': 'NLT',
};

function srcInitials(name) {
  if (!name) return '?';
  return SOURCE_INITIALS[name] || name.split(' ').map((word) => word[0]).join('').slice(0, 3).toUpperCase();
}

export function FeedItem({ article, compact = false }) {
  const category = article.category || 'politics';
  const color = CAT_COLORS[category] || '#6b7280';
  const summary = (article.description || '').trim();
  const location = articleLocation(article);
  const { openModal } = useModal();
  const image = resolveArticleImage(article);
  const minutes = readTime(summary);
  const dateValue = article.date ? new Date(article.date).getTime() : Date.now();
  const ageMinutes = Math.floor((Date.now() - dateValue) / 60000);
  const urgentKeywords = /killed|arrest|earthquake|flood|crash|fire|protest|storm|dead|attack|shooting|explosion/i;
  const combinedText = `${article.title || ''} ${summary || ''}`;
  const isBreaking = ageMinutes < 90 && urgentKeywords.test(combinedText);
  const hasImage = article.hasRealImage && image.url;
  const verified = isSourceVerified(article.source);

  if (compact) {
    return (
      <a
        className={`feed-compact cat-${category}`}
        href={article.link || '#'}
        onClick={(event) => {
          event.preventDefault();
          openModal({ ...article, imageUrl: image.url });
        }}
      >
        <div className="feed-compact-accent" style={{ background: color }} />
        <div className="feed-compact-body">
          <div className="feed-compact-meta">
            <span className="feed-src-badge" style={{ background: `${color}20`, color }}>
              {srcInitials(article.source)}
              {verified && <span className="verified-tick" title="Verified Source"> v</span>}
            </span>
            {isBreaking && <span className="breaking-pill">Breaking</span>}
            <span className="feed-ct">{article.timeAgo || 'just now'}</span>
            <span className="feed-readtime">| {minutes}m</span>
          </div>
          <div className="feed-compact-title">{article.title || 'Untitled article'}</div>
        </div>
        {hasImage && (
          <div className="feed-compact-thumb" style={{ backgroundImage: `url(${image.url})` }} />
        )}
      </a>
    );
  }

  return (
    <a
      className={`feed-item cat-${category}`}
      href={article.link || '#'}
      onClick={(event) => {
        event.preventDefault();
        openModal({ ...article, imageUrl: image.url });
      }}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="feed-accent" style={{ background: color }} />

      <div className="feed-body">
        <div className="feed-top-row">
          <span className="feed-src-badge" style={{ background: `${color}20`, color }}>
            {srcInitials(article.source)}
          </span>
          <span className="feed-source-name">
            {article.source}
            {verified && <span className="verified-tick" title="Verified Source"> v</span>}
          </span>
          {isBreaking && <span className="breaking-pill">Breaking</span>}
          <span className="feed-time-right">{article.timeAgo}</span>
        </div>

        <div className="feed-title">{article.title}</div>

        {summary && (
          <div className="mini-summary">
            {summary.slice(0, 160)}{summary.length > 160 ? '...' : ''}
          </div>
        )}

        <div className="feed-footer-row">
          <span className="feed-loc-pin">Location: {location}</span>
          <span className="feed-readtime">{minutes} min read</span>
        </div>
      </div>

      {hasImage ? (
        <div className="feed-thumb" style={{ backgroundImage: `url(${image.url})` }}>
          <div className="feed-img-cat-badge" style={{ background: color }}>
            {CAT_ICONS[category]} {category}
          </div>
          <div className="feed-thumb-overlay" />
        </div>
      ) : (
        <div
          className="feed-text-card"
          style={{
            background: `linear-gradient(135deg, ${color}18, ${color}05)`,
            borderLeft: `3px solid ${color}40`,
          }}
        >
          <div className="feed-text-card-icon">{CAT_ICONS[category] || 'N'}</div>
          <div className="feed-text-card-cat" style={{ color }}>{category.toUpperCase()}</div>
          <div className="feed-text-card-src">{srcInitials(article.source)}</div>
        </div>
      )}
    </a>
  );
}

const TTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0];

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ color: '#111827', fontWeight: 700 }}>{point.name || point.payload?.name}</div>
      <div style={{ color: '#6b7280' }}>{point.value} articles</div>
    </div>
  );
};

function OverviewTab({ articles, loading, stats }) {
  const sourceValues = Object.values(stats.bySrc);
  const maxSourceValue = sourceValues.length ? Math.max(...sourceValues) : 1;

  return (
    <>
      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Category breakdown</span>
            <span className="card-sub">{articles.length} articles</span>
          </div>
          {loading ? <div className="skel" style={{ height: 220 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.catData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {stats.catData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="transparent" />)}
                </Pie>
                <Tooltip content={<TTip />} />
                <Legend iconType="circle" iconSize={9} formatter={(value) => <span style={{ color: '#64748b', fontSize: 11 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Coverage by province</span>
            <span className="card-sub">7 provinces</span>
          </div>
          {loading ? <div className="skel" style={{ height: 220 }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.provData} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,150,0.15)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip content={<TTip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.provData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-head">
          <span className="card-title">Source performance</span>
          <span className="card-sub">{Object.keys(stats.bySrc).length} active sources</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(stats.bySrc).sort((a, b) => b[1] - a[1]).map(([source, count], index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {source}
              </div>
              <div style={{ flex: 1, height: 8, background: 'var(--bg-raised)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(count / maxSourceValue) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #dc143c, #0f4c81, #12805c)',
                    borderRadius: 999,
                    transition: 'width 1.2s',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-1)', fontWeight: 700, width: 28, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CategoryNewsTab({ articles, loading, category, search, setSearch }) {
  const [viewMode, setViewMode] = useState('feature');

  const filtered = useMemo(() => {
    let results = articles;

    if (category === 'provincial') {
      results = articles.filter((article) => article.province && article.province !== 'National' && article.province !== 'International');
    } else if (category !== 'all') {
      results = articles.filter((article) => article.category === category);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      results = results.filter((article) =>
        (article.title || '').toLowerCase().includes(query) ||
        (article.description || '').toLowerCase().includes(query));
    }

    return results;
  }, [articles, category, search]);

  const categoryColor = category === 'provincial' ? '#d97706' : (CAT_COLORS[category] || '#0f4c81');
  const categoryIcon = category === 'provincial' ? 'P' : (CAT_ICONS[category] || 'N');

  const categoryArticles = useMemo(() => {
    if (category === 'provincial') {
      return articles.filter((article) => article.province && article.province !== 'National' && article.province !== 'International');
    }
    if (category === 'all') return articles;
    return articles.filter((article) => article.category === category);
  }, [articles, category]);

  const topProvince = useMemo(() => {
    const counts = {};
    categoryArticles.forEach((article) => {
      const province = article.province || 'National';
      counts[province] = (counts[province] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  }, [categoryArticles]);

  const topSource = useMemo(() => {
    const counts = {};
    categoryArticles.forEach((article) => {
      const source = article.source || 'Unknown source';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  }, [categoryArticles]);

  const latest = categoryArticles.length
    ? categoryArticles.reduce((best, article) => {
        const time = new Date(article.date || 0).getTime();
        const bestTime = new Date(best.date || 0).getTime();
        return time > bestTime ? article : best;
      }, categoryArticles[0])
    : null;

  return (
    <>
      {!loading && categoryArticles.length > 0 && (
        <div className="card mb-4" style={{ borderTop: `3px solid ${categoryColor}`, background: `linear-gradient(135deg, ${categoryColor}08 0%, white 100%)` }}>
          <div className="card-head">
            <span className="card-title">
              {categoryIcon} {category === 'all' ? 'All Nepal news' : category === 'provincial' ? 'Provincial and local news' : `${category} signal lane`}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: `${categoryColor}15`, color: categoryColor, border: `1px solid ${categoryColor}30` }}>
              {categoryArticles.length} articles
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 8, borderLeft: `3px solid ${categoryColor}` }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontWeight: 600, marginBottom: 4 }}>TOTAL ARTICLES</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: categoryColor }}>{categoryArticles.length}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>From {[...new Set(categoryArticles.map((article) => article.source || 'Unknown source'))].length} sources</div>
            </div>

            {topProvince && (
              <div style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 8, borderLeft: '3px solid #0f4c81' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontWeight: 600, marginBottom: 4 }}>TOP PROVINCE</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)' }}>{topProvince[0]}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{topProvince[1]} articles</div>
              </div>
            )}

            {topSource && (
              <div style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 8, borderLeft: '3px solid #c2410c' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontWeight: 600, marginBottom: 4 }}>TOP SOURCE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-1)' }}>{topSource[0]}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{topSource[1]} articles</div>
              </div>
            )}

            {latest?.title && (
              <div style={{ padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 8, borderLeft: '3px solid #12805c' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', fontWeight: 600, marginBottom: 4 }}>LATEST</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>
                  {latest.title.slice(0, 60)}{latest.title.length > 60 ? '...' : ''}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 3 }}>{latest.timeAgo}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            {categoryIcon} {category === 'all' ? 'All news' : category === 'provincial' ? 'Provincial and local news' : `${category} news`}
            <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12, background: `${categoryColor}15`, color: categoryColor, border: `1px solid ${categoryColor}30`, fontWeight: 700 }}>
              {filtered.length} articles
            </span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-sub">{loading ? 'Fetching...' : `${categoryArticles.length} total`}</span>
            <div className="view-toggle">
              <button className={`view-toggle-btn${viewMode === 'feature' ? ' active' : ''}`} onClick={() => setViewMode('feature')} title="Feature cards">Wide</button>
              <button className={`view-toggle-btn${viewMode === 'compact' ? ' active' : ''}`} onClick={() => setViewMode('compact')} title="Compact list">Dense</button>
            </div>
          </div>
        </div>

        <input
          className="search-input"
          placeholder={`Search ${category === 'all' ? 'all news' : `${category} news`}...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className={`feed${viewMode === 'compact' ? ' feed-compact-list' : ''}`} style={{ maxHeight: viewMode === 'compact' ? 700 : 580 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <SkeletonFeedItem key={index} />)
            : filtered.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: 6 }}>
                    {category === 'all' ? 'No articles found' : `No ${category} articles found`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-4)', lineHeight: 1.7 }}>
                    {search
                      ? `No results for "${search}". Try different keywords.`
                      : articles.length === 0
                        ? 'Feeds are loading. Use Refresh in the header to retry.'
                        : `None of the ${articles.length} loaded articles matched this lane yet.`}
                  </div>
                </div>
              )
              : filtered.map((article) => <FeedItem key={article.id} article={article} compact={viewMode === 'compact'} />)}
        </div>
      </div>
    </>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'Overview' },
  { id: 'all', label: 'All News', icon: 'All' },
  { id: 'provincial', label: 'Provincial', icon: 'Province' },
  { id: 'international', label: 'International', icon: 'Global' },
  { id: 'politics', label: 'Politics', icon: 'Politics' },
  { id: 'economy', label: 'Economy', icon: 'Economy' },
  { id: 'technology', label: 'Technology', icon: 'Technology' },
  { id: 'disaster', label: 'Disaster', icon: 'Alert' },
  { id: 'health', label: 'Health', icon: 'Health' },
  { id: 'infrastructure', label: 'Infrastructure', icon: 'Infra' },
  { id: 'education', label: 'Education', icon: 'Education' },
  { id: 'sports', label: 'Sports', icon: 'Sports' },
  { id: 'tourism', label: 'Tourism', icon: 'Tourism' },
  { id: 'environment', label: 'Environment', icon: 'Environment' },
  { id: 'law', label: 'Law and Crime', icon: 'Law' },
];

export function Dashboard({ articles, loading, lastUpdated, refetch }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const stats = useMemo(() => {
    const byCat = {};
    const byProv = {};
    const bySrc = {};
    let latestArticle = null;

    articles.forEach((article) => {
      const category = article.category || 'uncategorized';
      const province = article.province || 'National';
      const source = article.source || 'Unknown source';

      byCat[category] = (byCat[category] || 0) + 1;
      byProv[province] = (byProv[province] || 0) + 1;
      bySrc[source] = (bySrc[source] || 0) + 1;

      if (!latestArticle || new Date(article.date || 0).getTime() > new Date(latestArticle.date || 0).getTime()) {
        latestArticle = article;
      }
    });

    const catData = Object.entries(byCat)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#64748b' }))
      .sort((a, b) => b.value - a.value);

    const provData = PROVINCES.map((province) => ({
      name: province.name.replace('Province No. ', 'P'),
      value: byProv[province.name] || 0,
      fill: province.color,
    }));

    const sourceRank = Object.entries(bySrc).sort((a, b) => b[1] - a[1]);
    const topCategory = catData[0] || null;
    const topProvince = [...provData].sort((a, b) => b.value - a.value).find((entry) => entry.value > 0) || null;
    const activeProvinceCount = provData.filter((entry) => entry.value > 0).length;
    const riskCount = articles.filter((article) => ['disaster', 'law', 'health'].includes(article.category)).length;
    const growthCount = articles.filter((article) => ['technology', 'economy', 'infrastructure'].includes(article.category)).length;

    return {
      byCat,
      byProv,
      bySrc,
      catData,
      provData,
      sourceRank,
      topCategory,
      topProvince,
      activeProvinceCount,
      riskCount,
      growthCount,
      latestArticle,
      uniqueSources: Object.keys(bySrc).length,
      leadSource: sourceRank[0] ? { name: sourceRank[0][0], value: sourceRank[0][1] } : null,
    };
  }, [articles]);

  const disasterArticles = articles.filter((article) => article.category === 'disaster');

  const heroCards = [
    {
      label: 'Lead sector',
      value: loading ? 'Preparing view' : (stats.topCategory?.name || 'No signal'),
      note: loading ? 'Compiling category mix' : `${stats.topCategory?.value || 0} stories in focus`,
      tone: 'blue',
    },
    {
      label: 'Regional concentration',
      value: loading ? 'Mapping spread' : (stats.topProvince?.name || 'National'),
      note: loading ? 'Scanning province data' : `${stats.topProvince?.value || 0} stories surfaced`,
      tone: 'gold',
    },
    {
      label: 'Lead source',
      value: loading ? 'Indexing sources' : (stats.leadSource?.name || 'Warming up'),
      note: loading ? 'Awaiting source mix' : `${stats.leadSource?.value || 0} contributions`,
      tone: 'red',
    },
    {
      label: 'Latest signal',
      value: loading ? 'Syncing feed' : (stats.latestArticle?.timeAgo || 'Live'),
      note: loading ? 'Waiting for first sync' : (stats.latestArticle?.title || 'Fresh updates will appear here').slice(0, 72),
      tone: 'green',
    },
  ];

  const watchCards = [
    {
      title: 'Priority pressure',
      metric: loading ? 'Calibrating' : `${stats.riskCount} high-attention items`,
      body: loading
        ? 'Assessing disaster, law, and health stories.'
        : disasterArticles[0]?.title || 'No critical item is dominating the national feed right now.',
      tone: 'red',
    },
    {
      title: 'Coverage reach',
      metric: loading ? 'Scanning' : `${stats.activeProvinceCount}/7 provinces`,
      body: loading
        ? 'Mapping regional distribution.'
        : stats.topProvince
          ? `${stats.topProvince.name} is currently contributing the strongest provincial signal.`
          : 'Regional coverage is still warming up.',
      tone: 'blue',
    },
    {
      title: 'Growth window',
      metric: loading ? 'Reading momentum' : `${stats.growthCount} opportunity stories`,
      body: loading
        ? 'Measuring economy, technology, and infrastructure signals.'
        : stats.growthCount > 0
          ? 'Infrastructure, economy, and innovation stories are active enough to form a clear opportunity lane.'
          : 'Growth-related reporting is quieter than the current risk and political movement.',
      tone: 'gold',
    },
  ];

  const primaryNarrative = loading
    ? 'The operations floor is building a fresh situational picture from the active intake network.'
    : `You are tracking ${articles.length} live articles from ${stats.uniqueSources} sources across ${stats.activeProvinceCount || 0} provinces, with ${stats.riskCount} high-attention items currently demanding watchlist focus.`;

  const handleTab = (id) => {
    setActiveTab(id);
    setSearch('');
  };

  return (
    <div className="page dashboard-page">
      {!dismissed && disasterArticles.length > 0 && (
        <div className="alert-strip">
          <span className="a-icon">Alert</span>
          <span className="a-text">{disasterArticles[0].title}</span>
          <span className="a-time">{disasterArticles[0].timeAgo}</span>
          <button className="a-close" onClick={() => setDismissed(true)}>Close</button>
        </div>
      )}

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="section-eyebrow">Operations floor</div>
          <h2 className="dashboard-hero-title">National situational awareness, arranged by signal strength.</h2>
          <p className="dashboard-hero-lead">{primaryNarrative}</p>
          <div className="dashboard-hero-actions">
            <button className="dashboard-primary-btn" onClick={refetch}>Refresh network</button>
            <div className="dashboard-status-chip">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Awaiting first sync'}
            </div>
          </div>
        </div>

        <div className="dashboard-hero-grid">
          {heroCards.map((card) => (
            <div key={card.label} className={`dashboard-hero-card tone-${card.tone}`}>
              <span className="dashboard-hero-card-label">{card.label}</span>
              <strong className="dashboard-hero-card-value">{card.value}</strong>
              <span className="dashboard-hero-card-note">{card.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-watch-grid">
        {watchCards.map((card) => (
          <div key={card.title} className={`dashboard-watch-card tone-${card.tone}`}>
            <span className="dashboard-watch-title">{card.title}</span>
            <strong className="dashboard-watch-metric">{card.metric}</strong>
            <p>{card.body}</p>
          </div>
        ))}
      </section>

      <div className="stats-row">
        <StatCard icon="News" value={loading ? '...' : articles.length} label="Total Articles" sub="Live stream" />
        <StatCard icon="Risk" value={loading ? '...' : (stats.byCat.disaster || 0)} label="Disaster" sub="Auto-detected" color="#dc2626" />
        <StatCard icon="Gov" value={loading ? '...' : (stats.byCat.politics || 0)} label="Politics" sub="Tracked" color="#0f4c81" />
        <StatCard icon="Eco" value={loading ? '...' : (stats.byCat.economy || 0)} label="Economy" sub="Analyzed" color="#d97706" />
        <StatCard icon="Health" value={loading ? '...' : (stats.byCat.health || 0)} label="Health" sub="Monitored" color="#db2777" />
        <StatCard icon="Infra" value={loading ? '...' : (stats.byCat.infrastructure || 0)} label="Infrastructure" sub="Tracked" color="#6d28d9" />
      </div>

      <div className="dashboard-tab-shell">
        <div className="dashboard-tab-bar">
          {TABS.map((tab) => {
            const count = tab.id === 'provincial'
              ? articles.filter((article) => article.province && article.province !== 'National' && article.province !== 'International').length
              : tab.id !== 'overview' && tab.id !== 'all'
                ? stats.byCat[tab.id]
                : null;

            const isActive = activeTab === tab.id;
            const tabColor = tab.id === 'provincial' ? '#d97706' : (CAT_COLORS[tab.id] || '#0f4c81');

            return (
              <button
                key={tab.id}
                className={`dashboard-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTab(tab.id)}
                style={{ '--tab-accent': tabColor, '--tab-accent-soft': `${tabColor}18` }}
              >
                {tab.icon} {tab.label}
                {count ? <span className="dashboard-tab-badge">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="dashboard-toolbar">
        <div className="dashboard-toolbar-copy">
          {loading ? 'Fetching live news...' : `${articles.length} articles loaded from ${Object.keys(stats.bySrc).length} sources`}
        </div>
        <div className="dashboard-toolbar-actions">
          {lastUpdated && <span className="dashboard-toolbar-meta">Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button className="dashboard-secondary-btn" onClick={refetch}>Refresh</button>
        </div>
      </div>

      {activeTab === 'overview'
        ? <OverviewTab articles={articles} loading={loading} stats={stats} />
        : (
          <CategoryNewsTab
            articles={articles}
            loading={loading}
            category={activeTab}
            search={search}
            setSearch={setSearch}
          />
        )}
    </div>
  );
}
