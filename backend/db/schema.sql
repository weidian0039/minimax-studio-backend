-- MiniMax Studio Database Schema
-- SQLite-compatible DDL

CREATE TABLE IF NOT EXISTS ideas (
  id           TEXT        PRIMARY KEY,
  email        TEXT        NOT NULL,
  idea_text    TEXT        NOT NULL,
  reference_id TEXT        UNIQUE NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  user_id      TEXT,
  result_url   TEXT,
  retry_count  INTEGER     NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at   TEXT        NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT        NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_email        ON ideas(email);
CREATE INDEX IF NOT EXISTS idx_ideas_reference_id ON ideas(reference_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status       ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id      ON ideas(user_id);

CREATE TABLE IF NOT EXISTS users (
  id              TEXT        PRIMARY KEY,
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  email_verified  INTEGER     NOT NULL DEFAULT 0,
  created_at      TEXT        NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS jobs (
  id              TEXT        PRIMARY KEY,
  idea_id         TEXT        NOT NULL,
  user_id         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                               CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  prompt          TEXT        NOT NULL,
  result_url      TEXT,
  error_message   TEXT,
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  minmax_job_id   TEXT,
  created_at      TEXT        NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT        NOT NULL DEFAULT (datetime('now')),
  processed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_idea_id     ON jobs(idea_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id    ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
