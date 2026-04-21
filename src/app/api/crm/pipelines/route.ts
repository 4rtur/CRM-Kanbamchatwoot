import type { NextRequest } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, ok, pipelineInputSchema } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)

    const pipelines = await db
      .select()
      .from(schema.pipelines)
      .where(eq(schema.pipelines.tenantId, tenantId))
      .orderBy(asc(schema.pipelines.order))

    const stages = await db
      .select()
      .from(schema.stages)
      .where(eq(schema.stages.tenantId, tenantId))
      .orderBy(asc(schema.stages.order))

    const stagesByPipeline = new Map<string, typeof stages>()
    for (const stage of stages) {
      const list = stagesByPipeline.get(stage.pipelineId) ?? []
      list.push(stage)
      stagesByPipeline.set(stage.pipelineId, list)
    }

    const payload = pipelines.map((pipeline) => ({
      ...pipeline,
      stages: stagesByPipeline.get(pipeline.id) ?? [],
    }))

    return ok(payload)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = pipelineInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('pl')
    const [row] = await db
      .insert(schema.pipelines)
      .values({
        id,
        tenantId,
        name: parsed.data.name,
        isDefault: parsed.data.isDefault ?? false,
        order: parsed.data.order ?? 0,
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
