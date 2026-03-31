// ═══════════════════════════════════════════════════════════════
// NCIG Backend — Story Clustering Engine (Phase 3A)
// Groups articles covering the same event from different sources
// Algorithm: title token similarity (Jaccard) ≥ 55% threshold
// ═══════════════════════════════════════════════════════════════

/**
 * Tokenise a title/text into a Set of meaningful word stems.
 * - Lowercase, remove punctuation, strip common stopwords
 * - Keeps single words plus bi-grams for better matching
 */
const STOPWORDS = new Set([
  'a','an','the','in','on','at','for','to','of','and','or','but','is','are',
  'was','were','be','been','has','have','had','will','would','could','should',
  'this','that','with','from','it','its','he','she','they','we','as','by',
  'up','do','did','not','no','nepal','nepali','says','told','news','more',
  'after','over','new','also','amid','since','into','than',
]);

function tokenise(text) {
  if (!text) return new Set();
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  const tokens = new Set(words);
  // Add bi-grams
  for (let i = 0; i < words.length - 1; i++) {
    tokens.add(`${words[i]}_${words[i+1]}`);
  }
  return tokens;
}

/**
 * Jaccard similarity between two Sets of tokens.
 * Returns 0.0–1.0
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Cluster articles into story threads.
 *
 * @param {Array} articles - flat list of article objects with { id, title, source, category, date, ... }
 * @param {number} threshold - Jaccard score ≥ this = same story (default 0.35)
 * @returns {Array} clusters — each cluster is:
 *   {
 *     id: string,           // hash of lead article id
 *     lead: article,        // most recent / highest-source-priority article
 *     sources: string[],    // unique source names
 *     sourceCount: number,
 *     articles: article[],  // all articles in cluster (sorted by date desc)
 *     category: string,
 *     date: string,
 *   }
 */
export function clusterArticles(articles, threshold = 0.35) {
  const indexed = articles.map(a => ({
    ...a,
    _tokens: tokenise(a.title),
  }));

  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < indexed.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [indexed[i]];
    visited.add(i);

    for (let j = i + 1; j < indexed.length; j++) {
      if (visited.has(j)) continue;
      // Only cluster within same category for precision
      if (indexed[i].category !== indexed[j].category) continue;

      const sim = jaccardSimilarity(indexed[i]._tokens, indexed[j]._tokens);
      if (sim >= threshold) {
        cluster.push(indexed[j]);
        visited.add(j);
      }
    }

    // Sort cluster by date descending (most recent first)
    cluster.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Lead article = most recent
    const lead = cluster[0];
    const sources = [...new Set(cluster.map(a => a.source))];

    clusters.push({
      id: `cluster_${lead.id || i}`,
      lead,
      sources,
      sourceCount: sources.length,
      articles: cluster.map(({ _tokens, ...rest }) => rest), // strip internal tokens
      category: lead.category,
      date: lead.date,
    });
  }

  // Sort clusters by date descending
  clusters.sort((a, b) => new Date(b.date) - new Date(a.date));
  return clusters;
}

/**
 * clusterAndFlatten — returns a flat array of lead articles
 * with extra fields injected so existing UI works unchanged:
 *   - article.clusterSize (number of sources covering it)
 *   - article.clusterSources (array of source names)
 *   - article.isClustered (bool)
 */
export function clusterAndFlatten(articles, threshold = 0.35) {
  const clusters = clusterArticles(articles, threshold);
  return clusters.map(c => ({
    ...c.lead,
    clusterSize: c.sourceCount,
    clusterSources: c.sources,
    isClustered: c.sourceCount > 1,
    clusterArticles: c.articles.slice(1), // secondary articles
  }));
}
