import { AbstractRepository } from '../../../lib/AbstractRepository'
import { Knex } from 'knex'
import { FullUserRow, NewUserRow, UpdatedUserRow } from './UserRepository'

export type UserRepositoryLite = AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow>

export function createUserRepositoryLite(knex: Knex): UserRepositoryLite {
  return new AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow>(knex, {
    tableName: 'users',
    idColumn: 'userId',
  })
}
