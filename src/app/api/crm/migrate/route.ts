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

    return ok({ migrated: true, report })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
