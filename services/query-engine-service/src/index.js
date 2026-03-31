// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — Query Engine Service
// Natural Language → Cypher query translation
// Supports: policy search, official tracking, event filtering,
// connection discovery, and geospatial queries
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import neo4j from 'neo4j-driver';
import Redis from 'ioredis';

const PORT = parseInt(process.env.PORT || '4002');
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'nepal_civic_2026';
const REDIS_URL = process.env.REDIS_URL || 'redis://:nepal_civic_2026@localhost:6379';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
const redis = new Redis(REDIS_URL);

// ── Intent Classification ─────────────────────────────────────
const INTENT_PATTERNS = [
  {
    intent: 'POLICY_BY_LOCATION',
    patterns: [
      /policies?\s+(?:affecting|in|for|about)\s+(.+)/i,
      /(?:show|find|list|get)\s+(?:all\s+)?policies?\s+(?:for|in|affecting)\s+(.+)/i,
      /what\s+policies?\s+affect\s+(.+)/i,
    ],
    template: (params) => ({
      cypher: `
        MATCH (p:Policy)-[:AFFECTS]->(l:Location)
        WHERE l.name =~ $locationPattern
        RETURN p.title AS title, p.status AS status, p.date AS date, 
               p.ministry AS ministry, l.name AS location
        ORDER BY p.date DESC LIMIT 20
      `,
      params: { locationPattern: `(?i).*${params.entity}.*` },
    }),
  },
  {
    intent: 'DECISIONS_BY_OFFICIAL',
    patterns: [
      /(?:track|show|find|list)\s+(?:all\s+)?decisions?\s+(?:by|from|of)\s+(.+)/i,
      /what\s+(?:has|did)\s+(.+?)\s+(?:decided?|done|issued)/i,
      /(.+?)(?:'s)?\s+decisions?/i,
    ],
    template: (params) => ({
      cypher: `
        MATCH (person:Person)-[:ISSUED]->(p:Policy)
        WHERE person.name =~ $namePattern
        OPTIONAL MATCH (p)-[:AFFECTS]->(loc:Location)
        RETURN person.name AS official, person.role AS role,
               p.title AS policy, p.date AS date, p.status AS status,
               collect(DISTINCT loc.name) AS affectedLocations
        ORDER BY p.date DESC LIMIT 20
      `,
      params: { namePattern: `(?i).*${params.entity}.*` },
    }),
  },
  {
    intent: 'EVENTS_IN_LOCATION',
    patterns: [
      /(?:what|show|events?)\s+(?:is\s+)?(?:happening|events?|news)\s+(?:in|at|near)\s+(.+)/i,
      /(?:latest|recent)\s+(?:news|events?)\s+(?:in|from|about)\s+(.+)/i,
      /(.+?)\s+(?:news|events|updates)/i,
    ],
    template: (params) => ({
      cypher: `
        MATCH (e:Event)-[:LOCATED_IN]->(l:Location)
        WHERE l.name =~ $locationPattern
        RETURN e.title AS title, e.category AS category, e.summary AS summary,
               e.date AS date, e.credibilityScore AS credibility, l.name AS location
        ORDER BY e.date DESC LIMIT 20
      `,
      params: { locationPattern: `(?i).*${params.entity}.*` },
    }),
  },
  {
    intent: 'EVENTS_BY_CATEGORY',
    patterns: [
      /(?:show|find|list)\s+(?:all\s+)?(\w+)\s+(?:news|events?|updates?)/i,
      /(\w+)\s+category\s+events?/i,
    ],
    template: (params) => ({
      cypher: `
        MATCH (e:Event)
        WHERE e.category = $category
        OPTIONAL MATCH (e)-[:LOCATED_IN]->(l:Location)
        RETURN e.title AS title, e.date AS date, e.summary AS summary,
               e.credibilityScore AS credibility, l.name AS location
        ORDER BY e.date DESC LIMIT 20
      `,
      params: { category: params.entity.toLowerCase() },
    }),
  },
  {
    intent: 'FIND_CONNECTIONS',
    patterns: [
      /(?:connection|link|relationship)\s+between\s+(.+?)\s+and\s+(.+)/i,
      /how\s+(?:is|are)\s+(.+?)\s+(?:connected|related|linked)\s+to\s+(.+)/i,
    ],
    template: (params) => ({
      cypher: `
        MATCH (a), (b)
        WHERE (a.name =~ $patternA) AND (b.name =~ $patternB)
        MATCH path = shortestPath((a)-[*..5]-(b))
        RETURN [n in nodes(path) | n.name] AS nodeNames,
               [r in relationships(path) | type(r)] AS relationships
        LIMIT 5
      `,
      params: {
        patternA: `(?i).*${params.entityA}.*`,
        patternB: `(?i).*${params.entityB}.*`,
      },
    }),
  },
];

// ── Query Translation ─────────────────────────────────────────
function translateQuery(naturalLanguageQuery) {
  const query = naturalLanguageQuery.trim();

  for (const intentDef of INTENT_PATTERNS) {
    for (const pattern of intentDef.patterns) {
      const match = query.match(pattern);
      if (match) {
        const params = {};

        if (intentDef.intent === 'FIND_CONNECTIONS') {
          params.entityA = match[1]?.trim();
          params.entityB = match[2]?.trim();
        } else {
          params.entity = match[1]?.trim();
        }

        const { cypher, params: cypherParams } = intentDef.template(params);

        return {
          intent: intentDef.intent,
          extractedEntities: params,
          cypher,
          params: cypherParams,
          confidence: 0.85,
        };
      }
    }
  }

  // Fallback: full-text search across all entities
  return {
    intent: 'GENERIC_SEARCH',
    extractedEntities: { query },
    cypher: `
      CALL {
        MATCH (e:Event) WHERE e.title =~ $pattern RETURN e.title AS title, 'Event' AS type, e.date AS date LIMIT 10
        UNION ALL
        MATCH (p:Policy) WHERE p.title =~ $pattern RETURN p.title AS title, 'Policy' AS type, p.date AS date LIMIT 10
        UNION ALL
        MATCH (per:Person) WHERE per.name =~ $pattern RETURN per.name AS title, 'Person' AS type, null AS date LIMIT 10
      }
      RETURN title, type, date
      LIMIT 20
    `,
    params: { pattern: `(?i).*${query}.*` },
    confidence: 0.5,
  };
}

// ── Execute Query ─────────────────────────────────────────────
async function executeQuery(translation) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(translation.cypher, translation.params);
    return result.records.map(r => {
      const obj = {};
      r.keys.forEach(key => {
        const val = r.get(key);
        obj[key] = neo4j.isInt(val) ? val.toInt() : val;
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

// ── Fastify API ───────────────────────────────────────────────
const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'healthy',
  service: 'query-engine-service',
  supportedIntents: INTENT_PATTERNS.map(i => i.intent),
}));

// Natural language query
app.get('/query', async (request) => {
  const { q, lang = 'en' } = request.query;
  if (!q) return { error: 'Query parameter "q" is required' };

  // Check cache
  const cacheKey = `query:${q.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    const result = JSON.parse(cached);
    result._cached = true;
    return result;
  }

  // Translate and execute
  const translation = translateQuery(q);
  const results = await executeQuery(translation);

  const response = {
    query: q,
    intent: translation.intent,
    confidence: translation.confidence,
    extractedEntities: translation.extractedEntities,
    results,
    total: results.length,
    generatedCypher: translation.cypher.trim(),
  };

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);

  return response;
});

// Advanced Cypher query (authenticated)
app.post('/query/advanced', async (request) => {
  const { cypher, params = {} } = request.body;
  if (!cypher) return { error: 'Cypher query is required' };

  // Restrict to read-only queries
  const upperCypher = cypher.toUpperCase().trim();
  if (upperCypher.startsWith('CREATE') || upperCypher.startsWith('DELETE') ||
      upperCypher.startsWith('SET') || upperCypher.startsWith('REMOVE') ||
      upperCypher.startsWith('DROP') || upperCypher.startsWith('MERGE')) {
    return { error: 'Only read queries are allowed through this endpoint' };
  }

  const results = await executeQuery({ cypher, params });
  return { results, total: results.length };
});

// Sample queries
app.get('/query/samples', async () => ({
  samples: [
    { query: 'Show all policies affecting Bagmati Province', intent: 'POLICY_BY_LOCATION' },
    { query: 'Track all decisions by Prime Minister', intent: 'DECISIONS_BY_OFFICIAL' },
    { query: 'What is happening in Kathmandu', intent: 'EVENTS_IN_LOCATION' },
    { query: 'Show all disaster events', intent: 'EVENTS_BY_CATEGORY' },
    { query: 'Connection between Ministry of Finance and Bagmati Province', intent: 'FIND_CONNECTIONS' },
  ],
}));

// ── Start ─────────────────────────────────────────────────────
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`🔍 Query Engine Service running on port ${PORT}`);
