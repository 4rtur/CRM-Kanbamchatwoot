'use client'

import { usePipelineStore } from '@/lib/store/pipeline-store'
import { Users, TrendingUp, Clock, DollarSign } from 'lucide-react'

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
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

  const pipelineValue = pipelineCards
    .filter((c) => !lastStage || c.stageId !== lastStage.id)
    .reduce((sum, c) => sum + (c.value || 0), 0)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
      {/* Aggregate stats only — per-stage values are shown in each column header */}
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
          <span className="text-[10px] text-muted-foreground">tempo médio</span>
        </div>
        {pipelineValue > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1">
            <DollarSign className="size-3 text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(pipelineValue)}</span>
            <span className="text-[10px] text-muted-foreground">em aberto</span>
          </div>
        )}
      </div>
    </div>
  )
}
