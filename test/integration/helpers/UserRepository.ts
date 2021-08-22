import { AbstractRepository } from '../../../lib/AbstractRepository'
import { Knex } from 'knex'

export type NewUserRow = {
  name: string
  age?: number
}

export type FullUserRow = NewUserRow & {
  userId: number
  createdAt: Date
  updatedAt: Date
}

export type UserRepository = AbstractRepository<NewUserRow, FullUserRow>

export function createUserRepository(knex: Knex): UserRepository {
  return new AbstractRepository<NewUserRow, FullUserRow>(knex, {
    tableName: 'users',
    idColumn: 'userId',
    defaultOrderBy: [
      {
        column: 'userId',
        order: 'asc',
      },
    ],
    columnsToFetch: ['userId', 'name', 'age', 'createdAt', 'updatedAt'],
    columnsForCreate: ['name', 'age'],
    columnsForUpdate: ['age'],
    columnsForGetFilters: ['name'],
  })
}
