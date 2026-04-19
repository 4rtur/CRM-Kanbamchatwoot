export async function GET(): Promise<Response> {
  const url = process.env.CHATWOOT_URL ?? ''
  const token = process.env.CHATWOOT_API_TOKEN ?? ''
  const accountId = process.env.CHATWOOT_ACCOUNT_ID ?? ''

  const serverConfigured = Boolean(url && token && accountId)

  return Response.json({
    serverConfigured,
    chatwootUrl: serverConfigured ? url : '',
  })
}
