import type { Knex } from 'knex';

// Initial schema migration — creates users, ideas, and jobs tables.
// Works on both SQLite (via better-sqlite3 client) and PostgreSQL (via pg client).
// Run: npm run migrate

export async function up(knex: Knex): Promise<void> {
  const isPg = knex.client.config.client === 'pg';

  // ── users ──────────────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (t) => {
      t.text('id').primary();
      t.text('email').notNullable().unique();
      t.text('password_hash').notNullable();
      t.text('role').notNullable().defaultTo('user').checkIn(['user', 'admin'], 'chk_users_role');
      if (isPg) {
        t.boolean('email_verified').notNullable().defaultTo(false);
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      } else {
        t.integer('email_verified').notNullable().defaultTo(0);
        t.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
        t.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
      }
    });
    await knex.schema.table('users', (t) => {
      t.index(['email'], 'idx_users_email');
    });
  }

  // ── ideas ──────────────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('ideas'))) {
    await knex.schema.createTable('ideas', (t) => {
      t.text('id').primary();
      t.text('email').notNullable();
      t.text('idea_text').notNullable();
      t.text('reference_id').notNullable().unique();
      t.text('status').notNullable().defaultTo('pending')
        .checkIn(['pending', 'processing', 'completed', 'failed'], 'chk_ideas_status');
      t.text('user_id').nullable();
      t.text('result_url').nullable();
      t.integer('retry_count').notNullable().defaultTo(0);
      t.text('error_message').nullable();
      if (isPg) {
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp('processed_at', { useTz: true }).nullable();
      } else {
        t.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
        t.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
        t.text('processed_at').nullable();
      }
    });
    await knex.schema.table('ideas', (t) => {
      t.index(['email'], 'idx_ideas_email');
      t.index(['reference_id'], 'idx_ideas_reference_id');
      t.index(['status'], 'idx_ideas_status');
      t.index(['user_id'], 'idx_ideas_user_id');
    });
  }

  // ── jobs ───────────────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('jobs'))) {
    await knex.schema.createTable('jobs', (t) => {
      t.text('id').primary();
      t.text('idea_id').notNullable();
      t.text('user_id').nullable();
      t.text('status').notNullable().defaultTo('pending')
        .checkIn(['pending', 'processing', 'completed', 'failed'], 'chk_jobs_status');
      t.text('prompt').notNullable();
      t.text('result_url').nullable();
      t.text('error_message').nullable();
      t.integer('retry_count').notNullable().defaultTo(0);
      t.text('minmax_job_id').nullable();
      if (isPg) {
        t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.timestamp('processed_at', { useTz: true }).nullable();
      } else {
        t.text('created_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
        t.text('updated_at').notNullable().defaultTo(knex.raw("(datetime('now'))"));
        t.text('processed_at').nullable();
      }
    });
    await knex.schema.table('jobs', (t) => {
      t.index(['idea_id'], 'idx_jobs_idea_id');
      t.index(['user_id'], 'idx_jobs_user_id');
      t.index(['status'], 'idx_jobs_status');
      t.index(['created_at'], 'idx_jobs_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('ideas');
  await knex.schema.dropTableIfExists('users');
}
