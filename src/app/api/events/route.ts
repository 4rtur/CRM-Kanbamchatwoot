/**
 * Endpoint Server-Sent Events (SSE) — preparação para multi-usuário.
 *
 * Atualmente envia apenas heartbeats a cada 30 segundos para manter
 * a conexão ativa. Quando o backend real for implementado, este endpoint
 * será o ponto de entrada para sincronização entre múltiplos usuários
 * em servidores diferentes.
 *
 * Para evoluir para multi-usuário real:
 * 1. Adicionar um pub/sub (Redis, Postgres LISTEN/NOTIFY, etc.)
 * 2. Quando uma mutação ocorrer via API, publicar o evento no pub/sub
 * 3. Este endpoint assina o canal pub/sub e retransmite para o cliente
 * 4. No cliente, substituir BroadcastChannel por EventSource apontando
 *    para /api/events, mantendo a mesma interface de RealtimeEvent
 * 5. Adicionar autenticação (token no header ou query param)
 *
 * Exemplo de uso no cliente:
 *   const source = new EventSource('/api/events')
 *   source.onmessage = (e) => {
 *     const event = JSON.parse(e.data)
 *     handleRealtimeEvent(event)
 *   }
 */

const HEARTBEAT_INTERVAL_MS = 30_000

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Envia evento inicial de conexão
      const connectEvent = `data: ${JSON.stringify({
        type: 'connected',
        payload: { message: 'Conexão SSE estabelecida' },
        timestamp: Date.now(),
      })}\n\n`
      controller.enqueue(encoder.encode(connectEvent))

      // Heartbeat periódico para manter a conexão viva
      const intervalId = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            payload: {},
            timestamp: Date.now(),
          })}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch {
          clearInterval(intervalId)
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Limpa o interval quando o cliente desconectar
      // O controller.close() será chamado pelo runtime quando a conexão cair
      const checkClosed = setInterval(() => {
        try {
          // Tenta enqueue vazio; se falhar, a stream já foi fechada
          controller.enqueue(encoder.encode(''))
        } catch {
          clearInterval(intervalId)
          clearInterval(checkClosed)
        }
      }, HEARTBEAT_INTERVAL_MS * 2)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
