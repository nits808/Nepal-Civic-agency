// ═══════════════════════════════════════════════════════════════
// NCIG Backend — Story Clustering Engine
// Groups articles covering the same event from different sources
// Algorithm: title token similarity (Jaccard) with Nepali UTF-8 support
// ═══════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  // English Stopwords
  'a','an','the','in','on','at','for','to','of','and','or','but','is','are',
  'was','were','be','been','has','have','had','will','would','could','should',
  'this','that','with','from','it','its','he','she','they','we','as','by',
  'up','do','did','not','no','nepal','nepali','says','told','news','more',
  'after','over','new','also','amid','since','into','than',
  // Nepali Stopwords (proper UTF-8)
  'र', 'वा', 'तर', 'मा', 'को', 'का', 'की', 'ले', 'बाट', 'द्वारा', 'हुन्',
  'छ', 'छन्', 'थियो', 'भने', 'तथा', 'पनि', 'गर्न', 'गरेको', 'गर्ने', 'भएको', 'हुने', 'गरी'
]);

function tokenise(text) {
  if (!text) return new Set();
  // Using explicit Devanagari range + word characters
  const words = text.toLowerCase()
    .replace(/[^\w\s\u0900-\u097f]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
    
  const tokens = new Set(words);
  for (let i = 0; i < words.length - 1; i++) {
    tokens.add(`${words[i]}_${words[i+1]}`);
  }
  return tokens;
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const t of setA) {
    if (setB.has(t)) intersectionCount++;
  }
  const union = setA.size + setB.size - intersectionCount;
  return intersectionCount / union;
}

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
      if (indexed[i].category !== indexed[j].category) continue;

      const sim = jaccardSimilarity(indexed[i]._tokens, indexed[j]._tokens);
      if (sim >= threshold) {
        cluster.push(indexed[j]);
        visited.add(j);
      }
    }

    cluster.sort((a, b) => new Date(b.date) - new Date(a.date));

    const lead = cluster[0];
    const sources = [...new Set(cluster.map(a => a.source))];

    clusters.push({
      id: `cluster_${lead.id || i}`,
      lead,
      sources,
      sourceCount: sources.length,
      articles: cluster.map(({ _tokens, ...rest }) => rest), 
      category: lead.category,
      date: lead.date,
    });
  }

  clusters.sort((a, b) => new Date(b.date) - new Date(a.date));
  return clusters;
}

export function clusterAndFlatten(articles, threshold = 0.35) {
  const clusters = clusterArticles(articles, threshold);
  return clusters.map(c => ({
    ...c.lead,
    clusterSize: c.sourceCount,
    clusterSources: c.sources,
    isClustered: c.sourceCount > 1,
    clusterArticles: c.articles.slice(1), 
  }));
}
