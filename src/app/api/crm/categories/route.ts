import type { NextRequest } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, ok, productCategoryInputSchema } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const rows = await db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.tenantId, tenantId))
      .orderBy(asc(schema.productCategories.order), asc(schema.productCategories.name))
    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = productCategoryInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('cat')
    const [row] = await db
      .insert(schema.productCategories)
      .values({
        id,
        tenantId,
        name: parsed.data.name,
        color: parsed.data.color,
        order: parsed.data.order,
      })
      .onConflictDoNothing({
        target: [schema.productCategories.tenantId, schema.productCategories.name],
      })
      .returning()

    if (!row) {
      return badRequest({ message: 'Categoria já existe para este tenant' })
    }

    await logAuditFromRequest(request, {
      tenantId,
      action: 'category.created',
      entityType: 'category',
      entityId: row.id,
      details: { name: row.name },
    })

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
