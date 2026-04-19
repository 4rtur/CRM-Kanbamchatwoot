'use client'

import { usePipelineStore } from '@/lib/store/pipeline-store'
import { Users, DollarSign, TrendingUp, Clock } from 'lucide-react'

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`
  }
  return `R$ ${value.toLocaleString('pt-BR')}`
}

export function PipelineStats() {
  const { filteredCards, activePipeline, cards, activePipelineId } = usePipelineStore()

  if (!activePipeline) return null

  const pipelineCards = cards.filter((c) => c.pipelineId === activePipelineId)
  const totalLeads = pipelineCards.length
  const totalValue = pipelineCards.reduce((sum, card) => sum + card.value, 0)

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

  const stats = [
    {
      icon: Users,
      label: 'Total leads',
      value: String(totalLeads),
      color: 'text-blue-400',
    },
    {
      icon: DollarSign,
      label: 'Valor total',
      value: formatCurrency(totalValue),
      color: 'text-green-400',
    },
    {
      icon: TrendingUp,
      label: 'Conversão',
      value: `${conversionRate}%`,
      color: 'text-purple-400',
    },
    {
      icon: Clock,
      label: 'Tempo médio',
      value: `${avgDays}d`,
      color: 'text-yellow-400',
    },
  ]

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-1.5"
        >
          <stat.icon className={`size-3.5 ${stat.color}`} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-foreground">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
