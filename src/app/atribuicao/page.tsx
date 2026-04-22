'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Kanban, Plus, Save, Trash2, ToggleLeft, ToggleRight, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { useUser } from '@/lib/auth/use-user'
import { hasPermission } from '@/lib/auth/permissions'
import type { ChatwootAgent, CrmPipeline } from '@/lib/chatwoot/types'
import { showToast } from '@/lib/toast'

interface AssignmentRuleRow {
  id: string
  tenantId: string
  pipelineId: string
  agentId: number
  agentName: string
  weekdays: number[]
  startTime: string
  endTime: string
  enabled: boolean
  lastAssignedAt: string | null
  createdAt: string
  updatedAt: string
}

interface DraftRule {
  pipelineId: string
  agentId: number | null
  agentName: string
  weekdays: number[]
  startTime: string
  endTime: string
  enabled: boolean
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function emptyDraft(defaultPipelineId: string): DraftRule {
  return {
    pipelineId: defaultPipelineId,
    agentId: null,
    agentName: '',
    weekdays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    enabled: true,
  }
}

async function fetchRules(): Promise<AssignmentRuleRow[]> {
  const response = await fetch('/api/crm/assignment-rules', { cache: 'no-store' })
  const json = await response.json()
  if (!json.success) throw new Error(json.error ?? 'Falha ao listar regras')
  return json.data as AssignmentRuleRow[]
}

async function createRule(draft: DraftRule): Promise<AssignmentRuleRow> {
  const response = await fetch('/api/crm/assignment-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  const json = await response.json()
  if (!json.success) throw new Error(typeof json.error === 'string' ? json.error : 'Falha ao criar regra')
  return json.data as AssignmentRuleRow
}

async function updateRule(id: string, patch: Partial<DraftRule>): Promise<AssignmentRuleRow> {
  const response = await fetch(`/api/crm/assignment-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const json = await response.json()
  if (!json.success) throw new Error(typeof json.error === 'string' ? json.error : 'Falha ao atualizar')
  return json.data as AssignmentRuleRow
}

async function deleteRule(id: string): Promise<void> {
  const response = await fetch(`/api/crm/assignment-rules/${id}`, { method: 'DELETE' })
  const json = await response.json()
  if (!json.success) throw new Error(typeof json.error === 'string' ? json.error : 'Falha ao remover')
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[]
  onChange: (next: number[]) => void
}) {
  function toggle(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day))
    } else {
      onChange([...value, day].sort((a, b) => a - b))
    }
  }
  return (
    <div className="flex flex-wrap gap-1">
      {WEEKDAY_LABELS.map((label, idx) => {
        const active = value.includes(idx)
        return (
          <button
            key={idx}
            type="button"
            onClick={() => toggle(idx)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              active
                ? 'border-[#1F93FF] bg-[#1F93FF]/15 text-[#1F93FF]'
                : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function RuleCard({
  rule,
  agents,
  pipelines,
  onDelete,
  onUpdate,
}: {
  rule: AssignmentRuleRow
  agents: ChatwootAgent[]
  pipelines: CrmPipeline[]
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<DraftRule>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DraftRule>({
    pipelineId: rule.pipelineId,
    agentId: rule.agentId,
    agentName: rule.agentName,
    weekdays: rule.weekdays,
    startTime: rule.startTime,
    endTime: rule.endTime,
    enabled: rule.enabled,
  })

  function handleSave() {
    onUpdate(rule.id, draft)
    setEditing(false)
  }

  function handleCancel() {
    setDraft({
      pipelineId: rule.pipelineId,
      agentId: rule.agentId,
      agentName: rule.agentName,
      weekdays: rule.weekdays,
      startTime: rule.startTime,
      endTime: rule.endTime,
      enabled: rule.enabled,
    })
    setEditing(false)
  }

  const pipeline = pipelines.find((p) => p.id === rule.pipelineId)
  const weekdaysLabel = rule.weekdays.length === 7
    ? 'Todos os dias'
    : rule.weekdays.map((d) => WEEKDAY_LABELS[d]).join(' · ')

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-[#1F93FF]" />
            <p className="truncate text-sm font-semibold">{rule.agentName}</p>
            {!rule.enabled && (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                desativada
              </span>
            )}
          </div>
          {!editing && (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Pipeline: <span className="font-medium text-foreground">{pipeline?.name ?? rule.pipelineId}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {weekdaysLabel} · {rule.startTime} às {rule.endTime}
              </p>
              {rule.lastAssignedAt && (
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                  Último lead: {new Date(rule.lastAssignedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!editing ? (
            <>
              <button
                onClick={() => onUpdate(rule.id, { enabled: !rule.enabled })}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title={rule.enabled ? 'Desativar' : 'Ativar'}
              >
                {rule.enabled ? (
                  <ToggleRight className="size-5 text-green-400" />
                ) : (
                  <ToggleLeft className="size-5" />
                )}
              </button>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)}>
                <Save className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (confirm(`Remover a regra do agente ${rule.agentName}?`)) {
                    onDelete(rule.id)
                  }
                }}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Pipeline</label>
            <select
              value={draft.pipelineId}
              onChange={(e) => setDraft({ ...draft, pipelineId: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Agente</label>
            <select
              value={draft.agentId ?? ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                const agent = agents.find((a) => a.id === id)
                setDraft({
                  ...draft,
                  agentId: id,
                  agentName: agent?.name ?? draft.agentName,
                })
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="">Selecione…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Dias ativos</label>
            <WeekdayPicker
              value={draft.weekdays}
              onChange={(weekdays) => setDraft({ ...draft, weekdays })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Início</label>
              <Input
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fim</label>
              <Input
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="size-3.5" data-icon="inline-start" />
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AtribuicaoContent() {
  const { user } = useUser()
  const { agents, pipelines, autoAssignmentEnabled, setAutoAssignmentEnabled } = usePipelineStore()

  const [rules, setRules] = useState<AssignmentRuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<DraftRule>(emptyDraft(''))

  const canManage = hasPermission(user, 'settings:access')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchRules()
        if (!cancelled) setRules(rows)
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Erro ao carregar regras')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (pipelines.length > 0 && !draft.pipelineId) {
      setDraft((d) => ({ ...d, pipelineId: pipelines[0].id }))
    }
  }, [pipelines, draft.pipelineId])

  async function handleCreate() {
    if (!draft.agentId) {
      showToast('Selecione um agente', 'error')
      return
    }
    try {
      const created = await createRule(draft)
      setRules((prev) => [...prev, created])
      setDraft(emptyDraft(pipelines[0]?.id ?? ''))
      setCreating(false)
      showToast('Regra criada', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar', 'error')
    }
  }

  async function handleUpdate(id: string, patch: Partial<DraftRule>) {
    try {
      const updated = await updateRule(id, patch)
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar', 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
      showToast('Regra removida', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover', 'error')
    }
  }

  if (!canManage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="size-4" />
          Você não tem permissão para gerenciar atribuição automática.
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Kanban className="size-5 text-[#1F93FF]" />
          <h1 className="text-base font-semibold">Auto-atribuição de leads</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Status</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando ativada, novos leads que entrarem no CRM serão atribuídos automaticamente ao agente disponível conforme as regras abaixo (round-robin por último atendimento).
              </p>
            </div>
            <button
              onClick={() => setAutoAssignmentEnabled(!autoAssignmentEnabled)}
              className="shrink-0"
              title={autoAssignmentEnabled ? 'Desativar' : 'Ativar'}
            >
              {autoAssignmentEnabled ? (
                <ToggleRight className="size-7 text-green-400" />
              ) : (
                <ToggleLeft className="size-7 text-muted-foreground" />
              )}
            </button>
          </div>
          <div className={`mt-3 flex items-center gap-2 rounded-md border p-2 text-xs ${
            autoAssignmentEnabled
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-border bg-muted/30 text-muted-foreground'
          }`}>
            {autoAssignmentEnabled ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Ativada — novos leads recebem agente conforme regras ativas.
              </>
            ) : (
              <>
                <AlertCircle className="size-3.5" />
                Desativada — novos leads entram sem agente.
              </>
            )}
          </div>
        </section>

        <Separator className="my-6" />

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Regras</h2>
            {!creating && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" data-icon="inline-start" />
                Nova regra
              </Button>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada regra liga 1 agente a 1 pipeline com janela de dias e horário. Turnos que atravessam meia-noite precisam de 2 regras (ex.: 18:00-23:59 + 00:00-09:30).
          </p>
        </section>

        {creating && (
          <div className="mt-4 rounded-lg border border-[#1F93FF]/30 bg-[#1F93FF]/5 p-4">
            <p className="text-sm font-semibold">Nova regra</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Pipeline</label>
                <select
                  value={draft.pipelineId}
                  onChange={(e) => setDraft({ ...draft, pipelineId: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Agente</label>
                <select
                  value={draft.agentId ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    const agent = agents.find((a) => a.id === id)
                    setDraft({
                      ...draft,
                      agentId: id || null,
                      agentName: agent?.name ?? '',
                    })
                  }}
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="">Selecione…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Dias ativos</label>
                <WeekdayPicker
                  value={draft.weekdays}
                  onChange={(weekdays) => setDraft({ ...draft, weekdays })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Início</label>
                  <Input
                    type="time"
                    value={draft.startTime}
                    onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Fim</label>
                  <Input
                    type="time"
                    value={draft.endTime}
                    onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Criar
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setCreating(false)
                  setDraft(emptyDraft(pipelines[0]?.id ?? ''))
                }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground">Carregando regras…</p>
          )}
          {loadError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {loadError}
            </div>
          )}
          {!loading && !loadError && rules.length === 0 && !creating && (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma regra configurada. Clique em &ldquo;Nova regra&rdquo; pra começar.
            </div>
          )}
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              agents={agents}
              pipelines={pipelines}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AtribuicaoPage() {
  return (
    <PipelineProvider>
      <AtribuicaoContent />
    </PipelineProvider>
  )
}
