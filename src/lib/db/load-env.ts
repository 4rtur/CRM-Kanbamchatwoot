import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'

const cwd = process.cwd()
const candidates = ['.env.local', '.env']

for (const file of candidates) {
  const abs = resolve(cwd, file)
  if (existsSync(abs)) {
    config({ path: abs })
  }
}
