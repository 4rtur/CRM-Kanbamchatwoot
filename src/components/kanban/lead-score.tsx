'use client'

import { getScoreColor, getScoreLabel } from '@/lib/scoring'

interface LeadScoreBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

export function LeadScoreBadge({ score, size = 'sm' }: LeadScoreBadgeProps) {
  const colorClass = getScoreColor(score)
  const label = getScoreLabel(score)

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${colorClass}`}
        title={`Score: ${score} - ${label}`}
      >
        {score}
      </span>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}
    >
      <span>{score}</span>
      <span className="opacity-70">|</span>
      <span>{label}</span>
    </div>
  )
}
