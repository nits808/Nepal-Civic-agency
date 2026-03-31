# Nepal Civic Intelligence Graph 3.0

A **national-level, real-time civic intelligence platform** that ingests data from 1000+ government, media, and NGO sources, processes it through AI pipelines, stores it in a knowledge graph, and exposes it through an interactive geospatial UI with natural language query capabilities.

## 🏗️ Architecture

```
Data Sources (1000+) → Scrapers → Kafka → AI Pipeline → Neo4j + PostGIS → API → Frontend
```

### Microservices

| Service | Language | Port | Description |
|---------|----------|------|-------------|
| `api-gateway` | Node.js | 3000 | Central entry, auth, rate limiting |
| `scraper-service` | Node.js | 3001 | Playwright/HTTP/RSS web scraping |
| `classifier-service` | Python | 8001 | Multi-label classification |
| `summarizer-service` | Python | 8002 | Bilingual summarization + fake news |
| `knowledge-graph-service` | Node.js | 4001 | Neo4j CRUD + Kafka consumer |
| `query-engine-service` | Node.js | 4002 | NL → Cypher translation |
| `alert-service` | Node.js | 4003 | WebSocket real-time alerts |
| `chatbot-service` | Python | 4004 | RAG-based civic chatbot |
| `dedup-service` | Python | 4008 | LSH + MinHash deduplication |
| `prediction-service` | Python | 8005 | Disaster/economic/health prediction |

### Infrastructure

- **Kafka** — Event streaming (15 topics)
- **Neo4j** — Knowledge graph
- **PostgreSQL + PostGIS** — Geospatial queries
- **Redis** — Caching, queues, pub/sub
- **Elasticsearch** — Full-text search
- **MinIO** — Object storage

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 22+
- Python 3.12+

### 1. Start Infrastructure
```bash
docker-compose up -d zookeeper kafka neo4j postgres redis elasticsearch minio
```

### 2. Wait for Kafka topics to be created
```bash
docker-compose up kafka-init
```

### 3. Install Node.js dependencies
```bash
npm install
```

### 4. Start Backend Services
```bash
# Terminal 1: API Gateway
cd services/api-gateway && npm install && npm run dev

# Terminal 2: Scraper
cd services/scraper-service && npm install && npm run dev

# Terminal 3: Knowledge Graph
cd services/knowledge-graph-service && npm install && npm run dev

# Terminal 4: Alerts
cd services/alert-service && npm install && npm run dev

# Terminal 5: Query Engine
cd services/query-engine-service && npm install && npm run dev
```

### 5. Start Python Services
```bash
# Terminal 6: Classifier
cd services/classifier-service && pip install -r requirements.txt && uvicorn main:app --port 8001

# Terminal 7: Summarizer
cd services/summarizer-service && pip install -r requirements.txt && uvicorn main:app --port 8002

# Terminal 8: Chatbot
cd services/chatbot-service && pip install -r requirements.txt && uvicorn main:app --port 4004
```

### 6. Start Frontend
```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** to view the dashboard.

## 📚 API Documentation

API docs available at **http://localhost:3000/docs** (Swagger UI).

### Key Endpoints

```
POST /api/v1/auth/login           — Authentication
GET  /api/v1/query?q=...          — Natural language query
GET  /api/v1/events               — Events with filters
GET  /api/v1/policies             — Policy tracking
GET  /api/v1/officials            — Official scores
GET  /api/v1/locations            — Location hierarchy
GET  /api/v1/alerts               — Active alerts
POST /api/v1/chat                 — Chatbot
POST /api/v1/simulate             — Policy simulation
WS   ws://localhost:4003/ws       — Real-time WebSocket
```

## 📁 Project Structure

```
NNI/
├── docker-compose.yml              # Full infrastructure
├── package.json                    # Monorepo root
├── .env.example                    # Environment template
├── infrastructure/
│   └── sql/init.sql               # PostGIS schema + seed data
├── packages/
│   └── shared-config/             # Shared configuration
├── services/
│   ├── api-gateway/               # Fastify API Gateway
│   ├── scraper-service/           # Playwright web scraper
│   ├── classifier-service/        # Python ML classifier
│   ├── summarizer-service/        # Bilingual summarizer
│   ├── knowledge-graph-service/   # Neo4j graph operations
│   ├── query-engine-service/      # NL → Cypher engine
│   ├── alert-service/             # WebSocket alerts
│   ├── chatbot-service/           # RAG chatbot
│   ├── dedup-service/             # Duplicate detection
│   └── prediction-service/        # Predictive analytics
└── frontend/                      # React + Vite dashboard
    └── src/
        ├── App.jsx                # Main application
        └── index.css              # Design system
```

## 🛡️ Security

- JWT authentication (via API Gateway)
- Rate limiting (100 req/min public, 1000 authenticated)
- Input validation (Zod/Pydantic schemas)
- CORS whitelist
- Audit logging

## 📈 Scaling

- Kubernetes-ready (every service has a Dockerfile)
- Kafka horizontal scaling (12 partitions/topic)
- Neo4j causal clustering
- Redis cluster mode
- CDN + read replicas

## 📜 License

Private — Nepal Civic Intelligence Project
