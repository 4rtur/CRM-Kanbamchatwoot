import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, notFound, ok, productCategoryUpdateSchema } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = productCategoryUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.color !== undefined) patch.color = parsed.data.color
    if (parsed.data.order !== undefined) patch.order = parsed.data.order

    const [row] = await db
      .update(schema.productCategories)
      .set(patch)
      .where(
        and(
          eq(schema.productCategories.id, id),
          eq(schema.productCategories.tenantId, tenantId),
        ),
      )
      .returning()

    if (!row) return notFound()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'category.updated',
      entityType: 'category',
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
      .delete(schema.productCategories)
      .where(
        and(
          eq(schema.productCategories.id, id),
          eq(schema.productCategories.tenantId, tenantId),
        ),
      )
      .returning()

    if (!row) return notFound()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'category.deleted',
      entityType: 'category',
      entityId: row.id,
      details: { name: row.name },
    })

    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
