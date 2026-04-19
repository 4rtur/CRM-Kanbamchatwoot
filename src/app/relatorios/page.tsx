'use client'

import { useMemo, useState } from 'react'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  Trophy,
  ArrowDownRight,
  Timer,
  CalendarDays,
} from 'lucide-react'
import Link from 'next/link'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

type PeriodFilter = '7d' | '30d' | 'month' | 'all'

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'all', label: 'Todo período' },
]

interface AgentRanking {
  name: string
  thumbnail: string
  leads: number
  value: number
  conversion: number
}

function DonutChart({
  value,
  total,
  color,
  label,
  count,
}: {
  value: number
  total: number
  color: string
  label: string
  count: number
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-32">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/20"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{count}</span>
          <span className="text-xs text-muted-foreground">{percentage}%</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {label}
      </span>
    </div>
  )
}

function ReportsContent() {
  const { pipelines, cards } = usePipelineStore()
  const [selectedPipelineId, setSelectedPipelineId] = useState(
    pipelines[0]?.id ?? '',
  )
  const [period, setPeriod] = useState<PeriodFilter>('all')

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

  const funnelData = useMemo(() => {
    if (!stats || !selectedPipeline) return []
    const totalLeads = stats.totalLeads
    let cumulativeCount = totalLeads

    return selectedPipeline.stages.map((stage, index) => {
      const stageCount = stats.stageStats[index]?.count ?? 0
      const remainingAfter = cumulativeCount
      cumulativeCount = cumulativeCount - stageCount
      const percentOfTotal =
        totalLeads > 0
          ? Math.round((remainingAfter / totalLeads) * 100)
          : 0

      return {
        stage,
        count: stageCount,
        percentOfTotal,
        dropOff:
          index > 0
            ? totalLeads > 0
              ? Math.round(
                  ((stats.stageStats[index - 1]?.count ?? 0) - stageCount) /
                    totalLeads *
                    100,
                )
              : 0
            : 0,
      }
    })
  }, [stats, selectedPipeline])

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#1F93FF]" />
            <h1 className="text-base font-semibold">Relatórios</h1>
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                period === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Pipeline Tabs */}
        <div className="mb-6">
          <Tabs
            value={selectedPipelineId}
            onValueChange={setSelectedPipelineId}
          >
            <TabsList variant="line">
              {pipelines.map((pipeline) => (
                <TabsTrigger key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Cards - 2x2 Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="size-4 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Total Leads
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {stats.totalLeads}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="size-4 text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Valor Total
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10">
                <TrendingUp className="size-4 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Conversão
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {stats.conversionRate}%
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="size-4 text-amber-400" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Tempo Médio
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {stats.avgDays}
              <span className="text-lg font-normal text-muted-foreground">
                {' '}
                dias
              </span>
            </p>
          </div>
        </div>

        {/* Funnel Chart + Won/Lost */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Funnel */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="size-4 text-[#1F93FF]" />
              Funil de Conversão
            </h3>
            <div className="space-y-3">
              {stats.stageStats.map((ss) => {
                const widthPercent = Math.max(
                  (ss.count / maxLeadsInStage) * 100,
                  6,
                )
                return (
                  <div key={ss.stage.id} className="group">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {ss.stage.name}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ss.percentOfTotal}% do total</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(ss.value)}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-9 w-full overflow-hidden rounded-lg bg-muted/20">
                      <div
                        className="flex h-full items-center rounded-lg px-3 transition-all duration-700 ease-out"
                        style={{
                          width: `${widthPercent}%`,
                          background: `linear-gradient(90deg, ${ss.stage.color}CC, ${ss.stage.color}88)`,
                        }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">
                          {ss.count} leads
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Won / Lost Donuts */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="size-4 text-amber-400" />
              Ganhos / Perdidos
            </h3>
            <div className="flex items-center justify-center gap-8 pt-4">
              <DonutChart
                value={stats.wonCards}
                total={stats.totalLeads}
                color="#22c55e"
                label="Ganhos"
                count={stats.wonCards}
              />
              <DonutChart
                value={stats.lostCards}
                total={stats.totalLeads}
                color="#ef4444"
                label="Perdidos"
                count={stats.lostCards}
              />
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>
                Taxa de conversão:{' '}
                <strong className="text-foreground">
                  {stats.conversionRate}%
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Conversion Funnel Visualization (drop-off) */}
        <div className="mb-8 rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <ArrowDownRight className="size-4 text-red-400" />
            Funil de Drop-off entre Etapas
          </h3>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {funnelData.map((item, index) => (
              <div key={item.stage.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex min-w-[100px] flex-col items-center rounded-lg border px-3 py-3"
                    style={{
                      borderColor: `${item.stage.color}44`,
                      backgroundColor: `${item.stage.color}0D`,
                    }}
                  >
                    <span
                      className="text-lg font-bold"
                      style={{ color: item.stage.color }}
                    >
                      {item.count}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {item.stage.name}
                    </span>
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {item.percentOfTotal}%
                    </Badge>
                  </div>
                </div>
                {index < funnelData.length - 1 && (
                  <div className="flex flex-col items-center px-2">
                    <div className="h-px w-6 bg-border" />
                    {item.dropOff > 0 || index > 0 ? (
                      <span className="text-[10px] font-medium text-red-400">
                        -{funnelData[index + 1]?.dropOff ?? 0}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        &rarr;
                      </span>
                    )}
                    <div className="h-px w-6 bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Table + Value Distribution */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Metrics Table */}
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="border-b border-border px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="size-4 text-[#1F93FF]" />
                Métricas por Etapa
              </h3>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Etapa
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Leads
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Valor
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Conversão
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                      Tempo Méd.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.stageStats.map((ss, index) => (
                    <tr
                      key={ss.stage.id}
                      className={`border-b border-border/30 last:border-0 ${
                        index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: ss.stage.color }}
                          />
                          <span className="font-medium">{ss.stage.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {ss.count}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-emerald-400">
                        {formatCurrency(ss.value)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted/30">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${ss.conversion}%`,
                                backgroundColor: ss.stage.color,
                              }}
                            />
                          </div>
                          <span className="tabular-nums">{ss.conversion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {ss.avgDays}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Value Distribution */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="size-4 text-emerald-400" />
              Distribuição de Valor
            </h3>
            <div className="space-y-3">
              {stats.stageStats.map((ss) => {
                const maxValue = Math.max(
                  ...stats.stageStats.map((s) => s.value),
                  1,
                )
                const widthPercent = Math.max(
                  (ss.value / maxValue) * 100,
                  4,
                )
                return (
                  <div key={ss.stage.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{ss.stage.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(ss.value)}
                      </span>
                    </div>
                    <div className="h-5 w-full overflow-hidden rounded-md bg-muted/20">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${widthPercent}%`,
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

        {/* Lead Velocity + Top Agents */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Lead Velocity */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Timer className="size-4 text-amber-400" />
              Velocidade do Lead (tempo por etapa)
            </h3>
            <div className="space-y-3">
              {stats.stageStats.map((ss, index) => {
                const maxDays = Math.max(
                  ...stats.stageStats.map((s) => s.avgDays),
                  1,
                )
                const widthPercent = Math.max(
                  (ss.avgDays / maxDays) * 100,
                  4,
                )
                return (
                  <div key={ss.stage.id} className="flex items-center gap-3">
                    <div className="w-28 shrink-0">
                      <span className="text-xs font-medium">
                        {ss.stage.name}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-6 w-full overflow-hidden rounded-md bg-muted/20">
                        <div
                          className="flex h-full items-center rounded-md px-2 transition-all duration-500"
                          style={{
                            width: `${widthPercent}%`,
                            background: `linear-gradient(90deg, ${ss.stage.color}99, ${ss.stage.color}55)`,
                          }}
                        >
                          <span className="text-[10px] font-bold text-white drop-shadow-sm">
                            {ss.avgDays}d
                          </span>
                        </div>
                      </div>
                    </div>
                    {index < stats.stageStats.length - 1 && (
                      <div className="w-12 shrink-0 text-right">
                        <span className="text-[10px] text-muted-foreground">
                          &darr;
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Tempo total médio
                </span>
                <span className="font-bold">{stats.avgDays} dias</span>
              </div>
            </div>
          </div>

          {/* Top Agents Ranking */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-amber-400" />
                Ranking de Agentes
              </h3>
            </div>
            {agentRankings.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <span className="text-xs text-muted-foreground">
                  Nenhum agente atribuído neste pipeline.
                </span>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Agente
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        Leads
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        Valor
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                        Conversão
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRankings.map((agent, index) => (
                      <tr
                        key={agent.name}
                        className={`border-b border-border/30 last:border-0 ${
                          index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-bold ${
                              index === 0
                                ? 'text-amber-400'
                                : index === 1
                                  ? 'text-zinc-400'
                                  : index === 2
                                    ? 'text-orange-400'
                                    : 'text-muted-foreground'
                            }`}
                          >
                            {index + 1}°
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                              {agent.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {agent.leads}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                          {formatCurrency(agent.value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            variant={
                              agent.conversion >= 50
                                ? 'default'
                                : agent.conversion >= 25
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {agent.conversion}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
