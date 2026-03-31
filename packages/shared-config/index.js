// Nepal Civic Intelligence Graph — Shared Configuration
export const config = {
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'ncig-service',
    topics: {
      // Raw ingestion topics
      RAW_NEWS: 'raw.news',
      RAW_POLICY: 'raw.policy',
      RAW_DISASTER: 'raw.disaster',
      RAW_COMPLAINT: 'raw.complaint',
      RAW_SOCIAL: 'raw.social',
      RAW_GOVERNMENT: 'raw.government',
      // Processed topics
      PROCESSED_CLASSIFIED: 'processed.classified',
      PROCESSED_SUMMARIZED: 'processed.summarized',
      PROCESSED_GEOTAGGED: 'processed.geotagged',
      PROCESSED_SCORED: 'processed.scored',
      // Enriched topics
      ENRICHED_EVENTS: 'enriched.events',
      ENRICHED_ALERTS: 'enriched.alerts',
      ENRICHED_PREDICTIONS: 'enriched.predictions',
      // System topics
      DEAD_LETTER: 'system.dead-letter',
      AUDIT: 'system.audit',
      METRICS: 'system.metrics',
    },
    consumerGroups: {
      CLASSIFIER: 'classifier-group',
      SUMMARIZER: 'summarizer-group',
      GEO_TAGGER: 'geo-tagger-group',
      GRAPH_WRITER: 'graph-writer-group',
      ALERT_DISPATCHER: 'alert-dispatcher-group',
      DEDUP: 'dedup-group',
      SCORER: 'scorer-group',
    },
  },
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'nepal_civic_2026',
  },
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'ncig',
    user: process.env.PG_USER || 'ncig_admin',
    password: process.env.PG_PASSWORD || 'nepal_civic_2026',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://:nepal_civic_2026@localhost:6379',
  },
  elasticsearch: {
    node: process.env.ES_NODE || 'http://localhost:9200',
  },
  // Nepal-specific constants
  nepal: {
    provinces: [
      { code: 'NP-1', name: 'Province 1', nameNe: 'प्रदेश नं. १' },
      { code: 'NP-2', name: 'Madhesh Province', nameNe: 'मधेश प्रदेश' },
      { code: 'NP-3', name: 'Bagmati Province', nameNe: 'बागमती प्रदेश' },
      { code: 'NP-4', name: 'Gandaki Province', nameNe: 'गण्डकी प्रदेश' },
      { code: 'NP-5', name: 'Lumbini Province', nameNe: 'लुम्बिनी प्रदेश' },
      { code: 'NP-6', name: 'Karnali Province', nameNe: 'कर्णाली प्रदेश' },
      { code: 'NP-7', name: 'Sudurpashchim Province', nameNe: 'सुदूरपश्चिम प्रदेश' },
    ],
    categories: [
      'health', 'economy', 'politics', 'education', 'infrastructure',
      'disaster', 'agriculture', 'environment', 'law', 'technology',
      'social', 'defense', 'tourism', 'sports', 'culture',
    ],
    sourceTypes: ['government', 'ngo', 'media', 'social', 'academic'],
  },
};

export default config;
