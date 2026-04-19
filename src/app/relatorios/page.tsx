'use client'

import { useMemo, useState, useEffect } from 'react'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  Trophy,
  Timer,
  ChevronDown,
  CalendarDays,
  Sun,
  Moon,
  ArrowDown,
  Inbox,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/lib/theme'

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
  }
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`
  }
  return `R$ ${value}`
}

type PeriodFilter = '7d' | '30d' | 'month' | 'all'

const PERIOD_OPTIONS: { value: PeriodFilter; label: string; short: string }[] = [
  { value: '7d', label: 'Últimos 7 dias', short: '7 dias' },
  { value: '30d', label: 'Últimos 30 dias', short: '30 dias' },
  { value: 'month', label: 'Este mês', short: 'Este mês' },
  { value: 'all', label: 'Todo período', short: 'Tudo' },
]

interface AgentStats {
  name: string
  thumbnail: string
  leads: number
  value: number
  conversion: number
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) {
      setDisplay(0)
      return
    }
    const duration = 600
    const steps = 30
    const stepTime = duration / steps
    const increment = value / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const current = step >= steps ? value : Math.round(increment * step)
      if (step >= steps) clearInterval(timer)
      setDisplay(current)
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span className="tabular-nums">
      {display.toLocaleString('pt-BR')}{suffix}
    </span>
  )
}

function AnimatedCurrency({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) {
      setDisplay(0)
      return
    }
    const duration = 600
    const steps = 30
    const stepTime = duration / steps
    const increment = value / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const current = step >= steps ? value : Math.round(increment * step)
      if (step >= steps) clearInterval(timer)
      setDisplay(current)
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span className="tabular-nums">{formatCurrency(display)}</span>
  )
}

/* ─── Tab: Resumo ─── */
function TabResumo({
  stats,
  inboxCounts,
  recentNotes,
}: {
  stats: NonNullable<ReturnType<typeof useComputedStats>>
  inboxCounts: { name: string; count: number }[]
  recentNotes: { text: string; author: string; timestamp: string; type: string }[]
}) {
  const maxLeads = Math.max(...stats.stageStats.map((s) => s.count), 1)

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {stats.kpis.map((kpi) => {
          const Icon = kpi.icon
          const isHighlight = 'highlight' in kpi && kpi.highlight
          return (
            <div
              key={kpi.label}
              style={{ flex: '1 1 200px', minWidth: '200px' }}
              className={`rounded-xl border-l-[3px] ${kpi.borderColor} border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-5`}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`flex size-8 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                  <Icon className={`size-4 ${kpi.iconColor}`} />
                </div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              {kpi.type === 'currency' ? (
                <p className={`text-3xl lg:text-4xl font-bold tracking-tight ${isHighlight ? 'text-emerald-500 dark:text-emerald-400' : ''}`}>
                  <AnimatedCurrency value={kpi.value} />
                </p>
              ) : kpi.type === 'percent' ? (
                <p className="text-3xl lg:text-4xl font-bold tracking-tight">
                  <AnimatedNumber value={kpi.value} suffix="%" />
                </p>
              ) : (
                <p className="text-3xl lg:text-4xl font-bold tracking-tight">
                  <AnimatedNumber value={kpi.value} />
                </p>
              )}
              {kpi.detail && (
                <p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Leads por Etapa — simple bars */}
      <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Leads por Etapa</h3>
        </div>
        <div className="space-y-3">
          {stats.stageStats.map((ss) => {
            const barWidth = Math.max((ss.count / maxLeads) * 100, 3)
            return (
              <div key={ss.stage.id} className="flex items-center gap-3">
                <div
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ss.stage.color }}
                />
                <span className="w-32 shrink-0 truncate text-sm">{ss.stage.name}</span>
                <div className="flex-1 h-5 rounded bg-muted/30 dark:bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{ width: `${barWidth}%`, backgroundColor: ss.stage.color, opacity: 0.75 }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {ss.count}
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(ss.value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Two columns: Leads por Origem + Atividade Recente */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Leads por Origem */}
        <div style={{ flex: '1 1 45%', minWidth: '300px' }} className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-6">
            <Inbox className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Leads por Origem</h3>
          </div>
          {inboxCounts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma origem encontrada.</p>
          ) : (
            <div className="space-y-3">
              {inboxCounts.map((inbox) => {
                const maxInbox = Math.max(...inboxCounts.map((i) => i.count), 1)
                const barW = Math.max((inbox.count / maxInbox) * 100, 4)
                return (
                  <div key={inbox.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">{inbox.name}</span>
                    <div className="flex-1 h-4 rounded bg-muted/30 dark:bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded bg-blue-500/60 dark:bg-blue-400/40 transition-all duration-500"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{inbox.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Atividade Recente */}
        <div style={{ flex: '1 1 45%', minWidth: '300px' }} className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Atividade Recente</h3>
          </div>
          {recentNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-4">
              {recentNotes.map((note, i) => {
                const typeLabel =
                  note.type === 'stage_change'
                    ? 'Mudou de etapa'
                    : note.type === 'agent_change'
                      ? 'Agente alterado'
                      : 'Nota'
                return (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/30" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{note.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel} &middot; {note.author}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Tab: Funil ─── */
function TabFunil({ stats }: { stats: NonNullable<ReturnType<typeof useComputedStats>> }) {
  const firstCount = stats.stageStats[0]?.count ?? 1

  return (
    <div className="space-y-8">
      {/* Vertical funnel with progressive bars */}
      <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Funil de Conversão</h3>
        </div>
        <div className="space-y-1">
          {stats.stageStats.map((ss, index) => {
            const percentOfFirst = firstCount > 0 ? (ss.count / firstCount) * 100 : 0
            const barWidth = Math.max(percentOfFirst, 4)
            const nextSs = stats.stageStats[index + 1]
            const dropOff =
              nextSs && ss.count > 0
                ? Math.round(((ss.count - nextSs.count) / ss.count) * 100)
                : null

            return (
              <div key={ss.stage.id}>
                <div className="flex items-center gap-4 py-2.5">
                  <div
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: ss.stage.color }}
                  />
                  <span className="w-36 shrink-0 truncate text-sm font-medium">{ss.stage.name}</span>
                  <div className="flex-1 h-7 rounded-md bg-muted/30 dark:bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-700"
                      style={{ width: `${barWidth}%`, backgroundColor: ss.stage.color, opacity: 0.7 }}
                    />
                  </div>
                  <div className="w-36 shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums">{ss.count}</span>
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      {Math.round(percentOfFirst)}%
                    </span>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {formatCurrency(ss.value)}
                    </div>
                  </div>
                </div>
                {dropOff !== null && dropOff > 0 && (
                  <div className="flex items-center gap-1.5 pl-[52px] py-0.5">
                    <ArrowDown className="size-3 text-red-400/70" />
                    <span className="text-[11px] text-red-400/70 tabular-nums">
                      -{dropOff}% saíram
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion table */}
      <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Detalhamento por Etapa</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border/50 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02]">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Etapa</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Leads</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Valor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Conversão %</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Tempo Médio</th>
              </tr>
            </thead>
            <tbody>
              {stats.stageStats.map((ss, i) => (
                <tr
                  key={ss.stage.id}
                  className={i % 2 === 1 ? 'bg-muted/15 dark:bg-white/[0.015]' : ''}
                >
                  <td className="px-6 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: ss.stage.color }}
                      />
                      {ss.stage.name}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">{ss.count}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{formatCurrency(ss.value)}</td>
                  <td className="px-6 py-3 text-right tabular-nums">{ss.conversion}%</td>
                  <td className="px-6 py-3 text-right tabular-nums">{ss.avgDays} dias</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Tab: Agentes ─── */
function TabAgentes({
  agents,
  totalLeads,
}: {
  agents: AgentStats[]
  totalLeads: number
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Desempenho por Agente</h3>
      </div>
      {agents.length === 0 ? (
        <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum agente atribuído neste pipeline.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {agents.map((agent) => {
            const initials = agent.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
            const sharePercent = totalLeads > 0 ? Math.round((agent.leads / totalLeads) * 100) : 0

            return (
              <div
                key={agent.name}
                style={{ flex: '1 1 45%', minWidth: '280px' }}
                className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted dark:bg-white/[0.08] text-xs font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-semibold truncate">{agent.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="tabular-nums">{agent.leads} leads</span>
                  <span className="tabular-nums">{formatCompact(agent.value)}</span>
                  <span className="tabular-nums">{agent.conversion}% conversão</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 dark:bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500/60 dark:bg-blue-400/50 transition-all duration-500"
                    style={{ width: `${Math.max(sharePercent, 2)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                  {sharePercent}% do total de leads
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Tab: Velocidade ─── */
function TabVelocidade({ stats }: { stats: NonNullable<ReturnType<typeof useComputedStats>> }) {
  const maxDays = Math.max(...stats.stageStats.map((s) => s.avgDays), 1)

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-8">
          <Timer className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Tempo Médio por Etapa</h3>
        </div>

        {/* Timeline */}
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border dark:bg-white/[0.08]" />
          <div className="space-y-6">
            {stats.stageStats.map((ss) => {
              const barWidth = Math.max((ss.avgDays / maxDays) * 100, 3)
              return (
                <div key={ss.stage.id} className="relative flex items-center gap-4">
                  <div
                    className="absolute -left-6 top-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-background"
                    style={{ backgroundColor: ss.stage.color, left: '-15px' }}
                  />
                  <span className="w-36 shrink-0 truncate text-sm font-medium">{ss.stage.name}</span>
                  <div className="flex-1 h-5 rounded bg-muted/30 dark:bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${ss.stage.color}BB, ${ss.stage.color}55)`,
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                    ~{ss.avgDays} dias
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className="mt-8 pt-6 border-t border-border/50 dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tempo médio total</span>
          <span className="text-2xl font-bold tabular-nums">
            {stats.avgDays} <span className="text-sm font-normal text-muted-foreground">dias</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Computed Stats Hook ─── */
function useComputedStats(selectedPipelineId: string) {
  const { pipelines, cards } = usePipelineStore()

  return useMemo(() => {
    const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)
    if (!selectedPipeline) return null

    const pipelineCards = cards.filter((c) => c.pipelineId === selectedPipelineId)
    const totalLeads = pipelineCards.length
    const totalValue = pipelineCards.reduce((sum, c) => sum + c.value, 0)

    const stages = selectedPipeline.stages
    const lastStage = stages[stages.length - 1]
    const wonCards = lastStage
      ? pipelineCards.filter((c) => c.stageId === lastStage.id).length
      : 0
    const conversionRate =
      totalLeads > 0 ? Math.round((wonCards / totalLeads) * 100) : 0

    const avgDays =
      totalLeads > 0
        ? Math.round(
            pipelineCards.reduce((sum, card) => {
              const created = new Date(card.contact.created_at).getTime()
              return sum + (Date.now() - created) / (1000 * 60 * 60 * 24)
            }, 0) / totalLeads,
          )
        : 0

    const stageStats = stages.map((stage, index) => {
      const stageCards = pipelineCards.filter((c) => c.stageId === stage.id)
      const stageValue = stageCards.reduce((sum, c) => sum + c.value, 0)
      const nextStage = stages[index + 1]
      const nextStageCards = nextStage
        ? pipelineCards.filter((c) => c.stageId === nextStage.id).length
        : 0
      const stageConversion =
        stageCards.length > 0 && nextStage
          ? Math.round((nextStageCards / stageCards.length) * 100)
          : index === stages.length - 1
            ? 100
            : 0

      const stageAvgDays =
        stageCards.length > 0
          ? Math.round(
              stageCards.reduce((sum, card) => {
                const created = new Date(card.contact.created_at).getTime()
                return sum + (Date.now() - created) / (1000 * 60 * 60 * 24)
              }, 0) / stageCards.length,
            )
          : 0

      return {
        stage,
        count: stageCards.length,
        value: stageValue,
        conversion: stageConversion,
        avgDays: stageAvgDays,
        percentOfTotal:
          totalLeads > 0 ? Math.round((stageCards.length / totalLeads) * 100) : 0,
      }
    })

    const pipelineValue = pipelineCards
      .filter((c) => !lastStage || c.stageId !== lastStage.id)
      .reduce((sum, c) => sum + c.value, 0)

    const receivedValue = lastStage
      ? pipelineCards.filter((c) => c.stageId === lastStage.id).reduce((sum, c) => sum + c.value, 0)
      : 0

    const kpis = [
      {
        label: 'Total de Leads',
        value: totalLeads,
        type: 'number' as const,
        icon: Users,
        borderColor: 'border-l-blue-500',
        iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
        iconColor: 'text-blue-600 dark:text-blue-400',
        detail: `${wonCards} ganhos`,
      },
      {
        label: 'Valor em Pipeline',
        value: pipelineValue,
        type: 'currency' as const,
        icon: Clock,
        borderColor: 'border-l-amber-500',
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
        iconColor: 'text-amber-600 dark:text-amber-400',
        detail: 'Receita potencial',
      },
      {
        label: 'Valor Recebido',
        value: receivedValue,
        type: 'currency' as const,
        icon: DollarSign,
        borderColor: 'border-l-emerald-500',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        detail: lastStage ? `Leads em "${lastStage.name}"` : '',
        highlight: true,
      },
      {
        label: 'Taxa de Conversão',
        value: conversionRate,
        type: 'percent' as const,
        icon: TrendingUp,
        borderColor: 'border-l-purple-500',
        iconBg: 'bg-purple-500/10 dark:bg-purple-500/15',
        iconColor: 'text-purple-600 dark:text-purple-400',
        detail: `${wonCards} de ${totalLeads}`,
      },
    ]

    return {
      totalLeads,
      totalValue,
      wonCards,
      conversionRate,
      avgDays,
      stageStats,
      kpis,
      pipelineCards,
      selectedPipeline,
    }
  }, [pipelines, cards, selectedPipelineId])
}

function ReportsContent() {
  const { pipelines, cards, inboxes } = usePipelineStore()
  const { theme, toggleTheme } = useTheme()
  const [selectedPipelineId, setSelectedPipelineId] = useState(
    pipelines[0]?.id ?? '',
  )
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('resumo')

  const stats = useComputedStats(selectedPipelineId)

  const pipelineCards = useMemo(
    () => cards.filter((c) => c.pipelineId === selectedPipelineId),
    [cards, selectedPipelineId],
  )

  const agentRankings = useMemo((): AgentStats[] => {
    const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)
    const agentMap = new Map<
      number,
      { name: string; thumbnail: string; leads: number; value: number; won: number }
    >()

    for (const card of pipelineCards) {
      if (!card.assignedAgent) continue
      const agentId = card.assignedAgent.id
      const existing = agentMap.get(agentId) ?? {
        name: card.assignedAgent.name,
        thumbnail: card.assignedAgent.thumbnail,
        leads: 0,
        value: 0,
        won: 0,
      }
      existing.leads += 1
      existing.value += card.value

      if (
        selectedPipeline &&
        card.stageId === selectedPipeline.stages[selectedPipeline.stages.length - 1]?.id
      ) {
        existing.won += 1
      }

      agentMap.set(agentId, existing)
    }

    return Array.from(agentMap.values())
      .map((a) => ({
        name: a.name,
        thumbnail: a.thumbnail,
        leads: a.leads,
        value: a.value,
        conversion: a.leads > 0 ? Math.round((a.won / a.leads) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [pipelineCards, pipelines, selectedPipelineId])

  const inboxCounts = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const card of pipelineCards) {
      for (const conv of card.conversations) {
        const inboxId = conv.inbox_id
        const inbox = inboxes.find((ib) => ib.id === inboxId)
        const name = inbox?.name ?? `Inbox ${inboxId}`
        countMap.set(name, (countMap.get(name) ?? 0) + 1)
      }
    }
    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [pipelineCards, inboxes])

  const recentNotes = useMemo(() => {
    const allNotes: { text: string; author: string; timestamp: string; type: string }[] = []
    for (const card of pipelineCards) {
      for (const note of card.notes) {
        allNotes.push({
          text: note.text,
          author: note.author,
          timestamp: note.timestamp,
          type: note.type,
        })
      }
    }
    return allNotes
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }, [pipelineCards])

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Nenhum pipeline encontrado.</p>
      </div>
    )
  }

  const selectedPeriodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.short ?? 'Tudo'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon-sm" className="hover:bg-muted">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-bold tracking-tight">Relatórios</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Pipeline select */}
              {pipelines.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {pipelines.map((pipeline) => (
                    <button
                      key={pipeline.id}
                      onClick={() => setSelectedPipelineId(pipeline.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                        selectedPipelineId === pipeline.id
                          ? 'bg-foreground text-background shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {pipeline.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Period dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPeriodOpen(!periodOpen)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  {selectedPeriodLabel}
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
                {periodOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPeriodOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg">
                      {PERIOD_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setPeriod(opt.value)
                            setPeriodOpen(false)
                          }}
                          className={`flex w-full items-center rounded-md px-3 py-2 text-xs transition-colors ${
                            period === opt.value
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-foreground hover:bg-accent/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              >
                {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs + Content */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line" className="mb-8">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="funil">Funil</TabsTrigger>
            <TabsTrigger value="agentes">Agentes</TabsTrigger>
            <TabsTrigger value="velocidade">Velocidade</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <TabResumo
              stats={stats}
              inboxCounts={inboxCounts}
              recentNotes={recentNotes}
            />
          </TabsContent>

          <TabsContent value="funil">
            <TabFunil stats={stats} />
          </TabsContent>

          <TabsContent value="agentes">
            <TabAgentes agents={agentRankings} totalLeads={stats.totalLeads} />
          </TabsContent>

          <TabsContent value="velocidade">
            <TabVelocidade stats={stats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function RelatoriosPage() {
  return (
    <PipelineProvider>
      <ReportsContent />
    </PipelineProvider>
  )
}
