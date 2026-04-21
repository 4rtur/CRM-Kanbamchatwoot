import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, customFieldValueInputSchema, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const entityType = request.nextUrl.searchParams.get('entityType')
    const entityId = request.nextUrl.searchParams.get('entityId')

    if (!entityType || !entityId || (entityType !== 'contact' && entityType !== 'deal')) {
      return badRequest('entityType (contact|deal) e entityId são obrigatórios')
    }

    const rows = await db
      .select()
      .from(schema.customFieldValues)
      .where(
        and(
          eq(schema.customFieldValues.tenantId, tenantId),
          eq(schema.customFieldValues.entityType, entityType),
          eq(schema.customFieldValues.entityId, entityId),
        ),
      )

    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = customFieldValueInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [row] = await db
      .insert(schema.customFieldValues)
      .values({
        id: newId('cfv'),
        tenantId,
        fieldId: parsed.data.fieldId,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        value: parsed.data.value ?? null,
      })
      .onConflictDoUpdate({
        target: [
          schema.customFieldValues.tenantId,
          schema.customFieldValues.fieldId,
          schema.customFieldValues.entityType,
          schema.customFieldValues.entityId,
        ],
        set: { value: parsed.data.value ?? null, updatedAt: new Date() },
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
