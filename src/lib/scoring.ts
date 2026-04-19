import type { CrmCard } from '@/lib/chatwoot/types'

export function calculateLeadScore(card: CrmCard): number {
  let score = 0

  if (card.phone || card.contact.phone_number) {
    score += 20
  }

  if (card.contact.email) {
    score += 10
  }

  if (card.lastMessageAt) {
    const hoursSinceActivity = (Date.now() - new Date(card.lastMessageAt).getTime()) / (1000 * 60 * 60)
    if (hoursSinceActivity <= 24) {
      score += 15
    }
  }

  if (card.labels.includes('vip')) {
    score += 20
  }

  if (card.labels.includes('urgente')) {
    score += 15
  }

  if (card.products.length > 0) {
    score += 10
  }

  if (card.checklist.length > 0) {
    const doneCount = card.checklist.filter((item) => item.done).length
    const completionRate = doneCount / card.checklist.length
    if (completionRate > 0.5) {
      score += 10
    }
  }

  return Math.min(score, 100)
}

export function getScoreColor(score: number): string {
  if (score < 30) return 'text-red-400 bg-red-500/20 border-red-500/30'
  if (score <= 60) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
  return 'text-green-400 bg-green-500/20 border-green-500/30'
}

export function getScoreLabel(score: number): string {
  if (score < 30) return 'Frio'
  if (score <= 60) return 'Morno'
  return 'Quente'
}
