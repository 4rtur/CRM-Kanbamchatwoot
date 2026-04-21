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
