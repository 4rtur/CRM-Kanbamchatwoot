import type { NextRequest } from 'next/server'

export class TenantNotFoundError extends Error {
  constructor(message = 'Tenant não identificado') {
    super(message)
    this.name = 'TenantNotFoundError'
  }
}

export async function resolveTenantId(request: NextRequest): Promise<string> {
  const headerTenant = request.headers.get('x-tenant-id')
  if (headerTenant && headerTenant.length > 0) return headerTenant

  const envTenant = process.env.DEFAULT_TENANT_ID
  if (envTenant && envTenant.length > 0) return envTenant

  throw new TenantNotFoundError()
}

export function tenantErrorResponse(error: unknown): Response {
  if (error instanceof TenantNotFoundError) {
    return Response.json({ success: false, error: error.message }, { status: 401 })
  }
  const message = error instanceof Error ? error.message : 'Erro interno'
  return Response.json({ success: false, error: message }, { status: 500 })
}
