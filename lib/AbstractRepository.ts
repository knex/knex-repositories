import { Knex } from 'knex'
import { copyWithoutUndefined, pickWithoutUndefined } from 'knex-utils'
import { NonUniqueResultError } from './NonUniqueResultError'

export type SortingParam<FullEntityRow> = {
  column: keyof FullEntityRow & string
  order?: 'desc' | 'asc'
}

export type RepositoryConfig<NewEntityRow, FullEntityRow, UpdatedEntityRow> = {
  tableName: string
  idColumn: keyof FullEntityRow & string
  defaultOrderBy?: SortingParam<FullEntityRow>[]
  columnsForCreate?: (keyof NewEntityRow & string)[]
  columnsForUpdate?: (keyof UpdatedEntityRow & string)[]
  columnsForGetFilters?: (keyof FullEntityRow & string)[]
  columnsToFetch: (keyof FullEntityRow & string)[]
  columnsToFetchList?: (keyof FullEntityRow & string)[]
  columnsToFetchDetails?: (keyof FullEntityRow & string)[]
}

export class AbstractRepository<
  NewEntityRow extends Record<string, any> = any,
  FullEntityRow extends NewEntityRow = any,
  UpdatedEntityRow extends Record<string, any> = Partial<NewEntityRow>
> {
  protected readonly knex: Knex
  protected readonly tableName: string
  protected readonly columnsToFetch: string[]
  protected readonly columnsToFetchList: string[]
  protected readonly columnsToFetchDetails: string[]
  protected readonly idColumn: string
  protected readonly defaultOrderBy?: SortingParam<FullEntityRow>[]
  private readonly columnsForCreate: string[]
  private readonly columnsForGetFilters?: string[]
  private readonly columnsForUpdate?: string[]

  constructor(knex: Knex, config: RepositoryConfig<NewEntityRow, FullEntityRow, UpdatedEntityRow>) {
    this.knex = knex

    this.tableName = config.tableName
    this.idColumn = config.idColumn
    this.defaultOrderBy = config.defaultOrderBy
    this.columnsToFetch = config.columnsToFetch
    this.columnsToFetchList = config.columnsToFetch ?? config.columnsToFetch
    this.columnsToFetchDetails = config.columnsToFetch ?? config.columnsToFetch
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
  ): Promise<FullEntityRow | undefined> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const updatedColumns = this.columnsForUpdate
      ? pickWithoutUndefined(updatedFields, this.columnsForUpdate)
      : copyWithoutUndefined(updatedFields)

    const updatedUserRows = await queryBuilder(this.tableName)
      .where({ [this.idColumn]: id })
      .update(updatedColumns)
      .returning(this.columnsToFetch)

    return updatedUserRows[0]
  }

  async updateByCriteria(
    filterCriteria: Partial<FullEntityRow>,
    updatedFields: UpdatedEntityRow,
    transactionProvider?: Knex.TransactionProvider | null,
    sorting?: SortingParam<FullEntityRow>[] | null
  ): Promise<FullEntityRow[]> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const updatedColumns = this.columnsForUpdate
      ? pickWithoutUndefined(updatedFields, this.columnsForUpdate)
      : copyWithoutUndefined(updatedFields)
    const filters = this.columnsForGetFilters
      ? pickWithoutUndefined(filterCriteria, this.columnsForGetFilters)
      : copyWithoutUndefined(filterCriteria)

    const updatedUserRows = await queryBuilder(this.tableName)
      .where(filters)
      .update(updatedColumns)
      .returning(this.columnsToFetch)

    const sortParam = sorting ?? this.defaultOrderBy
    if (sortParam) {
      queryBuilder.orderBy(sortParam)
    }

    return updatedUserRows
  }

  async getById(
    id: string | number,
    columnsToFetch?: (keyof FullEntityRow & string)[]
  ): Promise<FullEntityRow | undefined> {
    const result = await this.knex(this.tableName)
      .where({ [this.idColumn]: id })
      .select(columnsToFetch ?? this.columnsToFetchDetails)
    return result?.[0]
  }

  async getByCriteria(
    filterCriteria?: Partial<FullEntityRow>,
    sorting?: SortingParam<FullEntityRow>[] | null,
    columnsToFetch?: (keyof FullEntityRow & string)[]
  ): Promise<FullEntityRow[]> {
    let filters
    if (filterCriteria) {
      filters = this.columnsForGetFilters
        ? pickWithoutUndefined(filterCriteria, this.columnsForGetFilters)
        : copyWithoutUndefined(filterCriteria)
    } else {
      filters = {}
    }

    const queryBuilder = this.knex(this.tableName)
      .select(columnsToFetch ?? this.columnsToFetchList)
      .where(filters)

    const sortParam = sorting ?? this.defaultOrderBy
    if (sortParam) {
      queryBuilder.orderBy(sortParam)
    }

    const result = await queryBuilder
    return result
  }

  async getSingleByCriteria(
    filterCriteria: Partial<FullEntityRow>,
    columnsToFetch?: (keyof FullEntityRow & string)[]
  ): Promise<FullEntityRow | undefined> {
    const result = await this.getByCriteria(
      filterCriteria,
      null,
      columnsToFetch ?? this.columnsToFetchDetails
    )
    if (result.length > 1) {
      throw new NonUniqueResultError('Query resulted more than in a single result', filterCriteria)
    }
    return result[0]
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

  createTransactionProvider(): Knex.TransactionProvider {
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

  async getKnexOrTransaction(transactionProvider?: Knex.TransactionProvider | null): Promise<Knex> {
    return transactionProvider ? await transactionProvider() : this.knex
  }
}
