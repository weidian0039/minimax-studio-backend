# Staging Environment Setup — MiniMax Studio

**Status**: Active | **Version**: 1.1 | **Date**: 2026-04-20
**Author**: Release Engineer | **Sprint**: APP Sprint 1, Task 4

> Staging is a production mirror — same architecture, scaled down, never shared with production data.

---

## 1. Infrastructure Design

### 1.1 Architecture Overview

```
Internet
    │
    ├── CDN / WAF (Cloudflare)
    │     ├── staging.minimax-studio.com    (Frontend)
    │     ├── api.staging.minimax-studio.com (API)
    │     └── cdn.staging.minimax-studio.com (Assets)
    │
    ├── Frontend — Vercel
    │     └── Preview deployments per PR
    │
    ├── Backend — Railway (2 services)
    │     ├── api service — Node.js / Express (HTTP API server)
    │     │     ├── BullMQ client (enqueues jobs to Redis)
    │     │     └── Health endpoint: GET /health
    │     │
    │     └── worker service — Standalone BullMQ processor
    │           ├── Consumes jobs from Redis queue
    │           ├── Calls MiniMax API for image generation
    │           └── Uploads results to CDN, sends email
    │
    ├── Database — Railway PostgreSQL 16
    │     ├── Separate instance from production
    │     ├── Same schema, seeded with anonymized test data
    │     └── Read replica (for future read-heavy loads)
    │
    ├── Cache — Railway Redis 7
    │     ├── BullMQ queue persistence
    │     ├── Session/cache layer
    │     └── No persistence of production data
    │
    └── External Services (staging accounts)
          ├── MiniMax API (staging/test key)
          ├── Cloudflare R2 (staging bucket)
          ├── Resend (staging domain)
          └── Sentry (staging project)
```

### 1.2 Staging vs. Production Comparison

| Component | Production | Staging |
|-----------|-----------|---------|
| **API instances** | 2 (load balanced) | 1 (api service) + 1 (worker service) |
| **Worker instances** | 2 | 1 |
| **Database** | Production DB | Isolated, anonymized copy |
| **Redis** | Production Redis | Isolated instance |
| **CDN** | Production R2 bucket | Staging R2 bucket |
| **AI API** | Production API key | Staging/test API key |
| **Email sender** | Production domain | Staging domain (`@staging.minimax.studio`) |
| **Monitoring** | Production Sentry | Staging Sentry (separate DSN) |
| **Traffic** | Live users | Team only |
| **Auto-scaling** | Yes (2-10 instances) | No (fixed 1 instance each) |
| **SLAs** | 99.9% uptime | Best-effort |

### 1.3 Feature Flag System

Feature flags enable staged rollouts and allow staging to test flag states before production.

**Implementation**: Environment-based flags via the `FLAGS` environment variable (JSON object), parsed at startup.

```json
// staging environment variable: FLAGS
{
  "new_iteration_ui": true,
  "voice_input": true,
  "quality_scoring": false,
  "analytics_dashboard": false,
  "rate_limiting": true
}
```

**Access in code** (Node.js):
```typescript
// backend/src/config/flags.ts
interface FeatureFlags {
  new_iteration_ui: boolean;
  voice_input: boolean;
  quality_scoring: boolean;
  analytics_dashboard: boolean;
  rate_limiting: boolean;
}

function getFlags(): FeatureFlags {
  const raw = process.env.FLAGS || '{}';
  return JSON.parse(raw) as FeatureFlags;
}

export const flags = getFlags();
```

Usage:
```typescript
if (flags.new_iteration_ui) {
  // Enable new iteration UI endpoint
}
```

---

## 2. Deployment Configuration

### 2.1 Docker Compose — Local Development

**File**: `backend/docker-compose.yml`

```yaml
version: '3.9'

services:
  # ─────────────────────────────────────────────────────
  # API Server
  # ─────────────────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: minimax-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: staging
      PORT: 3000
      QUEUE_TYPE: bullmq
      # Database
      DATABASE_URL: postgresql://minimax:minimax@postgres:5432/minimax_staging
      # Redis
      REDIS_URL: redis://redis:6379
      # AI Provider
      MINIMAX_API_KEY: ${MINIMAX_API_KEY}
      # Email
      RESEND_API_KEY: ${RESEND_API_KEY}
      RESEND_FROM_EMAIL: hello@staging.minimax.studio
      # CDN
      CDN_BUCKET_URL: ${STAGING_CDN_BUCKET_URL}
      CLOUDFLARE_R2_ACCOUNT_ID: ${CLOUDFLARE_R2_ACCOUNT_ID}
      CLOUDFLARE_R2_ACCESS_KEY_ID: ${CLOUDFLARE_R2_ACCESS_KEY_ID}
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${CLOUDFLARE_R2_SECRET_ACCESS_KEY}
      # Feature flags
      FLAGS: '{"new_iteration_ui":true,"voice_input":true,"quality_scoring":false}'
      # Health check
      HEALTH_CHECK_SECRET: ${HEALTH_CHECK_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1024M
        reservations:
          cpus: '0.25'
          memory: 256M

  # ─────────────────────────────────────────────────────
  # BullMQ Worker
  # ─────────────────────────────────────────────────────
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: minimax-worker
    command: node dist/worker.js
    restart: unless-stopped
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgresql://minimax:minimax@postgres:5432/minimax_staging
      REDIS_URL: redis://redis:6379
      MINIMAX_API_KEY: ${MINIMAX_API_KEY}
      CDN_BUCKET_URL: ${STAGING_CDN_BUCKET_URL}
      CLOUDFLARE_R2_ACCOUNT_ID: ${CLOUDFLARE_R2_ACCOUNT_ID}
      CLOUDFLARE_R2_ACCESS_KEY_ID: ${CLOUDFLARE_R2_ACCESS_KEY_ID}
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${CLOUDFLARE_R2_SECRET_ACCESS_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2048M
        reservations:
          cpus: '0.5'
          memory: 512M

  # ─────────────────────────────────────────────────────
  # PostgreSQL Database
  # ─────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: minimax-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: minimax
      POSTGRES_PASSWORD: minimax
      POSTGRES_DB: minimax_staging
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d/migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minimax -d minimax_staging"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  # ─────────────────────────────────────────────────────
  # Redis
  # ─────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: minimax-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  # ─────────────────────────────────────────────────────
  # Nginx (Reverse Proxy for local staging)
  # ─────────────────────────────────────────────────────
  nginx:
    image: nginx:alpine
    container_name: minimax-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: minimax-network
```

### 2.2 Dockerfile for Backend

**File**: `backend/Dockerfile`

```dockerfile
# ─────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Prune dev dependencies
RUN npm prune --production

# ─────────────────────────────────────────────────────────
# Stage 2: Production
# ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy built artifacts
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodeuser:nodejs /app/package-lock.json ./package-lock.json

# Copy non-compiled assets
COPY --chown=nodeuser:nodejs . .

USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### 2.3 Nginx Configuration (Local Staging)

**File**: `backend/nginx/nginx.conf`

```nginx
events {
  worker_connections 1024;
}

http {
  upstream api {
    server api:3000;
    keepalive 32;
  }

  server {
    listen 80;
    server_name _;

    # Gzip compression
    gzip on;
    gzip_types application/json text/plain text/css application/javascript;
    gzip_min_length 1000;

    # Request logging
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # ─────────────────────────────────────────────────
    # Health check endpoint (no rate limiting)
    # ─────────────────────────────────────────────────
    location = /health {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
    }

    # ─────────────────────────────────────────────────
    # API endpoints
    # ─────────────────────────────────────────────────
    location /api/ {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # Timeouts
      proxy_connect_timeout 10s;
      proxy_send_timeout 60s;
      proxy_read_timeout 60s;

      # Buffering
      proxy_buffering on;
      proxy_buffer_size 4k;
      proxy_buffers 8 4k;

      # Rate limiting (staging — lighter limits)
      limit_req zone=api_limit burst=20 nodelay;
    }

    # ─────────────────────────────────────────────────
    # Static assets / CDN (future)
    # ─────────────────────────────────────────────────
    location /assets/ {
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_cache_valid 200 1h;
      add_header Cache-Control "public, max-age=3600";
    }

    # ─────────────────────────────────────────────────
    # Security headers
    # ─────────────────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  }
}

# ─────────────────────────────────────────────────────────
# Rate limiting zones
# ─────────────────────────────────────────────────
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
```

---

## 3. Environment Variable Management

### 3.1 `.env.example` — Complete Template

**File**: `backend/.env.example`

```bash
# ═══════════════════════════════════════════════════════
# MiniMax Studio — Environment Variables Template
# ═══════════════════════════════════════════════════════
# Copy to .env.local for local development
# NEVER commit .env files to version control
# ═══════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────────────────
NODE_ENV=staging
PORT=3000

# ─────────────────────────────────────────────────────────
# Database (PostgreSQL 16)
# ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://username:password@host:5432/minimax_staging

# ─────────────────────────────────────────────────────────
# Redis (BullMQ queue)
# ─────────────────────────────────────────────────────────
REDIS_URL=redis://host:6379

# ─────────────────────────────────────────────────────────
# AI Provider — MiniMax
# ─────────────────────────────────────────────────────────
MINIMAX_API_KEY=your_minimax_api_key_here

# ─────────────────────────────────────────────────────────
# Email — Resend
# ─────────────────────────────────────────────────────────
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=hello@staging.minimax.studio

# ─────────────────────────────────────────────────────────
# CDN — Cloudflare R2
# ─────────────────────────────────────────────────────────
CDN_BUCKET_URL=https://cdn.staging.minimax.studio
CLOUDFLARE_R2_ACCOUNT_ID=your_r2_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key

# ─────────────────────────────────────────────────────────
# Monitoring — Sentry
# ─────────────────────────────────────────────────────────
SENTRY_DSN=https://your_dsn@sentry.io/project

# ─────────────────────────────────────────────────────────
# Feature Flags (JSON)
# ─────────────────────────────────────────────────────────
FLAGS='{"new_iteration_ui":true,"voice_input":true,"quality_scoring":false,"analytics_dashboard":false,"rate_limiting":true}'

# ─────────────────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────────────────
HEALTH_CHECK_SECRET=generate_a_random_secret_here
CORS_ORIGINS=https://staging.minimax-studio.com,http://localhost:3000

# ─────────────────────────────────────────────────────────
# Rate Limiting
# ─────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3.2 `.gitignore` — Environment File Protection

**File**: `backend/.gitignore`

```gitignore
# Environment files — NEVER commit
.env
.env.local
.env.*.local
.env.staging
.env.production

# Never commit these
*.pem
*.key
*.crt
Certificates.p12
*.p12

# Keep the example
!.env.example
```

---

## 4. Domain and URL Strategy

### 4.1 URL Architecture

| Environment | Domain | Purpose | SSL |
|------------|--------|---------|-----|
| Production | `minimax-studio.com` | Live users | Auto (Cloudflare) |
| Production API | `api.minimax-studio.com` | Backend API | Auto (Cloudflare) |
| Production CDN | `cdn.minimax-studio.com` | Generated images | Auto (Cloudflare) |
| Staging | `staging.minimax-studio.com` | Team testing | Auto (Cloudflare) |
| Staging API | `api.staging.minimax-studio.com` | Backend staging | Auto (Cloudflare) |
| Staging CDN | `cdn.staging.minimax-studio.com` | Staging assets | Auto (Cloudflare) |
| PR Preview | `pr-{N}.staging.minimax-studio.com` | Per-PR previews | Auto (Vercel) |

### 4.2 Cloudflare DNS Configuration

```
# Production
minimax-studio.com        A     76.76.x.x   (Vercel IP)
api.minimax-studio.com    A     <Railway/Render IP>
cdn.minimax-studio.com    CNAME cdn.minimax.studio.r2.cloudflarestorage.com

# Staging
staging.minimax-studio.com CNAME <staging-vercel-project>.vercel.app
api.staging.minimax-studio.com CNAME <staging-railway-url>
cdn.staging.minimax-studio.com CNAME cdn.staging.minimax.studio.r2.cloudflarestorage.com

# PR Preview (wildcard)
*.staging.minimax-studio.com CNAME <vercel-preview-url>
```

### 4.3 CORS Configuration (Backend)

```typescript
// backend/src/middleware/cors.ts
const stagingOrigins = [
  'https://staging.minimax-studio.com',
  'https://pr-*.staging.minimax-studio.com',  // PR preview domains
  'http://localhost:3000',                     // local dev
  'http://localhost:5173',                     // Vite dev
];

const productionOrigins = [
  'https://minimax-studio.com',
];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? productionOrigins
  : stagingOrigins;

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin || allowedOrigins.some(o => matchOrigin(o, origin))) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed`));
    }
  },
  credentials: true,
});
```

---

## 5. Database Migration Strategy

### 5.1 Migration File Structure

```
backend/
  migrations/
    20260409_001_initial_schema.sql
    20260410_001_add_retry_fields.sql
  seeds/
    001_test_users.sql
    002_sample_ideas.sql
  knexfile.ts
```

### 5.2 Migration Rules

| Rule | Description |
|------|-------------|
| **Backward-compatible** | New migrations must not break existing running instances |
| **Always use transactions** | Wrap each migration in a transaction |
| **Test rollback locally** | Verify `knex migrate:rollback` works before merging |
| **No data migrations in the same migration as schema** | Separate into two migrations |
| **Seed data only in staging** | Production seeds are forbidden |
| **Anonymize test data** | No real email addresses or personal data in seeds |

### 5.3 Migration Workflow

```bash
# 1. Create a new migration
npx knex migrate:make add_idea_priority

# 2. Write the migration
# backend/migrations/20260411_001_add_idea_priority.sql

# 3. Dry run (verify SQL without executing)
npx knex migrate:latest --dry-run

# 4. Run migration
npx knex migrate:latest

# 5. Verify migration status
npx knex migrate:status

# 6. Rollback (if needed)
npx knex migrate:rollback
```

### 5.4 CI Migrations (from pipeline)

The GitHub Actions `migrate` job runs migrations before every deploy:

```bash
# Dry run first (safety gate)
npx knex migrate:latest --dry-run

# If dry run succeeds, execute
npx knex migrate:latest
```

---

## 6. Rollback Strategy

### 6.1 Blue/Green Deployment

Railway supports zero-downtime deployments via **rebuilds** (not blue/green by default). For true blue/green:

1. **Railway**: Use the "Traffic Split" feature to gradually shift traffic
2. **Vercel**: Automatic (instant rollback via dashboard or CLI)

```
Railway Traffic Split:
  Old deployment: 0%
  New deployment: 100%
  → Instant rollback: set old to 100%
```

### 6.2 One-Command Rollback

**Railway**:
```bash
# List recent deployments
railway status

# Rollback to previous deployment
railway rollback <deployment-id>

# Rollback to last working deployment
railway rollback
```

**Vercel**:
```bash
# List deployments
vercel list

# Instant rollback
vercel rollback [deployment-url]
```

### 6.3 Database Rollback

```bash
# Rollback last migration
npx knex migrate:rollback

# Rollback to specific migration
npx knex migrate:rollback --name 20260409_001_initial_schema

# Check migration status first
npx knex migrate:status
```

**Critical rule**: If a migration cannot be rolled back safely, it must not be deployed to production. Design migrations as additive only (new columns with defaults, new tables). Avoid destructive operations (DROP COLUMN, DROP TABLE) in a single deploy.

### 6.4 Rollback Decision Tree

```
Deploy fails
  │
  ├── API health check fails
  │     → Railway auto-rollback (60s timeout)
  │     → Notify Slack: "API health check failed, rolled back"
  │     → Notify Slack: "Backend rolled back to previous version"
  │
  ├── Smoke tests fail (post-deploy)
  │     → GitHub Actions triggers rollback job
  │     → Railway rollback command
  │     → Sentry alert + Slack notification
  │
  ├── Database migration fails
  │     → DO NOT proceed with deploy
  │     → Migration failure blocks deploy job
  │     → Notify Slack: "Migration failed, deploy aborted"
  │
  └── Runtime error (high error rate in Sentry)
        → PagerDuty alert to on-call
        → Manual Railway rollback
        → Post-mortem within 24 hours
```

---

## 7. Local Staging Development

### 7.1 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/minimax-studio/minimax-studio.git
cd minimax-studio/backend

# 2. Copy environment template
cp .env.example .env.local
# Edit .env.local with your staging values

# 3. Start all services
docker compose up --build

# 4. Run migrations
npm run migrate

# 5. Seed test data
npm run db:seed

# 6. Verify
open http://localhost:3000/health
```

### 7.2 Seed Data (Staging Only)

```sql
-- backend/seeds/001_test_users.sql
-- All test data is synthetic. No real user data.

INSERT INTO ideas (id, email, idea_text, status) VALUES
  ('ide_test000000001', 'test+001@staging.minimax.studio', 'A futuristic cityscape at sunset with flying vehicles', 'completed'),
  ('ide_test000000002', 'test+002@staging.minimax.studio', 'Minimalist mobile banking app with teal accent', 'queued'),
  ('ide_test000000003', 'test+003@staging.minimax.studio', 'Watercolor painting of a mountain cabin in autumn', 'failed');
```

### 7.3 Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

API_URL="${1:-http://localhost:3000}"

echo "=== MiniMax Studio Health Check ==="
echo "Target: $API_URL"
echo ""

# 1. Basic health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HTTP_CODE" == "200" ]; then
  echo "[OK] Health endpoint: HTTP $HTTP_CODE"
else
  echo "[FAIL] Health endpoint: HTTP $HTTP_CODE"
  exit 1
fi

# 2. Database connectivity (if endpoint supports it)
RESP=$(curl -s "$API_URL/health")
DB_STATUS=$(echo "$RESP" | jq -r '.database // "unknown"')
if [ "$DB_STATUS" == "ok" ]; then
  echo "[OK] Database: connected"
else
  echo "[WARN] Database: $DB_STATUS"
fi

# 3. Redis connectivity
REDIS_STATUS=$(echo "$RESP" | jq -r '.redis // "unknown"')
if [ "$REDIS_STATUS" == "ok" ]; then
  echo "[OK] Redis: connected"
else
  echo "[WARN] Redis: $REDIS_STATUS"
fi

# 4. API functional test
RESP=$(curl -s -X POST "$API_URL/api/ideas" \
  -H "Content-Type: application/json" \
  -d '{"email":"health-check@staging.minimax.studio","idea_text":"Health check test from staging validation script"}')
IDEA_STATUS=$(echo "$RESP" | jq -r '.status // "error"')
if [ "$IDEA_STATUS" == "queued" ]; then
  echo "[OK] API: POST /api/ideas returned queued"
else
  echo "[FAIL] API: unexpected response: $RESP"
  exit 1
fi

echo ""
echo "=== All checks passed ==="
```

---

## 8. Secrets Management

### 8.1 Secret Hierarchy

| Level | Storage | Used By |
|-------|---------|---------|
| Development | `.env.local` (gitignored) | Local Docker Compose |
| CI/CD | GitHub Actions Secrets | GitHub Actions workflows |
| Production | Railway Environment Variables | Railway deployments |
| Staging | Railway Environment Variables | Railway staging |

### 8.2 Secrets Rotation Policy

| Secret Type | Rotation Frequency | Rotation Procedure |
|-------------|-------------------|-------------------|
| API Keys (MiniMax, Resend) | Every 90 days | Generate new key, update all environments |
| Database URL | Every 180 days | Railway managed rotation |
| Cloudflare R2 keys | Every 90 days | Cloudflare dashboard, update Railway + GitHub |
| Sentry DSN | On project recreation | Generate new DSN, update environments |
| Vercel token | Every 180 days | Vercel dashboard, update GitHub |

### 8.3 Secret Audit

Run quarterly audit using this script:

```bash
#!/bin/bash
# scripts/secret-audit.sh

echo "=== Secret Audit Report ==="
echo "Date: $(date -u +%Y-%m-%d)"
echo ""

# Check for committed secrets (patterns that should not exist)
echo "Checking for potential committed secrets..."
if grep -r --include="*.ts" --include="*.js" --include="*.json" \
  -E "(sk-|api[_-]key|secret|password|token).*=['\"][a-zA-Z0-9]{20,}" \
  backend/src/; then
  echo "[FAIL] Potential secrets found in source code!"
else
  echo "[OK] No obvious secrets in source code"
fi

# Check .gitignore protects .env files
echo ""
echo "Checking .gitignore coverage..."
MISSING=""
for f in .env .env.local .env.production; do
  if ! grep -q "$f" backend/.gitignore 2>/dev/null; then
    MISSING="$MISSING $f"
  fi
done
if [ -n "$MISSING" ]; then
  echo "[WARN] .env files not fully protected:$MISSING"
else
  echo "[OK] .env files are gitignored"
fi
```

---

## 9. Monitoring and Alerting

### 9.1 Sentry Configuration

```yaml
# GitHub Actions: Sentry release tagging
- name: Tag Sentry release
  uses: getsentry/action-release@v1
  with:
    environment: staging  # or production
    version: ${{ github.ref_name }}
    project: minimax-studio-backend
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

**Alert rules** (Sentry):
- New issue created → Slack notification
- Issue affects >10 users in 1 hour → PagerDuty alert (production only)
- 5xx error rate >1% over 5 minutes → Slack notification

### 9.2 Uptime Monitoring

| Endpoint | Tool | Frequency | Alert |
|----------|------|-----------|-------|
| `https://api.staging.minimax-studio.com/health` | Cloudflare Health Check | 60s | Slack |
| `https://api.minimax-studio.com/health` | Cloudflare Health Check | 60s | PagerDuty |
| `https://staging.minimax-studio.com` | Vercel built-in | 60s | Slack |
| `https://minimax-studio.com` | Vercel built-in | 60s | PagerDuty |

### 9.3 Health Endpoint Response

```typescript
// backend/src/routes/health.ts
router.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    database: 'unknown',
    redis: 'unknown',
  };

  // Check database
  try {
    await req.app.locals.db.raw('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    checks.status = 'degraded';
  }

  // Check Redis
  try {
    await req.app.locals.redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
    checks.status = 'degraded';
  }

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
});
```

---

*Document Version: 1.1 — 2-service architecture (api + worker), 2026-04-20*
