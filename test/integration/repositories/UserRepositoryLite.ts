import { AbstractRepository } from '../../../lib/AbstractRepository'
import { Knex } from 'knex'
import { Filters, FullUserRow, NewUserRow, UpdatedUserRow } from './UserRepository'

export type UserRepositoryLite = AbstractRepository<
  NewUserRow,
  FullUserRow,
  UpdatedUserRow,
  Filters
>

export function createUserRepositoryLite(knex: Knex): UserRepositoryLite {
  return new AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow, Filters>(knex, {
    tableName: 'users',
    idColumn: 'userId',
  })
}
