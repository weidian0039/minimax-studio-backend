---
name: phase3-root-cause
description: Phase 3 critical root cause — stale db/database.js shadow file
type: project
---

# Phase 3 根因分析 — Stale db/database.js Shadow File

## 事件

Phase 3 实现期间，后端 routes 在创建 ideas 时无法正确存储 `user_id`（总是 null）。

## 根因

**tsconfig rootDir 变更前的 stale compiled output 导致 module resolution 错误。**

1. tsconfig 原配置：没有 `rootDir`，编译后 `src/db/database.ts` 输出到 `dist/db/database.js`
2. tsconfig 变更：加入 `rootDir: ./src`，`src/db/database.ts` 编译后仍输出到 `dist/db/database.js`
3. 但 tsconfig exclude 包含 `**/*.test.ts`，且 dist 不在 outDir 之外
4. 一个旧的 `db/database.js` 文件（手动放置，非编译产物）存在于 `workspace/backend/db/database.js`
5. TypeScript 编译后的 routes (`dist/routes/ideas.js`) 使用相对路径 `require("../db/database")` — 解析到 `dist/db/database.js` ✓
6. **但 P9-Backend agent 发现**：routes 源码 `src/routes/ideas.ts` 中的 import path 是 `../../db/database`（错误），编译后解析到了 `workspace/backend/db/database.js`（旧的，没有 userId 参数）

## 修复

| 操作 | 文件 |
|------|------|
| 删除 stale shadow file | `db/database.js` |
| 修正 import path | `src/routes/ideas.ts`: `../../db/database` → `../db/database` |
| 修正 import path | `src/routes/auth.ts`: `../../db/database` → `../db/database` |
| 移除 debug console.log | `src/routes/ideas.ts` |
| 重新编译 | `npm run build` |

## 架构教训

**三层 database 文件的职责必须清晰：**

| 文件 | 类型 | 用途 |
|------|------|------|
| `src/db/database.ts` | TypeScript 源码 | 编译源，TypeScript 类型检查 |
| `dist/db/database.js` | TS 编译产物 | runtime truth — routes/server 引用此文件 |
| `db/database.js` | ~~手动文件~~ | **已删除 — shadow file 导致 confusion** |

## 验证

- Backend unit tests: 47/48 pass (1 skipped: better-sqlite3 singleton)
- E2E tests: 29/29 pass
- 真实 API 测试：user_id 正确存储 ✓

## 日期

2026-04-13
