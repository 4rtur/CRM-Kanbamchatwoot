'use client'

const LS_KEYS = {
  pipelines: 'chatwoot-crm-pipelines',
  cardsExtra: 'chatwoot-crm-cards-extra',
  products: 'chatwoot-crm-products',
  automations: 'chatwoot-crm-automations',
  accessControl: 'chatwoot-crm-access-control',
} as const

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

export async function migrateFromLocalStorage(): Promise<{
  migrated: boolean
  report: Record<string, number>
}> {
  const payload = {
    pipelines: readJson<unknown[]>(LS_KEYS.pipelines) ?? undefined,
    cardsExtra: readJson<Record<string, unknown>>(LS_KEYS.cardsExtra) ?? undefined,
    products: readJson<unknown[]>(LS_KEYS.products) ?? undefined,
    automations: readJson<unknown[]>(LS_KEYS.automations) ?? undefined,
    accessControl: readJson<Record<string, unknown>>(LS_KEYS.accessControl) ?? undefined,
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
    data?: { migrated: boolean; report: Record<string, number> }
    error?: unknown
  }

  if (!body.success || !body.data) {
    throw new Error(
      typeof body.error === 'string' ? body.error : 'API retornou erro na migração',
    )
  }

  return body.data
}

export function archiveLocalStorage(): void {
  if (typeof window === 'undefined') return
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  for (const key of Object.values(LS_KEYS)) {
    const value = window.localStorage.getItem(key)
    if (value != null) {
      window.localStorage.setItem(`${key}__archived_${stamp}`, value)
      window.localStorage.removeItem(key)
    }
  }
}
