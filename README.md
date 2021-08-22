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
    columnsToFetch: ['userId', 'name', 'age'], 
    columnsToFetchDetails: ['userId', 'name', 'age', 'createdAt', 'updatedAt', 'passwordHash'],
    columnsForCreate: ['name', 'age', 'passwordHash'],
    columnsForUpdate: ['age'],
    columnsForGetFilters: ['name'],
  })
}
```

## Knex repositories API

Following methods are exposed by AbstractRepository base class:

* `create(newEntityRow: NewEntityRow, transactionProvider?: Knex.TransactionProvider): Promise<FullEntityRow>` - inserts new row;
* `updateById(id: string | number, updatedFields: UpdatedEntityRow, transactionProvider?: Knex.TransactionProvider): Promise<FullEntityRow | undefined>` - updates single row by id;
* `getById(id: string | number, columnsToFetch?: (keyof FullEntityRow & string)[]): Promise<FullEntityRow | undefined>` - retrieves single row by id;
* `getByCriteria(filterCriteria?: Partial<FullEntityRow>, sorting?: SortingParam<FullEntityRow>[] | null, columnsToFetch?: (keyof FullEntityRow & string)[]): Promise<FullEntityRow[]>` - retrieves zero or more rows by given criteria;
* `deleteById(id: string | number, transactionProvider?: Knex.TransactionProvider): Promise<void>` - deletes single row by id. 

[npm-image]: https://img.shields.io/npm/v/knex-repositories.svg
[npm-url]: https://npmjs.org/package/knex-repositories
