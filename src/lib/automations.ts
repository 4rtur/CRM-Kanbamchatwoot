import type { CrmCard, CrmAutomationRule } from '@/lib/chatwoot/types'

const AUTOMATIONS_STORAGE_KEY = 'chatwoot-crm-automations'

export function loadAutomations(): CrmAutomationRule[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(AUTOMATIONS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CrmAutomationRule[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // fallback
  }
  return []
}

export function saveAutomations(rules: CrmAutomationRule[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTOMATIONS_STORAGE_KEY, JSON.stringify(rules))
}

interface AutomationContext {
  card: CrmCard
  previousStageId?: string
  addedLabel?: string
}

interface AutomationResult {
  newStageId?: string
  newAgentId?: number
  newLabel?: string
  notification?: string
}

export function evaluateAutomations(
  rules: CrmAutomationRule[],
  context: AutomationContext,
): AutomationResult | null {
  const { card, previousStageId, addedLabel } = context

  for (const rule of rules) {
    if (!rule.enabled) continue
    if (rule.pipelineId !== card.pipelineId) continue

    let conditionMet = false

    switch (rule.condition.type) {
      case 'label_added':
        conditionMet = addedLabel === rule.condition.value
        break
      case 'stage_changed':
        conditionMet = previousStageId !== undefined && card.stageId === rule.condition.value
        break
      case 'score_above':
        conditionMet = card.score >= Number(rule.condition.value)
        break
      case 'checklist_completed': {
        if (card.checklist.length > 0) {
          const allDone = card.checklist.every((item) => item.done)
          conditionMet = allDone
        }
        break
      }
    }

    if (!conditionMet) continue

    switch (rule.action.type) {
      case 'move_to_stage':
        return { newStageId: rule.action.value }
      case 'assign_agent':
        return { newAgentId: Number(rule.action.value) }
      case 'add_label':
        return { newLabel: rule.action.value }
      case 'send_notification':
        return { notification: rule.action.value }
    }
  }

  return null
}
