import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { assignmentRuleUpdateSchema, badRequest, notFound, ok } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = assignmentRuleUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.pipelineId !== undefined) patch.pipelineId = parsed.data.pipelineId
    if (parsed.data.agentId !== undefined) patch.agentId = parsed.data.agentId
    if (parsed.data.agentName !== undefined) patch.agentName = parsed.data.agentName
    if (parsed.data.weekdays !== undefined) patch.weekdays = parsed.data.weekdays
    if (parsed.data.startTime !== undefined) patch.startTime = parsed.data.startTime
    if (parsed.data.endTime !== undefined) patch.endTime = parsed.data.endTime
    if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled

    const [row] = await db
      .update(schema.assignmentRules)
      .set(patch)
      .where(
        and(
          eq(schema.assignmentRules.id, id),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      )
      .returning()

    if (!row) return notFound()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'assignment_rule.updated',
      entityType: 'assignment_rule',
      entityId: row.id,
      details: { patch: parsed.data },
    })

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
      .delete(schema.assignmentRules)
      .where(
        and(
          eq(schema.assignmentRules.id, id),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      )
      .returning()

    if (!row) return notFound()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'assignment_rule.deleted',
      entityType: 'assignment_rule',
      entityId: row.id,
      details: { agentName: row.agentName, pipelineId: row.pipelineId },
    })

    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
