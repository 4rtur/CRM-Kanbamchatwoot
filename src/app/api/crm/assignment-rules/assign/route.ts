import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { resolveTenantId, tenantErrorResponse } from '@/lib/crm/tenant'
import { pickAgent } from '@/lib/crm/assignment'
import { badRequest, ok } from '@/lib/crm/schemas'
import { logAuditFromRequest } from '@/lib/db/audit'

const assignInputSchema = z.object({
  pipelineId: z.string().min(1),
  // identificador opcional do recurso sendo atribuído (contato/deal) apenas pra auditoria
  entityType: z.enum(['contact', 'deal']).optional(),
  entityId: z.string().min(1).optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const tenantId = await resolveTenantId(request)
    const body: unknown = await request.json()
    const parsed = assignInputSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.format())

    const picked = await pickAgent(tenantId, parsed.data.pipelineId)
    if (!picked) {
      return ok({ agent: null, reason: 'no_active_rule' })
    }

    await logAuditFromRequest(request, {
      tenantId,
      action: 'assignment_rule.applied',
      entityType: parsed.data.entityType ?? 'assignment_rule',
      entityId: parsed.data.entityId ?? picked.ruleId,
      details: {
        agentId: picked.agentId,
        agentName: picked.agentName,
        ruleId: picked.ruleId,
        pipelineId: parsed.data.pipelineId,
      },
    })

    return ok({ agent: picked })
  } catch (error: unknown) {
    return tenantErrorResponse(error)
  }
}
