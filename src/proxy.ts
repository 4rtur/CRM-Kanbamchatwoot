import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/api/auth',
  '/api/auth/chatwoot',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/config',
])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname.startsWith('/_next/')) return true
  if (pathname === '/favicon.ico') return true
  return false
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const legacyPassword = process.env.CRM_ACCESS_PASSWORD

  // Modo legado — senha única via CRM_ACCESS_PASSWORD (dev/demo)
  if (legacyPassword) {
    const legacyCookie = request.cookies.get('crm-auth')?.value
    if (legacyCookie) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Modo padrão — autenticação via Chatwoot
  const chatwootCookie = request.cookies.get('crm-chatwoot-auth')?.value
  if (chatwootCookie) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
