import type { NextRequest } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { newId } from '@/lib/crm/uid'
import { badRequest, ok, pipelineAccessInputSchema } from '@/lib/crm/schemas'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const pipelineId = request.nextUrl.searchParams.get('pipelineId')

    const where = pipelineId
      ? and(
          eq(schema.pipelineAccess.tenantId, tenantId),
          eq(schema.pipelineAccess.pipelineId, pipelineId),
        )
      : eq(schema.pipelineAccess.tenantId, tenantId)

    const rows = await db.select().from(schema.pipelineAccess).where(where)
    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

// Concede acesso. Se chatwootUserId é null = visível pra todos (wildcard).
// Idempotente via uniqueIndex (pipelineId, chatwootUserId).
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = pipelineAccessInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const [row] = await db
      .insert(schema.pipelineAccess)
      .values({
        id: newId('pa'),
        tenantId,
        pipelineId: parsed.data.pipelineId,
        chatwootUserId: parsed.data.chatwootUserId,
      })
      .onConflictDoNothing({
        target: [schema.pipelineAccess.pipelineId, schema.pipelineAccess.chatwootUserId],
      })
      .returning()

    return ok(row ?? null, { status: 201 })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}

// Remove acesso de um user de um pipeline. Se chatwootUserId ausente, remove wildcard.
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const pipelineId = request.nextUrl.searchParams.get('pipelineId')
    const userIdParam = request.nextUrl.searchParams.get('chatwootUserId')
    if (!pipelineId) return badRequest('pipelineId é obrigatório')

    const userIdCondition = userIdParam
      ? eq(schema.pipelineAccess.chatwootUserId, Number.parseInt(userIdParam, 10))
      : isNull(schema.pipelineAccess.chatwootUserId)

    await db
      .delete(schema.pipelineAccess)
      .where(
        and(
          eq(schema.pipelineAccess.tenantId, tenantId),
          eq(schema.pipelineAccess.pipelineId, pipelineId),
          userIdCondition,
        ),
      )

    return ok({ deleted: true })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
