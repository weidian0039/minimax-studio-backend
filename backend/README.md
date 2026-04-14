# MiniMax Studio — Backend API

**Status**: MVP | **Version**: 1.0.0 | **Sprint**: APP Sprint 2

> "想到即看到" — AI-powered image generation from text ideas.

---

## Environments

| Environment | URL | Branch | Auto-Deploy |
|------------|-----|--------|-------------|
| **Staging** | `https://api.staging.minimax-studio.com` | `develop` | Yes (on push) |
| **Production** | `https://api.minimax-studio.com` | `main` (tag trigger) | Manual |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose (for local full-stack)

### Local Development

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Start development server (SQLite auto-initializes on first run)
npm start
# Or for hot reload:
npm run dev

# 5. Verify
curl http://localhost:3000/health
```

### Local Full-Stack (API + Nginx)

```bash
docker compose up --build
# API: http://localhost:3000
# Health: http://localhost:3000/health
```

---

## API Reference

### Health Check

```http
GET /health
```

Returns application status, uptime, memory usage, and dependency health.

**Response**: `200 OK` (always 200 for this endpoint)

```json
{
  "status": "ok",
  "timestamp": "2026-04-12T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "memory": { "usedMB": 128.5, "totalMB": 512.0, "usagePercent": 25.1 },
  "checks": {
    "database": { "status": "ok", "latencyMs": 0 },
    "redis": { "status": "not_configured" }
  }
}
```

### Submit Idea (GIF Generation)

```http
POST /api/ideas
Content-Type: application/json

{
  "email": "user@example.com",
  "idea": "A futuristic cityscape at sunset with flying vehicles"
}
```

**Validation**: `idea` must be 5-500 characters. `email` must be a valid email.

**Response**: `201 Created`

```json
{
  "status": "queued",
  "id": "ide_a1b2c3d4e5f6g7h8",
  "referenceId": "MMS-ABC123",
  "estimated_wait_minutes": 5
}
```

**Errors**:
- `400` — Validation error (missing/invalid fields)
- `500` — Internal server error

### Get Idea by ID

```http
GET /api/ideas/:id
```

**Response**: `200 OK`

```json
{
  "id": "ide_a1b2c3d4e5f6g7h8",
  "email": "user@example.com",
  "idea_text": "A futuristic cityscape at sunset with flying vehicles",
  "reference_id": "MMS-ABC123",
  "status": "completed",
  "created_at": "2026-04-12T10:00:00.000Z",
  "processed_at": "2026-04-12T10:00:02.000Z"
}
```

**Errors**:
- `400` — Invalid ID format
- `404` — Idea not found

### Get Idea by Reference ID

```http
GET /api/ideas/reference/:ref
```

Human-readable reference lookup (e.g., `GET /api/ideas/reference/MMS-ABC123`).

**Response**: Same as Get Idea by ID.

---

## Deployment

### Railway (Staging + Production)

Deployment is fully automated via GitHub Actions.

**Staging**: Push to `develop` branch triggers deployment to Railway staging.
Health check polls: `https://api.staging.minimax-studio.com/health`

**Production**: Create a version tag to trigger production deployment:
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Railway Environment Variables

Set these in the Railway dashboard (Settings > Environment Variables):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (production) |
| `REDIS_URL` | Redis connection string |
| `MINIMAX_API_KEY` | MiniMax API key |
| `RESEND_API_KEY` | Resend email API key |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `CLOUDFLARE_R2_*` | Cloudflare R2 CDN credentials |
| `NODE_ENV` | `staging` or `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `https://staging.minimax-studio.com` (staging) or `https://minimax-studio.com` (prod) |

### Rollback

```bash
# Via Railway CLI
railway login
railway status
railway rollback <deployment-id>

# Via GitHub Actions (automatic on health check failure)
# Triggered by the `rollback` job in backend-ci.yml
```

---

## Monitoring

### Sentry

Error tracking is integrated via `src/monitoring.js`.
Set `SENTRY_DSN` in Railway environment variables.

Key features:
- Global uncaught exception handler
- Unhandled promise rejection handler
- Request context attachment
- Health check endpoint filtering (no noise from `/health`)

### UptimeRobot

Configure monitors at [uptimerobot.com](https://uptimerobot.com):

| Monitor Name | URL | Interval |
|-------------|-----|----------|
| `staging-api-health` | `https://api.staging.minimax-studio.com/health` | 5 min |
| `prod-api-health` | `https://api.minimax-studio.com/health` | 1 min |

See [`docs/monitoring-alerts.md`](../docs/monitoring-alerts.md) for full alerting configuration.

### Health Endpoint

The `/health` endpoint is used by:
- Railway internal health checks
- GitHub Actions post-deploy validation
- UptimeRobot polling

---

## Architecture

```
                    Internet
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    Railway (API)   Vercel (FE)   Cloudflare
         │              │              │
         ▼              ▼              ▼
    ┌─────────┐   ┌───────────┐   ┌─────────┐
    │ Node.js │   │  Static   │   │   R2    │
    │ Express │   │   Site    │   │  CDN    │
    └────┬────┘   └───────────┘   └─────────┘
         │
    ┌────┴────┐
    │         │
 SQLite(*)  Redis(*)
          (*) SQLite for MVP; PostgreSQL for production scale
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with hot reload (ts-node-dev) |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
backend/
├── src/
│   ├── server.js           # Express app entry point + middleware
│   ├── monitoring.js       # Sentry initialization + global handlers
│   ├── health.js           # Health check logic
│   ├── queue.js            # In-memory job queue (MVP)
│   ├── validation.js       # Input validation
│   └── routes/
│       └── ideas.js        # POST/GET /api/ideas
├── db/
│   ├── database.js         # SQLite database operations
│   ├── schema.sql          # Database schema
│   └── app.db              # SQLite database file (gitignored)
├── Dockerfile              # Production Docker image
├── docker-compose.yml      # Local full-stack (with Postgres + Redis)
├── knexfile.ts           # Knex configuration (future PostgreSQL migration)
├── tsconfig.json         # TypeScript configuration
└── package.json
```

---

*Last updated: 2026-04-12 — APP Sprint 2, Task 3*
