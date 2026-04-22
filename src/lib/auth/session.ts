import { SignJWT, jwtVerify } from 'jose'

export interface SessionPayload {
  id: number
  name: string
  email: string
  role: 'administrator' | 'agent' | 'supervisor'
  accountId: number
  chatwootToken: string
  chatwootUrl: string
  // Chatwoot devise auth headers, if present
  accessToken?: string
  client?: string
  uid?: string
  [key: string]: unknown
}

export const AUTH_COOKIE = 'crm-chatwoot-auth'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 dias

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET não configurado (mínimo 16 caracteres)')
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export function buildSessionCookie(token: string): string {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
}

export function buildClearSessionCookie(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export const SESSION_TTL = SESSION_TTL_SECONDS
