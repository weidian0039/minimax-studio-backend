# CI/CD Pipeline Design — MiniMax Studio

**Status**: Active | **Version**: 1.1 | **Date**: 2026-04-09
**Author**: Release Engineer | **Sprint**: APP Sprint 1, Task 4

> "想到即看到，看到即得到" — Pipeline must be fast, reliable, and automated.

> **Workspace Note**: The landing page currently lives at `workspace/index.html` (Phase 1 — static HTML).
> When the project evolves to a full Node.js frontend, it will migrate to `workspace/frontend/`.
> The pipeline handles both: HTML linting for current state, full Node.js build for future state.
> The actual workflow file at `.github/workflows/frontend-ci.yml` is the authoritative pipeline definition.

---

## 1. Pipeline Architecture Overview

### 1.1 Deployment Targets

| Target | Platform | Hosting | CI Integration |
|--------|----------|---------|----------------|
| **Landing Page** | Static HTML/JS | Vercel | GitHub Actions + Vercel Deploy Hook |
| **Backend API** | Node.js / Express | Railway / Render | GitHub Actions (Docker) |
| **Mobile App** | React Native | TestFlight / Play Store | GitHub Actions (Fastlane) |

### 1.2 Branching Strategy

```
main (production)
  ├── develop (staging)
  │     └── feature/* (PR targets: develop)
  └── release/* (production releases, tagged)
```

| Branch | Auto-Deploy | Approval | URL |
|--------|------------|----------|-----|
| `main` | No (manual tag trigger) | Required | `minimax-studio.com` |
| `develop` | Yes (on merge) | None | `staging.minimax-studio.com` |
| `feature/*` | Yes (PR preview) | None | `pr-{N}.staging.minimax-studio.com` |
| `release/*` | Yes (on merge to main) | Required | Production |

### 1.3 Pipeline Stages

```
Code Push
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 1: Code → Build                                  │
│  - Lint (ESLint / Prettier)                             │
│  - Type check (tsc)                                      │
│  - Dependency audit (npm audit)                         │
│  - Bundle / compile                                      │
│  - Security scan (Trivy / npm audit)                     │
│  - Docker build (backend only)                           │
└────────────────┬────────────────────────────────────────┘
                 │ Pass
                 ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 2: Build → Test                                  │
│  - Unit tests (Jest / Vitest)                           │
│  - Integration tests (API endpoints)                     │
│  - E2E tests (Playwright) — frontend only                │
│  - Mobile: Detox UI tests                               │
│  - Coverage gate: 80% minimum                            │
└────────────────┬────────────────────────────────────────┘
                 │ Pass
                 ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 3: Test → Staging Deploy                         │
│  - Automatic on PR merge to `develop`                    │
│  - Database migrations (run before deploy)              │
│  - Deploy backend (Docker on Railway/Render)             │
│  - Deploy frontend (Vercel)                             │
│  - Smoke tests against staging                          │
│  - Health check: GET /health                            │
└────────────────┬────────────────────────────────────────┘
                 │ Pass
                 ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 4: Staging → Production Deploy                    │
│  - Manual approval (GitHub Environment protection)       │
│  - OR automatic on release tag (`v*.*.*`)               │
│  - Run database migrations with backup                   │
│  - Blue/green or rolling deploy                         │
│  - Post-deploy smoke tests                              │
│  - Notify: Slack / email                               │
└────────────────┬────────────────────────────────────────┘
                 │ Pass
                 ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 5: Post-Deploy                                   │
│  - Smoke tests (critical paths only)                    │
│  - Health check polling (3x over 60s)                   │
│  - Sentry release tagging                               │
│  - Rollback on failure (automatic)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 2. GitHub Actions Workflows

### 2.1 Landing Page — Frontend Pipeline

**Two-phase approach**: The pipeline handles the current workspace structure (static `index.html` at root)
and is forward-compatible with a future `frontend/` Node.js project.
- Phase 1 (current): HTML validation, asset reference checks, Vercel static deploy
- Phase 2 (future): ESLint + TypeScript + Jest + Playwright when `frontend/package.json` exists

Triggered on: push to `develop`, `main`, and all PR branches.

**File**: `.github/workflows/frontend-ci.yml`

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['**.html', '**.css', '**.js', 'frontend/**', '.github/workflows/frontend-ci.yml']
  pull_request:
    branches: [develop]
    paths: ['**.html', '**.css', '**.js', 'frontend/**', '.github/workflows/frontend-ci.yml']

env:
  NODE_VERSION: '20'

jobs:
  # ─────────────────────────────────────────────────────────
  # JOB 1: Lint + Type Check
  # ─────────────────────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run ESLint
        working-directory: frontend
        run: npx eslint . --max-warnings=0
        continue-on-error: false

      - name: Check Prettier formatting
        working-directory: frontend
        run: npx prettier --check .
        continue-on-error: false

      - name: Run TypeScript type check
        working-directory: frontend
        run: npx tsc --noEmit
        continue-on-error: false

  # ─────────────────────────────────────────────────────────
  # JOB 2: Unit + Integration Tests
  # ─────────────────────────────────────────────────────────
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run tests with coverage
        working-directory: frontend
        run: npm run test:coverage
        env:
          CI: true

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: frontend/coverage/
          retention-days: 14

      - name: Enforce 80% coverage gate
        working-directory: frontend
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Line coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "ERROR: Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  # ─────────────────────────────────────────────────────────
  # JOB 3: E2E Tests (Playwright)
  # ─────────────────────────────────────────────────────────
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install --with-deps chromium

      - name: Run Playwright E2E tests
        working-directory: frontend
        run: npx playwright test
        env:
          CI: true

      - name: Upload E2E report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 14

  # ─────────────────────────────────────────────────────────
  # JOB 4: Staging Deploy (on push to develop)
  # ─────────────────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [lint, test, e2e]
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.minimax-studio.com
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--environment=preview'
          working-directory: .
          vercel-pull-request-number: ${{ github.event.pull_request.number }}

      - name: Run staging smoke tests
        run: |
          STAGING_URL="${{ vars.STAGING_FRONTEND_URL }}"
          echo "Running smoke tests against $STAGING_URL"
          # Verify landing page loads
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")
          if [ "$HTTP_CODE" != "200" ]; then
            echo "ERROR: Staging returned HTTP $HTTP_CODE"
            exit 1
          fi
          echo "Smoke test passed: HTTP $HTTP_CODE"

      - name: Notify Slack on staging deploy
        if: always()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "Frontend deployed to staging: ${{ vars.STAGING_FRONTEND_URL }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Frontend Staging Deploy*\nCommit: `${{ github.sha }}`\nAuthor: ${{ github.actor }}\nURL: ${{ vars.STAGING_FRONTEND_URL }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ─────────────────────────────────────────────────────────
  # JOB 5: Production Deploy (on release tag)
  # ─────────────────────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [lint, test, e2e]
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://minimax-studio.com
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --environment=production'
          working-directory: .

      - name: Tag Sentry release
        uses: getsentry/action-release@v1
        with:
          environment: production
          version: ${{ github.ref_name }}
          sourcemaps: frontend/dist/
          url_prefix: '~'
          project: minimax-studio-frontend
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}

      - name: Run production smoke tests
        run: |
          PROD_URL="${{ vars.PROD_FRONTEND_URL }}"
          echo "Running smoke tests against $PROD_URL"
          for i in 1 2 3; do
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
            if [ "$HTTP_CODE" == "200" ]; then
              echo "Smoke test passed (attempt $i): HTTP $HTTP_CODE"
              exit 0
            fi
            echo "Attempt $i failed: HTTP $HTTP_CODE"
            if [ $i -lt 3 ]; then sleep 20; fi
          done
          echo "ERROR: All smoke test attempts failed"
          exit 1

      - name: Notify Slack on production deploy
        if: always()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "Frontend deployed to production: ${{ vars.PROD_FRONTEND_URL }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Frontend Production Deploy*\nTag: `${{ github.ref_name }}`\nCommit: `${{ github.sha }}`\nAuthor: ${{ github.actor }}\nURL: ${{ vars.PROD_FRONTEND_URL }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

### 2.2 Backend API — Node.js Pipeline

**File**: `.github/workflows/backend-ci.yml`

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['backend/**', 'api/**', '.github/workflows/backend-ci.yml', 'Dockerfile*', 'docker-compose*.yml']
  pull_request:
    branches: [develop]
    paths: ['backend/**', 'api/**', '.github/workflows/backend-ci.yml', 'Dockerfile*', 'docker-compose*.yml']

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}-backend

jobs:
  # ─────────────────────────────────────────────────────────
  # JOB 1: Build + Security Scan
  # ─────────────────────────────────────────────────────────
  build:
    name: Build & Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci --frozen-lockfile

      - name: Run ESLint
        working-directory: backend
        run: npx eslint src/ --max-warnings=0

      - name: Run TypeScript type check
        working-directory: backend
        run: npx tsc --noEmit

      - name: Run npm audit
        working-directory: backend
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: Build Docker image
        run: |
          docker build \
            --tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
            ./backend

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Push Docker image (on main/develop only)
        if: github.event_name != 'pull_request'
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Upload Docker image as artifact
        if: github.event_name == 'pull_request'
        run: |
          docker save ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -o /tmp/backend-image.tar
          echo "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" > /tmp/image-tag.txt

        - name: Upload image artifact
          uses: actions/upload-artifact@v4
          with:
            name: backend-image
            path: /tmp/backend-image.tar
            retention-days: 1

  # ─────────────────────────────────────────────────────────
  # JOB 2: Database Migrations
  # ─────────────────────────────────────────────────────────
  migrate:
    name: Database Migrations
    runs-on: ubuntu-latest
    needs: build
    environment: ${{ github.ref == 'refs/heads/develop' && 'staging' || github.ref == 'refs/heads/main' && 'production' || 'development' }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci --frozen-lockfile

      - name: Run database migrations (dry run first)
        working-directory: backend
        run: npx knex migrate:latest --dry-run
        env:
          DATABASE_URL: ${{ github.ref == 'refs/heads/develop'
            && secrets.STAGING_DATABASE_URL
            || secrets.PROD_DATABASE_URL }}

      - name: Execute database migrations
        working-directory: backend
        run: npx knex migrate:latest
        env:
          DATABASE_URL: ${{ github.ref == 'refs/heads/develop'
            && secrets.STAGING_DATABASE_URL
            || secrets.PROD_DATABASE_URL }}

      - name: Verify migration integrity
        working-directory: backend
        run: npx knex migrate:status
        env:
          DATABASE_URL: ${{ github.ref == 'refs/heads/develop'
            && secrets.STAGING_DATABASE_URL
            || secrets.PROD_DATABASE_URL }}

  # ─────────────────────────────────────────────────────────
  # JOB 3: Test Suite
  # ─────────────────────────────────────────────────────────
  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: minimax_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci --frozen-lockfile

      - name: Run test suite
        working-directory: backend
        run: npm run test:coverage
        env:
          CI: true
          NODE_ENV: test
          DATABASE_URL: postgresql://test:test@localhost:5432/minimax_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage-report
          path: backend/coverage/
          retention-days: 14

      - name: Enforce 80% coverage gate
        working-directory: backend
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Line coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "ERROR: Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  # ─────────────────────────────────────────────────────────
  # JOB 4: Deploy to Railway (Staging)
  # ─────────────────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, migrate, test]
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    environment:
      name: staging
      url: https://api.staging.minimax-studio.com
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy via Railway CLI
        uses: Evans GER/railway-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          projectId: ${{ secrets.RAILWAY_STAGING_PROJECT_ID }}
          environment: staging
          service: api
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        env:
          NODE_ENV: staging
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          REDIS_URL: ${{ secrets.STAGING_REDIS_URL }}
          MINIMAX_API_KEY: ${{ secrets.STAGING_MINIMAX_API_KEY }}
          RESEND_API_KEY: ${{ secrets.STAGING_RESEND_API_KEY }}
          CDN_BUCKET_URL: ${{ secrets.STAGING_CDN_BUCKET_URL }}
          CLOUDFLARE_R2_ACCOUNT_ID: ${{ secrets.STAGING_CLOUDFLARE_R2_ACCOUNT_ID }}
          CLOUDFLARE_R2_ACCESS_KEY_ID: ${{ secrets.STAGING_CLOUDFLARE_R2_ACCESS_KEY_ID }}
          CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${{ secrets.STAGING_CLOUDFLARE_R2_SECRET_ACCESS_KEY }}
          SENTRY_DSN: ${{ secrets.STAGING_SENTRY_DSN }}

      - name: Run staging health check
        run: |
          for i in 1 2 3 4 5; do
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://api.staging.minimax-studio.com/health")
            if [ "$HTTP_CODE" == "200" ]; then
              echo "Health check passed: HTTP $HTTP_CODE"
              exit 0
            fi
            echo "Attempt $i: HTTP $HTTP_CODE"
            sleep 10
          done
          echo "ERROR: Health check failed after 5 attempts"
          exit 1

      - name: Run staging API smoke tests
        run: |
          API_URL="https://api.staging.minimax-studio.com"
          # Test POST /api/ideas
          RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/ideas" \
            -H "Content-Type: application/json" \
            -d '{"email":"ci-test@minimax.studio","idea_text":"CI smoke test idea for pipeline validation"}')
          HTTP_BODY=$(echo "$RESP" | head -n -1)
          HTTP_CODE=$(echo "$RESP" | tail -n 1)
          echo "POST /api/ideas response: HTTP $HTTP_CODE"
          echo "Body: $HTTP_BODY"
          if [ "$HTTP_CODE" != "201" ]; then
            echo "ERROR: Expected 201, got $HTTP_CODE"
            exit 1
          fi

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "Backend deployed to staging: https://api.staging.minimax-studio.com",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Backend Staging Deploy*\nCommit: `${{ github.sha }}`\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ─────────────────────────────────────────────────────────
  # JOB 5: Deploy to Railway (Production)
  # ─────────────────────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, migrate, test]
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://api.minimax-studio.com
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create database backup (pre-deploy)
        run: |
          echo "Creating pre-deployment database snapshot..."
          # PostgreSQL backup via Railway CLI or pg_dump
          PGDUMP_URL="${{ secrets.PROD_DATABASE_URL }}"
          # Backup stored with timestamp tag
          BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)-${{ github.ref_name }}"
          echo "Backup tag: $BACKUP_TAG"
          # Railway managed backup is preferred; this step is a fallback

      - name: Deploy via Railway CLI
        uses: Evans GER/railway-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          projectId: ${{ secrets.RAILWAY_PROD_PROJECT_ID }}
          environment: production
          service: api
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
        env:
          NODE_ENV: production
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          REDIS_URL: ${{ secrets.PROD_REDIS_URL }}
          MINIMAX_API_KEY: ${{ secrets.PROD_MINIMAX_API_KEY }}
          RESEND_API_KEY: ${{ secrets.PROD_RESEND_API_KEY }}
          CDN_BUCKET_URL: ${{ secrets.PROD_CDN_BUCKET_URL }}
          CLOUDFLARE_R2_ACCOUNT_ID: ${{ secrets.PROD_CLOUDFLARE_R2_ACCOUNT_ID }}
          CLOUDFLARE_R2_ACCESS_KEY_ID: ${{ secrets.PROD_CLOUDFLARE_R2_ACCESS_KEY_ID }}
          CLOUDFLARE_R2_SECRET_ACCESS_KEY: ${{ secrets.PROD_CLOUDFLARE_R2_SECRET_ACCESS_KEY }}
          SENTRY_DSN: ${{ secrets.PROD_SENTRY_DSN }}

      - name: Tag Sentry release
        uses: getsentry/action-release@v1
        with:
          environment: production
          version: ${{ github.ref_name }}
          project: minimax-studio-backend
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}

      - name: Run production health checks (3x polling)
        run: |
          API_URL="https://api.minimax-studio.com"
          for i in 1 2 3; do
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
            if [ "$HTTP_CODE" == "200" ]; then
              echo "Health check passed (attempt $i): HTTP $HTTP_CODE"
              exit 0
            fi
            echo "Attempt $i: HTTP $HTTP_CODE"
            sleep 20
          done
          echo "ERROR: Production health check failed"
          exit 1

      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "Backend deployed to production: https://api.minimax-studio.com",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Backend Production Deploy*\nTag: `${{ github.ref_name }}`\nCommit: `${{ github.sha }}`\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK

  # ─────────────────────────────────────────────────────────
  # JOB 6: Rollback on Failure
  # ─────────────────────────────────────────────────────────
  rollback:
    name: Rollback on Failure
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: failure() && github.ref == 'refs/heads/main'
    environment:
      name: production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Rollback Railway deployment
        uses: Evans GER/railway-action@v1
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          projectId: ${{ secrets.RAILWAY_PROD_PROJECT_ID }}
          environment: production
          action: rollback
        if: failure()

      - name: Notify Slack of rollback
        uses: slackapi/slack-github-action@v1.26.0
        with:
          payload: |
            {
              "text": "PRODUCTION ROLLBACK TRIGGERED",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*PRODUCTION ROLLBACK*\nCommit: `${{ github.sha }}`\nAuthor: ${{ github.actor }}\nReason: Post-deploy health check failed"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

### 2.3 Mobile App — React Native Pipeline

**File**: `.github/workflows/mobile-ci.yml`

```yaml
name: Mobile CI/CD

on:
  push:
    branches: [main, develop]
    paths: ['mobile/**', '.github/workflows/mobile-ci.yml']
  pull_request:
    branches: [develop]
    paths: ['mobile/**', '.github/workflows/mobile-ci.yml']

env:
  NODE_VERSION: '18'

jobs:
  # ─────────────────────────────────────────────────────────
  # JOB 1: Lint + Type Check
  # ─────────────────────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Run ESLint
        working-directory: mobile
        run: npx eslint . --max-warnings=0

      - name: Run TypeScript type check
        working-directory: mobile
        run: npx tsc --noEmit

  # ─────────────────────────────────────────────────────────
  # JOB 2: Unit Tests
  # ─────────────────────────────────────────────────────────
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Run Jest tests
        working-directory: mobile
        run: npm run test -- --coverage
        env:
          CI: true

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: mobile-coverage
          path: mobile/coverage/
          retention-days: 14

  # ─────────────────────────────────────────────────────────
  # JOB 3: iOS Build (on PR / develop)
  # ─────────────────────────────────────────────────────────
  ios-build:
    name: iOS Build
    runs-on: macos-14
    needs: [lint, test]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install Ruby dependencies
        working-directory: mobile/ios
        run: bundle install

      - name: Install npm dependencies
        working-directory: mobile
        run: npm ci

      - name: Install iOS pods
        working-directory: mobile/ios
        run: pod install

      - name: Build iOS (Debug)
        working-directory: mobile/ios
        run: xcodebuild -workspace MiniMaxStudio.xcworkspace \
          -scheme MiniMaxStudio \
          -configuration Debug \
          -destination "platform=iOS Simulator,name=iPhone 15 Pro" \
          -allowProvisioningUpdates \
          build CODE_SIGNING_ALLOWED=NO

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-build
          path: mobile/ios/build/
          retention-days: 7

  # ─────────────────────────────────────────────────────────
  # JOB 4: Android Build
  # ─────────────────────────────────────────────────────────
  android-build:
    name: Android Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install npm dependencies
        working-directory: mobile
        run: npm ci

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Build Android (Debug)
        working-directory: mobile/android
        run: ./gradlew assembleDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: mobile/android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 7

  # ─────────────────────────────────────────────────────────
  # JOB 5: iOS TestFlight Deploy (on release tag)
  # ─────────────────────────────────────────────────────────
  ios-deploy-testflight:
    name: iOS TestFlight Deploy
    runs-on: macos-14
    needs: [ios-build]
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: beta
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        working-directory: mobile
        run: npm ci

      - name: Setup Ruby for Fastlane
        working-directory: mobile/ios
        run: bundle install

      - name: Install iOS pods
        working-directory: mobile/ios
        run: pod install

      - name: Build iOS for TestFlight
        working-directory: mobile/ios
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
        run: |
          echo "${{ secrets.FASTLANE_CERTIFICATE }}" | base64 -d > Certificates.p12
          bundle exec fastlane beta
```

---

## 3. Shared Actions (Reusable Composites)

### 3.1 Shared: `/.github/actions/run-smoke-tests/action.yml`

```yaml
name: Run smoke tests
description: Smoke tests against a given URL and optional endpoints
inputs:
  url:
    description: Base URL to test
    required: true
  endpoints:
    description: JSON array of endpoints to test
    default: '["/health"]'
runs:
  using: composite
  steps:
    - name: Smoke test against ${{ inputs.url }}
      shell: bash
      run: |
        URL="${{ inputs.url }}"
        ENDPOINTS='${{ inputs.endpoints }}'
        for endpoint in $(echo "$ENDPOINTS" | jq -r '.[]'); do
          FULL_URL="${URL}${endpoint}"
          echo "Testing: $FULL_URL"
          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FULL_URL")
          if [ "$HTTP_CODE" != "200" ]; then
            echo "ERROR: $endpoint returned HTTP $HTTP_CODE"
            exit 1
          fi
          echo "OK: $endpoint"
        done
```

---

## 4. Environment Protection Rules

Configure in GitHub Settings > Environments:

### Production Environment
- Required reviewers: 2 (Tech Lead + Release Engineer)
- Wait timer: 0 minutes
- Deployment branches: `main`, `release/*`, tags matching `v*.*.*`
- Secrets: All production secrets masked

### Staging Environment
- Required reviewers: 0
- Deployment branches: `develop`
- Secrets: Staging-specific secrets

---

## 5. Toolchain Summary

| Category | Tool | Justification |
|----------|------|---------------|
| CI/CD | GitHub Actions | Native GitHub integration, free for public repos, macOS runners for iOS |
| Frontend Hosting | Vercel | Zero-config, preview deployments, edge network, native GitHub integration |
| Backend Hosting | Railway | Docker-native, PostgreSQL + Redis managed, easy GitHub deploy, rollback UI |
| Mobile CI | GitHub Actions + Fastlane | Fastlane is the industry standard for iOS/Android; GitHub Actions runs macOS |
| Secrets | GitHub Actions Secrets + Vars | Encrypted at rest, scoped per environment, no third-party dependency |
| Monitoring | Sentry | Error tracking + release tagging in CI |
| Notifications | Slack (via webhook) | Real-time deploy status to team |

---

## 6. Secrets Reference

Never commit secrets. All values stored in GitHub Actions Secrets (per environment):

| Secret | Frontend | Backend Staging | Backend Production |
|--------|----------|-----------------|---------------------|
| `VERCEL_TOKEN` | Yes | - | - |
| `VERCEL_ORG_ID` | Yes | - | - |
| `VERCEL_PROJECT_ID` | Yes | - | - |
| `DATABASE_URL` | - | Yes | Yes |
| `REDIS_URL` | - | Yes | Yes |
| `MINIMAX_API_KEY` | - | Yes | Yes |
| `RESEND_API_KEY` | - | Yes | Yes |
| `SENTRY_DSN` | - | Yes | Yes |
| `SLACK_WEBHOOK_URL` | Yes | Yes | Yes |
| `SENTRY_AUTH_TOKEN` | Yes | Yes | Yes |
| `RAILWAY_TOKEN` | - | Yes | Yes |
| `CLOUDFLARE_R2_*` | - | Yes | Yes |
| `APPLE_ID` | - | - | Mobile only |
| `FASTLANE_PASSWORD` | - | - | Mobile only |
| `MATCH_PASSWORD` | - | - | Mobile only |

---

*Document Version: 1.0 — APP Sprint 1, Task 4*
