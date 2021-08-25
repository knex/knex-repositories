import { Knex } from 'knex'

export async function createJoinTable(knex: Knex): Promise<void> {
  await knex.schema.createTable('joinTable', (table) => {
    table.increments('id').primary()
    table.string('userId').notNullable()
    table.string('orgId').notNullable()
    table.string('linkType').notNullable()
    table.string('name').notNullable()
  })
}

export async function dropJoinTable(knex: Knex): Promise<void> {
  await knex.schema.dropTable('joinTable')
}

export async function createUserTable(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('userId').primary()
    table.string('name').notNullable()
    table.integer('age').nullable()

    table.dateTime('createdAt').defaultTo(knex.fn.now()).notNullable()
    table.dateTime('updatedAt').defaultTo(knex.fn.now()).notNullable()
  })
}

export async function dropUserTable(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
