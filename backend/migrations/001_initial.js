/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('ideas', (table) => {
      table.text('id').primary();
      table.text('email').notNullable();
      table.text('idea_text').notNullable();
      table.text('reference_id').notNullable().unique();
      table
        .enu('status', ['pending', 'processing', 'completed', 'failed'], {
          useNative: true,
          enumName: 'idea_status',
        })
        .notNullable()
        .defaultTo('pending');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('processed_at', { useTz: true }).nullable();
    })
    .then(() =>
      knex.schema.raw(`
        CREATE INDEX IF NOT EXISTS idx_ideas_email        ON ideas(email);
        CREATE INDEX IF NOT EXISTS idx_ideas_reference_id ON ideas(reference_id);
        CREATE INDEX IF NOT EXISTS idx_ideas_status       ON ideas(status);
      `)
    );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('ideas').then(() =>
    knex.schema.raw('DROP TYPE IF EXISTS idea_status')
  );
};
