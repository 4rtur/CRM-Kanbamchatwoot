import type { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, dealInputSchema, ok } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const params = request.nextUrl.searchParams
    const pipelineId = params.get('pipelineId')
    const stageId = params.get('stageId')
    const status = params.get('status')
    const contactId = params.get('contactId')

    const conditions = [eq(schema.deals.tenantId, tenantId)]
    if (pipelineId) conditions.push(eq(schema.deals.pipelineId, pipelineId))
    if (stageId) conditions.push(eq(schema.deals.stageId, stageId))
    if (status === 'active' || status === 'won' || status === 'lost') {
      conditions.push(eq(schema.deals.status, status))
    }
    if (contactId) {
      const parsed = Number.parseInt(contactId, 10)
      if (!Number.isNaN(parsed)) {
        conditions.push(eq(schema.deals.chatwootContactId, parsed))
      }
    }

    const rows = await db
      .select()
      .from(schema.deals)
      .where(and(...conditions))
      .orderBy(desc(schema.deals.updatedAt))

    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = dealInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const id = newId('d')
    const [row] = await db
      .insert(schema.deals)
      .values({
        id,
        tenantId,
        chatwootContactId: parsed.data.chatwootContactId,
        chatwootConversationId: parsed.data.chatwootConversationId ?? null,
        pipelineId: parsed.data.pipelineId,
        stageId: parsed.data.stageId,
        status: parsed.data.status ?? 'active',
        valueEstimated:
          parsed.data.valueEstimated != null ? String(parsed.data.valueEstimated) : null,
        valueClosed: parsed.data.valueClosed != null ? String(parsed.data.valueClosed) : null,
        score: parsed.data.score ?? 0,
      })
      .returning()

    return ok(row, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
