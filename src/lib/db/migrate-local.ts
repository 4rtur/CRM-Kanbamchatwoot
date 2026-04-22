'use client'

const LS_KEYS = {
  pipelines: 'chatwoot-crm-pipelines',
  cardsExtra: 'chatwoot-crm-cards-extra',
  products: 'chatwoot-crm-products',
  automations: 'chatwoot-crm-automations',
  accessControl: 'chatwoot-crm-access-control',
  categories: 'chatwoot-crm-categories',
} as const

const MIGRATED_FLAG = 'chatwoot-crm-migrated-to-db'

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function hasLocalDataToMigrate(): boolean {
  if (typeof window === 'undefined') return false
  return Object.values(LS_KEYS).some((key) => window.localStorage.getItem(key) != null)
}

export function wasMigrated(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(MIGRATED_FLAG) === 'true'
}

export function markMigrated(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MIGRATED_FLAG, 'true')
}

export interface MigrationSummary {
  pipelines: number
  stages: number
  products: number
  notes: number
  checklistItems: number
  customFieldValues: number
  automations: number
  categories: number
}

/**
 * Lê chaves de localStorage, faz upload para /api/crm/migrate e grava flag.
 * Retorna o relatório da API. Não arquiva o localStorage — isso é passo manual.
 */
export async function migrateLocalToDb(): Promise<{
  migrated: boolean
  report: MigrationSummary
}> {
  const payload = {
    pipelines: readJson<unknown[]>(LS_KEYS.pipelines) ?? undefined,
    cardsExtra: readJson<Record<string, unknown>>(LS_KEYS.cardsExtra) ?? undefined,
    products: readJson<unknown[]>(LS_KEYS.products) ?? undefined,
    automations: readJson<unknown[]>(LS_KEYS.automations) ?? undefined,
    accessControl: readJson<Record<string, unknown>>(LS_KEYS.accessControl) ?? undefined,
    categories: readJson<unknown[]>(LS_KEYS.categories) ?? undefined,
  }

  const res = await fetch('/api/crm/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Migração falhou: HTTP ${res.status}`)
  }

  const body = (await res.json()) as {
    success: boolean
    data?: { migrated: boolean; report: MigrationSummary }
    error?: unknown
  }

  if (!body.success || !body.data) {
    throw new Error(
      typeof body.error === 'string' ? body.error : 'API retornou erro na migração',
    )
  }

  markMigrated()
  return body.data
}

/**
 * Migra automaticamente na primeira carga se houver dados locais e ainda não
 * tiver sido migrado. Falhas são silenciosas (retorna null) para não quebrar
 * o boot da aplicação.
 */
export async function autoMigrateIfNeeded(): Promise<MigrationSummary | null> {
  if (typeof window === 'undefined') return null
  if (wasMigrated()) return null
  if (!hasLocalDataToMigrate()) {
    markMigrated()
    return null
  }

  try {
    const result = await migrateLocalToDb()
    return result.report
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[migrate-local] auto-migração falhou:', error)
    return null
  }
}
