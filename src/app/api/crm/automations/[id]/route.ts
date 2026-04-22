import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { automationRuleUpdateSchema, badRequest, notFound, ok } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = automationRuleUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.pipelineId !== undefined) patch.pipelineId = parsed.data.pipelineId
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled
    if (parsed.data.conditionType !== undefined) patch.conditionType = parsed.data.conditionType
    if (parsed.data.conditionValue !== undefined) patch.conditionValue = parsed.data.conditionValue
    if (parsed.data.actionType !== undefined) patch.actionType = parsed.data.actionType
    if (parsed.data.actionValue !== undefined) patch.actionValue = parsed.data.actionValue

    const [row] = await db
      .update(schema.automationRules)
      .set(patch)
      .where(
        and(
          eq(schema.automationRules.id, id),
          eq(schema.automationRules.tenantId, tenantId),
        ),
      )
      .returning()

    if (!row) return notFound()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'automation.updated',
      entityType: 'automation',
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
      .delete(schema.automationRules)
      .where(
        and(
          eq(schema.automationRules.id, id),
          eq(schema.automationRules.tenantId, tenantId),
        ),
      )
      .returning()

    if (!row) return notFound()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'automation.deleted',
      entityType: 'automation',
      entityId: row.id,
      details: { name: row.name },
    })

    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
