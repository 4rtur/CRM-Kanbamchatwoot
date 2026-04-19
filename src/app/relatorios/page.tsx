'use client'

import { useMemo, useState, useEffect } from 'react'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { Button } from '@/components/ui/button'
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

interface AgentRanking {
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
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.round(increment * step)
      if (step >= steps) {
        current = value
        clearInterval(timer)
      }
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
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.round(increment * step)
      if (step >= steps) {
        current = value
        clearInterval(timer)
      }
      setDisplay(current)
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span className="tabular-nums">{formatCurrency(display)}</span>
  )
}

function ReportsContent() {
  const { pipelines, cards } = usePipelineStore()
  const { theme, toggleTheme } = useTheme()
  const [selectedPipelineId, setSelectedPipelineId] = useState(
    pipelines[0]?.id ?? '',
  )
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [periodOpen, setPeriodOpen] = useState(false)

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId),
    [pipelines, selectedPipelineId],
  )

  const pipelineCards = useMemo(
    () => cards.filter((c) => c.pipelineId === selectedPipelineId),
    [cards, selectedPipelineId],
  )

  const stats = useMemo(() => {
    if (!selectedPipeline) return null

    const totalLeads = pipelineCards.length
    const totalValue = pipelineCards.reduce((sum, c) => sum + c.value, 0)

    const stages = selectedPipeline.stages
    const lastStage = stages[stages.length - 1]
    const wonCards = lastStage
      ? pipelineCards.filter((c) => c.stageId === lastStage.id).length
      : 0
    const lostCards = 0
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
          totalLeads > 0
            ? Math.round((stageCards.length / totalLeads) * 100)
            : 0,
      }
    })

    return {
      totalLeads,
      totalValue,
      wonCards,
      lostCards,
      conversionRate,
      avgDays,
      stageStats,
    }
  }, [selectedPipeline, pipelineCards])

  const agentRankings = useMemo((): AgentRanking[] => {
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
        card.stageId ===
          selectedPipeline.stages[selectedPipeline.stages.length - 1]?.id
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
  }, [pipelineCards, selectedPipeline])

  if (!selectedPipeline || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Nenhum pipeline encontrado.</p>
      </div>
    )
  }

  const maxLeadsInStage = Math.max(
    ...stats.stageStats.map((ss) => ss.count),
    1,
  )
  const maxValue = Math.max(
    ...stats.stageStats.map((s) => s.value),
    1,
  )
  const maxDays = Math.max(
    ...stats.stageStats.map((s) => s.avgDays),
    1,
  )

  const selectedPeriodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.short ?? 'Tudo'

  const kpiCards = [
    {
      label: 'Total de Leads',
      value: stats.totalLeads,
      type: 'number' as const,
      icon: Users,
      accent: 'blue',
      borderColor: 'border-l-blue-500',
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      detail: `${stats.wonCards} ganhos`,
    },
    {
      label: 'Valor Total',
      value: stats.totalValue,
      type: 'currency' as const,
      icon: DollarSign,
      accent: 'emerald',
      borderColor: 'border-l-emerald-500',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      detail: stats.totalLeads > 0 ? `${formatCompact(Math.round(stats.totalValue / stats.totalLeads))} / lead` : '',
    },
    {
      label: 'Conversão',
      value: stats.conversionRate,
      type: 'percent' as const,
      icon: TrendingUp,
      accent: 'purple',
      borderColor: 'border-l-purple-500',
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/15',
      iconColor: 'text-purple-600 dark:text-purple-400',
      detail: `${stats.wonCards} de ${stats.totalLeads}`,
    },
    {
      label: 'Tempo Médio',
      value: stats.avgDays,
      type: 'days' as const,
      icon: Clock,
      accent: 'amber',
      borderColor: 'border-l-amber-500',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      detail: 'no funil',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon-sm" className="hover:bg-muted">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Relatórios</h1>
                <p className="text-xs text-muted-foreground">Visão geral do desempenho comercial</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

          {/* Pipeline pills */}
          <div className="mt-4 flex items-center gap-1.5">
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
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div
                key={kpi.label}
                className={`group relative overflow-hidden rounded-xl border-l-[3px] ${kpi.borderColor} bg-card dark:bg-white/[0.03] dark:backdrop-blur-sm border border-border/50 dark:border-white/[0.06] p-4 lg:p-5 transition-all hover:shadow-md dark:hover:bg-white/[0.05]`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex size-8 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                    <Icon className={`size-4 ${kpi.iconColor}`} />
                  </div>
                  {kpi.detail && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {kpi.detail}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  {kpi.type === 'currency' ? (
                    <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                      <AnimatedCurrency value={kpi.value} />
                    </p>
                  ) : kpi.type === 'percent' ? (
                    <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                      <AnimatedNumber value={kpi.value} suffix="%" />
                    </p>
                  ) : kpi.type === 'days' ? (
                    <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                      <AnimatedNumber value={kpi.value} />
                      <span className="ml-1 text-base font-normal text-muted-foreground">dias</span>
                    </p>
                  ) : (
                    <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                      <AnimatedNumber value={kpi.value} />
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Funnel Visualization */}
        <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] dark:backdrop-blur-sm p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Funil de Conversão</h3>
          </div>
          <div className="space-y-1.5">
            {stats.stageStats.map((ss, index) => {
              const totalLeads = stats.totalLeads || 1
              const widthPercent = Math.max((ss.count / maxLeadsInStage) * 100, 12)
              const topWidth = Math.min(widthPercent + 4, 100)
              const bottomWidth = Math.max(widthPercent - 4, 8)
              const nextSs = stats.stageStats[index + 1]
              const dropOff = nextSs
                ? ss.count > 0
                  ? Math.round(((ss.count - nextSs.count) / ss.count) * 100)
                  : 0
                : null

              return (
                <div key={ss.stage.id}>
                  <div className="relative group">
                    <div
                      className="relative overflow-hidden transition-all duration-500"
                      style={{
                        clipPath: `polygon(${(100 - topWidth) / 2}% 0%, ${(100 + topWidth) / 2}% 0%, ${(100 + bottomWidth) / 2}% 100%, ${(100 - bottomWidth) / 2}% 100%)`,
                        height: '52px',
                      }}
                    >
                      <div
                        className="absolute inset-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background: `linear-gradient(180deg, ${ss.stage.color}DD, ${ss.stage.color}99)`,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    {/* Overlay text */}
                    <div className="absolute inset-0 flex items-center justify-center gap-4 pointer-events-none">
                      <span className="text-xs font-semibold text-white drop-shadow-sm">
                        {ss.stage.name}
                      </span>
                      <span className="text-xs font-bold text-white drop-shadow-sm tabular-nums">
                        {ss.count} leads
                      </span>
                      <span className="text-[10px] font-medium text-white/80 drop-shadow-sm tabular-nums">
                        {ss.percentOfTotal}%
                      </span>
                      <span className="text-[10px] font-medium text-white/80 drop-shadow-sm tabular-nums">
                        {formatCompact(ss.value)}
                      </span>
                    </div>
                  </div>
                  {/* Drop-off indicator */}
                  {dropOff !== null && dropOff > 0 && (
                    <div className="flex items-center justify-center gap-1.5 py-0.5">
                      <ArrowDown className="size-3 text-red-400/70" />
                      <span className="text-[10px] font-medium text-red-400/70 tabular-nums">
                        -{dropOff}% drop-off
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Two-column: Conversion + Agent Ranking */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Conversion by Stage */}
          <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] dark:backdrop-blur-sm p-5 lg:p-6">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp className="size-4 text-purple-500 dark:text-purple-400" />
              <h3 className="text-sm font-semibold">Conversão por Etapa</h3>
            </div>
            <div className="space-y-4">
              {stats.stageStats.map((ss) => {
                return (
                  <div key={ss.stage.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: ss.stage.color }}
                        />
                        <span className="text-xs font-medium">{ss.stage.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {formatCompact(ss.value)}
                        </span>
                        <span className="text-xs font-semibold tabular-nums">
                          {ss.conversion}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30 dark:bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max(ss.conversion, 2)}%`,
                          backgroundColor: ss.stage.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Agent Ranking */}
          <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] dark:backdrop-blur-sm p-5 lg:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Trophy className="size-4 text-amber-500 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">Ranking de Agentes</h3>
            </div>
            {agentRankings.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs text-muted-foreground">
                  Nenhum agente atribuído neste pipeline.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {agentRankings.map((agent, index) => {
                  const rankColors = [
                    'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    'bg-zinc-400/15 text-zinc-500 dark:text-zinc-400 border-zinc-400/20',
                    'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
                  ]
                  const rankClass = rankColors[index] ?? 'bg-muted/50 text-muted-foreground border-transparent'

                  return (
                    <div
                      key={agent.name}
                      className="flex items-center gap-3 rounded-lg border border-border/30 dark:border-white/[0.04] bg-muted/20 dark:bg-white/[0.02] p-3 transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.04]"
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold ${rankClass}`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted dark:bg-white/[0.08] text-[10px] font-bold">
                        {agent.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {agent.leads} leads
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCompact(agent.value)}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {agent.conversion}% conv.
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Funnel Speed + Value Distribution */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Funnel Speed */}
          <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] dark:backdrop-blur-sm p-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-amber-500 dark:text-amber-400" />
                <h3 className="text-sm font-semibold">Velocidade do Funil</h3>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                Média total: <strong className="text-foreground">{stats.avgDays} dias</strong>
              </span>
            </div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border dark:bg-white/[0.08]" />
              <div className="space-y-4">
                {stats.stageStats.map((ss, index) => {
                  const barWidth = Math.max((ss.avgDays / maxDays) * 100, 4)
                  return (
                    <div key={ss.stage.id} className="relative flex items-center gap-4 pl-9">
                      {/* Timeline dot */}
                      <div
                        className="absolute left-[11px] size-2.5 rounded-full border-2 border-background"
                        style={{ backgroundColor: ss.stage.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium truncate">{ss.stage.name}</span>
                          <span className="text-xs font-semibold tabular-nums ml-2">
                            {ss.avgDays} dias
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30 dark:bg-white/[0.06]">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${barWidth}%`,
                              background: `linear-gradient(90deg, ${ss.stage.color}CC, ${ss.stage.color}66)`,
                            }}
                          />
                        </div>
                      </div>
                      {index < stats.stageStats.length - 1 && (
                        <div className="absolute left-[7px] top-full mt-0.5">
                          <ArrowDown className="size-2.5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Value Distribution */}
          <div className="rounded-xl border border-border/50 dark:border-white/[0.06] bg-card dark:bg-white/[0.03] dark:backdrop-blur-sm p-5 lg:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-500 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold">Distribuição de Valor</h3>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                Total: <strong className="text-foreground">{formatCurrency(stats.totalValue)}</strong>
              </span>
            </div>
            {/* Stacked bar */}
            <div className="mb-4 flex h-8 w-full overflow-hidden rounded-lg">
              {stats.stageStats.map((ss) => {
                const widthPercent = stats.totalValue > 0 ? (ss.value / stats.totalValue) * 100 : 0
                if (widthPercent < 0.5) return null
                return (
                  <div
                    key={ss.stage.id}
                    className="relative h-full transition-all duration-700 group/bar first:rounded-l-lg last:rounded-r-lg"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: ss.stage.color,
                      opacity: 0.8,
                    }}
                    title={`${ss.stage.name}: ${formatCurrency(ss.value)}`}
                  />
                )
              })}
            </div>
            {/* Legend */}
            <div className="space-y-2.5">
              {stats.stageStats.map((ss) => {
                const percent = stats.totalValue > 0 ? Math.round((ss.value / stats.totalValue) * 100) : 0
                const barWidth = Math.max((ss.value / maxValue) * 100, 4)
                return (
                  <div key={ss.stage.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: ss.stage.color }}
                        />
                        <span className="text-xs font-medium">{ss.stage.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {percent}%
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(ss.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30 dark:bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: ss.stage.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
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
