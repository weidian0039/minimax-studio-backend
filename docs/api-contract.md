# MiniMax Studio — Phase 3 API Contract

**Status**: Draft | **Version**: 1.0 | **Date**: 2026-04-13
**Phase**: Phase 3 Frontend Public Beta | **Base URL**: `http://localhost:3001/api`

---

## Authentication

All authenticated endpoints require a valid JWT token passed via:
- **Production**: `httpOnly` cookie `auth_token`
- **Development/Mock**: `localStorage` key `mock_auth_token`

---

## Endpoints

### 1. POST /api/auth/register

Register a new user account.

**Auth**: None (public)

**Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)"
}
```

**Response (201 Created)**:
```json
{
  "user": {
    "id": "usr_xxxxxxxxxxxx",
    "email": "user@example.com",
    "created_at": "2026-04-13T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 Bad Request`: `{ "error": "validation_error", "message": "...", "details": [...] }`
- `409 Conflict`: `{ "error": "duplicate_email", "message": "An account with this email already exists" }`

---

### 2. POST /api/auth/login

Authenticate an existing user.

**Auth**: None (public)

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": "usr_xxxxxxxxxxxx",
    "email": "user@example.com",
    "created_at": "2026-04-13T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 Bad Request`: `{ "error": "validation_error", "message": "..." }`
- `401 Unauthorized`: `{ "error": "invalid_credentials", "message": "Email or password is incorrect" }`

**Notes**: On success, server sets `auth_token` as httpOnly cookie (SameSite=Strict, Secure in production).

---

### 3. POST /api/auth/logout

Log out the current user.

**Auth**: Required

**Response (200 OK)**:
```json
{
  "success": true
}
```

**Notes**: Server clears the `auth_token` cookie.

---

### 4. GET /api/auth/me

Get the currently authenticated user.

**Auth**: Required

**Response (200 OK)**:
```json
{
  "user": {
    "id": "usr_xxxxxxxxxxxx",
    "email": "user@example.com",
    "created_at": "2026-04-13T10:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: `{ "error": "unauthorized", "message": "Authentication required" }`

---

### 5. GET /api/ideas

List all ideas for the authenticated user.

**Auth**: Required

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Response (200 OK)**:
```json
{
  "ideas": [
    {
      "id": "ide_xxxxxxxxxxxx",
      "email": "user@example.com",
      "idea_text": "一张赛博朋克风格的城市夜景",
      "reference_id": "MMS-ABC123",
      "status": "completed",
      "image_url": "https://cdn.example.com/images/xxx.png",
      "created_at": "2026-04-13T10:00:00Z",
      "processed_at": "2026-04-13T10:02:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

**Error Responses**:
- `401 Unauthorized`: `{ "error": "unauthorized", "message": "Authentication required" }`

---

### 6. POST /api/ideas

Submit a new idea for AI image generation.

**Auth**: Required

**Request Body**:
```json
{
  "idea_text": "string (required, 1-500 chars)"
}
```

**Response (201 Created)**:
```json
{
  "id": "ide_xxxxxxxxxxxx",
  "referenceId": "MMS-ABC123",
  "status": "pending",
  "estimated_wait_minutes": 5
}
```

**Error Responses**:
- `400 Bad Request`: `{ "error": "validation_error", "message": "..." }`
- `401 Unauthorized`: `{ "error": "unauthorized", "message": "Authentication required" }`

---

### 7. GET /api/ideas/:id

Get a specific idea by ID.

**Auth**: Required

**Response (200 OK)**:
```json
{
  "id": "ide_xxxxxxxxxxxx",
  "email": "user@example.com",
  "idea_text": "一张赛博朋克风格的城市夜景",
  "reference_id": "MMS-ABC123",
  "status": "completed",
  "image_url": "https://cdn.example.com/images/xxx.png",
  "created_at": "2026-04-13T10:00:00Z",
  "processed_at": "2026-04-13T10:02:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: `{ "error": "validation_error", "message": "Invalid idea ID format" }`
- `404 Not Found`: `{ "error": "not_found", "message": "Idea not found" }`
- `401 Unauthorized`: `{ "error": "unauthorized", "message": "Authentication required" }`

---

### 8. GET /api/dashboard/stats

Get dashboard statistics for the authenticated user.

**Auth**: Required

**Response (200 OK)**:
```json
{
  "stats": {
    "total_ideas": 15,
    "pending": 3,
    "processing": 1,
    "completed": 10,
    "failed": 1
  },
  "recent_ideas": [
    {
      "id": "ide_xxxxxxxxxxxx",
      "idea_text": "一张赛博朋克风格的城市夜景",
      "status": "completed",
      "image_url": "https://cdn.example.com/images/xxx.png",
      "created_at": "2026-04-13T10:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: `{ "error": "unauthorized", "message": "Authentication required" }`

---

## Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `validation_error` | Request body failed validation |
| 401 | `unauthorized` | Missing or invalid auth token |
| 403 | `forbidden` | Authenticated but not authorized |
| 404 | `not_found` | Resource not found |
| 409 | `duplicate_email` | Email already registered |
| 429 | `rate_limited` | Too many requests |
| 500 | `internal_error` | Server-side error |

---

## Idea Status Values

| Status | Description |
|--------|-------------|
| `pending` | Idea submitted, waiting to be processed |
| `processing` | AI generation in progress |
| `completed` | Image generated successfully |
| `failed` | Generation failed (user can retry) |

