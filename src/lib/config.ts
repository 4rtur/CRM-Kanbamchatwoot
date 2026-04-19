const STORAGE_KEY = 'chatwoot-crm-config'

export interface ChatwootConfig {
  url: string
  apiToken: string
  accountId: string
}

function getFromStorage(): Partial<ChatwootConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Partial<ChatwootConfig>
  } catch {
    // ignore parse errors
  }
  return {}
}

export function getChatwootConfig(): ChatwootConfig {
  const stored = getFromStorage()
  return {
    url: stored.url || process.env.NEXT_PUBLIC_CHATWOOT_URL || '',
    apiToken: stored.apiToken || process.env.NEXT_PUBLIC_CHATWOOT_API_TOKEN || '',
    accountId: stored.accountId || process.env.NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID || '',
  }
}

export function saveChatwootConfig(config: ChatwootConfig): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function isConfigured(): boolean {
  const config = getChatwootConfig()
  return Boolean(config.url && config.apiToken && config.accountId)
}
