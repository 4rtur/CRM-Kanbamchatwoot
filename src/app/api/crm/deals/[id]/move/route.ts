import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, dealMoveSchema, notFound, ok } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = dealMoveSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [stage] = await db
      .select()
      .from(schema.stages)
      .where(and(eq(schema.stages.id, parsed.data.stageId), eq(schema.stages.tenantId, tenantId)))
      .limit(1)

    if (!stage) return notFound('Stage não encontrado')

    const status: 'active' | 'won' | 'lost' =
      stage.type === 'won' ? 'won' : stage.type === 'lost' ? 'lost' : 'active'

    const patch: Record<string, unknown> = {
      stageId: parsed.data.stageId,
      pipelineId: stage.pipelineId,
      status,
      updatedAt: new Date(),
    }
    if (status !== 'active') patch.closedAt = new Date()

    const [previous] = await db
      .select()
      .from(schema.deals)
      .where(and(eq(schema.deals.id, id), eq(schema.deals.tenantId, tenantId)))
      .limit(1)

    const [row] = await db
      .update(schema.deals)
      .set(patch)
      .where(and(eq(schema.deals.id, id), eq(schema.deals.tenantId, tenantId)))
      .returning()

    if (!row) return notFound()

    if (previous) {
      const crossedPipeline = previous.pipelineId !== row.pipelineId
      await logAuditFromRequest(request, {
        tenantId,
        action: crossedPipeline ? 'card.pipeline_moved' : 'card.moved',
        entityType: 'deal',
        entityId: row.id,
        details: {
          fromStageId: previous.stageId,
          toStageId: row.stageId,
          fromPipelineId: previous.pipelineId,
          toPipelineId: row.pipelineId,
          toStageName: stage.name,
        },
      })
    }

    await db.insert(schema.notes).values({
      id: `n_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      tenantId,
      chatwootContactId: row.chatwootContactId,
      dealId: row.id,
      text: `Stage alterado para "${stage.name}"`,
      author: 'system',
      type: 'stage_change',
    })

    return ok(row)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
