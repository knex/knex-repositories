import { Knex } from 'knex'

const drivers = Object.freeze({
  MsSQL: 'mssql',
  MySQL: 'mysql',
  MySQL2: 'mysql2',
  Oracle: 'oracledb',
  PostgreSQL: 'pg',
  PgNative: 'pgnative',
  Redshift: 'pg-redshift',
  SQLite: 'sqlite3',
  CockroachDB: 'cockroachdb',
})

function getDriverName(knex: Knex): string {
  return knex.client?.driverName
}

export function isPostgreSQL(knex: Knex): boolean {
  return isOneOfDbs(knex, [drivers.PostgreSQL, drivers.PgNative])
}

export function isPgNative(knex: Knex): boolean {
  return getDriverName(knex) === drivers.PgNative
}

export function isPgBased(knex: Knex): boolean {
  return isOneOfDbs(knex, [
    drivers.PostgreSQL,
    drivers.PgNative,
    drivers.Redshift,
    drivers.CockroachDB,
  ])
}

export function isMssql(knex: Knex): boolean {
  return getDriverName(knex) === drivers.MsSQL
}

export function isOracle(knex: Knex): boolean {
  return getDriverName(knex) === drivers.Oracle
}

export function isMysql(knex: Knex): boolean {
  return isOneOfDbs(knex, [drivers.MySQL, drivers.MySQL2])
}

export function isRedshift(knex: Knex): boolean {
  return getDriverName(knex) === drivers.Redshift
}

export function isSQLite(knex: Knex): boolean {
  return getDriverName(knex) === drivers.SQLite
}

export function isCockroachDB(knex: Knex): boolean {
  return getDriverName(knex) === drivers.CockroachDB
}

/**
 *
 * @param knex
 * @param {('pg'|'pgnative'|'pg-redshift'|'oracledb'|'mysql'|'mysql2'|'mssql'|'sqlite3'|'cockroachdb')[]} supportedDbs - supported DB values in DRIVER_NAMES from lib/constants.
 * @returns {*}
 */
function isOneOfDbs(knex: Knex, supportedDbs: string[]) {
  return supportedDbs.includes(getDriverName(knex))
}
