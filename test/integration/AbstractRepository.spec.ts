import { getAllDbs, getKnexForDb } from './helpers/knexInstanceProvider'
import { Knex } from 'knex'
import { createUserTable, dropUserTable } from './helpers/tableCreator'
import { createUserRepository, UserRepository } from './repositories/UserRepository'

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

      const USER_1 = {
        name: 'test',
        age: 25,
      }

      const USER_2 = {
        name: 'test2',
        age: 30,
      }

      const assertUser1 = {
        userId: expect.any(Number),
        name: 'test',
        age: 25,
      }

      const assertUser2 = {
        userId: expect.any(Number),
        name: 'test2',
        age: 30,
      }

      describe('create', () => {
        it('creates new user', async () => {
          const result = await userRepository.create(USER_1)

          // Returning is not supported yet for these dbs, we may have a separate smarter repo implementation hacking returning into it in the future
          if (
            knex.client.driverName.includes('mysql') ||
            knex.client.driverName.includes('sqlite')
          ) {
            return
          }

          expect(result).toMatchObject(assertUser1)
        })
      })

      describe('getByCriteria', () => {
        it('returns users', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getByCriteria()

          expect(result).toMatchObject([assertUser1, assertUser2])
        })

        it('supports empty filter', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getByCriteria({})

          expect(result).toMatchObject([assertUser1, assertUser2])
        })

        it('supports sorting', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getByCriteria({}, [
            {
              column: 'userId',
              order: 'desc',
            },
          ])

          expect(result).toMatchObject([assertUser2, assertUser1])
        })

        it('supports filtering', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getByCriteria({
            name: 'test',
          })

          expect(result).toMatchObject([assertUser1])
        })

        it('skips unsupported filtering', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getByCriteria({
            age: 30,
          })

          expect(result).toMatchObject([assertUser1, assertUser2])
        })
      })

      describe('getSingleByCriteria', () => {
        it('returns user', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getSingleByCriteria({ name: USER_2.name })

          expect(result).toMatchObject(assertUser2)
        })

        it('throws an error if more than one result', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          await expect(userRepository.getSingleByCriteria({})).rejects.toThrow(
            /Query resulted more than in a single result/
          )
        })

        it('can return undefined', async () => {
          const result = await userRepository.getSingleByCriteria({})

          expect(result).toBeUndefined()
        })

        it('supports columns to fetch', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          const result = await userRepository.getSingleByCriteria(
            {
              name: 'test',
            },
            ['userId']
          )

          expect(result).toMatchObject({
            userId: expect.any(Number),
          })
        })

        it('skips unsupported filtering', async () => {
          await userRepository.create({
            ...USER_1,
            age: 25,
          })

          const result = await userRepository.getSingleByCriteria({
            age: 30,
          })

          expect(result).toMatchObject(assertUser1)
        })
      })

      describe('updateById', () => {
        it('updates supported fields', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)
          const users1 = await userRepository.getByCriteria({
            name: 'test',
          })
          const [user1] = users1

          await userRepository.updateById(user1.userId, {
            age: 11,
            name: 'test14',
          })
          const users = await userRepository.getByCriteria({}, [
            {
              column: 'userId',
              order: 'desc',
            },
          ])

          expect(users).toMatchObject([
            assertUser2,
            {
              ...assertUser1,
              age: 11,
              name: 'test',
            },
          ])
        })
      })

      describe('updateByCriteria', () => {
        it('updates supported fields', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)

          await userRepository.updateByCriteria(
            {
              name: USER_1.name,
            },
            {
              age: 11,
              name: 'test14',
            }
          )
          const users = await userRepository.getByCriteria({}, [
            {
              column: 'userId',
              order: 'desc',
            },
          ])

          expect(users).toMatchObject([
            assertUser2,
            {
              ...assertUser1,
              age: 11,
              name: 'test',
            },
          ])
        })
      })

      describe('deleteById', () => {
        it('deletes user', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)
          const users1 = await userRepository.getByCriteria({
            name: 'test',
          })

          await userRepository.deleteById(users1[0].userId)
          const users2 = await userRepository.getByCriteria()

          expect(users2).toMatchObject([assertUser2])
        })
      })

      describe('getById', () => {
        it('retrieves user details', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)
          const users1 = await userRepository.getByCriteria({
            name: 'test',
          })
          const [user1] = users1

          const user = await userRepository.getById(user1.userId)
          const assertDates = knex.client.driverName.includes('sqlite')
            ? {
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              }
            : { createdAt: expect.any(Date), updatedAt: expect.any(Date) }
          expect(user).toMatchObject({
            ...assertUser1,
            ...assertDates,
          })
        })
      })

      describe('rollbackTransaction', () => {
        it('rolls back changes', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)
          const users1 = await userRepository.getByCriteria({
            name: 'test',
          })
          const [user1] = users1

          const trxProvider = userRepository.createTransactionProvider()
          await userRepository.updateById(
            user1.userId,
            {
              age: 11,
              name: 'test14',
            },
            trxProvider
          )
          await userRepository.rollbackTransaction(trxProvider)

          const users = await userRepository.getByCriteria({}, [
            {
              column: 'userId',
              order: 'desc',
            },
          ])

          expect(users).toMatchObject([assertUser2, assertUser1])
        })
      })

      describe('commitTransaction', () => {
        it('commits changes', async () => {
          await userRepository.create(USER_1)
          await userRepository.create(USER_2)
          const users1 = await userRepository.getByCriteria({
            name: 'test',
          })
          const [user1] = users1

          const trxProvider = userRepository.createTransactionProvider()
          await userRepository.updateById(
            user1.userId,
            {
              age: 11,
              name: 'test14',
            },
            trxProvider
          )
          await userRepository.commitTransaction(trxProvider)

          const users = await userRepository.getByCriteria({}, [
            {
              column: 'userId',
              order: 'desc',
            },
          ])

          expect(users).toMatchObject([
            assertUser2,
            {
              ...assertUser1,
              age: 11,
              name: 'test',
            },
          ])
        })
      })
    })
  })
})
