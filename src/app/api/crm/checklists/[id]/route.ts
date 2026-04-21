import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { badRequest, checklistItemUpdateSchema, notFound, ok } from '@/lib/crm/schemas'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { id } = await context.params
    const body: unknown = await request.json()
    const parsed = checklistItemUpdateSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.title !== undefined) patch.title = parsed.data.title
    if (parsed.data.done !== undefined) patch.done = parsed.data.done
    if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority
    if (parsed.data.assignedTo !== undefined) patch.assignedTo = parsed.data.assignedTo
    if (parsed.data.order !== undefined) patch.order = parsed.data.order
    if (parsed.data.dueDate !== undefined) {
      patch.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
    }

    const [row] = await db
      .update(schema.checklistItems)
      .set(patch)
      .where(
        and(eq(schema.checklistItems.id, id), eq(schema.checklistItems.tenantId, tenantId)),
      )
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
      .delete(schema.checklistItems)
      .where(
        and(eq(schema.checklistItems.id, id), eq(schema.checklistItems.tenantId, tenantId)),
      )
      .returning()

    if (!row) return notFound()
    return ok({ deleted: true, id: row.id })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
