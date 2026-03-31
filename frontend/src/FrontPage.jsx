import React from 'react';
import { CAT_COLORS, CAT_ICONS, resolveArticleImage } from './data.js';
import { articleLocation } from './Dashboard.jsx';
import { useModal } from './ModalContext.jsx';
import { SkeletonCard } from './UIComponents.jsx';

function categoryLabel(value) {
  if (!value) return 'General';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function topEntry(map) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || null;
}

export function ImageCard({ article }) {
  const color = CAT_COLORS[article.category] || '#64748b';
  const { openModal } = useModal();
  const image = resolveArticleImage(article);

  return (
    <a
      className="img-card"
      href={article.link || '#'}
      onClick={(event) => {
        event.preventDefault();
        openModal({ ...article, imageUrl: image.url });
      }}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="img-card-top" style={{ backgroundImage: `url(${image.url})` }}>
        <div className="img-card-overlay">
          <span className="cat-pill" style={{ background: color }}>
            {CAT_ICONS[article.category] || ''} {article.category || 'News'}
          </span>
          {image.type === 'rss' && <span className="real-img-badge" title="Real article photo">Live</span>}
        </div>
      </div>
      <div className="img-card-body">
        <h3 className="ic-title">{article.title}</h3>
        <p className="ic-desc">{(article.description || '').substring(0, 100)}...</p>
        <div className="ic-foot">
          <span style={{ color, fontWeight: 800 }}>{article.source || 'Unknown'}</span>
          <span style={{ color: 'var(--text-4)' }}>| {article.timeAgo || 'just now'}</span>
        </div>
      </div>
    </a>
  );
}

function HeroLeadStory({ article }) {
  const { openModal } = useModal();
  const image = resolveArticleImage(article);
  const color = CAT_COLORS[article.category] || '#0f4c81';

  return (
    <a
      className="front-lead-story"
      href={article.link || '#'}
      onClick={(event) => {
        event.preventDefault();
        openModal({ ...article, imageUrl: image.url });
      }}
      target="_blank"
      rel="noopener noreferrer"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(8, 15, 30, 0.08), rgba(8, 15, 30, 0.78)), url(${image.url})` }}
    >
      <div className="front-lead-meta">
        <span className="front-lead-kicker" style={{ borderColor: `${color}55`, color }}>
          {categoryLabel(article.category)}
        </span>
        <span className="front-lead-time">{article.timeAgo || 'Just now'}</span>
      </div>
      <div className="front-lead-body">
        <h2>{article.title}</h2>
        <p>{(article.description || 'A high-priority update from the live civic intelligence stream.').slice(0, 180)}...</p>
        <div className="front-lead-foot">
          <span>{article.source || 'Unknown source'}</span>
          <span>{articleLocation(article)}</span>
        </div>
      </div>
    </a>
  );
}

function HeroMetric({ label, value, note, tone }) {
  return (
    <div className={`front-metric-card tone-${tone}`}>
      <span className="front-metric-label">{label}</span>
      <strong className="front-metric-value">{value}</strong>
      <span className="front-metric-note">{note}</span>
    </div>
  );
}

function ActionCard({ title, description, buttonLabel, onClick, tone }) {
  return (
    <div className={`front-action-card tone-${tone}`}>
      <span className="front-action-kicker">{title}</span>
      <p>{description}</p>
      <button className="front-action-btn" onClick={onClick}>
        {buttonLabel}
      </button>
    </div>
  );
}

function SignalLane({ title, subtitle, articles, tone, emptyLabel }) {
  return (
    <div className={`front-lane-card tone-${tone}`}>
      <div className="front-lane-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="front-lane-list">
        {articles.length === 0 ? (
          <div className="front-lane-empty">{emptyLabel}</div>
        ) : (
          articles.map((article) => <SignalRow key={article.id} article={article} tone={tone} />)
        )}
      </div>
    </div>
  );
}

function SignalRow({ article, tone }) {
  const { openModal } = useModal();
  const color = CAT_COLORS[article.category] || '#64748b';

  return (
    <button
      className={`front-lane-row tone-${tone}`}
      onClick={() => openModal({ ...article, imageUrl: resolveArticleImage(article).url })}
    >
      <span className="front-lane-accent" style={{ background: color }} />
      <span className="front-lane-body">
        <strong>{article.title}</strong>
        <span>{article.source || 'Unknown source'} | {article.timeAgo || 'Live'}</span>
      </span>
    </button>
  );
}

function HeroSkeleton() {
  return (
    <div className="front-lead-story skeleton-hero-card">
      <div className="skel skel-pill" style={{ width: 120 }} />
      <div className="skel skel-line long" style={{ marginTop: 'auto', height: 26 }} />
      <div className="skel skel-line medium" style={{ height: 16 }} />
      <div className="skel skel-line short" style={{ height: 16 }} />
    </div>
  );
}

export default function FrontPage({ articles, loading, setPage, backendOnline }) {
  const featureList = articles.slice(1, 7);
  const heroStory = articles[0];
  const criticalStories = articles.filter((article) => ['disaster', 'law', 'health'].includes(article.category)).slice(0, 3);
  const regionalStories = articles.filter((article) => article.province && !['National', 'International'].includes(article.province)).slice(0, 3);
  const growthStories = articles.filter((article) => ['technology', 'economy', 'infrastructure'].includes(article.category)).slice(0, 3);

  const categoryCounts = {};
  const sourceCounts = {};
  const provinceCounts = {};

  for (const article of articles) {
    categoryCounts[article.category || 'general'] = (categoryCounts[article.category || 'general'] || 0) + 1;
    sourceCounts[article.source || 'Unknown source'] = (sourceCounts[article.source || 'Unknown source'] || 0) + 1;
    provinceCounts[article.province || 'National'] = (provinceCounts[article.province || 'National'] || 0) + 1;
  }

  const leadCategory = topEntry(categoryCounts);
  const leadSource = topEntry(sourceCounts);
  const activeProvinceCount = Object.values(provinceCounts).filter(Boolean).length;

  const heroMetrics = [
    {
      label: 'Live signals',
      value: loading ? '...' : String(articles.length),
      note: loading ? 'Building stream' : `${Object.keys(sourceCounts).length} active sources`,
      tone: 'blue',
    },
    {
      label: 'Regional spread',
      value: loading ? '...' : `${activeProvinceCount}/7`,
      note: 'provinces represented',
      tone: 'gold',
    },
    {
      label: 'Lead sector',
      value: loading ? '...' : categoryLabel(leadCategory?.[0]),
      note: loading ? 'Scanning sectors' : `${leadCategory?.[1] || 0} stories now`,
      tone: 'red',
    },
    {
      label: 'Lead source',
      value: loading ? '...' : leadSource?.[0] || 'Warming up',
      note: loading ? 'Scanning publishers' : `${leadSource?.[1] || 0} items surfaced`,
      tone: 'green',
    },
  ];

  const actionCards = [
    {
      title: 'Operations floor',
      description: 'Jump into the high-density monitoring view with sector filters, watchlists, and story flow.',
      buttonLabel: 'Open dashboards',
      onClick: () => setPage('dashboard'),
      tone: 'red',
    },
    {
      title: 'Regional lens',
      description: 'Move straight into the map to understand where signals are clustering and who is driving them.',
      buttonLabel: 'Open map',
      onClick: () => setPage('map'),
      tone: 'blue',
    },
    {
      title: 'Network explorer',
      description: 'Trace relationships, test questions, and explore the knowledge graph behind the headlines.',
      buttonLabel: 'Explore graph',
      onClick: () => setPage('explorer'),
      tone: 'gold',
    },
    {
      title: 'Signal assistant',
      description: 'Use the AI layer for rapid interpretation, synthesis, and follow-up investigation paths.',
      buttonLabel: 'Ask assistant',
      onClick: () => setPage('chat'),
      tone: 'green',
    },
  ];

  return (
    <div className="frontpage-wrapper frontpage-upgraded">
      <header className="front-header front-header-refresh">
        <button className="front-brand" onClick={() => setPage('front')}>
          <img className="logo-flag" src="https://giwmscdntwo.gov.np/static/grapejs/img/Nepal-flag.gif" alt="Nepal Flag" />
          <span className="front-brand-copy">
            <strong>Nepal Civic Intelligence</strong>
            <span>Signal-first public information portal</span>
          </span>
        </button>

        <div className="front-header-actions">
          {backendOnline !== undefined && (
            <div className={`backend-badge ${backendOnline ? 'backend-online' : 'backend-offline'}`}>
              <span className={`conn-dot ${backendOnline ? 'ok' : 'error'}`} />
              {backendOnline ? 'Backend live' : 'Client intelligence mode'}
            </div>
          )}
          <button className="ghost-action-btn" onClick={() => setPage('map')}>
            Regional map
          </button>
          <button className="enter-btn" onClick={() => setPage('dashboard')}>
            Open operations
          </button>
        </div>
      </header>

      <main className="front-main front-main-refresh">
        <section className="front-hero-grid">
          <div className="front-hero-copy">
            <div className="section-eyebrow">National signal desk</div>
            <h1 className="front-hero-title">
              Turn a fast-moving civic news stream into a readable national picture.
            </h1>
            <p className="front-hero-lead">
              This experience now foregrounds what matters most: where pressure is building, which sectors are moving,
              and where to go next when the national mood shifts.
            </p>

            <div className="front-hero-actions">
              <button className="enter-btn" onClick={() => setPage('dashboard')}>
                Launch command floor
              </button>
              <button className="ghost-action-btn" onClick={() => setPage('sources')}>
                Inspect source network
              </button>
            </div>

            <div className="front-hero-strip">
              {heroMetrics.map((metric) => (
                <HeroMetric key={metric.label} {...metric} />
              ))}
            </div>
          </div>

          {loading ? <HeroSkeleton /> : heroStory ? <HeroLeadStory article={heroStory} /> : <HeroSkeleton />}
        </section>

        <section className="front-action-grid">
          {actionCards.map((card) => (
            <ActionCard key={card.title} {...card} />
          ))}
        </section>

        <section className="front-priority-grid">
          <SignalLane
            title="Critical watch"
            subtitle="High-risk developments and immediate response signals."
            articles={criticalStories}
            tone="red"
            emptyLabel="No critical items are leading the stream right now."
          />
          <SignalLane
            title="Provincial pulse"
            subtitle="Regional movement outside the national center."
            articles={regionalStories}
            tone="blue"
            emptyLabel="Regional reporting is still warming up."
          />
          <SignalLane
            title="Growth and innovation"
            subtitle="Signals tied to opportunity, investment, and infrastructure."
            articles={growthStories}
            tone="gold"
            emptyLabel="Growth-related stories will surface here as the stream expands."
          />
        </section>

        <section className="card front-featured-card">
          <div className="card-head front-featured-head">
            <div>
              <span className="card-title">Featured signal stream</span>
              <span className="card-sub">Curated quick-read cards from the live feed</span>
            </div>
            {!loading && <span className="front-featured-count">{articles.length} live articles</span>}
          </div>
          <div className="img-card-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
              : featureList.length === 0
                ? <div className="empty-state">No intelligence collected yet.</div>
                : featureList.map((article) => <ImageCard key={article.id} article={article} />)}
          </div>
        </section>
      </main>
    </div>
  );
}
