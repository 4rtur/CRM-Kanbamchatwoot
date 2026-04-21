import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL não configurada. Veja .env.example')
  }
  return url
}

const client = global.__dbClient ?? postgres(getConnectionString(), { max: 10 })

if (process.env.NODE_ENV !== 'production') {
  global.__dbClient = client
}

export const db = drizzle(client, { schema })
export { schema }
export type Database = typeof db
