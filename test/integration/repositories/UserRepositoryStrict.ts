import { AbstractRepository } from '../../../lib/AbstractRepository'
import { Knex } from 'knex'
import { FullUserRow, NewUserRow, UpdatedUserRow } from './UserRepository'

export type UserRepositoryStrict = AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow>

export function createUserRepositoryStrict(knex: Knex): UserRepositoryStrict {
  return new AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow>(knex, {
    tableName: 'users',
    idColumn: 'userId',
    columnsForCreate: ['name'],
    columnsForUpdate: ['age'],
    columnsForFilters: ['name'],
    throwOnInvalidColumns: true,
  })
}
