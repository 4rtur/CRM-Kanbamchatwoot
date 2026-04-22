import { NextRequest } from 'next/server'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { getSessionFromRequest } from '@/lib/auth/server'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 })
  }
  if (!hasPermission({
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    accountId: session.accountId,
    chatwootToken: session.chatwootToken,
  }, 'audit:view')) {
    return Response.json(
      { success: false, error: 'Sem permissão para visualizar auditoria' },
      { status: 403 },
    )
  }

  let tenantId: string
  try {
    tenantId = await resolveTenantId(request)
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }

  const { searchParams } = request.nextUrl
  const action = searchParams.get('action')
  const agentName = searchParams.get('agent')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = Math.min(Number.parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500)

  const conditions = [eq(schema.auditLog.tenantId, tenantId)]
  if (action) conditions.push(eq(schema.auditLog.action, action))
  if (agentName) conditions.push(eq(schema.auditLog.agentName, agentName))
  if (from) conditions.push(gte(schema.auditLog.createdAt, new Date(from)))
  if (to) conditions.push(lte(schema.auditLog.createdAt, new Date(to)))

  try {
    const entries = await db
      .select()
      .from(schema.auditLog)
      .where(and(...conditions))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(limit)

    return Response.json({ success: true, data: entries })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
