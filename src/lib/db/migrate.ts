import './load-env'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não configurada')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client)

  console.log('Aplicando migrations...')
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' })
  console.log('Migrations aplicadas.')

  await client.end()
}

main().catch((error: unknown) => {
  console.error('Migration falhou:', error)
  process.exit(1)
})
