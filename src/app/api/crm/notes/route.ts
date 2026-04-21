import type { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, noteInputSchema, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const contactId = request.nextUrl.searchParams.get('contactId')
    const dealId = request.nextUrl.searchParams.get('dealId')

    const conditions = [eq(schema.notes.tenantId, tenantId)]
    if (contactId) {
      const parsed = Number.parseInt(contactId, 10)
      if (!Number.isNaN(parsed)) conditions.push(eq(schema.notes.chatwootContactId, parsed))
    }
    if (dealId) conditions.push(eq(schema.notes.dealId, dealId))

    const rows = await db
      .select()
      .from(schema.notes)
      .where(and(...conditions))
      .orderBy(desc(schema.notes.createdAt))

    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = noteInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('n')
    const [row] = await db
      .insert(schema.notes)
      .values({
        id,
        tenantId,
        chatwootContactId: parsed.data.chatwootContactId,
        dealId: parsed.data.dealId ?? null,
        text: parsed.data.text,
        author: parsed.data.author,
        type: parsed.data.type,
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
