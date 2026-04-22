'use client'

import type { CrmPipeline, CrmStage, CrmProduct, CrmAutomationRule } from '@/lib/chatwoot/types'
import type {
  Pipeline as DbPipeline,
  Stage as DbStage,
  Product as DbProduct,
  AutomationRule as DbAutomationRule,
} from '@/lib/db/schema'

type ApiEnvelope<T> = { success: boolean; data?: T; error?: unknown }

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = (await res.json()) as ApiEnvelope<T>
  if (!res.ok || !body.success || body.data === undefined) {
    const msg =
      typeof body.error === 'string'
        ? body.error
        : `HTTP ${res.status} em ${path}`
    throw new Error(msg)
  }
  return body.data
}

function dbStageToLocal(s: DbStage): CrmStage {
  return { id: s.id, name: s.name, color: s.color, order: s.order }
}

function dbPipelineToLocal(p: DbPipeline & { stages: DbStage[] }): CrmPipeline {
  return {
    id: p.id,
    name: p.name,
    stages: p.stages.map(dbStageToLocal).sort((a, b) => a.order - b.order),
    createdAt: String(p.createdAt),
  }
}

function dbProductToLocal(p: DbProduct): CrmProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    price: Number(p.price),
  }
}

function dbAutomationToLocal(r: DbAutomationRule): CrmAutomationRule {
  return {
    id: r.id,
    name: r.name,
    pipelineId: r.pipelineId,
    enabled: r.enabled,
    condition: {
      type: r.conditionType as CrmAutomationRule['condition']['type'],
      value: String(r.conditionValue ?? ''),
    },
    action: {
      type: r.actionType as CrmAutomationRule['action']['type'],
      value: String(r.actionValue ?? ''),
    },
  }
}

export async function fetchPipelinesFromDb(): Promise<CrmPipeline[]> {
  const data = await apiFetch<Array<DbPipeline & { stages: DbStage[] }>>(
    '/api/crm/pipelines',
  )
  return data.map(dbPipelineToLocal)
}

export async function createPipelineInDb(pipeline: CrmPipeline): Promise<CrmPipeline> {
  await apiFetch<DbPipeline>('/api/crm/pipelines', {
    method: 'POST',
    body: JSON.stringify({ name: pipeline.name }),
  })
  return pipeline
}

export async function updatePipelineInDb(pipeline: CrmPipeline): Promise<void> {
  await apiFetch(`/api/crm/pipelines/${pipeline.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: pipeline.name }),
  })
}

export async function deletePipelineInDb(id: string): Promise<void> {
  await apiFetch(`/api/crm/pipelines/${id}`, { method: 'DELETE' })
}

export async function createStageInDb(
  pipelineId: string,
  stage: CrmStage,
  type: 'entry' | 'middle' | 'won' | 'lost' = 'middle',
): Promise<void> {
  await apiFetch('/api/crm/stages', {
    method: 'POST',
    body: JSON.stringify({
      pipelineId,
      name: stage.name,
      color: stage.color,
      order: stage.order,
      type,
    }),
  })
}

export async function updateStageInDb(stage: CrmStage): Promise<void> {
  await apiFetch(`/api/crm/stages/${stage.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: stage.name,
      color: stage.color,
      order: stage.order,
    }),
  })
}

export async function deleteStageInDb(id: string): Promise<void> {
  await apiFetch(`/api/crm/stages/${id}`, { method: 'DELETE' })
}

export async function fetchProductsFromDb(): Promise<CrmProduct[]> {
  const data = await apiFetch<DbProduct[]>('/api/crm/products')
  return data.map(dbProductToLocal)
}

export async function createProductInDb(product: CrmProduct): Promise<CrmProduct> {
  const created = await apiFetch<DbProduct>('/api/crm/products', {
    method: 'POST',
    body: JSON.stringify({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
    }),
  })
  return dbProductToLocal(created)
}

export async function updateProductInDb(product: CrmProduct): Promise<void> {
  await apiFetch(`/api/crm/products/${product.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
    }),
  })
}

export async function deleteProductInDb(id: string): Promise<void> {
  await apiFetch(`/api/crm/products/${id}`, { method: 'DELETE' })
}

export async function fetchAutomationsFromDb(): Promise<CrmAutomationRule[]> {
  const data = await apiFetch<DbAutomationRule[]>('/api/crm/automations')
  return data.map(dbAutomationToLocal)
}

export async function createAutomationInDb(rule: CrmAutomationRule): Promise<void> {
  await apiFetch('/api/crm/automations', {
    method: 'POST',
    body: JSON.stringify({
      pipelineId: rule.pipelineId,
      name: rule.name,
      enabled: rule.enabled,
      conditionType: rule.condition.type,
      conditionValue: rule.condition.value,
      actionType: rule.action.type,
      actionValue: rule.action.value,
    }),
  })
}

export async function updateAutomationInDb(rule: CrmAutomationRule): Promise<void> {
  await apiFetch(`/api/crm/automations/${rule.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      pipelineId: rule.pipelineId,
      name: rule.name,
      enabled: rule.enabled,
      conditionType: rule.condition.type,
      conditionValue: rule.condition.value,
      actionType: rule.action.type,
      actionValue: rule.action.value,
    }),
  })
}

export async function deleteAutomationInDb(id: string): Promise<void> {
  await apiFetch(`/api/crm/automations/${id}`, { method: 'DELETE' })
}

// ============================================================================
// Deals (persistência dos campos de trabalho do card)
// ============================================================================

export interface DbDealRow {
  id: string
  tenantId: string
  chatwootContactId: number
  chatwootConversationId: number | null
  pipelineId: string
  stageId: string
  status: 'active' | 'won' | 'lost'
  priority: 'alta' | 'media' | 'baixa'
  assignedAgentId: number | null
  valueEstimated: string | null
  valueClosed: string | null
  score: number
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

export async function fetchDealsFromDb(): Promise<DbDealRow[]> {
  return apiFetch<DbDealRow[]>('/api/crm/deals')
}

export async function upsertDealInDb(input: {
  chatwootContactId: number
  pipelineId: string
  stageId: string
  priority?: 'alta' | 'media' | 'baixa'
  valueEstimated?: number | null
  assignedAgentId?: number | null
  score?: number
}): Promise<DbDealRow> {
  return apiFetch<DbDealRow>('/api/crm/deals/upsert', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateDealInDb(
  dealId: string,
  patch: Partial<{
    stageId: string
    pipelineId: string
    priority: 'alta' | 'media' | 'baixa'
    valueEstimated: number | null
    assignedAgentId: number | null
    score: number
    status: 'active' | 'won' | 'lost'
    chatwootConversationId: number | null
  }>,
): Promise<DbDealRow> {
  return apiFetch<DbDealRow>(`/api/crm/deals/${dealId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function setDealProductsInDb(
  dealId: string,
  productIds: string[],
): Promise<void> {
  await apiFetch(`/api/crm/deals/${dealId}/products`, {
    method: 'PUT',
    body: JSON.stringify({ productIds }),
  })
}

export async function fetchDealProductsFromDb(dealId: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/crm/deals/${dealId}/products`)
}

// ============================================================================
// Checklist items
// ============================================================================

export interface DbChecklistItemRow {
  id: string
  tenantId: string
  dealId: string
  title: string
  done: boolean
  dueDate: string | null
  priority: 'alta' | 'media' | 'baixa'
  assignedTo: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export async function fetchChecklistFromDb(dealId: string): Promise<DbChecklistItemRow[]> {
  return apiFetch<DbChecklistItemRow[]>(`/api/crm/checklists?dealId=${encodeURIComponent(dealId)}`)
}

export async function createChecklistItemInDb(input: {
  dealId: string
  title: string
  done?: boolean
  dueDate?: string | null
  priority?: 'alta' | 'media' | 'baixa'
  assignedTo?: string | null
  order?: number
}): Promise<DbChecklistItemRow> {
  return apiFetch<DbChecklistItemRow>('/api/crm/checklists', {
    method: 'POST',
    body: JSON.stringify({
      dealId: input.dealId,
      title: input.title,
      done: input.done ?? false,
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? 'media',
      assignedTo: input.assignedTo ?? null,
      order: input.order ?? 0,
    }),
  })
}

export async function updateChecklistItemInDb(
  id: string,
  patch: Partial<{
    title: string
    done: boolean
    dueDate: string | null
    priority: 'alta' | 'media' | 'baixa'
    assignedTo: string | null
    order: number
  }>,
): Promise<DbChecklistItemRow> {
  return apiFetch<DbChecklistItemRow>(`/api/crm/checklists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteChecklistItemInDb(id: string): Promise<void> {
  await apiFetch(`/api/crm/checklists/${id}`, { method: 'DELETE' })
}

// ============================================================================
// Notes
// ============================================================================

export interface DbNoteRow {
  id: string
  tenantId: string
  chatwootContactId: number
  dealId: string | null
  text: string
  author: string
  type: 'note' | 'stage_change' | 'agent_change' | 'system'
  createdAt: string
}

export async function fetchNotesFromDb(contactId: number): Promise<DbNoteRow[]> {
  return apiFetch<DbNoteRow[]>(`/api/crm/notes?contactId=${contactId}`)
}

export async function createNoteInDb(input: {
  chatwootContactId: number
  dealId?: string | null
  text: string
  author: string
  type?: 'note' | 'stage_change' | 'agent_change' | 'system'
}): Promise<DbNoteRow> {
  return apiFetch<DbNoteRow>('/api/crm/notes', {
    method: 'POST',
    body: JSON.stringify({
      chatwootContactId: input.chatwootContactId,
      dealId: input.dealId ?? null,
      text: input.text,
      author: input.author,
      type: input.type ?? 'note',
    }),
  })
}

// ============================================================================
// Pipeline access
// ============================================================================

export interface DbPipelineAccessRow {
  id: string
  tenantId: string
  pipelineId: string
  chatwootUserId: number | null
  createdAt: string
}

export async function fetchPipelineAccessFromDb(): Promise<DbPipelineAccessRow[]> {
  return apiFetch<DbPipelineAccessRow[]>('/api/crm/pipeline-access')
}

export async function grantPipelineAccessInDb(
  pipelineId: string,
  chatwootUserId: number | null,
): Promise<void> {
  await apiFetch('/api/crm/pipeline-access', {
    method: 'POST',
    body: JSON.stringify({ pipelineId, chatwootUserId }),
  })
}

export async function revokePipelineAccessInDb(
  pipelineId: string,
  chatwootUserId: number | null,
): Promise<void> {
  const params = new URLSearchParams({ pipelineId })
  if (chatwootUserId !== null) params.set('chatwootUserId', String(chatwootUserId))
  await apiFetch(`/api/crm/pipeline-access?${params}`, { method: 'DELETE' })
}
