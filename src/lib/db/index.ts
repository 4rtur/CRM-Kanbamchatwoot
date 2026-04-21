import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DbInstance = PostgresJsDatabase<typeof schema>

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined
  // eslint-disable-next-line no-var
  var __dbInstance: DbInstance | undefined
}

function createClient(): postgres.Sql {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL não configurada. Configure em runtime via env vars do container.',
    )
  }
  return postgres(url, { max: 10 })
}

function getDb(): DbInstance {
  if (globalThis.__dbInstance) return globalThis.__dbInstance
  const client = globalThis.__dbClient ?? createClient()
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__dbClient = client
  }
  const instance = drizzle(client, { schema })
  globalThis.__dbInstance = instance
  return instance
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>
    return real[prop]
  },
  has(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>
    return prop in real
  },
})

export { schema }
export type Database = DbInstance
