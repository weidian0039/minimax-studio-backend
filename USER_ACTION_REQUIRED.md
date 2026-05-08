# USER_ACTION_REQUIRED — MiniMax Studio MVP

## 当前状态 (2026-04-20)

| 类别 | 状态 |
|------|------|
| Build | ✅ 0 errors |
| Unit Tests | ✅ 69/70 (1 skipped: nanoid ESM) |
| E2E Smoke | ✅ 11/11 |
| Integration | ✅ 22/22 |
| 代码质量 | ✅ 所有 Post-Launch items 已交付 |

**已知修复 (2026-04-20)**：email.service 测试超时问题已修复（`NODEMAILER_TRANSPORT=mock`）

---

## 生产部署前需要你提供的信息

以下任选其一，或告诉我你想从哪里开始：

### 选项 A：配置生产环境
```
需要你提供：
1. DATABASE_URL — PostgreSQL 连接串
   例如：postgresql://user:password@host:5432/minimax_studio

2. REDIS_URL — Redis URL（用于 BullMQ 队列）
   例如：redis://user:password@host:6379

3. 将 .env 中 DB_TYPE=postgres 取消注释
   将 QUEUE_TYPE=bullmq 取消注释
```

### 选项 B：接入真实 MiniMax API
```
需要你提供：
1. MINIMAX_API_KEY — 真实 API Key
   当前：MINIMAX_API_KEY=mock（使用 picsum.photos 占位图）

2. 将 .env 中 MINIMAX_API_KEY 替换为真实 key
```

### 选项 C：Railway 部署
```
我需要你提供：
1. Railway 账号授权
2. PostgreSQL 和 Redis 可以通过 Railway 界面直接创建

Railway 部署脚本已准备好。
```

### 选项 D：开新功能
```
告诉我你想要什么功能，我来设计方案。
```

### 选项 E：停下等指示
```
不动了，等你。
```

---

## 架构说明（供你参考）

```
生产模式：
- DB: PostgreSQL (via pg Pool) + Knex migrations
- Queue: BullMQ + Redis
- Email: nodemailer (SMTP) + winston-daily-rotate-file
- API: MiniMax 实 API / mock
- Auth: JWT + bcrypt + refresh token rotation
- Rate Limit: /auth/refresh 限流 10req/min (prod)
- Monitor: Bull Board @ /admin/queues (admin 认证)

开发模式：
- DB: SQLite (better-sqlite3)
- Queue: in-process polling (5000ms interval)
- Email: Ethereal fallback (无配置时)
- Rate Limit: /auth/refresh 限流 50req/min
```
