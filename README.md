# knex-repositories
Parametrized CRUD repository abstraction for Knex.js

[![NPM Version][npm-image]][npm-url]
[![Build Status](https://github.com/knex/knex-repositories/workflows/ci/badge.svg)](https://github.com/knex/knex-repositories/actions)
[![Coverage Status](https://coveralls.io/repos/knex/knex-repositories/badge.svg?branch=main)](https://coveralls.io/r/knex/knex-repositories?branch=main)

## Getting started

First install the package:

```bash
npm i knex-repositories
```

Next, create a repository:
```ts
import { AbstractRepository } from 'knex-repositories'
import { Knex } from 'knex'

export type NewUserRow = {
  name: string
  passwordHash: string
  age?: number
}

export type UpdatedUserRow = Partial<NewUserRow>

export type FullUserRow = NewUserRow & {
  userId: number
  createdAt: Date
  updatedAt: Date
}

export type UserFilters = {
    name?: string
}

export type UserRepository = AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow, UserFilters>

export function createUserRepository(knex: Knex): UserRepository {
  return new AbstractRepository<NewUserRow, FullUserRow, UpdatedUserRow, UserFilters>(knex, {
    tableName: 'users',
    idColumn: 'userId',
    defaultOrderBy: [
      {
        column: 'userId',
        order: 'asc',
      },
    ],
    columnsToFetch: ['userId', 'name', 'age'], 
    columnsToFetchDetails: ['userId', 'name', 'age', 'createdAt', 'updatedAt', 'passwordHash'],
    columnsForCreate: ['name', 'age', 'passwordHash'],
    columnsForUpdate: ['age'],
    columnsForFilters: ['userId', 'name'],
  })
}
```

## Knex repositories API

Following methods are exposed by AbstractRepository base class:

* `create(newEntityRow: NewEntityRow, transactionProvider?: Knex.TransactionProvider): Promise<FullEntityRow>` - inserts new row;
* `createBulk(newEntityRows: NewEntityRow[], transactionProvider?: Knex.TransactionProvider, chunkSize = 1000): Promise<FullEntityRow[]>` - inserts multiple new rows, returning inserted values. Does not return inserted values when using MySQL or SQLite;
* `createBulkNoReturning(newEntityRows: NewEntityRow[], transactionProvider?: Knex.TransactionProvider, chunkSize = 1000): Promise<void>` - inserts multiple new rows without returning inserted values;
* `updateById(id: string | number, updatedFields: UpdatedEntityRow, transactionProvider?: Knex.TransactionProvider, config?: { timeout?: number }): Promise<FullEntityRow | undefined>` - updates single row by id;
* `updateByCriteria(filterCriteria: Partial<FullEntityRow>, updatedFields: UpdatedEntityRow, transactionProvider?: Knex.TransactionProvider | null, sorting?: SortingParam<FullEntityRow>[] | null): Promise<FullEntityRow[]>` - updates zero or more rows by given criteria;
* `updateSingleByCriteria(filterCriteria: Partial<FullEntityRow>, updatedFields: UpdatedEntityRow, transactionProvider?: Knex.TransactionProvider | null): Promise<FullEntityRow>` - updates single row by a given criteria. If there are no rows or more than one, throws an error;
* `getById(id: string | number, columnsToFetch?: (keyof FullEntityRow & string)[], transactionProvider?: Knex.TransactionProvider | null): Promise<FullEntityRow | undefined>` - retrieves single row by id;
* `getByIdForUpdate(id: string | number, transactionProvider: Knex.TransactionProvider, columnsToFetch?: (keyof FullEntityRow & string)[]): Promise<FullEntityRow | undefined>` - retrieves single row by id, granting a row-level lock for provided transaction; 
* `getByCriteria(filterCriteria?: Partial<FullEntityRow>, sorting?: SortingParam<FullEntityRow>[] | null, columnsToFetch?: (keyof FullEntityRow & string)[], transactionProvider?: Knex.TransactionProvider | null): Promise<FullEntityRow[]>` - retrieves zero or more rows by given criteria;
* `getSingleByCriteria(filterCriteria: Partial<FullEntityRow>, columnsToFetch?: (keyof FullEntityRow & string)[]): Promise<FullEntityRow | undefined>` - retrieves single row or undefined by given criteria. Throws an error if more than single row is retrieved;
* `deleteById(id: string | number, transactionProvider?: Knex.TransactionProvider): Promise<void>` - deletes single row by id. 
* `deleteByCriteria(filterCriteria: Partial<FullEntityRow>, transactionProvider?: Knex.TransactionProvider): Promise<void>` - deletes zero or more rows by given criteria.

Note that both create and update methods are implemented in a way that works around lack of `returning` operation support in MySQL and SQLite. This results in additional SELECT query being done to retrieve missing data. If there is popular demand to make this functionality optional, there will be a disable option in the future.

[npm-image]: https://img.shields.io/npm/v/knex-repositories.svg
[npm-url]: https://npmjs.org/package/knex-repositories
