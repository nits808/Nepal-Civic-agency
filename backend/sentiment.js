// ═══════════════════════════════════════════════════════════════
// NCIG Backend — Nepal Civic Sentiment Engine v1.0
// Structured, multi-dimensional, Nepal-specific sentiment analysis
// ═══════════════════════════════════════════════════════════════

// ── LEXICON: Nepal-specific keyword scoring ──────────────────
// Score range: -5 (very negative) to +5 (very positive)
// Weights calibrated for Nepali civic context

const SENTIMENT_LEXICON = {

  // ── POLITICAL / GOVERNANCE ───────────────────────────────
  'corruption':         -4, 'bribery':          -4, 'embezzlement':   -4,
  'nepotism':           -3, 'misuse of funds':  -4, 'irregularity':   -3,
  'scandal':            -3, 'impeachment':      -3, 'no-confidence':  -3,
  'protest':            -2, 'strike':           -2, 'bandh':          -2,
  'resignation':        -2, 'dissolution':      -2, 'deadlock':       -2,
  'constitutional crisis': -4, 'ordinance':      -1,
  'coalition':          +1, 'agreement':        +2, 'peace':          +3,
  'reform':             +2, 'transparency':     +3, 'accountability': +2,
  'election':           +1, 'democracy':        +2, 'constitutional': +1,
  'good governance':    +4, 'development plan': +3, 'budget approved':+3,

  // ── ECONOMY ──────────────────────────────────────────────
  'inflation':          -3, 'recession':        -4, 'deficit':        -2,
  'debt':               -2, 'unemployment':     -3, 'poverty':        -3,
  'trade deficit':      -3, 'depreciation':     -2, 'rupee fall':     -3,
  'liquidity crisis':   -4, 'bank collapse':    -5, 'tax hike':       -2,
  'smuggling':          -3, 'black market':     -3,
  'GDP growth':         +4, 'remittance':       +2, 'export growth':  +3,
  'investment':         +3, 'FDI':              +3, 'foreign aid':    +2,
  'infrastructure':     +2, 'employment':       +3, 'surplus':        +3,
  'revenue growth':     +3, 'economic recovery':+4, 'tax relief':     +2,
  'hydropower export':  +4, 'trade surplus':    +4,

  // ── DISASTER / SAFETY ────────────────────────────────────
  'earthquake':         -5, 'flood':            -4, 'landslide':      -4,
  'casualty':           -5, 'killed':           -5, 'dead':           -5,
  'injured':            -4, 'missing':          -3, 'displacement':   -3,
  'relief':             +1, 'rescue':           +2, 'evacuated':      +1,
  'humanitarian':       +1, 'aid delivered':    +2, 'reconstruction': +2,

  // ── HEALTH ───────────────────────────────────────────────
  'epidemic':           -4, 'outbreak':         -4, 'dengue':         -3,
  'malnutrition':       -3, 'drug shortage':    -3, 'death toll':     -5,
  'contamination':      -3, 'pollution':        -3,
  'vaccine':            +3, 'health camp':      +2, 'treatment':      +2,
  'hospital opened':    +3, 'recovery rate':    +3, 'medical breakthrough': +4,
  'free health':        +3, 'immunization':     +3,

  // ── ENVIRONMENT ──────────────────────────────────────────
  'deforestation':      -4, 'glacier melt':     -4, 'pollution':      -3,
  'soil erosion':       -3, 'encroachment':     -3, 'poaching':       -3,
  'climate change':     -2, 'drought':          -3,
  'afforestation':      +3, 'national park':    +2, 'conservation':   +3,
  'clean energy':       +4, 'solar':            +3, 'biodiversity':   +2,
  'reforestation':      +3,

  // ── EDUCATION ────────────────────────────────────────────
  'school closure':     -3, 'exam cancelled':   -2, 'drop out':       -3,
  'teacher absent':     -2, 'infrastructure poor': -2,
  'scholarship':        +3, 'new school':       +3, 'enrollment rise':+3,
  'literacy':           +3, 'pass rate':        +2, 'university':     +1,
  'SEE result':         +1,

  // ── LAW & ORDER ──────────────────────────────────────────
  'murder':             -5, 'rape':             -5, 'robbery':        -4,
  'trafficking':        -5, 'drug bust':        -2, 'crime':          -3,
  'violence':           -4, 'riot':             -4, 'extortion':      -4,
  'arrested':           -1, 'convicted':        +1, 'acquitted':      0,
  'verdict':            0,  'justice':          +3, 'CIAA action':    +2,

  // ── CIVIC POSITIVES ──────────────────────────────────────
  'inaugurated':        +3, 'launched':         +2, 'completed':      +3,
  'approved':           +2, 'signed':           +2, 'milestone':      +3,
  'achievement':        +3, 'record':           +2, 'historic':       +2,
  'first time':         +2, 'breakthrough':     +3, 'successful':     +3,
  'celebrates':         +2, 'awarded':          +3, 'promoted':       +2,
};

// ── Category sentiment modifiers (context weight) ─────────
const CATEGORY_WEIGHTS = {
  disaster:       -1.5,   // disasters are almost always negatively weighted
  law:            -0.5,   // law articles lean negative (crime coverage)
  economy:         0.0,
  politics:       -0.2,   // slight negative bias (protests/criticism more newsworthy)
  health:         -0.3,
  environment:    -0.5,
  infrastructure: +0.5,   // infra articles lean positive (construction, progress)
  tourism:        +0.8,
  education:       0.0,
  sports:         +0.5,
  technology:     +0.3,
  international:   0.0,
};

// ── Intensity multipliers ─────────────────────────────────
const INTENSITY_WORDS = {
  'very':       1.3, 'extremely': 1.5, 'severely':  1.4,
  'critically': 1.4, 'massive':   1.3, 'major':     1.2,
  'terrible':   1.5, 'great':     1.3, 'huge':      1.3,
  'minimal':    0.7, 'slight':    0.7, 'minor':     0.7,
};

// ── Negation words (flip sentiment) ──────────────────────
const NEGATION_WORDS = new Set([
  'not', 'no', 'never', 'neither', 'without', 'denies', 'denied',
  'reject', 'rejected', 'stop', 'stopped', 'prevent', 'prevented',
]);


// ═══════════════════════════════════════════════════════════════
// CORE SENTIMENT SCORER
// ═══════════════════════════════════════════════════════════════

export function scoreArticle(article) {
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  const words = text.split(/[\s,;.!?]+/);
  
  let rawScore   = 0;
  let matchCount = 0;
  const matches  = [];

  // Multi-word phrase matching (most specific first)
  const phrases = Object.keys(SENTIMENT_LEXICON).sort((a, b) => b.length - a.length);
  
  for (const phrase of phrases) {
    if (text.includes(phrase)) {
      let weight = SENTIMENT_LEXICON[phrase];
      
      // Check for negation in surrounding 3 words
      const idx = text.indexOf(phrase);
      const preceding = text.slice(Math.max(0, idx - 30), idx).split(/\s+/);
      const hasNegation = preceding.some(w => NEGATION_WORDS.has(w));
      if (hasNegation) weight = -weight * 0.7;
      
      // Check for intensity words in preceding 2 words
      const intensifier = preceding.slice(-2).find(w => INTENSITY_WORDS[w]);
      if (intensifier) weight *= INTENSITY_WORDS[intensifier];

      rawScore += weight;
      matchCount++;
      matches.push({ phrase, weight: Math.round(weight * 10) / 10 });
    }
  }

  // Apply category context modifier
  const catMod = CATEGORY_WEIGHTS[article.category] || 0;
  rawScore += catMod;

  // Normalize to -100 to +100 scale
  const normalised = Math.max(-100, Math.min(100,
    matchCount > 0 ? (rawScore / matchCount) * 25 : catMod * 10
  ));

  // Map to labels
  let label, emoji, color;
  if (normalised >= 30)       { label = 'Very Positive'; emoji = '🟢'; color = '#10b981'; }
  else if (normalised >= 10)  { label = 'Positive';      emoji = '🟡'; color = '#84cc16'; }
  else if (normalised >= -10) { label = 'Neutral';        emoji = '⚪'; color = '#94a3b8'; }
  else if (normalised >= -30) { label = 'Negative';      emoji = '🟠'; color = '#f59e0b'; }
  else                         { label = 'Very Negative'; emoji = '🔴'; color = '#ef4444'; }

  // Impact score: how strongly does this article move public mood? (0-100)
  const impact = Math.min(100, Math.abs(rawScore) * 10 + (matchCount * 5));

  return {
    score:      Math.round(normalised),
    label,
    emoji,
    color,
    impact:     Math.round(impact),
    matchCount,
    topSignals: matches.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 5),
    rawScore:   Math.round(rawScore * 10) / 10,
  };
}


// ═══════════════════════════════════════════════════════════════
// AGGREGATE ANALYTICS
// ═══════════════════════════════════════════════════════════════

export function computeSentimentReport(articles) {
  if (!articles || articles.length === 0) {
    return { overall: 0, label: 'No Data', byCategory: {}, byProvince: {}, trend: [], topNegative: [], topPositive: [] };
  }

  const scored = articles.map(a => ({ ...a, sentiment: scoreArticle(a) }));

  // ── Overall Nepal Civic Mood Score (weighted by recency) ──
  let weightedSum = 0, weightTotal = 0;
  for (const a of scored) {
    const ageH = (Date.now() - new Date(a.date || 0).getTime()) / 3_600_000;
    const recencyWeight = Math.max(0.2, 1 - ageH / 72); // full weight <72h, fades to 0.2
    weightedSum   += a.sentiment.score * recencyWeight;
    weightTotal   += recencyWeight;
  }
  const overallScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;

  // ── By Category ──────────────────────────────────────────
  const byCategory = {};
  for (const a of scored) {
    const cat = a.category || 'politics';
    if (!byCategory[cat]) byCategory[cat] = { scores: [], count: 0, label: cat };
    byCategory[cat].scores.push(a.sentiment.score);
    byCategory[cat].count++;
  }
  for (const cat of Object.keys(byCategory)) {
    const avg = byCategory[cat].scores.reduce((s, v) => s + v, 0) / byCategory[cat].scores.length;
    byCategory[cat].avg = Math.round(avg);
    byCategory[cat].sentiment = scoreLabel(avg);
    delete byCategory[cat].scores;
  }

  // ── By Province ──────────────────────────────────────────
  const byProvince = {};
  for (const a of scored) {
    const prov = a.province || 'National';
    if (!byProvince[prov]) byProvince[prov] = { scores: [], count: 0 };
    byProvince[prov].scores.push(a.sentiment.score);
    byProvince[prov].count++;
  }
  for (const prov of Object.keys(byProvince)) {
    const avg = byProvince[prov].scores.reduce((s, v) => s + v, 0) / byProvince[prov].scores.length;
    byProvince[prov].avg = Math.round(avg);
    byProvince[prov].sentiment = scoreLabel(avg);
    delete byProvince[prov].scores;
  }

  // ── 24-hour trend (hourly buckets) ───────────────────────
  const now = Date.now();
  const buckets = Array.from({ length: 24 }, (_, i) => ({
    hour: new Date(now - (23 - i) * 3_600_000).toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
    scores: [], count: 0,
  }));
  for (const a of scored) {
    const ageH = Math.floor((now - new Date(a.date || 0).getTime()) / 3_600_000);
    if (ageH < 24) {
      const bucketIdx = 23 - ageH;
      if (buckets[bucketIdx]) { buckets[bucketIdx].scores.push(a.sentiment.score); buckets[bucketIdx].count++; }
    }
  }
  const trend = buckets.map(b => ({
    hour:  b.hour,
    score: b.scores.length > 0
      ? Math.round(b.scores.reduce((s, v) => s + v, 0) / b.scores.length)
      : null,
    count: b.count,
  }));

  // ── Most impactful articles ───────────────────────────────
  const sortedByImpact = [...scored].sort((a, b) => b.sentiment.impact - a.sentiment.impact);
  const topNegative = sortedByImpact.filter(a => a.sentiment.score < -10).slice(0, 5);
  const topPositive = sortedByImpact.filter(a => a.sentiment.score > 10).slice(0, 5);

  // ── Keyword frequency for word cloud ─────────────────────
  const keyFreq = {};
  for (const a of scored) {
    for (const { phrase, weight } of a.sentiment.topSignals) {
      if (!keyFreq[phrase]) keyFreq[phrase] = { count: 0, weight };
      keyFreq[phrase].count++;
    }
  }
  const topKeywords = Object.entries(keyFreq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([phrase, { count, weight }]) => ({ phrase, count, weight, sentiment: scoreLabel(weight * 25) }));

  return {
    overall: overallScore,
    label: scoreLabel(overallScore),
    totalArticles: articles.length,
    scoredArticles: scored.length,
    byCategory,
    byProvince,
    trend,
    topNegative: topNegative.map(simplify),
    topPositive: topPositive.map(simplify),
    topKeywords,
    generatedAt: new Date().toISOString(),
  };
}

function scoreLabel(score) {
  if (score >= 30)       return { label: 'Very Positive', emoji: '🟢', color: '#10b981' };
  if (score >= 10)       return { label: 'Positive',      emoji: '🟡', color: '#84cc16' };
  if (score >= -10)      return { label: 'Neutral',        emoji: '⚪', color: '#94a3b8' };
  if (score >= -30)      return { label: 'Negative',      emoji: '🟠', color: '#f59e0b' };
  return                        { label: 'Very Negative', emoji: '🔴', color: '#ef4444' };
}

function simplify(a) {
  return {
    id:          a.id,
    title:       a.title,
    source:      a.source,
    category:    a.category,
    province:    a.province,
    timeAgo:     a.time_ago || a.timeAgo,
    link:        a.link,
    sentiment:   a.sentiment,
  };
}
