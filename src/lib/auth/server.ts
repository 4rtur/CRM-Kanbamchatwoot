import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, verifySession, type SessionPayload } from './session'

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (!cookie) return null
  return await verifySession(cookie)
}
