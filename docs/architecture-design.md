# Technical Architecture Design — MiniMax Studio

**Status**: Draft | **Version**: 1.0 | **Date**: 2026-04-09
**Role**: CTO | **Sprint**: Content Sprint 1, Task 1
**Reference Documents**: `ai-integration.md`, `user-stories.md`, `mobile-tech-stack.md`

---

## Table of Contents

1. [System Architecture Diagram](#1-system-architecture-diagram)
2. [Database Schema](#2-database-schema)
3. [AI Model Integration](#3-ai-model-integration)
4. [Infrastructure Recommendations](#4-infrastructure-recommendations)
5. [Security Architecture](#5-security-architecture)
6. [Technology Stack Summary](#6-technology-stack-summary)

---

## 1. System Architecture Diagram

### 1.1 High-Level Architecture

```
+──────────────────────────────────────────────────────────────────────────────+
│                              MINIMAX STUDIO SYSTEM                             │
│                          "想到即看见，看见即得到"                                │
+──────────────────────────────────────────────────────────────────────────────+

  ┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
  │         CLIENT LAYER                │    │         CLIENT LAYER                  │
  │                                     │    │                                     │
  │  ┌───────────────┐   ┌──────────┐  │    │  ┌───────────────┐   ┌──────────┐  │
  │  │  Landing Page  │   │ Mobile   │  │    │  │  Dashboard /   │   │  Admin   │  │
  │  │  (index.html)  │   │    App   │  │    │  │  Internal Tool │   │  Panel   │  │
  │  │  Web (SPA)     │   │  (React  │  │    │  │                │   │          │  │
  │  │  ---          │   │  Native) │  │    │  │                │   │          │  │
  │  │  • Form input  │   │  • Camera│  │    │  │                │   │          │  │
  │  │  • Idea submit │   │  • Voice │  │    │  │                │   │          │  │
  │  │  • Status poll │   │  • Result│  │    │  │                │   │          │  │
  │  └───────┬───────┘   └─────┬────┘  │    │  └───────┬───────┘   └────┬────┘  │
  │          │                 │        │    │          │                 │        │
  └──────────┼─────────────────┼────────┘    └──────────┼─────────────────┼────────┘
             │                 │                       │                 │
             │ HTTPS/REST      │ HTTPS/REST            │ HTTPS/REST      │ HTTPS/REST
             ▼                 ▼                       ▼                 ▼
+──────────────────────────────────────────────────────────────────────────────────+
│                           API GATEWAY LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                          AWS API Gateway / Vercel Edge / NGINX              │  │
│  │                                                                              │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │   │   Rate      │  │   Auth      │  │   Validate  │  │    CORS         │  │  │
│  │   │   Limiter   │  │   (JWT)     │  │   & Parse   │  │    Headers      │  │  │
│  │   │   ---       │  │   ---       │  │   ---       │  │    ---         │  │  │
│  │   │  100 req/   │  │  • Verify   │  │  • Schema   │  │  • Whitelist   │  │  │
│  │   │  15min/user │  │    tokens   │  │    check    │  │    origins     │  │  │
│  │   │  1000/day   │  │  • Extract  │  │  • Sanitize │  │  • Preflight   │  │  │
│  │   │             │  │    claims   │  │    input    │  │    response    │  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  │                                                                              │  │
│  │   Routes:                                                                   │  │
│  │   POST /api/ideas          → Ideas Controller (public)                       │  │
│  │   GET  /api/ideas/:id     → Ideas Controller (public, id-based)              │  │
│  │   POST /api/generate      → Generate Controller (authenticated)              │  │
│  │   GET  /api/generate/:id  → Generate Controller (authenticated)              │  │
│  │   GET  /api/dashboard     → Analytics Controller (authenticated + admin)     │  │
│  │   POST /api/auth/register → Auth Controller (public)                         │  │
│  │   POST /api/auth/login    → Auth Controller (public)                         │  │
│  │   POST /api/auth/refresh  → Auth Controller (public)                         │  │
│  │   GET  /api/users/me      → User Controller (authenticated)                  │  │
│  │                                                                              │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
+──────────────────────────────────────────────────────────────────────────────────+
                                      │
           ┌──────────────────────────┼──────────────────────────────────────────┐
           │                          ▼                                           │
           │  ┌────────────────────────────────────────────────────────────────┐  │
           │  │                    API SERVER LAYER                             │  │
           │  │                                                                 │  │
           │  │   ┌─────────────────────────────────────────────────────────┐  │  │
           │  │   │              Node.js / Fastify (TypeScript)              │  │  │
           │  │   │                                                          │  │  │
           │  │   │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │  │  │
           │  │   │  │ Ideas Service │  │ Generate Svc │  │ Analytics Svc │  │  │  │
           │  │   │  │ ---          │  │ ---         │  │ ---          │  │  │  │
           │  │   │  │ • submit     │  │ • pipeline  │  │ • events      │  │  │  │
           │  │   │  │ • getStatus  │  │ • orchestr. │  │ • aggregates  │  │  │  │
           │  │   │  │ • list       │  │ • versioning│  │ • exports     │  │  │  │
           │  │   │  │ • email notif│  │             │  │               │  │  │  │
           │  │   │  └───────┬──────┘  └───────┬──────┘  └───────┬───────┘  │  │  │
           │  │   │          │                 │                 │          │  │  │
           │  │   │          └─────────────────┼─────────────────┘          │  │  │
           │  │   │                            │                            │  │  │
           │  │   │  ┌─────────────────────────┴────────────────────────┐   │  │  │
           │  │   │  │              Repository Layer                     │   │  │  │
           │  │   │  │  ┌──────────────┐  ┌──────────────┐                 │   │  │  │
           │  │   │  │  │  IdeaRepo    │  │  AssetRepo   │                 │   │  │  │
           │  │   │  │  │  UserRepo    │  │  EventRepo   │                 │   │  │  │
           │  │   │  │  └──────────────┘  └──────────────┘                 │   │  │  │
           │  │   │  └─────────────────────────────────────────────────────┘   │  │  │
           │  │   └─────────────────────────────────────────────────────────────┘  │  │
           │  └──────────────────────────────────────────────────────────────────┘  │
           │                                      │                                  │
           │            ┌──────────────────────────┼──────────────────────────┐     │
           │            │                          ▼                           │     │
           │            │  ┌───────────────────────────────────────────────┐  │     │
           │            │  │                POSTGRESQL                     │  │     │
           │            │  │                                               │  │     │
           │            │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │  │     │
           │            │  │  │  ideas  │ │  users  │ │ assets  │ │events │ │  │     │
           │            │  │  │  table  │ │  table  │ │  table  │ │ table │ │  │     │
           │            │  │  └─────────┘ └─────────┘ └─────────┘ └───────┘ │  │     │
           │            │  └───────────────────────────────────────────────┘  │     │
           │            └──────────────────────────────────────────────────────┘     │
           │                                                                          │
           └──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
+--------------------------------------------------------------------------------------------------+
│                                 QUEUE LAYER                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐     │
│  │                              BullMQ + Redis                                                 │     │
│  │                                                                                          │     │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────────────────┐  │     │
│  │   │  ideas:generate  │  │  ideas:email     │  │  ideas:dlq (Dead Letter Queue)     │  │     │
│  │   │  ---             │  │  ---             │  │  ---                               │  │     │
│  │   │  • Job per idea  │  │  • Email notif.  │  │  • Failed after max retries        │  │     │
│  │   │  • Concurrency:1 │  │  • Concurrency:5 │  │  • Manual inspection + replay      │  │     │
│  │   │  • Timeout:120s  │  │  • Timeout:30s    │  │                                    │  │     │
│  │   │  • 4 attempts    │  │  • 3 attempts    │  │                                    │  │     │
│  │   └────────┬─────────┘  └──────────────────┘  └────────────────────────────────────┘  │     │
│  │            │                                                                            │     │
│  └────────────┼────────────────────────────────────────────────────────────────────────────┘     │
│               │                                                                                  │
│               ▼                                                                                  │
+--------------------------------------------------------------------------------------------------+
│                                 AI WORKER LAYER                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐     │
│  │                                                                                          │     │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │     │
│  │   │                         AI WORKER PROCESS                                       │   │     │
│  │   │                         (Docker container, horizontally scalable)                │   │     │
│  │   │                                                                                 │   │     │
│  │   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │   │     │
│  │   │   │  Pipeline Stage  │  │  Pipeline Stage │  │  Pipeline Stage             │  │   │     │
│  │   │   │  1: PROMPT       │  │  2: GENERATE    │  │  3: QUALITY + UPLOAD        │  │   │     │
│  │   │   │  ENRICHMENT      │  │                 │  │                             │  │   │     │
│  │   │   │  ---            │  │  ---            │  │  ---                        │  │   │     │
│  │   │   │  • Load user    │  │  • Route model  │  │  • Validate dimensions     │  │   │     │
│  │   │   │    preferences  │  │  • Call MiniMax│  │  • Download from provider   │  │   │     │
│  │   │   │  • Enrich prompt│  │  • Fallback:   │  │  • Upload to CDN (R2/S3)    │  │   │     │
│  │   │   │    with style   │  │    OpenAI DALLE │  │  • Generate signed URL      │  │   │     │
│  │   │   │    presets      │  │  • Fallback:    │  │  • Update DB (result_url)   │  │   │     │
│  │   │   │  • Inject brand  │  │    Stable Diff │  │  • Enqueue email job        │  │   │     │
│  │   │   │    guidelines   │  │                 │  │  • Mark completed          │  │   │     │
│  │   │   └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │   │     │
│  │   │                                                                                 │   │     │
│  │   │   ┌───────────────────────────────────────────────────────────────────────┐  │   │     │
│  │   │   │  MODEL ROUTER                                                         │  │   │     │
│  │   │   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐  │  │   │     │
│  │   │   │  │ MiniMax     │ │ OpenAI      │ │ Stable      │ │ Future: Custom  │  │  │   │     │
│  │   │   │  │ Image-01    │ │ DALL-E 3    │ │ Diffusion   │ │ Fine-tuned      │  │  │   │     │
│  │   │   │  │ (Primary)   │ │ (Fallback)  │ │ (Fallback)  │ │                 │  │  │   │     │
│  │   │   │  │ ✓           │ │ ✓           │ │ ✓           │ │                 │  │  │   │     │
│  │   │   │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘  │  │   │     │
│  │   │   └───────────────────────────────────────────────────────────────────────┘  │   │     │
│  │   │                                                                                 │   │     │
│  │   └─────────────────────────────────────────────────────────────────────────────────┘   │     │
│  │                                                                                          │     │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                                  │
+--------------------------------------------------------------------------------------------------+
                                      │
                                      ▼
+--------------------------------------------------------------------------------------------------+
│                               STORAGE LAYER                                                        │
│  ┌──────────────────────────┐    ┌──────────────────────────┐    ┌────────────────────────────┐   │
│  │      PostgreSQL          │    │   Object Storage         │    │    CDN (Cloudflare R2)      │   │
│  │   (Primary DB)          │    │   (AWS S3 / R2)          │    │    (Asset Delivery)        │   │
│  │   ---                   │    │   ---                   │    │    ---                    │   │
│  │   • Ideas               │    │   • Generated images    │    │    • Edge caching         │   │
│  │   • Users               │    │   • Thumbnails (v2)    │    │    • Signed URLs (7d)     │   │
│  │   • Assets              │    │   • User uploads (v2) │    │    • Auto-optimization     │   │
│  │   • Events              │    │   • Backup snapshots   │    │    • Image resizing        │   │
│  │   • Sessions (optional)│    │                        │    │                            │   │
│  └──────────────────────────┘    └──────────────────────────┘    └────────────────────────────┘   │
│                                                                                                   │
│                          ┌──────────────────────────┐                                             │
│                          │      Redis               │                                             │
│                          │   (Queue + Cache)        │                                             │
│                          │   ---                   │                                             │
│                          │   • BullMQ job storage  │                                             │
│                          │   • Rate limit counters │                                             │
│                          │   • Session cache (v2)  │                                             │
│                          │   • Prompt cache (v2)   │                                             │
│                          └──────────────────────────┘                                             │
+--------------------------------------------------------------------------------------------------+
                                      │
                                      ▼
+--------------------------------------------------------------------------------------------------+
│                           NOTIFICATION LAYER                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐     │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────────┐  │     │
│  │   │   Resend       │  │   SendGrid       │  │   In-App Notification (v2)            │  │     │
│  │   │   (Primary)   │  │   (Fallback)    │  │   (Future)                              │  │     │
│  │   │   ---         │  │   ---          │  │   ---                                   │  │     │
│  │   │   • Completion│  │   • Same API   │  │   • WebSocket push                     │  │     │
│  │   │     emails    │  │     compat.    │  │   • Polling fallback                   │  │     │
│  │   │   • Failure   │  │   • Higher     │  │   • Badge counts                       │  │     │
│  │   │     emails    │  │     throughput │  │                                        │  │     │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────────────────────────────┘  │     │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘     │
+--------------------------------------------------------------------------------------------------+
```

### 1.2 Data Flow: Idea-to-Visual Pipeline

```
User (landing page or mobile app)
    │
    │ POST /api/ideas  { email, idea_text }
    │ OR POST /api/generate  { prompt, user_id?, params }
    ▼
API Gateway (rate limit, auth, validation)
    │
    │ validate() → sanitize input
    ▼
API Server
    │
    ├─► Save to PostgreSQL (status: queued)
    │
    └─► Enqueue BullMQ job
            │
            ▼
        Redis (job queued)
            │
            ▼
        AI Worker picks up job
            │
            ├─► STAGE 1: Prompt Enrichment
            │       • Load user preferences (if auth'd)
            │       • Inject style/brand guidelines
            │       • Output: enriched_prompt string
            │
            ├─► STAGE 2: Model Routing + Generation
            │       • Try: MiniMax Image-01 API
            │       • If fails (3x retries): fallback OpenAI DALL-E 3
            │       • If fails: fallback Stable Diffusion
            │       • Poll job status or wait for webhook
            │       • Output: image_url (provider CDN)
            │
            ├─► STAGE 3: Download + CDN Upload + DB Update
            │       • Fetch image from provider
            │       • Upload to R2/S3
            │       • Generate signed CDN URL
            │       • Update ideas.assets with result_url
            │       • Update ideas.status = 'completed'
            │
            └─► STAGE 4: Notification
                    • Enqueue email job
                    • Send completion email with result_url
                    • On failure: log, retry 3x, then skip
```

### 1.3 Async Architecture (BullMQ Workers)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BULLMQ QUEUE ARCHITECTURE                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  REDIS (pub/sub) — job coordination                             │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  ideas:generate    │  ideas:email   │  ideas:dlq        │   │  │
│  │  │  ═══════════════   │  ═══════════   │  ═══════════     │   │  │
│  │  │  CONCURRENCY: 1    │  CONCURRENCY:5 │  — (dead end)    │   │  │
│  │  │  TIMEOUT: 120s     │  TIMEOUT: 30s  │                  │   │  │
│  │  │  RETRY: 4         │  RETRY: 3      │                  │   │  │
│  │  │  BACKOFF: exp+jit │  BACKOFF:fixed │                  │   │  │
│  │  │  ────────────────  │  ────────────  │  ─────────────   │   │  │
│  │  │  JOB DATA:         │  JOB DATA:     │  JOB DATA:      │   │  │
│  │  │  { idea_id,        │  { idea_id,   │  { idea_id,     │   │  │
│  │  │    email,          │    email,      │    error,       │   │  │
│  │  │    idea_text,      │    idea_text,  │    attempt,     │   │  │
│  │  │    user_id?,       │    result_url, │    enqueued_at }│   │  │
│  │  │    generation_     │    status }    │                  │   │  │
│  │  │      params }      │                │                  │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  WORKERS (horizontally scalable, separate processes)    │   │  │
│  │  │                                                          │   │  │
│  │  │  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │   │  │
│  │  │  │ Worker A     │    │ Worker B     │    │ Worker C  │  │   │  │
│  │  │  │ (generate)   │    │ (generate)   │    │ (email)   │  │   │  │
│  │  │  │ [Docker]     │    │ [Docker]     │    │ [Docker]  │  │   │  │
│  │  │  │ GPU-capable  │    │ GPU-capable  │    │ CPU-only  │  │   │  │
│  │  │  └──────────────┘    └──────────────┘    └───────────┘  │   │  │
│  │  │        ...                  ...                  ...      │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │      ideas       │       │     assets       │
│ ──────────────── │       │ ──────────────── │       │ ──────────────── │
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ email            │◄──────│ user_id (FK)     │       │ idea_id (FK)     │
│ password_hash    │       │ email            │       │ file_key (S3)    │
│ display_name     │       │ idea_text        │       │ cdn_url          │
│ created_at       │       │ status           │       │ width            │
│ updated_at       │       │ created_at       │       │ height           │
│ is_admin         │       │ processed_at     │       │ format           │
│ preferences (JSONB)      │ retry_count       │       │ size_bytes       │
│ daily_quota      │       │ error_message    │       │ quality_score    │
│ last_active_at  │       │ generation_params│       │ created_at       │
└──────────────────┘       └────────┬─────────┘       └────────┬─────────┘
       │                            │                           │
       │                            │                    ┌──────┴──────────┐
       │                            │                    │ idea_iterations │
       │                            │                    │ ──────────────── │
       │                            │                    │ id (PK)          │
       │                            │                    │ asset_id (FK)     │
       │                            │                    │ idea_id (FK)      │
       │                            │                    │ iteration_number  │
       │                            │                    │ parent_asset_id   │
       │                            │                    │ (FK, nullable)    │
       │                            │                    │ refinement_prompt│
       │                            │                    │ created_at       │
       │                            │                    └──────────────────┘
       │                            │
       │                            │       ┌──────────────────┐
       │                            └───────│   idea_tags     │
       │                                    │ ──────────────── │
       │                                    │ idea_id (FK, PK) │
       │                                    │ tag (PK)         │
       │                                    └──────────────────┘
       │                                    ┌──────────────────┐
       └───────────────────────────────────►│  analytics_      │
                                             │    events        │
                                             │ ──────────────── │
                                             │ id (PK)          │
                                             │ user_id (FK)     │
                                             │ idea_id (FK)     │
                                             │ event_type       │
                                             │ event_data (JSONB│
                                             │ created_at       │
                                             └──────────────────┘
```

### 2.2 Table Definitions

#### 2.2.1 `users` — Authentication & User Profiles

```sql
-- Users table: extends the ideas model with full auth support
CREATE TABLE users (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255)   NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  display_name    VARCHAR(100),
  is_admin        BOOLEAN       NOT NULL DEFAULT FALSE,
  is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  preferences     JSONB         NOT NULL DEFAULT '{}',
  -- preferences schema:
  -- {
  --   "default_style": "cinematic" | "minimal" | "vibrant" | "default",
  --   "default_aspect_ratio": "1:1" | "16:9" | "9:16",
  --   "default_model": "minimax" | "openai" | "stablediffusion",
  --   "notifications_email": true,
  --   "notifications_inapp": false
  -- }
  daily_quota     INTEGER       NOT NULL DEFAULT 10,
  daily_used      INTEGER       NOT NULL DEFAULT 0,
  quota_reset_at  TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  last_active_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique index on email (case-insensitive)
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));

-- Index for daily quota resets
CREATE INDEX idx_users_quota_reset ON users(quota_reset_at) WHERE daily_used > 0;

-- Index for admin queries
CREATE INDEX idx_users_admin ON users(is_admin) WHERE is_admin = TRUE;
```

#### 2.2.2 `ideas` — Extended from `ai-integration.md`

```sql
-- Extended ideas table: adds user_id, tags, priority for P1+ features
-- Original columns from ai-integration.md are preserved

CREATE TYPE idea_status AS ENUM ('queued', 'processing', 'completed', 'failed');

CREATE TABLE ideas (
  id                 VARCHAR(21)   PRIMARY KEY DEFAULT 'ide_' || substr(gen_random_uuid()::text, 1, 16),
  -- user_id is nullable for MVP (anonymous submissions from landing page)
  -- After auth is added, submissions are linked to users
  user_id            UUID          REFERENCES users(id) ON DELETE SET NULL,
  -- email is retained for anonymous submissions (landing page beta signup)
  email              VARCHAR(255)  NOT NULL,
  idea_text          TEXT          NOT NULL,
  status             idea_status   NOT NULL DEFAULT 'queued',
  priority_score     INTEGER       CHECK (priority_score BETWEEN 1 AND 5),
  -- generation_params replaces future iteration's JSONB field
  -- {
  --   "aspect_ratio": "1:1" | "16:9" | "9:16",
  --   "style": "cinematic" | "minimal" | "vibrant" | "default",
  --   "model": "minimax" | "openai" | "stablediffusion",
  --   "count": 1..4,
  --   "quality": "standard" | "hd"
  -- }
  generation_params  JSONB         DEFAULT '{}',
  retry_count         INTEGER       NOT NULL DEFAULT 0,
  error_message       TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  result_url          TEXT,
  estimated_wait_minutes INTEGER
);

-- Indexes for query performance
CREATE INDEX idx_ideas_email       ON ideas(email);
CREATE INDEX idx_ideas_status      ON ideas(status);
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_user_id     ON ideas(user_id) WHERE user_id IS NOT NULL;
-- Composite index for user history (most recent first)
CREATE INDEX idx_ideas_user_created ON ideas(user_id, created_at DESC) WHERE user_id IS NOT NULL;
-- Index for status + created_at (dashboard metrics)
CREATE INDEX idx_ideas_status_created ON ideas(status, created_at DESC);
-- Partial index for processing queue (pick up queued jobs efficiently)
CREATE INDEX idx_ideas_queued ON ideas(created_at ASC) WHERE status = 'queued';
```

#### 2.2.3 `assets` — Generated Visual Assets

```sql
CREATE TABLE assets (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id         VARCHAR(21)  NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  file_key        VARCHAR(255) NOT NULL,  -- S3/R2 object key
  cdn_url         TEXT         NOT NULL,
  width           INTEGER      NOT NULL CHECK (width > 0 AND width <= 8192),
  height          INTEGER      NOT NULL CHECK (height > 0 AND height <= 8192),
  format          VARCHAR(10)  NOT NULL DEFAULT 'png',  -- png | jpeg | webp
  size_bytes      BIGINT       NOT NULL CHECK (size_bytes > 0),
  -- Model that generated this asset
  model_used      VARCHAR(50)  NOT NULL,  -- minimax | openai | stablediffusion
  -- Quality score (v2 — set by quality scoring pipeline)
  quality_score   REAL         CHECK (quality_score BETWEEN 0.0 AND 1.0),
  -- Prompt that was used (snapshot at generation time)
  prompt_snapshot TEXT         NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fetching assets by idea (most recent first)
CREATE INDEX idx_assets_idea_id    ON assets(idea_id, created_at DESC);
-- Index for CDN bulk invalidation by date
CREATE INDEX idx_assets_created    ON assets(created_at DESC);
-- Index for quality analytics
CREATE INDEX idx_assets_quality    ON assets(quality_score) WHERE quality_score IS NOT NULL;
```

#### 2.2.4 `idea_iterations` — Version History for Refinement (US-02)

```sql
CREATE TABLE idea_iterations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id           UUID        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  idea_id            VARCHAR(21) NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  iteration_number   INTEGER     NOT NULL CHECK (iteration_number >= 1 AND iteration_number <= 10),
  -- Reference to the parent asset (nullable for the first iteration)
  parent_asset_id   UUID        REFERENCES assets(id) ON DELETE SET NULL,
  -- The refinement prompt (e.g., "make the sky darker")
  refinement_prompt  TEXT        NOT NULL,
  -- What model was used for this iteration
  model_used         VARCHAR(50) NOT NULL,
  -- Relationship to the parent's iteration (if any)
  parent_iteration_id UUID       REFERENCES idea_iterations(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure max 10 iterations per idea
  CONSTRAINT max_iterations CHECK (
    (SELECT COUNT(*) FROM idea_iterations WHERE idea_id = idea_iterations.idea_id) < 10
  )
);

-- Index for fetching iteration chain for an idea
CREATE INDEX idx_iterations_idea_id    ON idea_iterations(idea_id, iteration_number ASC);
-- Index for parent chain traversal
CREATE INDEX idx_iterations_parent_asset ON idea_iterations(parent_asset_id) WHERE parent_asset_id IS NOT NULL;
```

#### 2.2.5 `idea_tags` — Tagging for Organization (US-03)

```sql
CREATE TABLE idea_tags (
  idea_id   VARCHAR(21) NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag       VARCHAR(100) NOT NULL,
  created_by UUID       REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (idea_id, tag)
);

-- Index for finding all ideas with a tag
CREATE INDEX idx_tags_tag      ON idea_tags(tag);
-- Index for tag autocomplete
CREATE INDEX idx_tags_tag_prefix ON idea_tags(tag varchar_pattern_ops);
```

#### 2.2.6 `analytics_events` — Event Tracking for Dashboard (US-06)

```sql
CREATE TABLE analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  idea_id      VARCHAR(21) REFERENCES ideas(id) ON DELETE SET NULL,
  event_type   VARCHAR(50) NOT NULL,
  -- event_type values:
  -- 'idea_submitted', 'generation_started', 'generation_completed', 'generation_failed',
  -- 'asset_viewed', 'asset_downloaded', 'iteration_created', 'idea_tagged',
  -- 'user_registered', 'user_login'
  event_data   JSONB       NOT NULL DEFAULT '{}',
  -- event_data examples:
  -- { "model": "minimax", "aspect_ratio": "1:1", "iteration_count": 0 }
  -- { "source": "landing_page" | "mobile_app" }
  -- { "duration_ms": 3500, "cached": false }
  session_id   VARCHAR(100),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- High-cardinality indexes: use BRIN for time-series data
CREATE INDEX idx_events_created_at    ON analytics_events USING BRIN(created_at);
CREATE INDEX idx_events_user_id        ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_idea_id        ON analytics_events(idea_id) WHERE idea_id IS NOT NULL;
CREATE INDEX idx_events_type           ON analytics_events(event_type);
-- Composite for user journey analysis
CREATE INDEX idx_events_user_created  ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Partitioning strategy (PostgreSQL 14+):
-- PARTITION BY RANGE (created_at)
-- Partitions: analytics_events_YYYYMM
-- Auto-create partitions via pg_partman or cron job
-- Retain 90 days on hot storage, archive older to cold storage
```

### 2.3 Index Strategy Summary

| Table | Index | Type | Purpose |
|---|---|---|---|
| `ideas` | `idx_ideas_email` | B-tree | Find submissions by email (beta signup) |
| `ideas` | `idx_ideas_status` | B-tree | Filter by status (processing queue) |
| `ideas` | `idx_ideas_created_at DESC` | B-tree | Chronological listing |
| `ideas` | `idx_ideas_queued` | Partial | Fast queue pickup |
| `ideas` | `idx_ideas_user_created` | Composite | Authenticated user history |
| `ideas` | `idx_ideas_status_created` | Composite | Dashboard metrics |
| `users` | `idx_users_email_lower` | Unique | Case-insensitive email login |
| `assets` | `idx_assets_idea_id` | Composite | Fetch all assets for an idea |
| `assets` | `idx_assets_quality` | Partial | Quality analytics queries |
| `analytics_events` | `idx_events_created_at` | BRIN | Time-series analytics (low overhead) |
| `analytics_events` | `idx_events_type` | B-tree | Event type filtering |
| `idea_tags` | `idx_tags_tag_prefix` | B-tree (pattern) | Tag autocomplete |
| `idea_iterations` | `idx_iterations_idea_id` | Composite | Version history chain |

### 2.4 Database Migrations

```bash
# Use Drizzle ORM for type-safe migrations (preferred) or Prisma
# Recommended: Drizzle Kit for schema management

npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit push   # for development only

# Migration files go in: src/db/migrations/
# Each migration is versioned, timestamped, and idempotent
```

---

## 3. AI Model Integration

### 3.1 Model Routing Strategy

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MODEL ROUTING DECISION TREE                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Incoming Prompt + User Preferences                                   │
│          │                                                           │
│          ▼                                                           │
│  ┌───────────────────┐                                               │
│  │ Check user pref   │ ◄── preferences.model_override               │
│  │ (if authenticated)│     (admin setting or user choice)            │
│  └────────┬──────────┘                                               │
│           │                                                           │
│           ├─► model_override == "minimax"  ────────────────────────► PRIMARY
│           │                                                                │
│           ├─► model_override == "openai"   ────────────────────────► FALLBACK-1
│           │                                                                │
│           ├─► model_override == "stablediffusion" ────────────────► FALLBACK-2
│           │                                                                │
│           └─► model_override == null (default)                           │
│                    │                                                      │
│                    ▼                                                      │
│           ┌───────────────────┐                                           │
│           │ PRIMARY PATH:    │                                           │
│           │ MiniMax Image-01 │                                           │
│           │                   │                                           │
│           │ Try: immediate    │                                           │
│           │ Timeout: 120s     │                                           │
│           │                   │                                           │
│           │ On success ──────┼─────────────────────────────► Done       │
│           │ On failure (3x) ─┼────────────────────────────────► FALLBACK-1│
│           │ On timeout ──────┼────────────────────────────────► FALLBACK-1│
│           │ On 429 (rate) ───┼──► Exponential backoff (30s, 60s, 120s)  │
│           │ On 5xx ──────────┼──► Retry 3x then FALLBACK-1              │
│           └───────────────────┘                                           │
│                                                                       │
│           ┌───────────────────┐                                           │
│           │ FALLBACK-1:      │                                           │
│           │ OpenAI DALL-E 3  │                                           │
│           │                   │                                           │
│           │ Try: immediate    │                                           │
│           │ Timeout: 90s      │                                           │
│           │                   │                                           │
│           │ On success ───────┼─────────────────────────────► Done       │
│           │ On failure ──────┼────────────────────────────────► FALLBACK-2│
│           └───────────────────┘                                           │
│                                                                       │
│           ┌───────────────────┐                                          │
│           │ FALLBACK-2:       │                                          │
│           │ Stable Diffusion │                                          │
│           │ (Replicate API    │                                          │
│           │  or Modal.com)    │                                          │
│           │                   │                                          │
│           │ Try: immediate    │                                          │
│           │ Timeout: 150s      │                                          │
│           │                   │                                          │
│           │ On success ───────┼─────────────────────────────► Done       │
│           │ On failure ───────┼────────────────────────────────► MARK_FAILED│
│           └───────────────────┘                                          │
│                                                                       │
│           ┌───────────────────┐                                          │
│           │ MARK_FAILED:      │                                          │
│           │ • Set status='failed'                                       │
│           │ • Store error_message                                       │
│           │ • Enqueue failure email                                      │
│           │ • Move to DLQ                                                 │
│           └───────────────────┘                                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 API Integration Points

#### 3.2.1 Primary: MiniMax API

```typescript
// File: src/ai/providers/minimax.ts

interface MiniMaxGenerateRequest {
  model: 'MiniMax-Image-01';
  prompt: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16';
  num_images?: number;  // 1-4
}

interface MiniMaxGenerateResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface MiniMaxJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  images?: Array<{
    url: string;       // Provider CDN URL (temporary)
    width: number;
    height: number;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

// Polling implementation
async function pollMiniMaxJob(jobId: string, maxWaitMs = 120_000): Promise<MiniMaxJobResponse> {
  const start = Date.now();
  const interval = 5_000; // Poll every 5s

  while (Date.now() - start < maxWaitMs) {
    const response = await fetch(`https://api.minimax.chat/v1/images/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new AIProviderError('minimax', response.status, await response.text());
    }

    const data: MiniMaxJobResponse = await response.json();

    if (data.status === 'completed') return data;
    if (data.status === 'failed') {
      throw new AIProviderError('minimax', -1, data.error?.message ?? 'Job failed');
    }

    // status === 'pending' or 'processing' — wait and retry
    await sleep(interval);
  }

  throw new AIProviderError('minimax', -1, 'Polling timeout exceeded');
}
```

#### 3.2.2 Fallback: OpenAI DALL-E 3

```typescript
// File: src/ai/providers/openai.ts

interface DalleGenerateOptions {
  prompt: string;
  model?: 'dall-e-3' | 'dall-e-2';
  n?: number;  // 1-4 (DALL-E 3 only supports 1)
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  response_format?: 'url' | 'b64_json';
}

// Note: DALL-E 3 returns base64 directly (no polling needed)
// URL-based images expire after 1 hour — download and re-upload to CDN immediately
async function generateWithDalle(options: DalleGenerateOptions): Promise<Buffer> {
  const response = await openai.images.generate({
    model: options.model ?? 'dall-e-3',
    prompt: options.prompt,
    n: 1,  // DALL-E 3: n=1 only
    size: options.size ?? '1024x1024',
    quality: options.quality ?? 'standard',
    response_format: 'b64_json',  // Prefer base64 to avoid URL expiry
  });

  if (!response.data[0]?.b64_json) {
    throw new AIProviderError('openai', -1, 'No image data returned');
  }

  return Buffer.from(response.data[0].b64_json, 'base64');
}
```

#### 3.2.3 Fallback: Stable Diffusion (Replicate / Modal)

```typescript
// File: src/ai/providers/stable-diffusion.ts

// Option A: Replicate API
interface ReplicateRequest {
  version: string;  // pinned model version
  input: {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
  };
}

// Option B: Modal.com (self-hosted SD)
// More cost-effective at scale, lower latency
// Deploy SDXL as a Modal function with GPU (A10G)
```

### 3.3 Prompt Enrichment Pipeline

```typescript
// File: src/ai/prompt-enricher.ts

interface EnrichmentInput {
  originalPrompt: string;
  userId?: string;        // If authenticated, load preferences
  style?: string;         // Override from request
  aspectRatio?: string;   // Override from request
  brandGuidelines?: {    // US-04: Campaign brand guidelines
    colors?: string[];
    fonts?: string[];
    logoUrl?: string;
  };
}

interface EnrichmentOutput {
  enrichedPrompt: string;
  negativePrompt?: string;
  resolvedStyle: string;
  resolvedAspectRatio: string;
  model: string;
}

async function enrichPrompt(input: EnrichmentInput): Promise<EnrichmentOutput> {
  const {
    originalPrompt,
    userId,
    style,
    aspectRatio,
    brandGuidelines,
  } = input;

  // Step 1: Load user preferences (if authenticated)
  let userPrefs = {};
  if (userId) {
    const user = await userRepo.findById(userId);
    userPrefs = user?.preferences ?? {};
  }

  // Step 2: Resolve style
  const resolvedStyle = style ?? userPrefs.default_style ?? 'default';

  // Step 3: Resolve aspect ratio
  const resolvedAspectRatio = aspectRatio ?? userPrefs.default_aspect_ratio ?? '1:1';

  // Step 4: Apply style preset (prompt injection)
  const stylePresets: Record<string, { positive: string; negative?: string }> = {
    cinematic: {
      positive: `${originalPrompt}, cinematic composition, film photography, dramatic lighting, anamorphic lens flare, shallow depth of field, professional color grading, ultra-detailed`,
      negative: 'amateur, snapshot, low quality, blurry, distorted, watermark, text overlay',
    },
    minimal: {
      positive: `${originalPrompt}, minimal design, clean lines, ample whitespace, modern typography, flat design, vector style, simplicity, elegance`,
      negative: 'cluttered, busy, noisy, chaotic, excessive detail, watermark, text overlay',
    },
    vibrant: {
      positive: `${originalPrompt}, vibrant colors, saturated palette, high contrast, dynamic composition, energetic, pop art style, bold, eye-catching`,
      negative: 'dull, muted, washed out, low saturation, watermark, text overlay',
    },
    default: {
      positive: `${originalPrompt}, high quality, detailed, professional, masterpiece`,
      negative: 'low quality, blurry, watermark, text overlay',
    },
  };

  const preset = stylePresets[resolvedStyle] ?? stylePresets.default;

  // Step 5: Apply brand guidelines (US-04)
  let enrichedPrompt = preset.positive;
  if (brandGuidelines?.colors?.length) {
    enrichedPrompt += `, color palette: ${brandGuidelines.colors.join(', ')}`;
  }
  if (brandGuidelines?.fonts?.length) {
    enrichedPrompt += `, typography inspired by: ${brandGuidelines.fonts.join(', ')}`;
  }
  if (brandGuidelines?.logoUrl) {
    enrichedPrompt += `, incorporate brand logo subtly`;
  }

  return {
    enrichedPrompt,
    negativePrompt: preset.negative,
    resolvedStyle,
    resolvedAspectRatio,
    model: userPrefs.default_model ?? 'minimax',
  };
}
```

### 3.4 Output Format Handling

```typescript
// File: src/ai/output-handler.ts

interface OutputHandler {
  downloadSource(source: ImageSource): Promise<Buffer>;
  // ImageSource: { type: 'url', url: string } | { type: 'base64', data: string }
  //
  // Note on base64 vs URL:
  // - MiniMax: URL-based (requires polling, URL expires)
  // - DALL-E 3: base64 preferred (URL expires in 1h)
  // - Stable Diffusion: varies by provider
  //
  validateDimensions(buffer: Buffer): Promise<{ width: number; height: number }>;
  uploadToCDN(buffer: Buffer, destination: string): Promise<string>;
  // Returns CDN URL
  generateSignedURL(cdnUrl: string, expiresIn?: Duration): string;
}

async function processGeneratedImage(
  source: ImageSource,
  ideaId: string,
  model: string
): Promise<{ cdnUrl: string; width: number; height: number; sizeBytes: number }> {
  // 1. Download source
  const buffer = await outputHandler.downloadSource(source);

  // 2. Validate dimensions (reject if < 1024px)
  const { width, height } = await outputHandler.validateDimensions(buffer);
  if (width < 1024 || height < 1024) {
    throw new Error(`Image too small: ${width}x${height}. Minimum 1024px required.`);
  }

  // 3. Convert to optimized format (WebP with PNG fallback)
  // Note: For MVP, preserve original format. WebP conversion is v2.

  // 4. Upload to CDN with deterministic key
  const cdnKey = `assets/${ideaId}/${ideaId}-${Date.now()}.png`;
  const cdnUrl = await outputHandler.uploadToCDN(buffer, cdnKey);

  // 5. Generate signed URL (7-day expiry)
  const signedUrl = outputHandler.generateSignedURL(cdnUrl, { days: 7 });

  return {
    cdnUrl: signedUrl,
    width,
    height,
    sizeBytes: buffer.length,
  };
}
```

---

## 4. Infrastructure Recommendations

### 4.1 Cloud Provider Comparison

| Dimension | AWS | GCP | Vercel | Railway | Render |
|---|---|---|---|---|---|
| **API Server** | ECS Fargate / Lambda | Cloud Run | Edge Functions | Container | Container |
| **Database** | RDS PostgreSQL | Cloud SQL | Vercel Postgres | PostgreSQL | PostgreSQL |
| **Queue** | SQS + Redis (ElastiCache) | Cloud Tasks + Memorystore | Upstash | Upstash | BullMQ on container |
| **CDN/Storage** | S3 + CloudFront | GCS + Cloud CDN | Vercel Blob | R2 + CDN | S3 + CDN |
| **AI Workers** | ECS on EC2 (GPU) | Vertex AI | -- | Modal.com | Modal.com |
| **Email** | SES | -- | Resend | Resend | Resend |
| **IaC** | Terraform | Terraform | Vercel (auto) | -- | -- |
| **Cost model** | Pay-per-use + reserved | Pay-per-use | Usage-based | Usage-based | Usage-based |
| **Complexity** | High | Medium-High | Low (opinionated) | Low-Medium | Low |
| **Startup speed** | Slow (days) | Medium (hours) | Fast (minutes) | Fast (minutes) | Fast (minutes) |
| **MiniMax Fit** | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ |

### 4.2 Recommended Architecture: AWS + Modal.com Hybrid

**Rationale**: The primary bottleneck for MiniMax Studio is GPU-backed AI inference. Cloud providers with managed GPU services (AWS SageMaker, GCP Vertex AI, Modal.com) are necessary. A hybrid approach gives the best cost-performance trade-off.

```
+────────────────────────────────────────────────────────────────────────────+
│  RECOMMENDED INFRASTRUCTURE — AWS (API/CDB/Queue) + Modal (AI Workers)     │
+────────────────────────────────────────────────────────────────────────────+

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  AWS REGION: ap-southeast-1 (Singapore) or us-west-2 (Oregon)             │
  │  ─────────────────────────────────────────────────────────────────────   │
  │                                                                          │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  CDN LAYER: Cloudflare (Global Edge)                               │  │
  │  │  • R2 bucket for object storage (S3-compatible, cheaper egress)   │  │
  │  │  • Cache all generated assets at edge (immutable, 1-year TTL)       │  │
  │  │  • Signed URLs for authenticated access (7-day expiry)              │  │
  │  │  • Image resizing via Cloudflare Images (on-the-fly variants)       │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                              ▲                                           │
  │                              │ signed URLs                               │
  │  ┌───────────────────────────┴──────────────────────────────────────┐  │
  │  │  API LAYER: AWS Lambda + API Gateway (REST) OR AWS ECS Fargate     │  │
  │  │  ─────────────────────────────────────────────────────────────────│  │
  │  │  • Lambda: fast scaling, pay-per-invocation (good for MVP)        │  │
  │  │  • ECS Fargate: persistent workers for BullMQ (production scale)  │  │
  │  │  • Preferred: ECS Fargate (auto-scaling, persistent queue workers)│  │
  │  │  • Use Lambda for webhook handlers, scheduled jobs                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                              │                                           │
  │                              ▼                                           │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  DATA LAYER                                                        │  │
  │  │  ┌──────────────────────┐    ┌──────────────────────────────────┐ │  │
  │  │  │  RDS PostgreSQL 16   │    │  ElastiCache Redis 7 (cluster)    │ │  │
  │  │  │  ─────────────────   │    │  ──────────────────────────────── │ │  │
  │  │  │  • Multi-AZ (prod)   │    │  • BullMQ job queue               │ │  │
  │  │  │  • Read replicas x2  │    │  • Rate limit counters            │ │  │
  │  │  │  • Automated backups │    │  • Session cache (v2)             │ │  │
  │  │  │  • pgvector (future)│    │  • Prompt cache (v2)              │ │  │
  │  │  │  ─────────────────   │    │  ──────────────────────────────── │ │  │
  │  │  │  Size: db.t3.medium  │    │  Size: cache.r6g.small (3 shards) │ │  │
  │  │  │    (MVP)            │    │                                    │ │  │
  │  │  │  → db.r7g.large     │    │                                    │ │  │
  │  │  │    (production)    │    │                                    │ │  │
  │  │  └──────────────────────┘    └──────────────────────────────────┘ │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                           │
  └───────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ BullMQ jobs (via Redis)
                                       ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │  AI WORKER LAYER: Modal.com (separate from AWS)                            │
  │  ─────────────────────────────────────────────────────────────────────────  │
  │                                                                            │
  │  Why Modal.com over ECS GPU?                                               │
  │  • GPU instances (A10G, A100) are expensive to keep running 24/7         │
  │  • Modal spins up GPU containers on-demand, bills per second             │
  │  • No cold start issues — pre-warmed containers maintained               │
  │  • Native Python support — no Docker GPU config needed                     │
  │  • Supports Stable Diffusion, ComfyUI, custom models                       │
  │                                                                            │
  │  ┌─────────────────────────────────────────────────────────────────────┐  │
  │  │  Modal App: minimax-studio-workers                                  │  │
  │  │                                                                     │  │
  │  │  @stub()  generate_image_minimax(prompt, params)                   │  │
  │  │  @stub()  generate_image_openai(prompt, params)                   │  │
  │  │  @stub()  generate_image_stablediffusion(prompt, params)           │  │
  │  │  @stub()  quality_check(image_buffer)                               │  │
  │  │                                                                     │  │
  │  │  @method() class GenerationWorker:                                   │  │
  │  │    • Receives job from BullMQ                                       │  │
  │  │    • Calls appropriate @stub() function                              │  │
  │  │    • Downloads result, uploads to R2                                │  │
  │  │    • Updates PostgreSQL via REST API call to ECS                     │  │
  │  │    • Enqueues email notification                                     │  │
  │  │                                                                     │  │
  │  │  GPU: A10G (~$1.25/hr on Modal, ~$0.50/min with auto-shutdown)     │  │
  │  │  Auto-scale: 0–10 concurrent workers based on queue depth            │  │
  │  │  Timeout: 120s hard limit                                            │  │
  │  └─────────────────────────────────────────────────────────────────────┘  │
  │                                                                            │
  └───────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Email dispatch
                                       ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │  NOTIFICATION: Resend (Primary) + SendGrid (Fallback)                    │
  │  ─────────────────────────────────────────────────────────────────────────  │
  │  • Resend: transactional emails (completion, failure, verification)     │
  │  • SendGrid: high-volume marketing emails (v2)                            │
  │  • SPF/DKIM/DMARC configured for deliverability                           │
  │  • Unsubscribe link in all emails (CAN-SPAM compliance)                   │
  └───────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Container Strategy

```yaml
# docker-compose.yml (MVP/local development)
version: '3.9'

services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/minimax
      REDIS_URL: redis://redis:6379
      MINIMAX_API_KEY: ${MINIMAX_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  worker-generate:
    build:
      context: ./api
      dockerfile: Dockerfile.worker
    command: node dist/workers/generate.js
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/minimax
      REDIS_URL: redis://redis:6379
      MINIMAX_API_KEY: ${MINIMAX_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 2  # Scale to 10 in production
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  worker-email:
    build:
      context: ./api
      dockerfile: Dockerfile.worker
    command: node dist/workers/email.js
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/minimax
      REDIS_URL: redis://redis:6379
      RESEND_API_KEY: ${RESEND_API_KEY}
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: minimax
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

### 4.4 Auto-Scaling Triggers

```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler) — production
# Or AWS ECS Service Auto Scaling — alternative

# API Server (ECS Fargate)
apiVersion: v1
kind: HorizontalPodAutoscaler
metadata:
  name: minimax-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: minimax-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    # Custom metric: queue depth
    - type: External
      external:
        metric:
          name: bullmq_waiting_count
          selector:
            matchLabels:
              queue: ideas:generate
        target:
          type: AverageValue
          averageValue: "10"  # Scale up if >10 jobs waiting

---
# AI Worker (Modal — auto-scaling built-in)
# Modal automatically scales based on:
# 1. Concurrent request limit (set to 10)
# 2. Average execution time
# 3. GPU availability in the region
#
# Configuration in modal.toml:
# [global]
# concurrency_limit = 50
#
# [@stub(gpu="A10G")]
# generation_worker:
#   timeout = 120
#   memory = 32768  # 32GB
#   retries = 2
```

**Auto-scaling thresholds:**

| Service | Metric | Scale Up | Scale Down | Cooldown |
|---|---|---|---|---|
| API Server (ECS) | CPU > 70% for 3min | +2 instances | -1 instance | 5 min |
| API Server (ECS) | Queue depth > 50 | +5 instances | — | 5 min |
| AI Worker (Modal) | Concurrent jobs > 8 | +3 workers | -1 worker | 30s |
| AI Worker (Modal) | Queue wait > 60s | +5 workers | — | 1 min |
| Database (RDS) | CPU > 80% for 5min | Scale up instance | — | 30 min |
| Redis (ElastiCache) | Memory > 75% | Scale up node | — | 15 min |

### 4.5 CDN for Asset Delivery

```
CDN Strategy (Cloudflare R2 + Cloudflare CDN):
────────────────────────────────────────────────

  Generated Image Lifecycle:

  1. AI Worker generates image
  2. Worker uploads to R2 bucket (origin):
     R2 bucket: assets.minimax.studio
     Key: assets/{idea_id}/{timestamp}.png

  3. R2 bucket is connected to Cloudflare CDN:
     • All assets cached at 50+ edge locations globally
     • Cache key: full URL (immutable — no user-specific data in URL)
     • Cache TTL: 1 year (immutable, versioned filenames)
     • Cache-Control: public, max-age=31536000, immutable

  4. Signed URLs for time-limited access:
     • Generated using Cloudflare Workers + HMAC
     • Expiry: 7 days for authenticated users
     • Expiry: 1 hour for anonymous users (from landing page)
     • Signed URL format:
       https://cdn.minimax.studio/assets/{idea_id}/{file}?
         sig={hmac}&expires={timestamp}&uid={user_id}

  5. On-the-fly image optimization:
     • Cloudflare Images handles resize/transcode:
       ?width=256,512,1024
       ?format=webp
       ?quality=85
     • Serves WebP to supported browsers, PNG fallback
     • No need to store thumbnail variants (computed at edge)

  6. Cache invalidation:
     • On asset deletion: selective purge by key pattern
     • On bulk invalidation: purge by tag or prefix
     • Cloudflare Cache Purge API (via Lambda scheduled function)
```

---

## 5. Security Architecture

### 5.1 Authentication Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ANONYMOUS USER (Landing Page Beta Signup)                                │
│  ─────────────────────────────────────────────────                         │
│                                                                             │
│  User submits: POST /api/ideas { email, idea_text }                        │
│       │                                                                     │
│       ▼                                                                     │
│  • No JWT required (public endpoint)                                        │
│  • Rate limit: 3 submissions per IP per 15 minutes                          │
│  • Email stored for notification (not linked to user account yet)          │
│  • Returns: idea_id (prefixed "ide_"), estimated_wait_minutes             │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  USER REGISTRATION (POST /api/auth/register)                              │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  • Request: { email, password, display_name? }                            │
│  • Password: hashed with Argon2id (memory: 64MB, iterations: 3)           │
│    → bcrypt is acceptable fallback (cost factor 12)                        │
│  • Email verification token sent via Resend (24h expiry)                  │
│  • After verification: JWT issued                                           │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  USER LOGIN (POST /api/auth/login)                                        │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  • Request: { email, password }                                            │
│  • Rate limit: 5 attempts per IP per 15 minutes                           │
│  • On success: JWT access token (15min) + refresh token (30d)             │
│  • Refresh token: stored in Redis with revocation list                    │
│  • On failure: generic "Invalid credentials" (no email enumeration)      │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  JWT TOKEN STRUCTURE                                                       │
│  ─────────────────                                                         │
│                                                                             │
│  Access Token (JWT, RS256 signed, 15min expiry):                          │
│  {                                                                         │
│    "sub": "user_uuid",                                                     │
│    "email": "user@example.com",                                           │
│    "role": "user" | "admin",                                              │
│    "iat": 1712659200,                                                      │
│    "exp": 1712660100                                                       │
│  }                                                                         │
│                                                                             │
│  Refresh Token (opaque, Redis-stored, 30d expiry):                        │
│  {                                                                         │
│    "token_id": "uuid",                                                    │
│    "user_id": "uuid",                                                      │
│    "created_at": "timestamp",                                             │
│    "revoked": false                                                        │
│  }                                                                         │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  TOKEN REFRESH (POST /api/auth/refresh)                                   │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  • Client sends refresh token in body or HttpOnly cookie                 │
│  • Server checks Redis: token exists + not revoked                        │
│  • Issues new access token + rotates refresh token (invalidation)        │
│  • Old refresh token added to revocation list (24h grace period)         │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  LOGOUT (POST /api/auth/logout)                                           │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  • Add refresh token to revocation list                                   │
│  • Clear auth cookie                                                       │
│  • Client discards access token                                            │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Rate Limiting Configuration

```typescript
// File: src/middleware/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'fastify';

// Upstash Redis — same Redis cluster as BullMQ
// This avoids a separate rate-limit service

const redis = Redis.fromEnv();

// Sliding window rate limiter
const ideaSubmissionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),  // 10 ideas per 15 min per IP
  analytics: true,
  prefix: 'rl:ideas:submit',
});

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),   // 5 login attempts per 15 min per IP
  analytics: true,
  prefix: 'rl:auth:login',
});

const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'),  // 100 API calls per 15 min per IP
  analytics: true,
  prefix: 'rl:api:global',
});

// Authenticated users get higher limits
const authenticatedLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '15 m'), // 1000 per 15 min per user_id
  analytics: true,
  prefix: 'rl:api:user',
  // Custom key: uses user_id from JWT, falls back to IP
  keyGenerator: (req: NextRequest) => {
    const userId = req.headers.get('x-user-id');
    return userId ?? req.ip ?? 'anonymous';
  },
});

export async function rateLimitMiddleware(
  request: NextRequest,
  type: 'ideas' | 'auth' | 'api' | 'api-authenticated'
): Promise<NextResponse | null> {
  const limiters = {
    ideas: ideaSubmissionLimiter,
    auth: authLimiter,
    api: apiLimiter,
    'api-authenticated': authenticatedLimiter,
  };

  const limiter = limiters[type];
  const identifier = request.ip ?? 'unknown';

  const { success, remaining, reset, policy } = await limiter.limit(identifier);

  const headers = {
    'X-RateLimit-Limit': policy.limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };

  if (!success) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. Please slow down.',
        retry_after_seconds: Math.ceil((reset - Date.now()) / 1000),
      },
      { status: 429, headers }
    );
  }

  return null; // Allow through
}
```

### 5.3 Input Sanitization

```typescript
// File: src/utils/sanitizer.ts

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Schema validation (primary defense — from ai-integration.md)
const SubmitIdeaSchema = z.object({
  email: z.string().email().max(255),
  idea_text: z.string().min(10).max(500).trim(),
});

const GenerateSchema = z.object({
  prompt: z.string().min(10).max(500).trim(),
  style: z.enum(['cinematic', 'minimal', 'vibrant', 'default']).optional(),
  aspect_ratio: z.enum(['1:1', '16:9', '9:16']).optional(),
  user_id: z.string().uuid().optional(),
});

const RegisterSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  display_name: z.string().min(1).max(100).trim().optional(),
});

// Sanitization helpers
function sanitizeHtml(input: string): string {
  // For any HTML content (future: rich text descriptions)
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],      // Strip all HTML
    ALLOWED_ATTR: [],       // Strip all attributes
    KEEP_CONTENT: true,
  });
}

function sanitizePrompt(input: string): string {
  // Prompts are sent to AI models — minimal sanitization
  // Remove null bytes and control characters
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, 500);  // Enforce max length
}

function sanitizeSearchQuery(input: string): string {
  // For tag search, keyword search
  return input
    .replace(/[<>\"\'\\]/g, '')  // Remove injection chars
    .trim()
    .slice(0, 100);
}

// SQL injection prevention: handled by parameterized queries (Drizzle ORM)
// XSS prevention: handled by React's default escaping + CSP headers
// CSRF: handled by SameSite=Strict cookies + CORS whitelist
```

### 5.4 CDN Access Control

```
CDN Security Configuration:
────────────────────────────

  Cloudflare Settings:
  ───────────────────
  • TLS: 1.3 only (modern security)
  • TLS mode: Full (strict)
  • HSTS: Enabled (max-age: 12 months, includeSubDomains, preload)
  • Always Use HTTPS: Enabled
  • Minimum TLS Version: 1.2

  Signed URL Generation (Workers):
  ─────────────────────────────────
  • Algorithm: HMAC-SHA256
  • Secret: stored in Cloudflare Workers Secrets (never in code)
  • URL format:
    https://cdn.minimax.studio/assets/{path}?sig={signature}&expires={timestamp}&uid={user_id}
  • signature = HMAC-SHA256(secret, `${path}:${expires}:${uid}`)
  • Worker validates: signature matches + expires > now + uid matches

  Content Security Policy:
  ───────────────────────
  • CSP header on all responses:
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';  // inline for CSS-in-JS
    img-src 'self' https://cdn.minimax.studio https://assets.minimax.studio data:;
    connect-src 'self' https://api.minimax.studio;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';

  CORS Configuration:
  ──────────────────
  • Allowed origins:
    - https://minimax.studio (production)
    - https://*.vercel.app (preview deployments)
    - http://localhost:3000 (development)
  • Allowed methods: GET, POST, OPTIONS
  • Allowed headers: Content-Type, Authorization
  • Credentials: true
  • Max-age: 86400 (1 day)

  Origin IP Allowlist (for admin operations):
  ───────────────────────────────────────────
  • AWS Console access: MFA + IP allowlist
  • Database: security group restricting port 5432 to ECS tasks only
  • Redis: ElastiCache in VPC, no public endpoint
```

---

## 6. Technology Stack Summary

### 6.1 Complete Stack Matrix

| Layer | Technology | Version | Justification |
|---|---|---|---|
| **Frontend — Web** | React 19 + Vite | 5.x / 6.x | Fast HMR, TypeScript native, optimal bundle splitting. SPA for landing page + dashboard. |
| **Frontend — Mobile** | React Native | 0.76.x | Single codebase for iOS + Android. New Architecture (Fabric + JSI) eliminates JS thread bottleneck. See `mobile-tech-stack.md` for full rationale. |
| **Frontend — Styling** | Tailwind CSS | 3.x | Utility-first, consistent design system, minimal bundle size, rapid iteration. |
| **Frontend — Animations** | Framer Motion | 11.x | Declarative animations, spring physics, shared layout animations for smooth transitions. |
| **State Management** | Zustand | 5.x | Minimal boilerplate, TypeScript-first, works across React/RN boundary. |
| **API Server** | Fastify | 4.x | 2-3x faster than Express, built-in validation (JSON Schema), excellent TypeScript support. |
| **API Server Runtime** | Node.js | 22.x LTS | Stable, wide ecosystem support, Fastify's native runtime. |
| **Language** | TypeScript | 5.x | Type safety across frontend + backend. Strict mode enabled. |
| **ORM** | Drizzle ORM | 0.30.x | Type-safe, lightweight, SQL-like queries. Preferred over Prisma for performance at scale. |
| **Database** | PostgreSQL | 16.x | Robust, reliable, excellent JSONB support, BRIN indexes for time-series. |
| **Queue** | BullMQ | 5.x | Mature, Redis-backed, job retry/backoff, dead-letter queues, concurrency control. |
| **Cache/Rate Limit** | Redis (ElastiCache) | 7.x | Shared with BullMQ. Sliding window rate limiting via Upstash SDK. |
| **AI Worker Runtime** | Modal.com | — | On-demand GPU (A10G/A100), per-second billing, no cold start. |
| **AI Provider — Primary** | MiniMax Image-01 API | — | Per `ai-integration.md` spec. Primary model for MVP. |
| **AI Provider — Fallback 1** | OpenAI DALL-E 3 | — | Fallback on MiniMax failure. Best-in-class image quality. |
| **AI Provider — Fallback 2** | Stable Diffusion XL (Modal) | — | Final fallback. Self-hosted on Modal A10G. |
| **Object Storage** | Cloudflare R2 | — | S3-compatible, no egress fees (critical for CDN), cheaper than S3. |
| **CDN** | Cloudflare | — | Global edge network, signed URLs, on-the-fly image resizing, Workers for custom logic. |
| **Email — Transactional** | Resend | 4.x | Modern API, React Email for templates, excellent deliverability. |
| **Email — Fallback** | SendGrid | — | Higher throughput for marketing emails (v2). |
| **IaC** | Terraform | 1.7.x | Full infrastructure as code, state management, multi-provider. |
| **CI/CD** | GitHub Actions | — | Integrated with GitHub, large action marketplace, free for open repos. |
| **Container** | Docker | 25.x | Consistent environments across dev/prod. Multi-stage builds for minimal images. |
| **Orchestration** | AWS ECS Fargate | — | No server management, auto-scaling, task networking. Alternative: Kubernetes (EKS) for v2. |
| **Secrets** | AWS Secrets Manager | — | Encrypted at rest, IAM-based access, rotation support. |
| **Monitoring** | Datadog / Grafana Cloud | — | APM, infrastructure metrics, log aggregation, alerting. |
| **Error Tracking** | Sentry | 8.x | Error monitoring, source maps, performance tracing. |

### 6.2 Directory Structure

```
minimax-studio/
├── apps/
│   ├── web/                        # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/         # UI components (small files, feature-organized)
│   │   │   ├── pages/              # Route pages
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── stores/            # Zustand stores
│   │   │   ├── api/               # API client functions
│   │   │   ├── utils/             # Pure utility functions
│   │   │   ├── types/             # Shared TypeScript types
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── mobile/                    # React Native app
│       ├── src/
│       │   ├── screens/           # Screen components
│       │   ├── components/        # Shared components
│       │   ├── hooks/             # RN-specific hooks
│       │   ├── services/          # API + native service integration
│       │   ├── store/             # Zustand state
│       │   └── utils/
│       ├── ios/
│       ├── android/
│       └── app.json
│
├── packages/
│   └── shared/                     # Shared types, validation schemas, utilities
│       ├── src/
│       │   ├── types/             # Zod schemas, TypeScript interfaces
│       │   ├── validation/         # Input validation schemas
│       │   └── constants/         # Shared constants
│       └── package.json
│
├── services/
│   └── api/                        # Fastify API server
│       ├── src/
│       │   ├── app.ts             # Fastify app bootstrap
│       │   ├── server.ts          # Server entry point
│       │   ├── routes/            # Route definitions (OpenAPI-style)
│       │   │   ├── ideas.ts
│       │   │   ├── auth.ts
│       │   │   ├── generate.ts
│       │   │   ├── dashboard.ts
│       │   │   └── health.ts
│       │   ├── controllers/      # Request handlers
│       │   ├── services/         # Business logic
│       │   │   ├── ideas.service.ts
│       │   │   ├── generate.service.ts
│       │   │   ├── auth.service.ts
│       │   │   └── analytics.service.ts
│       │   ├── repositories/     # Data access (Drizzle)
│       │   │   ├── idea.repository.ts
│       │   │   ├── user.repository.ts
│       │   │   ├── asset.repository.ts
│       │   │   └── event.repository.ts
│       │   ├── workers/          # BullMQ workers (separate processes)
│       │   │   ├── generate.worker.ts
│       │   │   └── email.worker.ts
│       │   ├── ai/               # AI integration layer
│       │   │   ├── router.ts     # Model routing logic
│       │   │   ├── providers/
│       │   │   │   ├── minimax.ts
│       │   │   │   ├── openai.ts
│       │   │   │   └── stable-diffusion.ts
│       │   │   ├── prompt-enricher.ts
│       │   │   └── output-handler.ts
│       │   ├── middleware/       # Fastify middleware
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── validation.ts
│       │   ├── db/
│       │   │   ├── schema.ts     # Drizzle schema definitions
│       │   │   ├── client.ts     # DB client
│       │   │   └── migrations/   # SQL migration files
│       │   ├── queue/
│       │   │   ├── client.ts     # BullMQ setup
│       │   │   └── jobs.ts       # Job definitions
│       │   └── utils/
│       │       ├── errors.ts
│       │       └── logger.ts
│       ├── Dockerfile
│       ├── Dockerfile.worker
│       ├── docker-compose.yml
│       └── package.json
│
├── infrastructure/                  # Terraform IaC
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── redis/
│   │   ├── s3/
│   │   └── iam/
│   └── terraform.tfstate
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, test, type-check
│       ├── deploy-api.yml          # Deploy to ECS
│       └── deploy-web.yml          # Deploy to Vercel
│
├── package.json                     # Workspace root
├── turbo.json                      # Turborepo config
├── tsconfig.json                   # Base TypeScript config
├── tailwind.config.ts
├── .env.example
└── README.md
```

### 6.3 Cost Estimation (MVP to v1)

```
COST ESTIMATES — Monthly (Based on MVP Scale: 1,000 users, 5,000 generations/month)
───────────────────────────────────────────────────────────────────────────────────────

  AWS (API + Database + Storage):
  ───────────────────────────────
  ECS Fargate (2 tasks, 1 vCPU, 2GB each):          $30/mo
  RDS PostgreSQL (db.t3.medium, Multi-AZ):           $120/mo
  ElastiCache (cache.r6g.small, 1 node):             $35/mo
  S3 / R2 Storage (10GB generated images):            $1/mo
  Cloudflare CDN (bandwidth for 5,000 images):        $5/mo
  Cloudflare R2 API calls:                            $1/mo
  RDS Storage (100GB):                               $23/mo
  Data transfer (estimated 50GB):                    $5/mo
  ────────────────────────────────────────────────
  AWS Subtotal:                                      $220/mo

  Modal.com (AI Workers):
  ──────────────────────
  MiniMax API calls (5,000 x $0.02/avg):             $100/mo  # Provider cost
  OpenAI DALL-E 3 fallback (est. 10% = 500):         $75/mo  # ~500 failures x $0.12
  Modal GPU compute (A10G, ~1hr/month active):         $5/mo  # ~1min per job avg
  Modal API calls (5,000):                            $5/mo
  ────────────────────────────────────────────────
  Modal Subtotal:                                    $185/mo

  Third-Party Services:
  ────────────────────
  Resend (5,000 emails):                             $20/mo
  Sentry (error tracking):                          $20/mo
  Datadog APM (optional, MVP scale):                 $0/mo   # Free tier
  ────────────────────────────────────────────────
  Third-Party Subtotal:                              $40/mo

  TOTAL MVP MONTHLY:                                 ~$445/mo
  Per-user cost at 1,000 users:                     ~$0.45/user/month
  Per-generation cost at 5,000 generations:         ~$0.089/generation

  ─────────────────────────────────────────────────────────────────────────────────
  AT SCALE: 50,000 users, 100,000 generations/month
  ─────────────────────────────────────────────────────────────────────────────────
  ECS Fargate (10 tasks):                           $150/mo
  RDS PostgreSQL (db.r7g.large, Multi-AZ):            $400/mo
  ElastiCache (3 shards):                           $105/mo
  Storage (500GB):                                 $115/mo
  Cloudflare CDN:                                    $50/mo
  AI Provider costs (est.):                       $2,000/mo  # Linear-ish scaling
  Modal GPU:                                        $50/mo
  Email + Sentry:                                    $50/mo
  ─────────────────────────────────────────────────
  TOTAL v1 MONTHLY:                                ~$2,920/mo
  Per-user cost at 50,000 users:                   ~$0.06/user/month
  Per-generation cost at 100,000 generations:      ~$0.029/generation

  Notes:
  • GPU inference is the dominant cost driver. Optimize via prompt caching and
    result caching to reduce API calls.
  • R2 egress is free (major advantage over S3 at scale).
  • Consider reserved instances for RDS once usage is stable.
  • Modal GPU billing is per-second with auto-shutdown — very efficient for
    variable workloads.
```

---

## Appendix A: Implementation Phasing

| Phase | Scope | Timeline | Deliverables |
|---|---|---|---|
| **Phase 0 — Scaffolding** | Project setup, IaC, CI/CD pipeline, Docker compose | Week 1 | Repo, Docker, Terraform skeleton, GitHub Actions CI |
| **Phase 1 — Core MVP** | Landing page + API + Queue + MiniMax integration + Email | Weeks 2-4 | Full end-to-end: idea submission -> email with result |
| **Phase 2 — Mobile MVP** | React Native app, camera capture, result display | Weeks 2-6 | Mobile app on TestFlight/Play Store beta |
| **Phase 3 — Auth + Dashboard** | User accounts, JWT, analytics events, dashboard | Weeks 5-7 | Login, history, metrics dashboard |
| **Phase 4 — Polish + Fallbacks** | DALL-E fallback, quality scoring, CDN signing | Weeks 7-8 | Resilient pipeline, production-ready CDN |
| **Phase 5 — Iteration (US-02)** | Refinement pipeline, version history, comparison UI | Weeks 9-12 | Multi-iteration visual refinement |
| **Phase 6 — Campaign (US-04)** | Brand guidelines, campaign boards, multi-format export | Weeks 11-14 | Marketing workflow, ZIP export |
| **Phase 7 — Launch** | Performance optimization, monitoring, alerting, incident runbooks | Weeks 13-16 | Public launch, App Store listing |

---

## Appendix B: OpenAPI Routes (Complete)

```yaml
# See ai-integration.md for existing endpoints.
# Additional endpoints added by this architecture:

paths:
  /api/auth/register:
    post:
      summary: Register new user
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: User created, verification email sent
        '400':
          description: Validation error or email already exists

  /api/auth/login:
    post:
      summary: Login and receive JWT tokens
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: JWT tokens issued
          headers:
            Set-Cookie:
              schema:
                type: string
                example: refresh_token=xxx; HttpOnly; SameSite=Strict; Secure
        '401':
          description: Invalid credentials

  /api/auth/refresh:
    post:
      summary: Refresh access token
      tags: [Auth]
      responses:
        '200':
          description: New access token issued
        '401':
          description: Refresh token expired or revoked

  /api/generate:
    post:
      summary: Submit a generation request (authenticated)
      tags: [Generate]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateRequest'
      responses:
        '201':
          description: Generation job queued
        '401':
          description: Unauthorized
        '429':
          description: Daily quota exceeded

  /api/generate/{id}/status:
    get:
      summary: Get generation status
      tags: [Generate]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Generation status and result
        '404':
          description: Not found

  /api/dashboard/metrics:
    get:
      summary: Get analytics metrics
      tags: [Dashboard]
      security:
        - bearerAuth: []
      parameters:
        - name: range
          in: query
          schema:
            type: string
            enum: [7d, 30d, 90d]
          description: Time range for metrics
      responses:
        '200':
          description: Aggregated metrics
        '401':
          description: Unauthorized
        '403':
          description: Admin only
```

---

*Document Version: 1.0 — Content Sprint 1, Task 1*
*Author: CTO*
*Next Steps: Review with P8, distribute to engineering leads for implementation planning*
