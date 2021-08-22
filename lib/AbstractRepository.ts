import { Knex } from 'knex'
import { copyWithoutUndefined, pickWithoutUndefined } from 'knex-utils'

export type SortingParam<FullEntityRow> = {
  column: keyof FullEntityRow & string
  order?: 'desc' | 'asc'
}

export type RepositoryConfig<NewEntityRow, FullEntityRow, UpdatedEntityRow> = {
  tableName: string
  columnsForCreate?: (keyof NewEntityRow & string)[]
  columnsForUpdate?: (keyof UpdatedEntityRow & string)[]
  columnsForGetFilters?: (keyof FullEntityRow & string)[]
  columnsToFetch: (keyof FullEntityRow & string)[]
  idColumn: keyof FullEntityRow & string
}

export class AbstractRepository<
  NewEntityRow extends Record<string, any> = any,
  FullEntityRow extends NewEntityRow = any,
  UpdatedEntityRow extends Record<string, any> = Partial<NewEntityRow>
> {
  protected readonly knex: Knex
  protected readonly tableName: string
  protected readonly columnsToFetch: string[]
  protected readonly idColumn: string
  private readonly columnsForCreate: string[]
  private readonly columnsForGetFilters?: string[]
  private readonly columnsForUpdate?: string[]

  constructor(knex: Knex, config: RepositoryConfig<NewEntityRow, FullEntityRow, UpdatedEntityRow>) {
    this.knex = knex

    this.tableName = config.tableName
    this.idColumn = config.idColumn
    this.columnsToFetch = config.columnsToFetch
    this.columnsForCreate = config.columnsForCreate ?? []
    this.columnsForGetFilters = config.columnsForGetFilters || undefined
    this.columnsForUpdate = config.columnsForUpdate || undefined
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

  async updateById(
    id: string | number,
    updatedFields: UpdatedEntityRow,
    transactionProvider?: Knex.TransactionProvider
  ) {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const updatedColumns = this.columnsForUpdate
      ? pickWithoutUndefined(updatedFields, this.columnsForUpdate)
      : copyWithoutUndefined(updatedFields)

    const updatedUserRows = await queryBuilder('users')
      .where({ [this.idColumn]: id })
      .update(updatedColumns)
      .returning(this.columnsToFetch)

    return updatedUserRows[0]
  }

  async getByCriteria(
    filterCriteria?: Partial<FullEntityRow>,
    sorting?: SortingParam<FullEntityRow>[]
  ): Promise<FullEntityRow[]> {
    const filters =
      filterCriteria && this.columnsForGetFilters
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
