import { getChatwootConfig } from '@/lib/config'
import type {
  ChatwootContact,
  ChatwootContactPayload,
  ChatwootConversation,
  ChatwootMessage,
  ChatwootAgent,
  ChatwootTeam,
  ChatwootLabel,
  ChatwootCustomAttribute,
  ChatwootInbox,
} from './types'

class ChatwootApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
  ) {
    super(message)
    this.name = 'ChatwootApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const config = getChatwootConfig()
  if (!config.url || !config.apiToken || !config.accountId) {
    throw new Error('Chatwoot não configurado. Acesse Configurações para definir URL, token e conta.')
  }

  // Remove barra inicial para montar a rota do proxy
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const url = `/api/chatwoot/${cleanPath}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-chatwoot-url': config.url,
      'x-chatwoot-token': config.apiToken,
      'x-chatwoot-account-id': config.accountId,
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new ChatwootApiError(
      `Erro na API Chatwoot: ${response.status} ${response.statusText}`,
      response.status,
      url,
    )
  }

  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

export async function listContacts(page = 1, searchQuery?: string): Promise<{
  contacts: ChatwootContact[]
  totalCount: number
  currentPage: number
}> {
  const params = new URLSearchParams({ page: String(page) })
  if (searchQuery) params.set('q', searchQuery)

  const path = searchQuery ? `/search/contacts?${params}` : `/contacts?${params}`

  if (searchQuery) {
    const result = await request<{ payload: ChatwootContact[] }>(path)
    return {
      contacts: result.payload,
      totalCount: result.payload.length,
      currentPage: page,
    }
  }

  const result = await request<ChatwootContactPayload>(path)
  return {
    contacts: result.payload,
    totalCount: result.meta.count,
    currentPage: result.meta.current_page,
  }
}

export async function getContact(contactId: number): Promise<ChatwootContact> {
  return request<ChatwootContact>(`/contacts/${contactId}`)
}

export async function listContactConversations(contactId: number): Promise<ChatwootConversation[]> {
  const result = await request<{ payload: ChatwootConversation[] }>(
    `/contacts/${contactId}/conversations`,
  )
  return result.payload
}

export async function getConversationMessages(
  conversationId: number,
  before?: number,
): Promise<ChatwootMessage[]> {
  const params = new URLSearchParams()
  if (before) params.set('before', String(before))

  const result = await request<{ payload: ChatwootMessage[] }>(
    `/conversations/${conversationId}/messages?${params}`,
  )
  return result.payload
}

export async function updateContactCustomAttributes(
  contactId: number,
  customAttributes: Record<string, unknown>,
): Promise<ChatwootContact> {
  return request<ChatwootContact>(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({ custom_attributes: customAttributes }),
  })
}

export async function listCustomAttributes(
  model: 'contact_attribute' | 'conversation_attribute' = 'contact_attribute',
): Promise<ChatwootCustomAttribute[]> {
  const result = await request<{ data: ChatwootCustomAttribute[] }>(
    `/custom_attribute_definitions?attribute_model=${model}`,
  )
  return result.data
}

export async function listLabels(): Promise<ChatwootLabel[]> {
  const result = await request<{ payload: ChatwootLabel[] }>('/labels')
  return result.payload
}

export async function listAgents(): Promise<ChatwootAgent[]> {
  return request<ChatwootAgent[]>('/agents')
}

export async function listTeams(): Promise<ChatwootTeam[]> {
  return request<ChatwootTeam[]>('/teams')
}

export async function listInboxes(): Promise<ChatwootInbox[]> {
  const result = await request<{ payload: ChatwootInbox[] }>('/inboxes')
  return result.payload
}

export async function assignConversation(
  conversationId: number,
  agentId: number,
): Promise<void> {
  await request(`/conversations/${conversationId}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ assignee_id: agentId }),
  })
}

export async function updateConversationLabels(
  conversationId: number,
  labels: string[],
): Promise<{ payload: string[] }> {
  return request<{ payload: string[] }>(`/conversations/${conversationId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  })
}

export async function updateContactLabels(
  contactId: number,
  labels: string[],
): Promise<ChatwootContact> {
  return request<ChatwootContact>(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({ labels }),
  })
}

export async function createContact(data: {
  name: string
  email?: string
  phone_number?: string
}): Promise<ChatwootContact> {
  return request<ChatwootContact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function listConversations(
  page = 1,
  status: 'open' | 'resolved' | 'pending' = 'open',
): Promise<{ payload: ChatwootConversation[]; meta: { all_count: number } }> {
  const params = new URLSearchParams({ page: String(page), status })
  const result = await request<{
    data: {
      payload: ChatwootConversation[]
      meta: { all_count: number }
    }
  }>(`/conversations?${params}`)
  return result.data
}

export { ChatwootApiError }
