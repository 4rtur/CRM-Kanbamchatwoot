import type { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, checklistItemInputSchema, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const dealId = request.nextUrl.searchParams.get('dealId')
    if (!dealId) return badRequest('dealId é obrigatório')

    const rows = await db
      .select()
      .from(schema.checklistItems)
      .where(
        and(
          eq(schema.checklistItems.tenantId, tenantId),
          eq(schema.checklistItems.dealId, dealId),
        ),
      )
      .orderBy(asc(schema.checklistItems.order))
    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = checklistItemInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('ci')
    const [row] = await db
      .insert(schema.checklistItems)
      .values({
        id,
        tenantId,
        dealId: parsed.data.dealId,
        title: parsed.data.title,
        done: parsed.data.done,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        priority: parsed.data.priority,
        assignedTo: parsed.data.assignedTo ?? null,
        order: parsed.data.order,
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
