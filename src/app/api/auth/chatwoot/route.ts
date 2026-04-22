import { NextRequest } from 'next/server'
import {
  signSession,
  buildSessionCookie,
  type SessionPayload,
} from '@/lib/auth/session'
import type { CrmRole } from '@/lib/auth/permissions'

interface ChatwootSignInBody {
  data?: {
    id?: number
    name?: string
    email?: string
    access_token?: string
    role?: string
    account_id?: number
    accounts?: Array<{
      id: number
      name: string
      role: string
    }>
  }
}

function normalizeRole(role: string | undefined): CrmRole {
  if (role === 'administrator' || role === 'agent' || role === 'supervisor') {
    return role
  }
  return 'agent'
}

function getChatwootUrl(): string | null {
  const url = process.env.CHATWOOT_URL || process.env.NEXT_PUBLIC_CHATWOOT_URL
  if (!url) return null
  return url.replace(/\/$/, '')
}

function getConfiguredAccountId(): number | null {
  const raw = process.env.CHATWOOT_ACCOUNT_ID || process.env.NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: NextRequest): Promise<Response> {
  const chatwootUrl = getChatwootUrl()
  if (!chatwootUrl) {
    return Response.json(
      { success: false, error: 'CHATWOOT_URL não configurado no servidor.' },
      { status: 500 },
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { success: false, error: 'Corpo da requisição inválido.' },
      { status: 400 },
    )
  }

  const email = body.email?.trim()
  const password = body.password

  if (!email || !password) {
    return Response.json(
      { success: false, error: 'Informe email e senha do Chatwoot.' },
      { status: 400 },
    )
  }

  let signInResponse: Response
  try {
    signInResponse = await fetch(`${chatwootUrl}/auth/sign_in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json(
      { success: false, error: `Falha ao conectar com Chatwoot: ${message}` },
      { status: 502 },
    )
  }

  if (!signInResponse.ok) {
    const status = signInResponse.status === 401 ? 401 : signInResponse.status
    return Response.json(
      { success: false, error: 'Email ou senha inválidos no Chatwoot.' },
      { status },
    )
  }

  let data: ChatwootSignInBody
  try {
    data = (await signInResponse.json()) as ChatwootSignInBody
  } catch {
    return Response.json(
      { success: false, error: 'Resposta inválida do Chatwoot.' },
      { status: 502 },
    )
  }

  const user = data.data
  if (!user || typeof user.id !== 'number' || !user.access_token) {
    return Response.json(
      { success: false, error: 'Usuário Chatwoot sem token de acesso.' },
      { status: 502 },
    )
  }

  // Descobre o account_id — prioridade: env (tenant fixo do CRM), senão primeiro accounts[]
  const configuredAccountId = getConfiguredAccountId()
  let accountId: number | null = configuredAccountId
  let roleFromAccount: string | undefined = user.role

  if (Array.isArray(user.accounts) && user.accounts.length > 0) {
    // Se env define uma conta, usa ela pra achar o role correto
    if (configuredAccountId) {
      const match = user.accounts.find((a) => a.id === configuredAccountId)
      if (match) {
        roleFromAccount = match.role
      }
    } else {
      accountId = user.accounts[0].id
      roleFromAccount = user.accounts[0].role
    }
  }

  if (!accountId) {
    return Response.json(
      { success: false, error: 'Usuário não pertence a nenhuma conta Chatwoot.' },
      { status: 403 },
    )
  }

  const role = normalizeRole(roleFromAccount)

  const accessToken = signInResponse.headers.get('access-token') ?? undefined
  const client = signInResponse.headers.get('client') ?? undefined
  const uid = signInResponse.headers.get('uid') ?? undefined

  const session: SessionPayload = {
    id: user.id,
    name: user.name ?? email,
    email: user.email ?? email,
    role,
    accountId,
    chatwootToken: user.access_token,
    chatwootUrl,
    accessToken,
    client,
    uid,
  }

  const token = await signSession(session)

  return new Response(
    JSON.stringify({
      success: true,
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        accountId: session.accountId,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildSessionCookie(token),
      },
    },
  )
}
