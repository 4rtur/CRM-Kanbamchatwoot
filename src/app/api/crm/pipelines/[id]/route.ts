import type { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, notFound, ok, pipelineUpdateSchema } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params

    const [pipeline] = await db
      .select()
      .from(schema.pipelines)
      .where(and(eq(schema.pipelines.id, id), eq(schema.pipelines.tenantId, tenantId)))
      .limit(1)

    if (!pipeline) return notFound()

    const stages = await db
      .select()
      .from(schema.stages)
      .where(and(eq(schema.stages.pipelineId, id), eq(schema.stages.tenantId, tenantId)))
      .orderBy(asc(schema.stages.order))

    return ok({ ...pipeline, stages })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = pipelineUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [row] = await db
      .update(schema.pipelines)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(schema.pipelines.id, id), eq(schema.pipelines.tenantId, tenantId)))
      .returning()

    if (!row) return notFound()
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
      .delete(schema.pipelines)
      .where(and(eq(schema.pipelines.id, id), eq(schema.pipelines.tenantId, tenantId)))
      .returning()

    if (!row) return notFound()
    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
