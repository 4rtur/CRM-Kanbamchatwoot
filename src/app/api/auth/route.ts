import { NextRequest } from 'next/server'

export async function POST(request: NextRequest): Promise<Response> {
  const accessPassword = process.env.CRM_ACCESS_PASSWORD

  if (!accessPassword) {
    return Response.json(
      { error: 'Proteção por senha não configurada.' },
      { status: 400 },
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Corpo da requisição inválido.' },
      { status: 400 },
    )
  }

  if (!body.password || body.password !== accessPassword) {
    return Response.json(
      { error: 'Senha incorreta.' },
      { status: 401 },
    )
  }

  const token = Buffer.from(`${Date.now()}-${accessPassword}`).toString('base64')

  const response = Response.json({ success: true })
  const headers = new Headers(response.headers)
  headers.set(
    'Set-Cookie',
    `crm-auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  )

  return new Response(response.body, {
    status: 200,
    headers,
  })
}
