import { Knex } from 'knex'
import { copyWithoutUndefined, pickWithoutUndefined } from 'knex-utils'

export type SortingParam = {
  column: string
  order?: 'desc' | 'asc'
}

export type RepositoryConfig<NewEntityRow, FullEntityRow> = {
  tableName: string
  columnsForCreate?: (keyof NewEntityRow & string)[]
  columnsForGetFilters?: (keyof FullEntityRow & string)[]
  columnsToFetch: (keyof FullEntityRow & string)[]
  idColumn: keyof FullEntityRow & string
}

export class AbstractRepository<
  NewEntityRow extends Record<string, any> = any,
  FullEntityRow extends NewEntityRow = any
> {
  protected readonly knex: Knex
  protected readonly tableName: string
  protected readonly columnsToFetch: string[]
  protected readonly idColumn: string
  private readonly columnsForGetFilters: string[]
  private readonly columnsForCreate: string[]

  constructor(knex: Knex, config: RepositoryConfig<NewEntityRow, FullEntityRow>) {
    this.knex = knex

    this.tableName = config.tableName
    this.idColumn = config.idColumn
    this.columnsToFetch = config.columnsToFetch
    this.columnsForCreate = config.columnsForCreate ?? []
    this.columnsForGetFilters = config.columnsForGetFilters ?? []
  }

  async create(
    newEntityRow: NewEntityRow,
    transactionProvider?: Knex.TransactionProvider
  ): Promise<FullEntityRow> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const insertRow = pickWithoutUndefined(newEntityRow, this.columnsForCreate)

    const insertedRows = await queryBuilder(this.tableName)
      .insert(insertRow)
      .returning(this.columnsToFetch)
    return insertedRows[0]
  }

  async get(
    filterCriteria?: Record<string, any>,
    sorting?: SortingParam[]
  ): Promise<FullEntityRow[]> {
    const filters = filterCriteria
      ? pickWithoutUndefined(filterCriteria, this.columnsForGetFilters)
      : {}

    const queryBuilder = this.knex(this.tableName).select(this.columnsToFetch).where(filters)

    if (sorting) {
      queryBuilder.orderBy(sorting)
    }

    const result = await queryBuilder
    return result
  }

  async deleteById(
    id: string | number,
    transactionProvider?: Knex.TransactionProvider
  ): Promise<void> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    await queryBuilder(this.tableName)
      .where({
        [this.idColumn]: id,
      })
      .del()
  }

  getTransactionProvider(): any {
    return this.knex.transactionProvider()
  }

  async commitTransaction(transactionProvider: Knex.TransactionProvider): Promise<void> {
    const trx = await transactionProvider()
    await trx.commit()
  }

  async rollbackTransaction(transactionProvider: Knex.TransactionProvider): Promise<void> {
    const trx = await transactionProvider()
    await trx.rollback()
  }

  async getKnexOrTransaction(transactionProvider?: Knex.TransactionProvider): Promise<Knex> {
    return transactionProvider ? await transactionProvider() : this.knex
  }
}
