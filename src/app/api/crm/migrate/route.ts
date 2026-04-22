import type { NextRequest } from 'next/server'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, migrateFromLocalStoragePayloadSchema, ok } from '@/lib/crm/schemas'

interface LocalStoragePipeline {
  id?: string
  name?: string
  stages?: Array<{ id?: string; name?: string; color?: string; order?: number }>
}

interface LocalStorageProduct {
  id?: string
  name?: string
  price?: number
  category?: string
  description?: string
}

interface LocalStorageAutomation {
  id?: string
  pipelineId?: string
  name?: string
  enabled?: boolean
  condition?: { type?: string; value?: unknown }
  action?: { type?: string; value?: unknown }
}

interface LocalStorageCardExtra {
  checklist?: Array<{
    id?: string
    title?: string
    done?: boolean
    dueDate?: string | null
    priority?: 'alta' | 'media' | 'baixa'
    assignedTo?: string | null
  }>
  notes?: Array<{
    id?: string
    text?: string
    author?: string
    timestamp?: string
    type?: 'note' | 'stage_change' | 'agent_change'
  }>
  products?: string[]
  priority?: 'alta' | 'media' | 'baixa'
  value?: number
  labels?: string[]
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = migrateFromLocalStoragePayloadSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const report = {
      pipelines: 0,
      stages: 0,
      products: 0,
      notes: 0,
      checklistItems: 0,
      customFieldValues: 0,
      automations: 0,
      categories: 0,
    }

    if (parsed.data.pipelines) {
      for (const raw of parsed.data.pipelines as LocalStoragePipeline[]) {
        if (!raw.id || !raw.name) continue

        await db
          .insert(schema.pipelines)
          .values({
            id: `${tenantId}-legacy-${raw.id}`,
            tenantId,
            name: raw.name,
            isDefault: false,
            order: 99,
          })
          .onConflictDoNothing()
        report.pipelines += 1

        if (Array.isArray(raw.stages)) {
          for (let i = 0; i < raw.stages.length; i += 1) {
            const stage = raw.stages[i]
            if (!stage?.id || !stage.name) continue
            await db
              .insert(schema.stages)
              .values({
                id: `${tenantId}-legacy-${raw.id}-${stage.id}`,
                tenantId,
                pipelineId: `${tenantId}-legacy-${raw.id}`,
                name: stage.name,
                color: stage.color ?? '#94a3b8',
                order: stage.order ?? i,
                type: 'middle',
              })
              .onConflictDoNothing()
            report.stages += 1
          }
        }
      }
    }

    if (parsed.data.products) {
      for (const raw of parsed.data.products as LocalStorageProduct[]) {
        if (!raw.name) continue
        await db
          .insert(schema.products)
          .values({
            id: newId('p'),
            tenantId,
            name: raw.name,
            category: raw.category ?? '',
            description: raw.description ?? '',
            price: String(raw.price ?? 0),
          })
          .onConflictDoNothing()
        report.products += 1
      }
    }

    if (parsed.data.cardsExtra) {
      for (const [cardId, rawValue] of Object.entries(parsed.data.cardsExtra)) {
        const extras = rawValue as LocalStorageCardExtra
        const contactIdMatch = cardId.match(/(\d+)/)
        if (!contactIdMatch) continue
        const contactId = Number.parseInt(contactIdMatch[1]!, 10)
        if (Number.isNaN(contactId)) continue

        if (extras.notes) {
          for (const note of extras.notes) {
            if (!note.text) continue
            await db
              .insert(schema.notes)
              .values({
                id: newId('n'),
                tenantId,
                chatwootContactId: contactId,
                dealId: null,
                text: note.text,
                author: note.author ?? 'legacy',
                type: note.type ?? 'note',
              })
              .onConflictDoNothing()
            report.notes += 1
          }
        }
      }
    }

    const VALID_AUTO_CONDITIONS = new Set([
      'label_added',
      'stage_changed',
      'score_above',
      'checklist_completed',
      'inactive_for',
      'value_above',
    ])
    const VALID_AUTO_ACTIONS = new Set([
      'move_to_stage',
      'assign_agent',
      'add_label',
      'send_notification',
      'mark_lost',
    ])

    if (parsed.data.automations) {
      for (const raw of parsed.data.automations as LocalStorageAutomation[]) {
        if (!raw.name || !raw.pipelineId) continue
        const conditionType = raw.condition?.type
        const actionType = raw.action?.type
        if (!conditionType || !VALID_AUTO_CONDITIONS.has(conditionType)) continue
        if (!actionType || !VALID_AUTO_ACTIONS.has(actionType)) continue

        await db
          .insert(schema.automationRules)
          .values({
            id: newId('auto'),
            tenantId,
            pipelineId: raw.pipelineId,
            name: raw.name,
            enabled: raw.enabled ?? true,
            conditionType: conditionType as
              | 'label_added'
              | 'stage_changed'
              | 'score_above'
              | 'checklist_completed'
              | 'inactive_for'
              | 'value_above',
            conditionValue: raw.condition?.value ?? null,
            actionType: actionType as
              | 'move_to_stage'
              | 'assign_agent'
              | 'add_label'
              | 'send_notification'
              | 'mark_lost',
            actionValue: raw.action?.value ?? null,
          })
          .onConflictDoNothing()
        report.automations += 1
      }
    }

    if (parsed.data.categories) {
      for (let i = 0; i < parsed.data.categories.length; i += 1) {
        const raw = parsed.data.categories[i]
        const name = typeof raw === 'string' ? raw : (raw as { name?: string }).name
        if (!name || typeof name !== 'string') continue
        const color =
          typeof raw === 'string'
            ? '#71717a'
            : (raw as { color?: string }).color ?? '#71717a'

        await db
          .insert(schema.productCategories)
          .values({
            id: newId('cat'),
            tenantId,
            name,
            color,
            order: i,
          })
          .onConflictDoNothing({
            target: [schema.productCategories.tenantId, schema.productCategories.name],
          })
        report.categories += 1
      }
    }

    return ok({ migrated: true, report })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
