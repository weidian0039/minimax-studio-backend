import type { Knex } from 'knex';
import path from 'path';

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db', 'app.db');

// Migrations live in db/migrations/ (relative to this file)
const MIGRATIONS_DIR = path.join(__dirname, 'db', 'migrations');

function pgConfig(connectionString?: string | undefined): Knex.Config {
  return {
    client: 'pg',
    connection: {
      connectionString: connectionString || DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
      directory: MIGRATIONS_DIR,
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds'),
    },
  };
}

function sqliteConfig(filename: string): Knex.Config {
  return {
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    migrations: {
      tableName: 'knex_migrations',
      directory: MIGRATIONS_DIR,
    },
  };
}

// Select driver based on DB_TYPE env var (defaults to sqlite)
const activeConfig: Knex.Config = DB_TYPE === 'postgres'
  ? pgConfig()
  : sqliteConfig(DB_PATH);

const config: Record<string, Knex.Config> = {
  development: activeConfig,

  staging: pgConfig(process.env.DATABASE_URL),

  production: {
    ...pgConfig(process.env.DATABASE_URL),
    pool: { min: 5, max: 20 },
  },

  test: DB_TYPE === 'postgres'
    ? pgConfig(process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/minimax_test')
    : sqliteConfig(process.env.DB_PATH || ':memory:'),
};

export default config;
module.exports = config;
