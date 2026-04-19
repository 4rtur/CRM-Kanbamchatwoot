'use client'

import { usePipelineStore } from '@/lib/store/pipeline-store'
import { Users, TrendingUp, Clock } from 'lucide-react'

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`
  }
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function PipelineStats() {
  const { activePipeline, cards, activePipelineId } = usePipelineStore()

  if (!activePipeline) return null

  const pipelineCards = cards.filter((c) => c.pipelineId === activePipelineId)
  const totalLeads = pipelineCards.length

  const stages = activePipeline.stages
  const lastStage = stages[stages.length - 1]
  const lastStageCards = lastStage
    ? pipelineCards.filter((c) => c.stageId === lastStage.id).length
    : 0
  const conversionRate = totalLeads > 0 ? Math.round((lastStageCards / totalLeads) * 100) : 0

  const avgDays = totalLeads > 0
    ? Math.round(
        pipelineCards.reduce((sum, card) => {
          const created = new Date(card.contact.created_at).getTime()
          const diffDays = (Date.now() - created) / (1000 * 60 * 60 * 24)
          return sum + diffDays
        }, 0) / totalLeads,
      )
    : 0

  const stageValues = stages.map((stage) => {
    const stageCards = pipelineCards.filter((c) => c.stageId === stage.id)
    const value = stageCards.reduce((sum, c) => sum + c.value, 0)
    return { stage, value }
  })

  const pipelineValue = pipelineCards
    .filter((c) => !lastStage || c.stageId !== lastStage.id)
    .reduce((sum, c) => sum + c.value, 0)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
      {/* Per-stage values */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem' }}>
        {stageValues.map((sv, i) => (
          <div
            key={sv.stage.id}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1"
          >
            <div
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: sv.stage.color }}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{sv.stage.name}:</span>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: sv.stage.color }}>
              {formatCurrency(sv.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border/50 mx-1 hidden sm:block" />

      {/* Summary stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1">
          <Users className="size-3 text-blue-400" />
          <span className="text-xs font-semibold text-foreground">{totalLeads}</span>
          <span className="text-[10px] text-muted-foreground">leads</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1">
          <TrendingUp className="size-3 text-purple-400" />
          <span className="text-xs font-semibold text-foreground">{conversionRate}%</span>
          <span className="text-[10px] text-muted-foreground">conversão</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1">
          <Clock className="size-3 text-yellow-400" />
          <span className="text-xs font-semibold text-foreground">{avgDays}d</span>
          <span className="text-[10px] text-muted-foreground">média</span>
        </div>
        {pipelineValue > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="text-[10px] text-muted-foreground">Pipeline:</span>
            <span className="text-[10px] text-muted-foreground font-medium">{formatCurrency(pipelineValue)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
