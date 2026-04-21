'use client'

import useSWR, { type KeyedMutator } from 'swr'
import type {
  Pipeline,
  Stage,
  CustomFieldDefinition,
  CustomFieldValue,
  Deal,
  Product,
  ChecklistItem,
  Note,
  AutomationRule,
} from '@/lib/db/schema'

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  error?: unknown
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
  const body = (await res.json()) as ApiEnvelope<T>
  if (!body.success || body.data === undefined) {
    throw new Error(typeof body.error === 'string' ? body.error : 'API retornou erro')
  }
  return body.data
}

export type PipelineWithStages = Pipeline & { stages: Stage[] }

export function useCrmPipelines(): {
  data: PipelineWithStages[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<PipelineWithStages[]>
} {
  const { data, error, isLoading, mutate } = useSWR<PipelineWithStages[]>(
    '/api/crm/pipelines',
    fetcher,
  )
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmCustomFields(appliesTo?: 'contact' | 'deal'): {
  data: CustomFieldDefinition[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<CustomFieldDefinition[]>
} {
  const query = appliesTo ? `?appliesTo=${appliesTo}` : ''
  const { data, error, isLoading, mutate } = useSWR<CustomFieldDefinition[]>(
    `/api/crm/custom-fields${query}`,
    fetcher,
  )
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmCustomFieldValues(
  entityType: 'contact' | 'deal',
  entityId: string | null | undefined,
): {
  data: CustomFieldValue[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<CustomFieldValue[]>
} {
  const key = entityId
    ? `/api/crm/custom-fields/values?entityType=${entityType}&entityId=${entityId}`
    : null
  const { data, error, isLoading, mutate } = useSWR<CustomFieldValue[]>(key, fetcher)
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmDeals(filter?: {
  pipelineId?: string
  stageId?: string
  status?: 'active' | 'won' | 'lost'
  contactId?: number
}): {
  data: Deal[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<Deal[]>
} {
  const params = new URLSearchParams()
  if (filter?.pipelineId) params.set('pipelineId', filter.pipelineId)
  if (filter?.stageId) params.set('stageId', filter.stageId)
  if (filter?.status) params.set('status', filter.status)
  if (filter?.contactId) params.set('contactId', String(filter.contactId))
  const query = params.toString()
  const url = `/api/crm/deals${query ? `?${query}` : ''}`
  const { data, error, isLoading, mutate } = useSWR<Deal[]>(url, fetcher)
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmProducts(): {
  data: Product[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<Product[]>
} {
  const { data, error, isLoading, mutate } = useSWR<Product[]>('/api/crm/products', fetcher)
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmChecklists(dealId: string | null | undefined): {
  data: ChecklistItem[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<ChecklistItem[]>
} {
  const key = dealId ? `/api/crm/checklists?dealId=${dealId}` : null
  const { data, error, isLoading, mutate } = useSWR<ChecklistItem[]>(key, fetcher)
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmNotes(filter: { contactId?: number; dealId?: string }): {
  data: Note[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<Note[]>
} {
  const params = new URLSearchParams()
  if (filter.contactId) params.set('contactId', String(filter.contactId))
  if (filter.dealId) params.set('dealId', filter.dealId)
  const query = params.toString()
  const url = query ? `/api/crm/notes?${query}` : null
  const { data, error, isLoading, mutate } = useSWR<Note[]>(url, fetcher)
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export function useCrmAutomations(pipelineId?: string): {
  data: AutomationRule[] | undefined
  error: Error | undefined
  isLoading: boolean
  mutate: KeyedMutator<AutomationRule[]>
} {
  const query = pipelineId ? `?pipelineId=${pipelineId}` : ''
  const { data, error, isLoading, mutate } = useSWR<AutomationRule[]>(
    `/api/crm/automations${query}`,
    fetcher,
  )
  return { data, error: error as Error | undefined, isLoading, mutate }
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = (await res.json()) as ApiEnvelope<T>
  if (!res.ok || !body.success || body.data === undefined) {
    throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`)
  }
  return body.data
}
