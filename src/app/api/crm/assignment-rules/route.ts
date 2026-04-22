import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { assignmentRuleInputSchema, badRequest, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const pipelineId = request.nextUrl.searchParams.get('pipelineId')

    const whereClause = pipelineId
      ? and(
          eq(schema.assignmentRules.tenantId, tenantId),
          eq(schema.assignmentRules.pipelineId, pipelineId),
        )
      : eq(schema.assignmentRules.tenantId, tenantId)

    const rows = await db.select().from(schema.assignmentRules).where(whereClause)
    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = assignmentRuleInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('asg')
    const [row] = await db
      .insert(schema.assignmentRules)
      .values({
        id,
        tenantId,
        pipelineId: parsed.data.pipelineId,
        agentId: parsed.data.agentId,
        agentName: parsed.data.agentName,
        weekdays: parsed.data.weekdays,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        enabled: parsed.data.enabled,
      })
      .returning()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'assignment_rule.created',
      entityType: 'assignment_rule',
      entityId: row.id,
      details: {
        agentId: row.agentId,
        agentName: row.agentName,
        pipelineId: row.pipelineId,
      },
    })

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
