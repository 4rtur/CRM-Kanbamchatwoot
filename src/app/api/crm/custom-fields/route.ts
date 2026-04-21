import type { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, customFieldDefinitionInputSchema, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const appliesTo = request.nextUrl.searchParams.get('appliesTo')

    const whereClause =
      appliesTo === 'contact' || appliesTo === 'deal'
        ? and(
            eq(schema.customFieldDefinitions.tenantId, tenantId),
            eq(schema.customFieldDefinitions.appliesTo, appliesTo),
          )
        : eq(schema.customFieldDefinitions.tenantId, tenantId)

    const rows = await db
      .select()
      .from(schema.customFieldDefinitions)
      .where(whereClause)
      .orderBy(asc(schema.customFieldDefinitions.order))

    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = customFieldDefinitionInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('cf')
    const [row] = await db
      .insert(schema.customFieldDefinitions)
      .values({
        id,
        tenantId,
        key: parsed.data.key,
        name: parsed.data.name,
        type: parsed.data.type,
        appliesTo: parsed.data.appliesTo,
        options: parsed.data.options,
        isRequired: parsed.data.isRequired,
        order: parsed.data.order,
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
