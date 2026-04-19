import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest): NextResponse {
  const accessPassword = process.env.CRM_ACCESS_PASSWORD

  // Sem senha configurada — modo demo, acesso livre
  if (!accessPassword) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Permitir acesso à página de login e API de autenticação
  if (pathname === '/login' || pathname === '/api/auth') {
    return NextResponse.next()
  }

  // Permitir acesso a arquivos estáticos do Next.js
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Verificar cookie de autenticação
  const authCookie = request.cookies.get('crm-auth')
  if (authCookie?.value) {
    return NextResponse.next()
  }

  // Redirecionar para login
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
