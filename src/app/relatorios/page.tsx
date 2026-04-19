'use client'

import { useMemo } from 'react'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Kanban,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function ReportsContent() {
  const { pipelines, cards } = usePipelineStore()

  const pipelineStats = useMemo(() => {
    return pipelines.map((pipeline) => {
      const pipelineCards = cards.filter((c) => c.pipelineId === pipeline.id)
      const totalLeads = pipelineCards.length
      const totalValue = pipelineCards.reduce((sum, c) => sum + c.value, 0)

      const stages = pipeline.stages
      const lastStage = stages[stages.length - 1]
      const wonCards = lastStage
        ? pipelineCards.filter((c) => c.stageId === lastStage.id).length
        : 0
      const lostCards = 0 // No lost tracking yet
      const conversionRate = totalLeads > 0 ? Math.round((wonCards / totalLeads) * 100) : 0

      const avgDays = totalLeads > 0
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
        const stageConversion = stageCards.length > 0 && nextStage
          ? Math.round((nextStageCards / stageCards.length) * 100)
          : index === stages.length - 1 ? 100 : 0

        return {
          stage,
          count: stageCards.length,
          value: stageValue,
          conversion: stageConversion,
          avgDays: stageCards.length > 0
            ? Math.round(
                stageCards.reduce((sum, card) => {
                  const created = new Date(card.contact.created_at).getTime()
                  return sum + (Date.now() - created) / (1000 * 60 * 60 * 24)
                }, 0) / stageCards.length,
              )
            : 0,
        }
      })

      return {
        pipeline,
        totalLeads,
        totalValue,
        wonCards,
        lostCards,
        conversionRate,
        avgDays,
        stageStats,
      }
    })
  }, [pipelines, cards])

  const maxLeadsInStage = Math.max(
    ...pipelineStats.flatMap((ps) => ps.stageStats.map((ss) => ss.count)),
    1,
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-[#1F93FF]" />
          <h1 className="text-base font-semibold">Relatórios</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {pipelineStats.map((ps) => (
          <div key={ps.pipeline.id} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">{ps.pipeline.name}</h2>

            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Users className="size-4" />
                  <span className="text-xs text-muted-foreground">Total Leads</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{ps.totalLeads}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-green-400">
                  <DollarSign className="size-4" />
                  <span className="text-xs text-muted-foreground">Valor Total</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{formatCurrency(ps.totalValue)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <TrendingUp className="size-4" />
                  <span className="text-xs text-muted-foreground">Conversão</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{ps.conversionRate}%</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Clock className="size-4" />
                  <span className="text-xs text-muted-foreground">Tempo Médio</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{ps.avgDays}d</p>
              </div>
            </div>

            {/* Won/Lost */}
            <div className="mb-6 flex gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2">
                <CheckCircle2 className="size-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">{ps.wonCards} ganhos</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2">
                <XCircle className="size-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">{ps.lostCards} perdidos</span>
              </div>
            </div>

            {/* Funnel Chart */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Funil de Conversão</h3>
              <div className="space-y-2">
                {ps.stageStats.map((ss) => {
                  const widthPercent = Math.max((ss.count / maxLeadsInStage) * 100, 4)
                  return (
                    <div key={ss.stage.id} className="flex items-center gap-3">
                      <div className="w-32 shrink-0 text-right">
                        <span className="text-xs font-medium">{ss.stage.name}</span>
                      </div>
                      <div className="flex-1">
                        <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted/30">
                          <div
                            className="flex h-full items-center rounded-md px-3 transition-all duration-500"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: ss.stage.color,
                              opacity: 0.8,
                            }}
                          >
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {ss.count}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                        {formatCurrency(ss.value)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-stage metrics table */}
            <div className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Métricas por Etapa</h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Etapa</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Leads</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Valor</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Conversão</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Tempo Med.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ps.stageStats.map((ss) => (
                      <tr key={ss.stage.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="size-2 rounded-full"
                              style={{ backgroundColor: ss.stage.color }}
                            />
                            <span className="font-medium">{ss.stage.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">{ss.count}</td>
                        <td className="px-4 py-2 text-right text-green-400">{formatCurrency(ss.value)}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-[#1F93FF]"
                                style={{ width: `${ss.conversion}%` }}
                              />
                            </div>
                            <span>{ss.conversion}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{ss.avgDays}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator className="my-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RelatóriosPage() {
  return (
    <PipelineProvider>
      <ReportsContent />
    </PipelineProvider>
  )
}
