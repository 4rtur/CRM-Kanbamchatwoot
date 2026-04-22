import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, dealUpdateSchema, notFound, ok } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params

    const [row] = await db
      .select()
      .from(schema.deals)
      .where(and(eq(schema.deals.id, id), eq(schema.deals.tenantId, tenantId)))
      .limit(1)

    if (!row) return notFound()
    return ok(row)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = dealUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.pipelineId !== undefined) patch.pipelineId = parsed.data.pipelineId
    if (parsed.data.stageId !== undefined) patch.stageId = parsed.data.stageId
    if (parsed.data.status !== undefined) {
      patch.status = parsed.data.status
      if (parsed.data.status === 'won' || parsed.data.status === 'lost') {
        patch.closedAt = new Date()
      }
    }
    if (parsed.data.valueEstimated !== undefined) {
      patch.valueEstimated =
        parsed.data.valueEstimated != null ? String(parsed.data.valueEstimated) : null
    }
    if (parsed.data.valueClosed !== undefined) {
      patch.valueClosed = parsed.data.valueClosed != null ? String(parsed.data.valueClosed) : null
    }
    if (parsed.data.score !== undefined) patch.score = parsed.data.score
    if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority
    if (parsed.data.assignedAgentId !== undefined) {
      patch.assignedAgentId = parsed.data.assignedAgentId
    }
    if (parsed.data.chatwootConversationId !== undefined) {
      patch.chatwootConversationId = parsed.data.chatwootConversationId
    }

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

    if (previous && parsed.data.stageId !== undefined && previous.stageId !== row.stageId) {
      const sameTPipeline = parsed.data.pipelineId === undefined || previous.pipelineId === row.pipelineId
      await logAuditFromRequest(request, {
        tenantId,
        action: sameTPipeline ? 'card.moved' : 'card.pipeline_moved',
        entityType: 'deal',
        entityId: row.id,
        details: {
          fromStageId: previous.stageId,
          toStageId: row.stageId,
          fromPipelineId: previous.pipelineId,
          toPipelineId: row.pipelineId,
        },
      })
    }

    return ok(row)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params

    const [row] = await db
      .delete(schema.deals)
      .where(and(eq(schema.deals.id, id), eq(schema.deals.tenantId, tenantId)))
      .returning()

    if (!row) return notFound()
    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
