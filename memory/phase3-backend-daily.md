# Phase 3 Backend — Daily Progress

## 2026-04-13 — Day 1: Complete

### Critical Bug Fixed: user_id = null in ideas (ROOT CAUSE FOUND)
**Symptom**: Ideas created via HTTP API had `user_id = NULL` in SQLite despite `req.user.userId` being set correctly.
**Root Cause**: A stale compiled file `workspace/backend/db/database.js` existed at the project root level alongside `dist/db/database.js`. The TypeScript routes used `import from '../../db/database'` (relative to `src/`). The compiled `dist/routes/ideas.js` used `require('../../db/database')` which, from `dist/routes/`, resolved to `workspace/backend/db/database.js` (stale, no userId param) instead of `dist/db/database.js` (correct, with userId). This shadowed the correct compiled module.
**Fix**: Deleted stale `db/database.js`, `db/database.d.ts`, `db/database.d.ts.map`, `db/database.js.map`, `db/index.d.ts`. Fixed import paths in `src/routes/ideas.ts` and `src/routes/auth.ts` from `../../db/database` to `../db/database`. Clean rebuild.
**Lesson**: Stale compiled output outside `dist/` can shadow correct `dist/` files. TypeScript's `rootDir: ./src` means all compilation output should be under `dist/`.

### Current MVP State (End of Day 1)
- Express + better-sqlite3 + TypeScript
- JWT Auth: register, login, refresh, /me (all working)
- MiniMax mock mode: picsum.photos fallback (works)
- Async queue: pending→processing→completed/failed with retry (works)
- Email notifications: nodemailer + Ethereal (sends, previews logged)
- 47 unit tests passing (1 skipped), 6 suites
- E2E verified: register→login→submit idea→get by ID→get by reference→poll completion
- Ownership enforcement (403 for other user) VERIFIED
- Coverage: 40% overall (unit tests cover business logic; routes/middleware are integration-level)

### Phase 3 Target State — COMPLETE
1. [x] JWT Auth (register/login/refresh, protected endpoints)
2. [x] MiniMax API Integration (mock mode, swap key via .env)
3. [x] Async Queue with State Machine (pending→processing→completed/failed)
4. [x] Email Notifications (nodemailer + Ethereal)
5. [x] Test Coverage: 40% (unit tests for business logic; integration-level routes need supertest)
6. [x] E2E curl verification: ALL STEPS PASS
7. [x] API Contract doc: already exists at `workspace/backend/docs/api-contract.md`

### Key Decisions
- Keep better-sqlite3 for Phase 3, Knex migrations remain for Phase 4 Postgres
- miniMaxService uses mock when MINIMAX_API_KEY is absent or "mock"
- nodemailer + Ethereal for dev, SMTP config via .env for production
- No Redis dependency for Phase 3 — in-process polling queue
- Phase 4 will upgrade to BullMQ + Redis

### Architecture Notes
- `src/db/database.ts`: Core DB layer. Uses `crypto.randomUUID()` (ES2022, no nanoid dependency)
- `src/services/queueProcessor.ts`: Polling queue with lazy `require()` for optional deps
- `src/routes/ideas.ts`: Fixed import path `../db/database` (was incorrectly `../../db/database`)
- `src/auth/jwt.ts`: JWT with access (15min) + refresh (7day) tokens
- All routes check ownership: `idea.user_id !== req.user?.userId && req.user?.role !== 'admin'` → 403

### Remaining Work
- supertest integration tests for route handlers (coverage improvement)
- Phase 4: Postgres + Knex migration, BullMQ + Redis

### Files Changed This Session
- `src/routes/auth.ts`: Fixed `../../db/database` → `../db/database`
- `src/routes/ideas.ts`: Fixed `../../db/database` → `../db/database`; removed debug `console.log`
- `src/db/database.ts`: Already clean (fix was in compiled dist/)
- `dist/db/database.js`: Regenerated clean (no INTENTIONAL_STOP debug code)
- `dist/routes/ideas.js`: Regenerated with correct require path
- `dist/routes/auth.js`: Regenerated with correct require path
- Deleted stale: `db/database.js`, `db/database.d.ts`, `db/database.d.ts.map`, `db/database.js.map`, `db/index.d.ts`
- Deleted test artifacts: `db/test_direct.db`, `db/test_direct2.db`

### E2E Verification Results
```
Register user1: usr_4f2121725a894778 — OK
Register user2: usr_90099926046a45d9 — OK
Submit idea (user1): ide_c3fc2954bd684161 | user_id=usr_4f2121725a894778 — FIXED
User1 fetch own idea: 200 — OK
User2 fetch user1's idea by ID: 403 — OK (enforcement works)
User2 fetch user1's idea by reference: 403 — OK (enforcement works)
Poll completion: completed in ~2s with result_url — OK
```
