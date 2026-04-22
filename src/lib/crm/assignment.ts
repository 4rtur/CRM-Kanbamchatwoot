import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'

export interface PickedAgent {
  agentId: number
  agentName: string
  ruleId: string
}

function timeToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

function isWithinWindow(startTime: string, endTime: string, nowMinutes: number): boolean {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return nowMinutes >= start && nowMinutes <= end
}

// Escolhe o próximo agente pra novo lead conforme regras ativas do tenant/pipeline.
// Estratégia: round-robin por lastAssignedAt (NULL primeiro — agente nunca escolhido
// tem prioridade máxima; depois o mais antigo).
// Retorna null se nenhuma regra ativa no momento (weekday + horário).
// Side-effect: atualiza lastAssignedAt da regra escolhida.
export async function pickAgent(
  tenantId: string,
  pipelineId: string,
): Promise<PickedAgent | null> {
  const now = new Date()
  const weekday = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const rules = await db
    .select()
    .from(schema.assignmentRules)
    .where(
      and(
        eq(schema.assignmentRules.tenantId, tenantId),
        eq(schema.assignmentRules.pipelineId, pipelineId),
        eq(schema.assignmentRules.enabled, true),
      ),
    )

  const activeRules = rules.filter((r) => {
    if (!r.weekdays.includes(weekday)) return false
    if (!isWithinWindow(r.startTime, r.endTime, nowMinutes)) return false
    return true
  })

  if (activeRules.length === 0) return null

  activeRules.sort((a, b) => {
    const aTs = a.lastAssignedAt?.getTime() ?? 0
    const bTs = b.lastAssignedAt?.getTime() ?? 0
    return aTs - bTs
  })

  const chosen = activeRules[0]

  await db
    .update(schema.assignmentRules)
    .set({ lastAssignedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.assignmentRules.id, chosen.id))

  return {
    agentId: chosen.agentId,
    agentName: chosen.agentName,
    ruleId: chosen.id,
  }
}
