import type { NextRequest } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { logAuditFromRequest } from '@/lib/db/audit'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, ok, productInputSchema } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const rows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.tenantId, tenantId))
      .orderBy(asc(schema.products.name))
    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = productInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('p')
    const [row] = await db
      .insert(schema.products)
      .values({
        id,
        tenantId,
        name: parsed.data.name,
        category: parsed.data.category,
        description: parsed.data.description,
        price: String(parsed.data.price),
      })
      .returning()

    await logAuditFromRequest(request, {
      tenantId,
      action: 'product.created',
      entityType: 'product',
      entityId: row.id,
      details: { name: row.name, category: row.category, price: row.price },
    })

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
