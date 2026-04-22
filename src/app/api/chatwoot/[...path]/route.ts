import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/server'

async function getCredentials(request: NextRequest): Promise<{
  chatwootUrl: string | null
  chatwootToken: string | null
  accountId: string | null
}> {
  // 1) Prioridade: sessão do usuário (token pessoal do Chatwoot)
  const session = await getSessionFromRequest(request)
  if (session?.chatwootToken && session?.chatwootUrl && session?.accountId) {
    return {
      chatwootUrl: session.chatwootUrl,
      chatwootToken: session.chatwootToken,
      accountId: String(session.accountId),
    }
  }

  // 2) Fallback: env vars (modo demo / operações de sistema)
  const envUrl = process.env.CHATWOOT_URL
  const envToken = process.env.CHATWOOT_API_TOKEN
  const envAccountId = process.env.CHATWOOT_ACCOUNT_ID

  if (envUrl && envToken && envAccountId) {
    return {
      chatwootUrl: envUrl,
      chatwootToken: envToken,
      accountId: envAccountId,
    }
  }

  // 3) Fallback legado: headers (localStorage client-side)
  return {
    chatwootUrl: request.headers.get('x-chatwoot-url'),
    chatwootToken: request.headers.get('x-chatwoot-token'),
    accountId: request.headers.get('x-chatwoot-account-id'),
  }
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params
  const { chatwootUrl, chatwootToken, accountId } = await getCredentials(request)

  if (!chatwootUrl || !chatwootToken || !accountId) {
    return Response.json(
      { error: 'Credenciais Chatwoot não configuradas. Defina as variáveis de ambiente ou preencha nas Configurações.' },
      { status: 400 },
    )
  }

  const baseUrl = chatwootUrl.replace(/\/$/, '')
  const chatwootPath = path.join('/')
  const queryString = request.nextUrl.search
  const targetUrl = `${baseUrl}/api/v1/accounts/${accountId}/${chatwootPath}${queryString}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    api_access_token: chatwootToken,
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  }

  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.text()
      if (body) {
        fetchOptions.body = body
      }
    } catch {
      // Sem body — segue sem ele
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions)

    if (response.status === 204) {
      return new Response(null, { status: 204 })
    }

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao conectar com Chatwoot'
    return Response.json(
      { error: `Falha ao conectar com Chatwoot: ${message}` },
      { status: 502 },
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return proxyRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return proxyRequest(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return proxyRequest(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return proxyRequest(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  return proxyRequest(request, context)
}
