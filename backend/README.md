# NCIG Backend

Lightweight Node.js backend for the Nepal Civic Intelligence Graph portal.

## Stack
- **Express** — REST API
- **WebSocket (ws)** — Real-time push to frontend
- **better-sqlite3** — Local database (no setup required)
- **node-cron** — Auto-fetch every 90 seconds
- **cheerio** — Server-side og:image extraction from article pages

## Structure
```
backend/
├── server.js    ← Main entry point (Express + WS + cron)
├── fetcher.js   ← Fetches all RSS feeds in parallel, extracts og:image
├── parser.js    ← RSS XML parser + article classifier/geo-tagger
├── db.js        ← SQLite layer (articles, feed status, image cache)
├── feeds.js     ← All 26+ RSS feed URLs
├── ncig.db      ← Auto-created SQLite database (git-ignored)
└── package.json
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/articles` | All articles, sorted by date |
| `GET` | `/api/articles?category=disaster` | Filter by category |
| `GET` | `/api/articles?province=Bagmati` | Filter by province |
| `GET` | `/api/search?q=keyword` | Full-text search |
| `GET` | `/api/feeds` | Feed status (live/failed) |
| `GET` | `/api/stats` | Article counts, categories |
| `POST` | `/api/fetch` | Manually trigger a fetch cycle |
| `GET` | `/api/health` | Health check |
| `WS` | `ws://localhost:4000` | Real-time push for new articles |

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Server starts at **http://localhost:4000** and immediately fetches all feeds.

## WebSocket Events
```json
{ "type": "CONNECTED",    "message": "NCIG live feed connected" }
{ "type": "NEW_ARTICLES", "source": "Kathmandu Post", "count": 3 }
```

## Environment Variables
```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
```
