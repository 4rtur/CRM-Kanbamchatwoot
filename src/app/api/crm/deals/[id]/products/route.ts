import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, dealProductsInputSchema, notFound, ok } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params

    const rows = await db
      .select()
      .from(schema.dealProducts)
      .where(
        and(
          eq(schema.dealProducts.tenantId, tenantId),
          eq(schema.dealProducts.dealId, id),
        ),
      )

    return ok(rows.map((r) => r.productId))
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

// PUT sobrescreve a lista de produtos do deal (replace).
export async function PUT(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = dealProductsInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [deal] = await db
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(and(eq(schema.deals.id, id), eq(schema.deals.tenantId, tenantId)))
      .limit(1)

    if (!deal) return notFound()

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.dealProducts)
        .where(
          and(
            eq(schema.dealProducts.tenantId, tenantId),
            eq(schema.dealProducts.dealId, id),
          ),
        )

      if (parsed.data.productIds.length > 0) {
        await tx.insert(schema.dealProducts).values(
          parsed.data.productIds.map((productId) => ({
            tenantId,
            dealId: id,
            productId,
            quantity: '1',
          })),
        )
      }
    })

    return ok({ dealId: id, productIds: parsed.data.productIds })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
