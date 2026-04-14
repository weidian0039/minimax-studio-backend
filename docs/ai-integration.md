# AI Integration Documentation — MiniMax Studio

**Status**: Active | **Version**: 2.0 | **Date**: 2026-04-09

**Scope**: This document defines the API contract between the MiniMax Studio landing page and the future AI backend pipeline. It is the authoritative reference for all backend development decisions.

> **MVP** items ship with the initial backend. **Future Iteration** items are planned for post-launch phases.

---

## 1. Core API Endpoints

### 1.1 Submit Idea

Submits a user's idea for AI-powered image generation. This is the primary integration point between the landing page form and the backend.

**Endpoint**

```
POST /api/ideas
```

**Request Schema**

```json
{
  "email": "string",
  "idea_text": "string"
}
```

| Field       | Type   | Required | Constraints                              |
|-------------|--------|----------|------------------------------------------|
| `email`     | string | Yes      | Valid email format (RFC 5322), max 255 chars |
| `idea_text` | string | Yes      | Min 10 chars, max 500 chars              |

**Request Example**

```json
{
  "email": "user@example.com",
  "idea_text": "A futuristic cityscape at sunset with flying vehicles and neon billboards"
}
```

**Response — 201 Created**

```json
{
  "status": "queued",
  "idea_id": "ide_01HX9K3M4N5P6Q7R",
  "estimated_wait_minutes": 5
}
```

| Field                   | Type    | Description                                      |
|-------------------------|---------|--------------------------------------------------|
| `status`                | string  | Always `"queued"` on successful submission      |
| `idea_id`               | string  | Unique identifier, prefixed `ide_`              |
| `estimated_wait_minutes`| integer | Rough ETA; frontend displays this to user        |

**Response — 400 Bad Request**

```json
{
  "error": "validation_error",
  "message": "Request validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "idea_text", "message": "Must be between 10 and 500 characters" }
  ]
}
```

**Response — 503 Service Unavailable**

```json
{
  "error": "service_unavailable",
  "message": "Queue system temporarily unavailable. Please retry later.",
  "retry_after_seconds": 30
}
```

> **MVP** — Full validation, persistence, and queuing.

---

### 1.2 Get Idea Status

Retrieves the current processing status and result of a submitted idea. The frontend uses this for optional polling; it is not required for MVP but is listed here for API completeness.

**Endpoint**

```
GET /api/ideas/{idea_id}
```

**Path Parameters**

| Parameter | Type   | Description            |
|-----------|--------|------------------------|
| `idea_id` | string | The ID returned from `POST /api/ideas` |

**Response — 200 OK**

```json
{
  "idea_id": "ide_01HX9K3M4N5P6Q7R",
  "email": "user@example.com",
  "idea_text": "A futuristic cityscape at sunset with flying vehicles",
  "status": "completed",
  "created_at": "2026-04-09T10:00:00Z",
  "processed_at": "2026-04-09T10:03:42Z",
  "result_url": "https://cdn.minimax.studio/results/ide_01HX9K3M4N5P6Q7R.png"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | One of: `queued`, `processing`, `completed`, `failed` |
| `result_url` | string | Present only when `status` is `completed` |
| `processed_at` | string | ISO 8601 timestamp; present when `status` is `completed` or `failed` |

**Response — 404 Not Found**

```json
{
  "error": "not_found",
  "message": "Idea not found"
}
```

> **Future Iteration** — Not required for MVP launch. Implement when frontend needs live status polling or user-facing status pages.

---

## 2. Queue System Design

### Architecture Overview

```
Landing Page (index.html)
  │
  │  POST /api/ideas
  ▼
API Server (Node.js / Express or Fastify)
  │
  │  1. Validate request
  │  2. Persist to PostgreSQL (status: queued)
  │  3. Enqueue job
  ▼
Job Queue (BullMQ / Redis)
  │
  │  4. Worker picks up job
  ▼
AI Worker
  │
  │  5. Call AI generation pipeline
  │  6. Upload result to CDN
  │  7. Update DB (status: completed / failed)
  │  8. Send email notification
  ▼
Email Service (Resend / SendGrid / AWS SES)
```

### Job Lifecycle

| Stage | Status       | Description                                                      |
|-------|--------------|------------------------------------------------------------------|
| 1     | `queued`     | Idea persisted; waiting for worker pickup                       |
| 2     | `processing` | Worker has claimed the job and is executing the pipeline         |
| 3     | `completed`  | Generation succeeded; `result_url` populated; email sent        |
| 4     | `failed`     | All retries exhausted; failure email sent                        |

### Queue Configuration

- **Queue provider**: BullMQ backed by Redis
- **Concurrency**: 1 job per worker instance (AI generation is CPU/GPU-bound)
- **Job timeout**: 120 seconds per job
- **Dead letter queue**: Failed jobs after `maxRetries` are moved to DLQ for manual inspection
- **Backoff strategy**: Exponential with jitter (see Section 5)

### Email Notification Template

**On completion**

```
To: {email}
Subject: Your idea is ready — MiniMax Studio

Your visual has been generated!

View your result: {result_url}

Your idea: "{idea_text}"

Download, share, and enjoy!
```

**On failure**

```
To: {email}
Subject: Generation failed — MiniMax Studio

We're sorry, but your visual could not be generated at this time.
Our team has been notified and will look into it.

Your idea: "{idea_text}"

Please try submitting again at minimax.studio
```

> **MVP**: Sync email dispatch on job completion. **Future Iteration**: Email queuing with retry (3 attempts, 1h apart) to handle transient SMTP failures.

---

## 3. Data Model

### Table: `ideas`

| Column         | Type          | Constraints                                           |
|----------------|---------------|-------------------------------------------------------|
| `id`           | `VARCHAR(21)` | Primary key. Format: `ide_` + 16-char nanoid          |
| `email`        | `VARCHAR(255)`| NOT NULL, indexed                                      |
| `idea_text`    | `TEXT`        | NOT NULL                                              |
| `status`       | `idea_status` | NOT NULL, DEFAULT `'queued'`                          |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                             |
| `processed_at` | `TIMESTAMPTZ` | NULLABLE — set when processing finishes               |
| `result_url`   | `TEXT`        | NULLABLE — CDN URL on success                        |
| `retry_count`  | `INTEGER`     | NOT NULL, DEFAULT 0                                   |
| `error_message`| `TEXT`        | NULLABLE — last error detail on failure              |

**Status Enum: `idea_status`**

```sql
CREATE TYPE idea_status AS ENUM ('queued', 'processing', 'completed', 'failed');
```

**DDL**

```sql
CREATE TYPE idea_status AS ENUM ('queued', 'processing', 'completed', 'failed');

CREATE TABLE ideas (
  id            VARCHAR(21)    PRIMARY KEY DEFAULT 'ide_' || nanoid(16),
  email         VARCHAR(255)  NOT NULL,
  idea_text     TEXT          NOT NULL,
  status        idea_status   NOT NULL DEFAULT 'queued',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  result_url    TEXT,
  retry_count   INTEGER       NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_ideas_email     ON ideas(email);
CREATE INDEX idx_ideas_status    ON ideas(status);
CREATE INDEX idx_ideas_created  ON ideas(created_at DESC);
```

> **MVP**: Core columns only. `retry_count` and `error_message` added for debugging. **Future Iteration**: Add `user_id` (after auth), `generation_params` (JSONB for aspect ratio, style), `quality_score` (float), `parent_idea_id` (for iterative refinement lineage).

---

## 4. AI Pipeline

### Stage 1 — Text-to-Image Generation

**MVP**

The worker calls the MiniMax image generation API using `idea_text` as the prompt.

```
POST https://api.minimax.chat/v1/images/generate
Headers: Authorization: Bearer {MINIMAX_API_KEY}
Body: { "model": "MiniMax-Image-01", "prompt": idea_text }
```

- Use async job mode: submit, get `job_id`, poll `GET /jobs/{job_id}` every 5 seconds until `status: completed`
- Timeout: 120 seconds total
- On API error: follow retry strategy in Section 5
- Store returned image URL for Stage 3

**Future Iteration**

- Support aspect ratio parameter (`1:1`, `16:9`, `9:16`) via `generation_params` JSONB field
- Switch from polling to webhook callback for lower latency
- Support style preset parameter (`cinematic`, `minimal`, `vibrant`, etc.)

---

### Stage 2 — Quality Scoring

**Future Iteration**

After image generation, run a lightweight quality assessment:

1. Fetch generated image dimensions — reject if below 1024x1024
2. Run CLIP-based coherence scoring — reject if score < 0.7
3. If score too low, trigger re-generation (up to 2 retries within Stage 2)
4. Store `quality_score` (0.0–1.0) in `generation_params`

---

### Stage 3 — CDN Upload & Result Storage

**MVP**

```
1. Download image from MiniMax API output URL
2. Upload to CDN (Cloudflare R2 / AWS S3 + CloudFront)
3. Generate signed URL with 7-day expiry
4. Store CDN URL in ideas.result_url
5. Delete source image from AI provider storage (cost optimization)
```

**Future Iteration**

- Generate thumbnails at 256px, 512px, 1024px variants
- Store as WebP with PNG fallback
- CDN URL replaced with signed URL refreshed on access

---

## 5. Error Handling

### HTTP Error Responses

| Scenario                    | HTTP Status | Error Code          | Behavior                                              |
|-----------------------------|-------------|---------------------|-------------------------------------------------------|
| Missing required field      | 400         | `validation_error`  | List all missing fields in `details` array           |
| Invalid email format        | 400         | `validation_error`  | Field-level message                                   |
| `idea_text` length violation| 400         | `validation_error`  | Field-level message with min/max                     |
| Idea not found              | 404         | `not_found`         | Return 404 with message                               |
| Database write failure       | 500         | `internal_error`    | Log full error, alert ops; return sanitized message  |
| Queue system unavailable    | 503         | `service_unavailable`| Include `retry_after_seconds` in response            |

### Retry Strategy for AI Worker

AI generation failures use **exponential backoff with jitter**. This applies to network timeouts, 5xx responses from the AI provider, and CDN upload failures.

```
Attempt 1: immediate
Attempt 2: wait  10 seconds  (± 0–2s jitter)
Attempt 3: wait  30 seconds  (± 0–5s jitter)
Attempt 4: wait  60 seconds  (± 0–10s jitter) → move to DLQ, set status = failed
```

| Attempt | Base Delay | Jitter Range | Max Delay |
|---------|-----------|---------------|-----------|
| 1       | 0s        | —             | 0s        |
| 2       | 10s       | ±2s           | 12s       |
| 3       | 30s       | ±5s           | 35s       |
| 4       | 60s       | ±10s          | 70s       |

Jitter prevents thundering-herd when a shared downstream dependency recovers.

**Implementation note**: Use BullMQ's built-in backoff with type `exponential` and `jitter: true`. Set `attempts: 4` and `backoff: { type: 'exponential', delay: 10000 }`.

### Email Failure Handling

| Scenario                        | Behavior                                                       |
|---------------------------------|----------------------------------------------------------------|
| SMTP transient failure (4xx)   | Retry 3x with 10min intervals; log final failure              |
| SMTP permanent failure (5xx)   | Log error; do NOT mark idea as failed (generation succeeded)  |
| Invalid recipient email        | Log and skip; generation result preserved in DB              |

> **MVP**: AI worker retry strategy. **Future Iteration**: Email delivery retry queue.

---

## 6. OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: MiniMax Studio — Ideas API
  version: 2.0.0
  description: |
    Backend API for the MiniMax Studio AI image generation pipeline.
    Handles idea submission, queue management, and result delivery.

servers:
  - url: https://api.minimax.studio
    description: Production

paths:
  /api/ideas:
    post:
      summary: Submit an idea for AI image generation
      tags: [Ideas]
      operationId: submitIdea
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmitIdeaRequest'
            example:
              email: "user@example.com"
              idea_text: "A futuristic cityscape at sunset with flying vehicles"
      responses:
        '201':
          description: Idea queued successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SubmitIdeaResponse'
              example:
                status: "queued"
                idea_id: "ide_01HX9K3M4N5P6Q7R"
                estimated_wait_minutes: 5
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationError'
              example:
                error: "validation_error"
                message: "Request validation failed"
                details:
                  - field: "email"
                    message: "Invalid email format"
                  - field: "idea_text"
                    message: "Must be between 10 and 500 characters"
        '503':
          description: Queue system unavailable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ServiceUnavailable'
              example:
                error: "service_unavailable"
                message: "Queue system temporarily unavailable. Please retry later."
                retry_after_seconds: 30

  /api/ideas/{idea_id}:
    get:
      summary: Get idea status and result
      tags: [Ideas]
      operationId: getIdea
      parameters:
        - name: idea_id
          in: path
          required: true
          schema:
            type: string
          example: "ide_01HX9K3M4N5P6Q7R"
      responses:
        '200':
          description: Idea found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Idea'
              example:
                idea_id: "ide_01HX9K3M4N5P6Q7R"
                email: "user@example.com"
                idea_text: "A futuristic cityscape at sunset with flying vehicles"
                status: "completed"
                created_at: "2026-04-09T10:00:00Z"
                processed_at: "2026-04-09T10:03:42Z"
                result_url: "https://cdn.minimax.studio/results/ide_01HX9K3M4N5P6Q7R.png"
        '404':
          description: Idea not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotFoundError'
              example:
                error: "not_found"
                message: "Idea not found"

components:
  schemas:
    SubmitIdeaRequest:
      type: object
      required: [email, idea_text]
      properties:
        email:
          type: string
          format: email
          maxLength: 255
          description: Valid email address for result notification
          example: "user@example.com"
        idea_text:
          type: string
          minLength: 10
          maxLength: 500
          description: The creative idea to generate from
          example: "A futuristic cityscape at sunset with flying vehicles"

    SubmitIdeaResponse:
      type: object
      properties:
        status:
          type: string
          enum: [queued]
          example: "queued"
        idea_id:
          type: string
          example: "ide_01HX9K3M4N5P6Q7R"
        estimated_wait_minutes:
          type: integer
          example: 5

    Idea:
      type: object
      properties:
        idea_id:
          type: string
          example: "ide_01HX9K3M4N5P6Q7R"
        email:
          type: string
          format: email
          example: "user@example.com"
        idea_text:
          type: string
          example: "A futuristic cityscape at sunset"
        status:
          type: string
          enum: [queued, processing, completed, failed]
          example: "completed"
        created_at:
          type: string
          format: date-time
          example: "2026-04-09T10:00:00Z"
        processed_at:
          type: string
          format: date-time
          nullable: true
          example: "2026-04-09T10:03:42Z"
        result_url:
          type: string
          format: uri
          nullable: true
          example: "https://cdn.minimax.studio/results/ide_01HX9K3M4N5P6Q7R.png"

    ValidationError:
      type: object
      properties:
        error:
          type: string
          example: "validation_error"
        message:
          type: string
          example: "Request validation failed"
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
                example: "idea_text"
              message:
                type: string
                example: "Must be between 10 and 500 characters"

    ServiceUnavailable:
      type: object
      properties:
        error:
          type: string
          example: "service_unavailable"
        message:
          type: string
          example: "Queue system temporarily unavailable. Please retry later."
        retry_after_seconds:
          type: integer
          example: 30

    NotFoundError:
      type: object
      properties:
        error:
          type: string
          example: "not_found"
        message:
          type: string
          example: "Idea not found"

  tags:
    - name: Ideas
      description: Idea submission and status endpoints
```

---

## 7. Future Iteration Backlog

| Priority | Item                                              | Description                                                    |
|----------|---------------------------------------------------|----------------------------------------------------------------|
| High     | `GET /api/ideas/:id`                              | Live status polling for user-facing status page                |
| High     | Webhook callback from AI provider                 | Replace polling with push notifications for lower latency      |
| Medium   | Quality scoring pipeline stage                    | CLIP-based assessment with auto-retry on low scores            |
| Medium   | `generation_params` field                        | Aspect ratio, style preset, image count                        |
| Medium   | Auth layer: JWT + user accounts                   | Track submissions per user; enable history dashboard           |
| Low      | Multi-format output (WebP, PNG, thumbnails)      | Variants at 256/512/1024px                                     |
| Low      | Rate limiting per email                           | Prevent abuse; max 10 submissions per email per day            |
| Low      | Iterative refinement lineage (`parent_idea_id`)  | Support multi-round prompt refinement (Story 6)                |
| Low      | Email delivery retry queue                        | 3-retry with 1h intervals for transient SMTP failures          |

---

*Document Version: 2.0 — Content Sprint 1, Task 3.2*
