import { Knex } from 'knex'
import { chunk, copyWithoutUndefined, pickWithoutUndefined } from 'knex-utils'
import { NonUniqueResultError } from './NonUniqueResultError'
import { NoEntityExistsError } from './NoEntityExistsError'
import { doesSupportReturning, doesSupportUpdateOrderBy } from './dbSupportHelper'

export type SortingParam<FullEntityRow> = {
  column: keyof FullEntityRow & string
  order?: 'desc' | 'asc'
}

export type RepositoryConfig<NewEntityRow, FullEntityRow, UpdatedEntityRow, Filters> = {
  tableName: string
  idColumn: keyof FullEntityRow & string
  defaultOrderBy?: SortingParam<FullEntityRow>[]
  columnsForCreate?: (keyof NewEntityRow & string)[]
  columnsForUpdate?: (keyof UpdatedEntityRow & string)[]
  columnsForFilters?: (keyof Filters & string)[]
  columnsToFetch: (keyof FullEntityRow & string)[]
  columnsToFetchList?: (keyof FullEntityRow & string)[]
  columnsToFetchDetails?: (keyof FullEntityRow & string)[]
}

export type UpdateConfig = {
  timeout?: number
}

export class AbstractRepository<
  NewEntityRow extends Record<string, any> = any,
  FullEntityRow extends NewEntityRow = any,
  UpdatedEntityRow extends Record<string, any> = Partial<NewEntityRow>,
  Filters extends Record<string, any> = Partial<FullEntityRow>
> {
  protected readonly knex: Knex
  protected readonly tableName: string
  protected readonly columnsToFetch: string[]
  protected readonly columnsToFetchList: string[]
  protected readonly columnsToFetchDetails: string[]
  protected readonly idColumn: string
  protected readonly defaultOrderBy?: SortingParam<FullEntityRow>[]
  private readonly columnsForCreate: string[]
  private readonly columnsForFilters?: string[]
  private readonly columnsForUpdate?: string[]

  constructor(
    knex: Knex,
    config: RepositoryConfig<NewEntityRow, FullEntityRow, UpdatedEntityRow, Filters>
  ) {
    this.knex = knex

    this.tableName = config.tableName
    this.idColumn = config.idColumn
    this.defaultOrderBy = config.defaultOrderBy
    this.columnsToFetch = config.columnsToFetch
    this.columnsToFetchList = config.columnsToFetch ?? config.columnsToFetch
    this.columnsToFetchDetails = config.columnsToFetch ?? config.columnsToFetch
    this.columnsForCreate = config.columnsForCreate ?? []
    this.columnsForFilters = config.columnsForFilters || undefined
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

    if (!doesSupportReturning(this.knex)) {
      const insertedRow = await this.getById(insertedRows[0], undefined, transactionProvider)
      return insertedRow!
    }

    return insertedRows[0]
  }

  async createBulk(
    newEntityRows: NewEntityRow[],
    transactionProvider?: Knex.TransactionProvider,
    chunkSize = 1000
  ): Promise<FullEntityRow[]> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const insertRows = newEntityRows.map((newEntityRow) =>
      pickWithoutUndefined(newEntityRow, this.columnsForCreate)
    )

    const chunks = chunk(insertRows, chunkSize)

    const insertedRows = []
    for (const rows of chunks) {
      insertedRows.push(
        ...(await queryBuilder(this.tableName).insert(rows).returning(this.columnsToFetch))
      )
    }

    return insertedRows
  }

  async createBulkNoReturning(
    newEntityRows: NewEntityRow[],
    transactionProvider?: Knex.TransactionProvider,
    chunkSize = 1000
  ): Promise<void> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const insertRows = newEntityRows.map((newEntityRow) =>
      pickWithoutUndefined(newEntityRow, this.columnsForCreate)
    )

    const chunks = chunk(insertRows, chunkSize)

    for (const rows of chunks) {
      await queryBuilder(this.tableName).insert(rows)
    }
  }

  async updateById(
    id: string | number,
    updatedFields: UpdatedEntityRow,
    transactionProvider?: Knex.TransactionProvider,
    updateConfig: UpdateConfig = {}
  ): Promise<FullEntityRow | undefined> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const updatedColumns = this.columnsForUpdate
      ? pickWithoutUndefined(updatedFields, this.columnsForUpdate)
      : copyWithoutUndefined(updatedFields)

    const qb = queryBuilder(this.tableName)
      .where({ [this.idColumn]: id })
      .update(updatedColumns)
      .returning(this.columnsToFetch)

    if (updateConfig.timeout) {
      qb.timeout(updateConfig.timeout)
    }

    const updatedUserRows = await qb

    return updatedUserRows[0]
  }

  async updateSingleByCriteria(
    filterCriteria: Filters,
    updatedFields: UpdatedEntityRow,
    transactionProvider?: Knex.TransactionProvider | null
  ): Promise<FullEntityRow> {
    const result = await this.updateByCriteria(filterCriteria, updatedFields, transactionProvider)

    let returningResult
    if (doesSupportReturning(this.knex)) {
      returningResult = result
    } else {
      returningResult = await this.getByCriteria(
        filterCriteria,
        undefined,
        this.columnsToFetchDetails,
        transactionProvider
      )
    }

    if (returningResult.length > 1) {
      throw new NonUniqueResultError('Query updated more than one row', filterCriteria)
    }
    if (returningResult.length === 0) {
      throw new NoEntityExistsError('Query updated no rows', filterCriteria)
    }
    return result[0]
  }

  async updateByCriteria(
    filterCriteria: Filters,
    updatedFields: UpdatedEntityRow,
    transactionProvider?: Knex.TransactionProvider | null,
    sorting?: SortingParam<FullEntityRow>[] | null
  ): Promise<FullEntityRow[]> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const updatedColumns = this.columnsForUpdate
      ? pickWithoutUndefined(updatedFields, this.columnsForUpdate)
      : copyWithoutUndefined(updatedFields)
    const filters = this.columnsForFilters
      ? pickWithoutUndefined(filterCriteria, this.columnsForFilters)
      : copyWithoutUndefined(filterCriteria)

    const qb = queryBuilder(this.tableName)
      .where(filters)
      .update(updatedColumns)
      .returning(this.columnsToFetch)

    const sortParam = sorting ?? this.defaultOrderBy
    if (doesSupportUpdateOrderBy(this.knex) && sortParam) {
      qb.orderBy(sortParam)
    }

    const result = await qb
    return result
  }

  async getById(
    id: string | number,
    columnsToFetch?: (keyof FullEntityRow & string)[],
    transactionProvider?: Knex.TransactionProvider | null
  ): Promise<FullEntityRow | undefined> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    const result = await queryBuilder(this.tableName)
      .where({ [this.idColumn]: id })
      .select(columnsToFetch ?? this.columnsToFetchDetails)
    return result?.[0]
  }

  async getByIdForUpdate(
    id: string | number,
    transactionProvider: Knex.TransactionProvider,
    columnsToFetch?: (keyof FullEntityRow & string)[]
  ): Promise<FullEntityRow | undefined> {
    const trx = await transactionProvider()
    const result = await this.knex(this.tableName)
      .transacting(trx)
      .forUpdate()
      .where({ [this.idColumn]: id })
      .select(columnsToFetch ?? this.columnsToFetchDetails)
    return result?.[0]
  }

  async getByCriteria(
    filterCriteria?: Filters,
    sorting?: SortingParam<FullEntityRow>[] | null,
    columnsToFetch?: (keyof FullEntityRow & string)[],
    transactionProvider?: Knex.TransactionProvider | null
  ): Promise<FullEntityRow[]> {
    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    let filters
    if (filterCriteria) {
      filters = this.columnsForFilters
        ? pickWithoutUndefined(filterCriteria, this.columnsForFilters)
        : copyWithoutUndefined(filterCriteria)
    } else {
      filters = {}
    }

    const qb = queryBuilder(this.tableName)
      .select(columnsToFetch ?? this.columnsToFetchList)
      .where(filters)

    const sortParam = sorting ?? this.defaultOrderBy
    if (sortParam) {
      qb.orderBy(sortParam)
    }

    const result = await qb
    return result
  }

  async getSingleByCriteria(
    filterCriteria: Filters,
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

  async deleteByCriteria(
    filterCriteria: Filters,
    transactionProvider?: Knex.TransactionProvider
  ): Promise<void> {
    const filters = this.columnsForFilters
      ? pickWithoutUndefined(filterCriteria, this.columnsForFilters)
      : copyWithoutUndefined(filterCriteria)

    const queryBuilder = await this.getKnexOrTransaction(transactionProvider)
    await queryBuilder(this.tableName).where(filters).del()
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
