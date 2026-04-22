import type { NextRequest } from 'next/server'
import { db, schema } from './index'
import { newId } from '@/lib/crm/uid'
import { getSessionFromRequest } from '@/lib/auth/server'

export type AuditAction =
  | 'card.moved'
  | 'card.created'
  | 'card.pipeline_moved'
  | 'label.added'
  | 'label.removed'
  | 'pipeline.created'
  | 'pipeline.updated'
  | 'pipeline.deleted'
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'stage.created'
  | 'stage.updated'
  | 'stage.deleted'
  | 'automation.created'
  | 'automation.updated'
  | 'automation.deleted'
  | 'category.created'
  | 'category.updated'
  | 'category.deleted'
  | 'assignment_rule.created'
  | 'assignment_rule.updated'
  | 'assignment_rule.deleted'
  | 'assignment_rule.applied'

export type AuditEntityType =
  | 'card'
  | 'deal'
  | 'contact'
  | 'pipeline'
  | 'stage'
  | 'product'
  | 'automation'
  | 'category'
  | 'label'
  | 'assignment_rule'

export interface LogAuditInput {
  tenantId: string
  agentId?: number | null
  agentName?: string | null
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  details?: Record<string, unknown>
}

/**
 * Registra uma entrada no audit log. Nunca lança — falhas de audit não devem
 * quebrar a operação principal. Erros são logados no servidor.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      id: newId('al'),
      tenantId: input.tenantId,
      agentId: input.agentId ?? null,
      agentName: input.agentName ?? 'system',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ?? {},
    })
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[audit] falha ao gravar entrada', {
      action: input.action,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Igual ao logAudit, mas enriquece agentId/agentName a partir do cookie de sessão
 * do Chatwoot presente na requisição. Se não houver sessão, cai no default 'system'.
 */
export async function logAuditFromRequest(
  request: NextRequest,
  input: Omit<LogAuditInput, 'agentId' | 'agentName'> & {
    agentId?: number | null
    agentName?: string | null
  },
): Promise<void> {
  let agentId: number | null = input.agentId ?? null
  let agentName: string | null = input.agentName ?? null

  if (agentId === null || agentName === null) {
    const session = await getSessionFromRequest(request)
    if (session) {
      agentId = agentId ?? session.id
      agentName = agentName ?? session.name
    }
  }

  await logAudit({
    ...input,
    agentId,
    agentName,
  })
}
