import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, notFound, ok, productUpdateSchema } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.category !== undefined) patch.category = parsed.data.category
    if (parsed.data.description !== undefined) patch.description = parsed.data.description
    if (parsed.data.price !== undefined) patch.price = String(parsed.data.price)

    const [row] = await db
      .update(schema.products)
      .set(patch)
      .where(and(eq(schema.products.id, id), eq(schema.products.tenantId, tenantId)))
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
      .delete(schema.products)
      .where(and(eq(schema.products.id, id), eq(schema.products.tenantId, tenantId)))
      .returning()

    if (!row) return notFound()
    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
