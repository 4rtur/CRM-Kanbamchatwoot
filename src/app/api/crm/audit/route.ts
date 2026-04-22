import type { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { ok } from '@/lib/crm/schemas'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const { searchParams } = new URL(request.url)

    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const action = searchParams.get('action')

    const rawLimit = Number.parseInt(searchParams.get('limit') ?? '', 10)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT

    const conditions = [eq(schema.auditLog.tenantId, tenantId)]
    if (entityType) conditions.push(eq(schema.auditLog.entityType, entityType))
    if (entityId) conditions.push(eq(schema.auditLog.entityId, entityId))
    if (action) conditions.push(eq(schema.auditLog.action, action))

    const rows = await db
      .select()
      .from(schema.auditLog)
      .where(and(...conditions))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)

    return ok(rows)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
