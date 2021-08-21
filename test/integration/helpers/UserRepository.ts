import { AbstractRepository } from '../../../lib/AbstractRepository'
import { Knex } from 'knex'

export type NewUserRow = {
  name: string
  age?: number
}

export type FullUserRow = NewUserRow & {
  id: number
  createdAt: Date
  updatedAt: Date
}

export type UserRepository = AbstractRepository<NewUserRow, FullUserRow>

export function createUserRepository(knex: Knex) {
  return new AbstractRepository<NewUserRow, FullUserRow>(knex, {
    tableName: 'users',
    tableColumnsToFetch: ['userId', 'name', 'age', 'createdAt', 'updatedAt'],
  })
}
