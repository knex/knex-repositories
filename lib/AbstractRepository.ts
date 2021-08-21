import { Knex } from 'knex'
import { copyWithoutUndefined, pickWithoutUndefined } from 'knex-utils'

export type SortingParam = {
  column: string
  order?: 'desc' | 'asc'
}

export type RepositoryConfig = {
  tableName: string
  tableColumnsToFetch: string[]
  idColumn: string
  filterColumns?: string[]
}

export class AbstractRepository<
  NewEntityRow extends Record<string, any> = any,
  FullEntityRow extends NewEntityRow = any
> {
  protected readonly knex: Knex
  protected tableName: string
  protected tableColumnsToFetch: string[]
  protected idColumn: string
  protected filterColumns: string[]

  constructor(knex: Knex, config: RepositoryConfig) {
    this.knex = knex

    this.tableName = config.tableName
    this.tableColumnsToFetch = config.tableColumnsToFetch
    this.idColumn = config.idColumn
    this.filterColumns = config.filterColumns ?? []
  }

  async create(
    newEntityRow: NewEntityRow,
    transactionProvider?: Knex.TransactionProvider
  ): Promise<FullEntityRow> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const insertRow = copyWithoutUndefined(newEntityRow)

    const insertedRows = await queryBuilder(this.tableName)
      .insert(insertRow)
      .returning(this.tableColumnsToFetch)
    return insertedRows[0]
  }

  async get(
    filterCriteria?: Record<string, any>,
    sorting?: SortingParam[]
  ): Promise<FullEntityRow[]> {
    const filters = filterCriteria ? pickWithoutUndefined(filterCriteria, this.filterColumns) : {}

    const queryBuilder = this.knex(this.tableName).select(this.tableColumnsToFetch).where(filters)

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
