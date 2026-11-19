# Nepal Civic Intelligence Graph

A **national-level, real-time civic intelligence platform** that ingests data from government, media, and NGO sources, processes it, and exposes it through an interactive geospatial UI.

## 🏗️ Architecture

The platform uses a clean, functional 2-tier architecture:

```
Data Sources → Express Backend + SQLite (ncig-backend) → React Frontend (ncig-frontend)
```

### Infrastructure

- **Backend (Node.js/Express)** — Handles API requests, WebSockets, data ingestion, and clustering logic. Uses `better-sqlite3` for fast, persistent local storage.
- **Frontend (React + Vite)** — Interactive geospatial dashboard using Leaflet and Recharts. Built for production using Nginx.
- **Docker Compose** — Simple, reproducible containerized deployment.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 22+ (for local development)

### Start via Docker (Production / Containerized)
```bash
docker-compose up --build -d
```
The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

### Local Development (Node.js)

1. Install dependencies across all workspaces:
```bash
npm install
```

2. Start both the backend and frontend development servers concurrently:
```bash
npm run dev
```

Open **http://localhost:5173** to view the dashboard.

## 📁 Project Structure

```
NNI/
├── docker-compose.yml              # Clean 2-tier infrastructure
├── package.json                    # Monorepo root
├── backend/                        # Node.js + Express backend
│   ├── server.js                   # Main API & WS server
│   ├── db.js                       # SQLite database layer
│   ├── fetcher.js                  # RSS parsing & ingestion
│   └── clustering.js               # Story clustering & deduplication engine
└── frontend/                       # React + Vite dashboard
    ├── src/
    │   ├── App.jsx                 # Main application
    │   ├── config.js               # Network bridge configuration
    │   └── ChatPage.jsx            # Interactive UI components
    ├── vite.config.js              # Vite server & proxy rules
    └── nginx.conf                  # Production reverse proxy
```

## 🛡️ Security

- **Authentication**: Secured via `X-API-Key` middleware on mutation and fetch endpoints.
- **Vulnerability Mitigations**: Protected against SSRF and Reflected/Stored XSS natively.
- **Persistence**: SQLite database is securely mapped to a persistent Docker volume (`/app/data/ncig.db`).

## 📜 License

Private — Nepal Civic Intelligence Project
