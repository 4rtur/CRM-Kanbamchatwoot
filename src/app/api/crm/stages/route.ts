import type { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, ok, stageInputSchema } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const pipelineId = request.nextUrl.searchParams.get('pipelineId')

    const whereClause = pipelineId
      ? and(eq(schema.stages.tenantId, tenantId), eq(schema.stages.pipelineId, pipelineId))
      : eq(schema.stages.tenantId, tenantId)

    const rows = await db
      .select()
      .from(schema.stages)
      .where(whereClause)
      .orderBy(asc(schema.stages.order))

    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = stageInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('st')
    const [row] = await db
      .insert(schema.stages)
      .values({
        id,
        tenantId,
        pipelineId: parsed.data.pipelineId,
        name: parsed.data.name,
        color: parsed.data.color ?? '#94a3b8',
        order: parsed.data.order ?? 0,
        type: parsed.data.type ?? 'middle',
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
