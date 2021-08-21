import { getAllDbs, getKnexForDb } from './helpers/knexInstanceProvider'
import { Knex } from 'knex'
import { createUserTable, dropUserTable } from './helpers/tableCreator'
import { createUserRepository, UserRepository } from './helpers/UserRepository'

describe('AbstractRepository integration', () => {
  getAllDbs().forEach((db) => {
    describe(db, () => {
      let knex: Knex
      let userRepository: UserRepository
      beforeEach(async () => {
        knex = getKnexForDb(db)
        userRepository = createUserRepository(knex)
        await createUserTable(knex)
      })

      afterEach(async () => {
        await dropUserTable(knex)
        await knex.destroy()
      })

      describe('create', () => {
        it('creates new user', async function () {
          const result = await userRepository.create({
            name: 'test',
            age: 25,
          })

          // Returning is not supported yet for these dbs, we may have a separate smarter repo implementation hacking returning into it in the future
          if (
            knex.client.driverName.includes('mysql') ||
            knex.client.driverName.includes('sqlite')
          ) {
            return
          }

          expect(result).toMatchObject({
            userId: expect.any(Number),
            name: 'test',
            age: 25,
          })
        })
      })
    })
  })
})
