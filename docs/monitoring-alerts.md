# Monitoring & Alerting Configuration — MiniMax Studio

**Status**: Active | **Version**: 1.0 | **Date**: 2026-04-12
**Author**: Release Engineer | **Sprint**: APP Sprint 2, Task 3

> Proactive monitoring is the difference between "we noticed" and "we knew first."

---

## 1. Monitoring Stack

| Layer | Tool | Purpose | Cost |
|-------|------|---------|------|
| **Error Tracking** | Sentry | Exception monitoring, release tagging | Free tier (5k events/mo) |
| **Uptime Monitoring** | UptimeRobot | HTTP health check polling | Free (50 monitors) |
| **Log Aggregation** | Railway Logs | Built-in log streaming | Included |
| **Analytics** | Vercel Analytics | Frontend performance | Free tier |

---

## 2. Sentry Integration

### 2.1 Setup

Sentry is initialized in `backend/src/monitoring.js` with:
- Global error handler (uncaught exceptions)
- Unhandled promise rejection handler
- Request context attachment
- Health check endpoint filtering (no noise from `/health`)

**Environment variable**: `SENTRY_DSN`

```
# Staging
SENTRY_DSN=https://xxxx@sentry.io/minimax-studio-staging

# Production
SENTRY_DSN=https://xxxx@sentry.io/minimax-studio-production
```

### 2.2 Release Tagging (CI)

Every deployment tags the Sentry release:

```yaml
# backend-ci.yml — deploy-staging job
- name: Tag Sentry release
  uses: getsentry/action-release@v1
  with:
    environment: staging
    version: ${{ github.sha }}
    project: minimax-studio-backend
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ vars.SENTRY_ORG }}
```

### 2.3 Alert Rules

Configure in Sentry dashboard under **Settings > Alerts**:

| Rule | Condition | Action | Severity |
|------|-----------|--------|----------|
| **New issue** | Issue first seen | Slack notification to `#alerts` | Warning |
| **Error spike** | >10 events in 5 min | Slack notification | Warning |
| **Critical error** | >50 events in 5 min | PagerDuty (prod only) | Critical |
| **Health check failure** | See Section 4 | UptimeRobot alert | Critical |
| **Release regression** | Same error in new release | Slack + revert recommendation | Warning |

---

## 3. Alert Definitions

### 3.1 Error Rate Alert

**Trigger**: HTTP 5xx error rate > 1% over 5 minutes

**Detection**: Sentry `issue.stats` data or Railway metrics

**Response**:
1. PagerDuty page to on-call engineer
2. Post `#backend-alerts` Slack channel
3. Evaluate rollback via Railway dashboard

**Staging threshold**: > 5% error rate (higher tolerance for pre-prod)

### 3.2 Response Time Alert

**Trigger**: p95 response time > 2000ms over 5 minutes

**Detection**: Railway built-in metrics or custom endpoint timing

**Response**:
1. Post `#backend-alerts` Slack channel with sample slow traces
2. Check database connection pool (`backend_ci` metric)
3. Check Redis latency

**Staging threshold**: > 5000ms (5s) — relaxed for pre-prod

### 3.3 Health Check Failure Alert

**Trigger**: `GET /health` returns non-200 for > 3 consecutive checks

**Detection**: UptimeRobot (primary) + Railway internal health check (secondary)

**Response**:
1. UptimeRobot alerts to configured email + webhook
2. Railway auto-restarts service on health failure
3. If restart does not resolve in 5 minutes, PagerDuty alert

### 3.4 Memory Usage Alert

**Trigger**: Memory usage > 85% for > 2 minutes

**Detection**: Railway metrics dashboard

**Response**:
1. Post to `#backend-alerts`
2. Review BullMQ queue depth (workers processing large payloads)
3. Scale up if sustained

---

## 4. UptimeRobot Configuration

### 4.1 Monitor Setup

Create monitors at [uptimerobot.com](https://uptimerobot.com) (free tier: 50 monitors):

| Monitor Name | URL | Interval | Type |
|-------------|-----|----------|------|
| `staging-api-health` | `https://api.staging.minimax-studio.com/health` | 5 min | HTTP(s) |
| `staging-api-main` | `https://api.staging.minimax-studio.com/api/flags` | 5 min | HTTP(s) |
| `staging-frontend` | `https://staging.minimax-studio.com` | 5 min | HTTP(s) |
| `prod-api-health` | `https://api.minimax-studio.com/health` | 1 min | HTTP(s) |
| `prod-frontend` | `https://minimax-studio.com` | 1 min | HTTP(s) |

### 4.2 Alert Contacts

Configure alert contacts in UptimeRobot:

1. **Email** — release-engineer@minimax.studio
2. **Slack webhook** — `#alerts` channel via Slack webhook integration

**Webhook payload format**:
```
UptimeRobot Alert: [monitor_name] is DOWN
URL: [monitor_url]
Status: [alert_details]
Time: [timestamp]
```

### 4.3 SSL Certificate Monitoring

UptimeRobot free tier includes SSL certificate monitoring:
- Automatically checks certificate expiration
- Alert 30 days before expiry
- Alert on certificate errors

---

## 5. Railway Monitoring

### 5.1 Built-in Metrics

Railway provides per-service metrics:
- Request count
- Response time (p50, p95, p99)
- Error rate
- Memory usage
- CPU usage

Access at: Railway Dashboard > Project > Service > Metrics

### 5.2 Log Aggregation

Railway streams container logs. For structured log querying:
- Export logs to Datadog (production)
- Use Railway native log viewer (staging)

### 5.3 Deployment Health

Railway automatically runs health checks:
- Polls `/health` endpoint at the configured port
- Fails deployment if health check fails 3 times
- Auto-restarts on failure

---

## 6. On-Call Runbook

When an alert fires, follow this runbook:

### 6.1 Error Rate Spike

```
1. Open Sentry dashboard → filter by environment = production
2. Find top error by frequency
3. Check if error is in new release (Sentry release tab)
4. If yes: trigger Railway rollback
5. If no: investigate database/query performance
6. Update #backend-alerts with status
```

### 6.2 Health Check Failure

```
1. Check Railway dashboard for deployment status
2. Check Railway logs for startup errors
3. If container crashed: check recent deploys
4. If DB connection error: verify DATABASE_URL in Railway env vars
5. If Redis error: verify REDIS_URL
6. Rollback if deploy-related
```

### 6.3 Slow Response Times

```
1. Check Railway metrics — is it DB-bound or CPU-bound?
2. Check database slow query log
3. Check BullMQ queue depth (large backlog = workers overwhelmed)
4. Scale up worker count if needed
5. Add Redis connection pool monitoring
```

---

## 7. Alert Channel Reference

| Channel | Tool | Purpose |
|---------|------|---------|
| `#backend-alerts` | Slack | Real-time alerts for all environments |
| `#incidents` | Slack | Post-mortem and major incident coordination |
| `release-engineer@minimax.studio` | Email | UptimeRobot downtime alerts |
| PagerDuty | PagerDuty | Production critical alerts (on-call rotation) |

---

## 8. Health Check Endpoint Reference

**Endpoint**: `GET /health`

**Response (200 — healthy)**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-12T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "memory": {
    "usedMB": 128.5,
    "totalMB": 512.0,
    "usagePercent": 25.1
  },
  "checks": {
    "database": { "status": "ok", "latencyMs": 4 },
    "redis": { "status": "ok", "latencyMs": 1 }
  }
}
```

**Response (503 — degraded)**:
```json
{
  "status": "degraded",
  "timestamp": "2026-04-12T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "memory": { ... },
  "checks": {
    "database": { "status": "ok", "latencyMs": 4 },
    "redis": { "status": "error", "error": "Connection refused" }
  }
}
```

---

*Document Version: 1.0 — APP Sprint 2, Task 3*
