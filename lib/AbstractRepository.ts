import { Knex } from 'knex'
import { copyWithoutUndefined } from 'knex-utils'

export type RepositoryConfig = {
  tableName: string
  tableColumnsToFetch: string[]
}

export class AbstractRepository<
  NewEntityRow extends Record<string, any> = any,
  FullEntityRow extends NewEntityRow = any
> {
  protected readonly knex: Knex
  protected tableName: string
  protected tableColumnsToFetch: string[]

  constructor(knex: Knex, config: RepositoryConfig) {
    this.knex = knex

    this.tableName = config.tableName
    this.tableColumnsToFetch = config.tableColumnsToFetch
  }

  async create(newEntityRow: NewEntityRow): Promise<FullEntityRow> {
    const insertRow = copyWithoutUndefined(newEntityRow)

    const insertedRows = await this.knex(this.tableName)
      .insert(insertRow)
      .returning(this.tableColumnsToFetch)
    return insertedRows[0]
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
