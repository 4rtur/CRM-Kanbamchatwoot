import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, notFound, ok, stageUpdateSchema } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = stageUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [row] = await db
      .update(schema.stages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(schema.stages.id, id), eq(schema.stages.tenantId, tenantId)))
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
      .delete(schema.stages)
      .where(and(eq(schema.stages.id, id), eq(schema.stages.tenantId, tenantId)))
      .returning()

    if (!row) return notFound()
    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
