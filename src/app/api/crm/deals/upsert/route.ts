import type { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, dealInputSchema, ok } from '@/lib/crm/schemas'

// Idempotente: insere deal se não existe pra (tenantId, chatwootContactId, pipelineId),
// senão retorna o existente. Usado na sincronização de contatos do Chatwoot —
// garante que todo card tenha um deal persistido.
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = dealInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [existing] = await db
      .select()
      .from(schema.deals)
      .where(
        and(
          eq(schema.deals.tenantId, tenantId),
          eq(schema.deals.chatwootContactId, parsed.data.chatwootContactId),
          eq(schema.deals.pipelineId, parsed.data.pipelineId),
        ),
      )
      .limit(1)

    if (existing) {
      return ok(existing)
    }

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
        priority: parsed.data.priority ?? 'media',
        assignedAgentId: parsed.data.assignedAgentId ?? null,
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
