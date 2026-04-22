'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Settings2, Plus, Trash2, GripVertical, LayoutTemplate, Eye, EyeOff } from 'lucide-react'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { AutomationSettings } from './automation-settings'
import type { CrmPipeline, CrmStage } from '@/lib/chatwoot/types'
import { useUser } from '@/lib/auth/use-user'
import { hasPermission } from '@/lib/auth/permissions'

const STAGE_COLORS = [
  '#6B7280',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#22C55E',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#F97316',
]

interface PipelineTemplate {
  name: string
  description: string
  stages: { name: string; color: string }[]
}

const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    name: 'Vendas',
    description: 'Pipeline de vendas completo',
    stages: [
      { name: 'Novo Lead', color: '#6B7280' },
      { name: 'Qualificação', color: '#3B82F6' },
      { name: 'Proposta', color: '#F59E0B' },
      { name: 'Negociação', color: '#8B5CF6' },
      { name: 'Fechado', color: '#22C55E' },
    ],
  },
  {
    name: 'Suporte',
    description: 'Atendimento e suporte ao cliente',
    stages: [
      { name: 'Aberto', color: '#EF4444' },
      { name: 'Em Andamento', color: '#F59E0B' },
      { name: 'Aguardando Cliente', color: '#6B7280' },
      { name: 'Resolvido', color: '#22C55E' },
    ],
  },
  {
    name: 'Cobrança',
    description: 'Gestão de cobranças e pagamentos',
    stages: [
      { name: 'Pendente', color: '#F59E0B' },
      { name: 'Notificado', color: '#3B82F6' },
      { name: 'Negociando', color: '#8B5CF6' },
      { name: 'Pago', color: '#22C55E' },
      { name: 'Inadimplente', color: '#EF4444' },
    ],
  },
  {
    name: 'Recrutamento',
    description: 'Processo seletivo de candidatos',
    stages: [
      { name: 'Candidato', color: '#6B7280' },
      { name: 'Triagem', color: '#3B82F6' },
      { name: 'Entrevista', color: '#F59E0B' },
      { name: 'Proposta', color: '#8B5CF6' },
      { name: 'Contratado', color: '#22C55E' },
    ],
  },
  {
    name: 'Customer Success',
    description: 'Acompanhamento de clientes ativos',
    stages: [
      { name: 'Onboarding', color: '#3B82F6' },
      { name: 'Ativo', color: '#22C55E' },
      { name: 'Em Risco', color: '#F59E0B' },
      { name: 'Churned', color: '#EF4444' },
      { name: 'Renovado', color: '#8B5CF6' },
    ],
  },
  {
    name: 'Personalizado',
    description: 'Comece do zero com etapas vazias',
    stages: [],
  },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function PipelineSettings() {
  const {
    pipelines,
    addPipeline,
    updatePipeline,
    deletePipeline,
    agents,
    accessControl,
    setAccessControl,
  } = usePipelineStore()
  const { user } = useUser()
  const canCreatePipeline = hasPermission(user, 'pipelines:create')
  const canDeletePipeline = hasPermission(user, 'pipelines:delete')
  const canManageAutomations = hasPermission(user, 'automations:manage')
  const [open, setOpen] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<CrmPipeline | null>(null)
  const [pipelineName, setPipelineName] = useState('')
  const [stages, setStages] = useState<CrmStage[]>([])
  const [activeTab, setActiveTab] = useState('pipelines')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAccessControl, setShowAccessControl] = useState(false)
  const [accessPipelineId, setAccessPipelineId] = useState<string | null>(null)

  function handleCreateNew() {
    setShowTemplates(true)
  }

  function handleSelectTemplate(template: PipelineTemplate) {
    setShowTemplates(false)
    setEditingPipeline(null)
    setPipelineName(template.name === 'Personalizado' ? '' : template.name)

    if (template.stages.length === 0) {
      setStages([
        { id: generateId(), name: 'Novo', color: '#6B7280', order: 0 },
        { id: generateId(), name: 'Em Progresso', color: '#3B82F6', order: 1 },
        { id: generateId(), name: 'Concluído', color: '#22C55E', order: 2 },
      ])
    } else {
      setStages(
        template.stages.map((s, i) => ({
          id: generateId(),
          name: s.name,
          color: s.color,
          order: i,
        })),
      )
    }
  }

  function handleEdit(pipeline: CrmPipeline) {
    setEditingPipeline(pipeline)
    setPipelineName(pipeline.name)
    setStages([...pipeline.stages])
    setShowTemplates(false)
  }

  function handleAddStage() {
    const colorIndex = stages.length % STAGE_COLORS.length
    setStages((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        color: STAGE_COLORS[colorIndex],
        order: prev.length,
      },
    ])
  }

  function handleRemoveStage(stageId: string) {
    setStages((prev) =>
      prev
        .filter((s) => s.id !== stageId)
        .map((s, i) => ({ ...s, order: i })),
    )
  }

  function handleStageNameChange(stageId: string, name: string) {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, name } : s)))
  }

  function handleStageColorChange(stageId: string, color: string) {
    setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, color } : s)))
  }

  function handleSave() {
    if (!pipelineName.trim()) return
    const validStages = stages.filter((s) => s.name.trim())
    if (validStages.length === 0) return

    if (editingPipeline) {
      updatePipeline({
        ...editingPipeline,
        name: pipelineName.trim(),
        stages: validStages,
      })
    } else {
      addPipeline({
        id: generateId(),
        name: pipelineName.trim(),
        stages: validStages,
        createdAt: new Date().toISOString(),
      })
    }

    setEditingPipeline(null)
    setPipelineName('')
    setStages([])
  }

  function handleDelete(id: string) {
    deletePipeline(id)
    setEditingPipeline(null)
    setPipelineName('')
    setStages([])
  }

  function handleAccessToggle(pipelineId: string, agentId: number) {
    const current = accessControl[pipelineId]?.visibleTo ?? 'all'
    if (current === 'all') {
      setAccessControl(pipelineId, [agentId])
    } else {
      const arr = current as number[]
      if (arr.includes(agentId)) {
        const next = arr.filter((id) => id !== agentId)
        setAccessControl(pipelineId, next.length === 0 ? 'all' : next)
      } else {
        setAccessControl(pipelineId, [...arr, agentId])
      }
    }
  }

  function handleSetAllVisible(pipelineId: string) {
    setAccessControl(pipelineId, 'all')
  }

  const isEditing = editingPipeline !== null || pipelineName !== ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Settings2 className="size-3.5" data-icon="inline-start" />
            Configurar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Gerencie pipelines, etapas, automações e visibilidade.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line">
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            {canManageAutomations && (
              <TabsTrigger value="automations">Automações</TabsTrigger>
            )}
            <TabsTrigger value="access">Visibilidade</TabsTrigger>
          </TabsList>

          <div className="max-h-[60vh] overflow-y-auto">
            <TabsContent value="pipelines">
              {/* Template picker */}
              {showTemplates ? (
                <div className="space-y-2 py-2">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Escolha um template para começar:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PIPELINE_TEMPLATES.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => handleSelectTemplate(template)}
                        className="flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:border-[#1F93FF]/40 hover:bg-[#1F93FF]/5"
                      >
                        <div className="flex items-center gap-1.5">
                          <LayoutTemplate className="size-3.5 text-[#1F93FF]" />
                          <span className="text-sm font-medium">{template.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {template.description}
                        </p>
                        {template.stages.length > 0 && (
                          <div className="mt-1 flex gap-0.5">
                            {template.stages.map((s, i) => (
                              <div
                                key={i}
                                className="size-2 rounded-full"
                                style={{ backgroundColor: s.color }}
                                title={s.name}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(false)}
                    className="mt-2 w-full"
                  >
                    Voltar
                  </Button>
                </div>
              ) : !isEditing ? (
                <div className="space-y-2 py-2">
                  {pipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{pipeline.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pipeline.stages.length} etapas
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(pipeline)}
                        >
                          <Settings2 className="size-3.5" />
                        </Button>
                        {pipelines.length > 1 && canDeletePipeline && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(pipeline.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {canCreatePipeline && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCreateNew}
                    >
                      <Plus className="size-3.5" data-icon="inline-start" />
                      Novo Pipeline
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Nome do Pipeline
                    </label>
                    <Input
                      value={pipelineName}
                      onChange={(e) => setPipelineName(e.target.value)}
                      placeholder="Ex: Vendas, Suporte..."
                    />
                  </div>

                  <Separator />

                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Etapas
                    </label>
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-2"
                        >
                          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40" />
                          <input
                            type="color"
                            value={stage.color}
                            onChange={(e) => handleStageColorChange(stage.id, e.target.value)}
                            className="size-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                          />
                          <Input
                            value={stage.name}
                            onChange={(e) => handleStageNameChange(stage.id, e.target.value)}
                            placeholder={`Etapa ${index + 1}`}
                            className="flex-1"
                          />
                          {stages.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveStage(stage.id)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={handleAddStage}
                    >
                      <Plus className="size-3" data-icon="inline-start" />
                      Adicionar etapa
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="automations">
              <div className="py-2">
                <AutomationSettings />
              </div>
            </TabsContent>

            <TabsContent value="access">
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  Configure quais agentes podem ver cada pipeline. Por padrão, todos os agentes têm acesso.
                </p>

                {showAccessControl && accessPipelineId ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        {pipelines.find((p) => p.id === accessPipelineId)?.name}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAccessControl(false)
                          setAccessPipelineId(null)
                        }}
                      >
                        Voltar
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSetAllVisible(accessPipelineId)}
                    >
                      <Eye className="size-3.5" data-icon="inline-start" />
                      Visível para todos
                    </Button>

                    <Separator />

                    <div className="space-y-1.5">
                      {agents.map((agent) => {
                        const current = accessControl[accessPipelineId]?.visibleTo ?? 'all'
                        const isVisible = current === 'all' || (current as number[]).includes(agent.id)
                        return (
                          <button
                            key={agent.id}
                            onClick={() => handleAccessToggle(accessPipelineId, agent.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors ${
                              isVisible
                                ? 'bg-[#1F93FF]/10 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            {isVisible ? (
                              <Eye className="size-3.5 text-[#1F93FF]" />
                            ) : (
                              <EyeOff className="size-3.5" />
                            )}
                            <span>{agent.name}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              {agent.role === 'administrator' ? 'Admin' : 'Agente'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pipelines.map((pipeline) => {
                      const control = accessControl[pipeline.id]?.visibleTo ?? 'all'
                      const label = control === 'all'
                        ? 'Todos os agentes'
                        : `${(control as number[]).length} agente(s)`
                      return (
                        <button
                          key={pipeline.id}
                          onClick={() => {
                            setAccessPipelineId(pipeline.id)
                            setShowAccessControl(true)
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-medium">{pipeline.name}</p>
                            <p className="text-xs text-muted-foreground">{label}</p>
                          </div>
                          <Eye className="size-4 text-muted-foreground" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          {isEditing && activeTab === 'pipelines' ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPipeline(null)
                  setPipelineName('')
                  setStages([])
                }}
              >
                Voltar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
