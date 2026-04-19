'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Zap, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import type { CrmAutomationRule, CrmAutomationCondition, CrmAutomationAction } from '@/lib/chatwoot/types'

function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
}

const CONDITION_LABELS: Record<CrmAutomationCondition['type'], string> = {
  label_added: 'Label adicionada',
  stage_changed: 'Etapa alterada para',
  score_above: 'Score acima de',
  checklist_completed: 'Checklist completa',
}

const ACTION_LABELS: Record<CrmAutomationAction['type'], string> = {
  move_to_stage: 'Mover para etapa',
  assign_agent: 'Atribuir agente',
  add_label: 'Adicionar label',
  send_notification: 'Enviar notificação',
}

export function AutomationSettings() {
  const {
    automationRules,
    addAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
    activePipeline,
    agents,
    labels,
  } = usePipelineStore()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [conditionType, setConditionType] = useState<CrmAutomationCondition['type']>('stage_changed')
  const [conditionValue, setConditionValue] = useState('')
  const [actionType, setActionType] = useState<CrmAutomationAction['type']>('move_to_stage')
  const [actionValue, setActionValue] = useState('')

  const pipelineRules = automationRules.filter(
    (r) => r.pipelineId === activePipeline?.id,
  )

  function resetForm() {
    setShowForm(false)
    setName('')
    setConditionType('stage_changed')
    setConditionValue('')
    setActionType('move_to_stage')
    setActionValue('')
  }

  function handleSave() {
    if (!name.trim() || !conditionValue || !actionValue || !activePipeline) return

    const rule: CrmAutomationRule = {
      id: generateId(),
      name: name.trim(),
      pipelineId: activePipeline.id,
      enabled: true,
      condition: { type: conditionType, value: conditionValue },
      action: { type: actionType, value: actionValue },
    }

    addAutomationRule(rule)
    resetForm()
  }

  function toggleRule(rule: CrmAutomationRule) {
    updateAutomationRule({ ...rule, enabled: !rule.enabled })
  }

  const stages = activePipeline?.stages ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="size-4 text-yellow-400" />
        <h3 className="text-sm font-semibold">Automações</h3>
        <span className="text-xs text-muted-foreground">
          ({pipelineRules.length} regra{pipelineRules.length !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Existing rules */}
      {pipelineRules.length > 0 && (
        <div className="space-y-2">
          {pipelineRules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-opacity ${
                rule.enabled ? 'border-border bg-card' : 'border-border/30 bg-muted/10 opacity-60'
              }`}
            >
              <button onClick={() => toggleRule(rule)} className="shrink-0">
                {rule.enabled ? (
                  <ToggleRight className="size-5 text-green-400" />
                ) : (
                  <ToggleLeft className="size-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{rule.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  Quando: {CONDITION_LABELS[rule.condition.type]} = {rule.condition.value}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Entao: {ACTION_LABELS[rule.action.type]} = {rule.action.value}
                </p>
              </div>
              <button
                onClick={() => deleteAutomationRule(rule.id)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {pipelineRules.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground/50">
          Nenhuma automação configurada para este pipeline.
        </p>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da regra"
            className="text-sm"
          />

          <Separator />

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Condição
            </label>
            <div className="flex gap-2">
              <select
                value={conditionType}
                onChange={(e) => {
                  setConditionType(e.target.value as CrmAutomationCondition['type'])
                  setConditionValue('')
                }}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="stage_changed">Etapa alterada para</option>
                <option value="label_added">Label adicionada</option>
                <option value="score_above">Score acima de</option>
                <option value="checklist_completed">Checklist completa</option>
              </select>

              {conditionType === 'stage_changed' && (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">Selecione...</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              {conditionType === 'label_added' && (
                <select
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">Selecione...</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.title}>{l.title}</option>
                  ))}
                </select>
              )}

              {conditionType === 'score_above' && (
                <Input
                  type="number"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="Ex: 60"
                  className="flex-1 text-xs"
                />
              )}

              {conditionType === 'checklist_completed' && (
                <span className="flex items-center text-xs text-muted-foreground">
                  (todas as tarefas marcadas)
                  {!conditionValue && setConditionValue('true') as unknown as string}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ação
            </label>
            <div className="flex gap-2">
              <select
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value as CrmAutomationAction['type'])
                  setActionValue('')
                }}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="move_to_stage">Mover para etapa</option>
                <option value="assign_agent">Atribuir agente</option>
                <option value="add_label">Adicionar label</option>
                <option value="send_notification">Notificação</option>
              </select>

              {actionType === 'move_to_stage' && (
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">Selecione...</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              {actionType === 'assign_agent' && (
                <select
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">Selecione...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                  ))}
                </select>
              )}

              {actionType === 'add_label' && (
                <Input
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="Nome da label"
                  className="flex-1 text-xs"
                />
              )}

              {actionType === 'send_notification' && (
                <Input
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="Mensagem da notificacao"
                  className="flex-1 text-xs"
                />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || !conditionValue || !actionValue}>
              <Check className="size-3" data-icon="inline-start" />
              Salvar
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="size-3" data-icon="inline-start" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="size-3.5" data-icon="inline-start" />
          Nova Automacao
        </Button>
      )}
    </div>
  )
}
