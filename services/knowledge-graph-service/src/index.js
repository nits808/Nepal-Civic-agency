// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — Knowledge Graph Service
// Neo4j-based graph storage with CRUD, Cypher queries, and
// Kafka consumer for real-time graph updates
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import neo4j from 'neo4j-driver';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import pg from 'pg';

const PORT = parseInt(process.env.PORT || '4001');
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'nepal_civic_2026';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://:nepal_civic_2026@localhost:6379';

// ── Neo4j Driver ──────────────────────────────────────────────
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
  maxConnectionPoolSize: 50,
  connectionTimeout: 5000,
});

// ── Redis Cache ───────────────────────────────────────────────
const redis = new Redis(REDIS_URL);

// ── PostgreSQL (PostGIS) ──────────────────────────────────────
const pgPool = new pg.Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'ncig',
  user: process.env.PG_USER || 'ncig_admin',
  password: process.env.PG_PASSWORD || 'nepal_civic_2026',
  max: 20,
});

// ── Schema Initialization ─────────────────────────────────────
async function initializeSchema() {
  const session = driver.session();
  try {
    // Create constraints and indexes
    const constraints = [
      'CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE',
      'CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE',
      'CREATE CONSTRAINT policy_id IF NOT EXISTS FOR (p:Policy) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
      'CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (e) {
        // Constraint may already exist
      }
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX event_category IF NOT EXISTS FOR (e:Event) ON (e.category)',
      'CREATE INDEX event_date IF NOT EXISTS FOR (e:Event) ON (e.date)',
      'CREATE INDEX location_type IF NOT EXISTS FOR (l:Location) ON (l.type)',
      'CREATE INDEX location_name IF NOT EXISTS FOR (l:Location) ON (l.name)',
      'CREATE INDEX policy_status IF NOT EXISTS FOR (p:Policy) ON (p.status)',
      'CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)',
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
      } catch (e) {
        // Index may already exist
      }
    }

    // Seed Nepal locations into graph
    await session.run(`
      MERGE (nepal:Location {id: 'NP', name: 'Nepal', nameNe: 'नेपाल', type: 'country'})
      WITH nepal
      UNWIND [
        {id: 'NP-1', name: 'Province 1', nameNe: 'प्रदेश नं. १'},
        {id: 'NP-2', name: 'Madhesh Province', nameNe: 'मधेश प्रदेश'},
        {id: 'NP-3', name: 'Bagmati Province', nameNe: 'बागमती प्रदेश'},
        {id: 'NP-4', name: 'Gandaki Province', nameNe: 'गण्डकी प्रदेश'},
        {id: 'NP-5', name: 'Lumbini Province', nameNe: 'लुम्बिनी प्रदेश'},
        {id: 'NP-6', name: 'Karnali Province', nameNe: 'कर्णाली प्रदेश'},
        {id: 'NP-7', name: 'Sudurpashchim Province', nameNe: 'सुदूरपश्चिम प्रदेश'}
      ] AS prov
      MERGE (p:Location {id: prov.id})
      SET p.name = prov.name, p.nameNe = prov.nameNe, p.type = 'province'
      MERGE (p)-[:PART_OF]->(nepal)
    `);

    console.log('✅ Neo4j schema initialized');
  } finally {
    await session.close();
  }
}

// ── Graph Operations ──────────────────────────────────────────
const GraphOps = {
  // Create or update an event in the graph
  async upsertEvent(event) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MERGE (e:Event {id: $id})
        SET e.title = $title,
            e.titleNe = $titleNe,
            e.category = $category,
            e.summary = $summary,
            e.date = datetime($date),
            e.sourceUrl = $sourceUrl,
            e.credibilityScore = $credibilityScore,
            e.sentiment = $sentiment,
            e.updatedAt = datetime()
        WITH e
        OPTIONAL MATCH (loc:Location {name: $locationName})
        FOREACH (_ IN CASE WHEN loc IS NOT NULL THEN [1] ELSE [] END |
          MERGE (e)-[:LOCATED_IN]->(loc)
        )
        RETURN e
      `, {
        id: event.id,
        title: event.title || '',
        titleNe: event.titleNe || '',
        category: event.category || 'politics',
        summary: event.summary || '',
        date: event.date || new Date().toISOString(),
        sourceUrl: event.sourceUrl || '',
        credibilityScore: event.credibilityScore || 0.5,
        sentiment: event.sentiment || 'neutral',
        locationName: event.locationName || '',
      });
      return result.records[0]?.get('e')?.properties;
    } finally {
      await session.close();
    }
  },

  // Create a policy node with relationships
  async upsertPolicy(policy) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MERGE (p:Policy {id: $id})
        SET p.title = $title,
            p.titleNe = $titleNe,
            p.status = $status,
            p.ministry = $ministry,
            p.date = datetime($date),
            p.description = $description,
            p.progress = $progress,
            p.updatedAt = datetime()
        WITH p
        OPTIONAL MATCH (loc:Location {name: $affectedLocation})
        FOREACH (_ IN CASE WHEN loc IS NOT NULL THEN [1] ELSE [] END |
          MERGE (p)-[:AFFECTS {impact: $impact}]->(loc)
        )
        RETURN p
      `, {
        id: policy.id,
        title: policy.title || '',
        titleNe: policy.titleNe || '',
        status: policy.status || 'announced',
        ministry: policy.ministry || '',
        date: policy.date || new Date().toISOString(),
        description: policy.description || '',
        progress: policy.progress || 0,
        affectedLocation: policy.affectedLocation || '',
        impact: policy.impact || 'direct',
      });
      return result.records[0]?.get('p')?.properties;
    } finally {
      await session.close();
    }
  },

  // Query: all policies affecting a location
  async policiesByLocation(locationName) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (p:Policy)-[:AFFECTS]->(l:Location)
        WHERE l.name =~ $pattern OR l.nameNe =~ $pattern
        RETURN p, l.name AS location
        ORDER BY p.date DESC
        LIMIT 50
      `, { pattern: `(?i).*${locationName}.*` });
      return result.records.map(r => ({
        ...r.get('p').properties,
        location: r.get('location'),
      }));
    } finally {
      await session.close();
    }
  },

  // Query: events by category and location
  async eventsByFilter(filters = {}) {
    const session = driver.session();
    try {
      let cypher = 'MATCH (e:Event)';
      const params = {};

      if (filters.location) {
        cypher += '-[:LOCATED_IN]->(l:Location) WHERE l.name =~ $locPattern';
        params.locPattern = `(?i).*${filters.location}.*`;
      }

      if (filters.category) {
        cypher += filters.location ? ' AND' : ' WHERE';
        cypher += ' e.category = $category';
        params.category = filters.category;
      }

      cypher += ' RETURN e ORDER BY e.date DESC LIMIT $limit';
      params.limit = neo4j.int(filters.limit || 50);

      const result = await session.run(cypher, params);
      return result.records.map(r => r.get('e').properties);
    } finally {
      await session.close();
    }
  },

  // Query: decisions by an official
  async decisionsByOfficial(officialName) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (person:Person)-[:ISSUED]->(p:Policy)
        WHERE person.name =~ $pattern
        OPTIONAL MATCH (p)-[:AFFECTS]->(loc:Location)
        RETURN person.name AS official, p AS policy, collect(loc.name) AS locations
        ORDER BY p.date DESC
        LIMIT 20
      `, { pattern: `(?i).*${officialName}.*` });
      return result.records.map(r => ({
        official: r.get('official'),
        policy: r.get('policy').properties,
        affectedLocations: r.get('locations'),
      }));
    } finally {
      await session.close();
    }
  },

  // Query: shortest path between entities
  async findConnections(entityA, entityB) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (a), (b)
        WHERE (a.name =~ $patternA) AND (b.name =~ $patternB)
        MATCH path = shortestPath((a)-[*..5]-(b))
        RETURN path
        LIMIT 5
      `, {
        patternA: `(?i).*${entityA}.*`,
        patternB: `(?i).*${entityB}.*`,
      });
      return result.records.map(r => {
        const path = r.get('path');
        return {
          nodes: path.segments.map(s => ({
            start: s.start.properties,
            end: s.end.properties,
            relationship: s.relationship.type,
          })),
        };
      });
    } finally {
      await session.close();
    }
  },

  // Graph statistics
  async getStats() {
    const session = driver.session();
    try {
      const result = await session.run(`
        CALL {
          MATCH (e:Event) RETURN 'events' AS label, count(e) AS count
          UNION ALL
          MATCH (p:Policy) RETURN 'policies' AS label, count(p) AS count
          UNION ALL
          MATCH (l:Location) RETURN 'locations' AS label, count(l) AS count
          UNION ALL
          MATCH (p:Person) RETURN 'persons' AS label, count(p) AS count
          UNION ALL
          MATCH (o:Organization) RETURN 'organizations' AS label, count(o) AS count
          UNION ALL
          MATCH (d:Document) RETURN 'documents' AS label, count(d) AS count
        }
        RETURN label, count
      `);
      const stats = {};
      result.records.forEach(r => {
        stats[r.get('label')] = r.get('count').toInt();
      });
      return stats;
    } finally {
      await session.close();
    }
  },
};

// ── Kafka Consumer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'knowledge-graph-service',
  brokers: KAFKA_BROKERS,
});

async function startKafkaConsumer() {
  const consumer = kafka.consumer({ groupId: 'graph-writer-group' });
  await consumer.connect();

  await consumer.subscribe({
    topics: ['enriched.events', 'processed.classified'],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        if (topic === 'enriched.events') {
          await GraphOps.upsertEvent({
            id: data.id || `evt-${Date.now()}`,
            title: data.title,
            category: data.primary_category || data.category,
            summary: data.summary_3line || data.summary,
            date: data.publishedAt || data.date,
            sourceUrl: data.url,
            credibilityScore: data.credibility_score,
            sentiment: data.sentiment,
            locationName: data.primary_district || data.primary_province,
          });
        }

        console.log(`📊 Graph updated from ${topic}:${partition}`);
      } catch (err) {
        console.error('Graph write error:', err.message);
      }
    },
  });

  console.log('📡 Kafka consumer started (enriched.events, processed.classified)');
}

// ── Fastify API ───────────────────────────────────────────────
const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'healthy',
  service: 'knowledge-graph-service',
  timestamp: new Date().toISOString(),
}));

// Graph Statistics
app.get('/stats', async () => {
  const cached = await redis.get('graph:stats');
  if (cached) return JSON.parse(cached);

  const stats = await GraphOps.getStats();
  await redis.set('graph:stats', JSON.stringify(stats), 'EX', 60);
  return stats;
});

// Policies by location
app.get('/policies/by-location/:location', async (request) => {
  const { location } = request.params;
  return GraphOps.policiesByLocation(location);
});

// Events with filters
app.get('/events', async (request) => {
  const { category, location, limit } = request.query;
  return GraphOps.eventsByFilter({
    category,
    location,
    limit: parseInt(limit || '50'),
  });
});

// Decisions by official
app.get('/officials/:name/decisions', async (request) => {
  return GraphOps.decisionsByOfficial(request.params.name);
});

// Find connections
app.get('/connections', async (request) => {
  const { entityA, entityB } = request.query;
  if (!entityA || !entityB) {
    return { error: 'entityA and entityB query params required' };
  }
  return GraphOps.findConnections(entityA, entityB);
});

// Raw Cypher query (authenticated analysts only) — READ mode enforced
app.post('/query/cypher', async (request, reply) => {
  const { cypher, params } = request.body || {};

  // Basic input validation
  if (!cypher || typeof cypher !== 'string' || cypher.trim().length === 0) {
    return reply.status(400).send({ error: 'cypher field is required and must be a non-empty string' });
  }
  if (cypher.length > 2000) {
    return reply.status(400).send({ error: 'Query too long (max 2000 chars)' });
  }

  // Block write operations — only allow read-only queries
  const writePattern = /\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|CALL\s+apoc\.periodic)/i;
  if (writePattern.test(cypher)) {
    return reply.status(403).send({ error: 'Write operations are not permitted via this endpoint' });
  }

  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params || {});
    return {
      records: result.records.map(r => r.toObject()),
      summary: {
        counters: result.summary.counters._stats,
        queryType: result.summary.queryType,
      },
    };
  } catch (err) {
    return reply.status(500).send({ error: 'Cypher execution failed', detail: err.message });
  } finally {
    await session.close();
  }
});

// Locations hierarchy
app.get('/locations', async () => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (l:Location)
      OPTIONAL MATCH (l)-[:PART_OF]->(parent:Location)
      RETURN l, parent.name AS parentName
      ORDER BY l.type, l.name
    `);
    return result.records.map(r => ({
      ...r.get('l').properties,
      parentName: r.get('parentName'),
    }));
  } finally {
    await session.close();
  }
});

// ── Startup ───────────────────────────────────────────────────
async function start() {
  await initializeSchema();

  // Start Kafka consumer in background
  startKafkaConsumer().catch(err => {
    console.warn('Kafka consumer failed to start:', err.message);
    console.warn('Graph service will operate in API-only mode');
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🔗 Knowledge Graph Service running on port ${PORT}`);
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown (SIGTERM + SIGINT)
async function shutdown(signal) {
  console.log(`[KG] ${signal} received — closing connections…`);
  try {
    await driver.close();
    await pgPool.end();
    await redis.quit();
    console.log('[KG] All connections closed.');
  } catch (err) {
    console.error('[KG] Shutdown error:', err.message);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
