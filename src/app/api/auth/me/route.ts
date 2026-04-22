import { NextRequest } from 'next/server'
import { AUTH_COOKIE, verifySession } from '@/lib/auth/session'

export async function GET(request: NextRequest): Promise<Response> {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (!cookie) {
    return Response.json(
      { success: false, error: 'Não autenticado' },
      { status: 401 },
    )
  }

  const session = await verifySession(cookie)
  if (!session) {
    return Response.json(
      { success: false, error: 'Sessão inválida ou expirada' },
      { status: 401 },
    )
  }

  return Response.json({
    success: true,
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      accountId: session.accountId,
      chatwootToken: session.chatwootToken,
    },
  })
}
