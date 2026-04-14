# MiniMax Studio — API Contract

**Version**: 1.0 | **Date**: 2026-04-13
**Base URL**: `http://localhost:3001` (dev) | `https://api.minimax.studio` (prod)
**Auth**: Bearer token in `Authorization` header (JWT)

---

## Auth Endpoints

### POST /api/auth/register
Register a new user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors**:
- `400` — validation error (missing fields, < 8 char password, invalid email format)
- `409` — email already registered
- `500` — internal error

---

### POST /api/auth/login
Login with email + password.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors**:
- `400` — validation error (missing fields)
- `401` — invalid credentials
- `500` — internal error

---

### POST /api/auth/refresh
Refresh access token using a valid refresh token.

**Request**:
```json
{
  "refreshToken": "eyJ..."
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ..."
  }
}
```

**Errors**:
- `400` — refreshToken missing
- `401` — invalid or expired refresh token / user not found
- `500` — internal error

---

### GET /api/auth/me
Get current authenticated user's info. **Requires auth**.

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "userId": "abc123",
    "email": "user@example.com"
  }
}
```

**Errors**:
- `401` — missing or invalid Authorization header / expired token

---

## Ideas Endpoints

All ideas endpoints require authentication. Pass the access token in the `Authorization` header.

### POST /api/ideas
Submit a new idea.

**Headers**: `Authorization: Bearer <accessToken>`

**Request**:
```json
{
  "email": "user@example.com",
  "idea_text": "A futuristic city at sunset"
}
```
> Note: `idea` field is accepted as alias for `idea_text`.

**Response** (201):
```json
{
  "success": true,
  "data": {
    "status": "queued",
    "id": "ide_abc123",
    "referenceId": "MMS-ABC123",
    "estimated_wait_minutes": 5
  }
}
```

**Errors**:
- `400` — validation error (missing email or idea_text)
- `401` — unauthorized
- `500` — internal error

---

### GET /api/ideas/:id
Get idea status by idea ID. **Requires auth**.

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "ide_abc123",
    "email": "user@example.com",
    "idea_text": "A futuristic city at sunset",
    "reference_id": "MMS-ABC123",
    "status": "completed",
    "result_url": "https://picsum.photos/seed/abc/1024/1024",
    "created_at": "2026-04-13T00:00:00.000Z",
    "processed_at": "2026-04-13T00:05:00.000Z"
  }
}
```

**Errors**:
- `400` — invalid idea ID format (must start with `ide_`)
- `401` — unauthorized
- `403` — forbidden (idea belongs to another user)
- `404` — idea not found
- `500` — internal error

---

### GET /api/ideas/reference/:ref
Get idea by reference ID (e.g. `MMS-ABC123`). **Requires auth**.

**Headers**: `Authorization: Bearer <accessToken>`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "ide_abc123",
    "email": "user@example.com",
    "idea_text": "A futuristic city at sunset",
    "reference_id": "MMS-ABC123",
    "status": "completed",
    "result_url": "https://picsum.photos/seed/abc/1024/1024",
    "created_at": "2026-04-13T00:00:00.000Z",
    "processed_at": "2026-04-13T00:05:00.000Z"
  }
}
```

**Errors**:
- `400` — invalid reference ID format (expected `MMS-XXXXXX`)
- `401` — unauthorized
- `403` — forbidden
- `404` — idea not found
- `500` — internal error

---

## Health Endpoint

### GET /health
Health check. No auth required.

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-04-13T00:00:00.000Z",
  "uptime": 12345,
  "version": "1.0.0",
  "memory": {
    "usedMB": 120.45,
    "totalMB": 16384,
    "usagePercent": 0.74
  },
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "not_configured" }
  }
}
```

---

## Auth Token Format

**Access Token**: JWT signed with `JWT_SECRET`, contains `{ userId, email, role, iat, exp }`. TTL: **15 minutes**.

**Refresh Token**: JWT signed with `JWT_SECRET`, contains `{ userId, iat, exp }`. TTL: **7 days**.

**Token Storage (Frontend)**:
- Store access token in memory (NOT localStorage for security)
- Store refresh token in httpOnly cookie or secure storage
- Use refresh token to obtain new access token when expired

**Verifying**: The `Authorization` header format is `Bearer <accessToken>`. On 401 response, attempt refresh flow.

---

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message"
}
```

Error codes: `validation_error`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `internal_error`

---

## Status Codes Summary

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (no/invalid/expired token) |
| 403 | Forbidden (permission denied) |
| 404 | Not Found |
| 409 | Conflict (e.g. email already registered) |
| 500 | Internal Server Error |
