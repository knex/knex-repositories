import { Knex } from 'knex'

const DB_WITHOUT_RETURNING = new Set(['mysql', 'mysql2', 'sqlite3'])

export function doesSupportReturning(knex: Knex): boolean {
  return !DB_WITHOUT_RETURNING.has(knex.client.driverName)
}

export function doesSupportUpdateOrderBy(knex: Knex): boolean {
  return knex.client.driverName !== 'mssql'
}
