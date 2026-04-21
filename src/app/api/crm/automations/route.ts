import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { automationRuleInputSchema, badRequest, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const pipelineId = request.nextUrl.searchParams.get('pipelineId')

    const whereClause = pipelineId
      ? and(
          eq(schema.automationRules.tenantId, tenantId),
          eq(schema.automationRules.pipelineId, pipelineId),
        )
      : eq(schema.automationRules.tenantId, tenantId)

    const rows = await db.select().from(schema.automationRules).where(whereClause)
    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = automationRuleInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('auto')
    const [row] = await db
      .insert(schema.automationRules)
      .values({
        id,
        tenantId,
        pipelineId: parsed.data.pipelineId,
        name: parsed.data.name,
        enabled: parsed.data.enabled,
        conditionType: parsed.data.conditionType,
        conditionValue: parsed.data.conditionValue ?? null,
        actionType: parsed.data.actionType,
        actionValue: parsed.data.actionValue ?? null,
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
