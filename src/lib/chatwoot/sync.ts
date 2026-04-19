import { listContacts } from './api'
import type { CrmPipeline, CrmCard } from './types'
import { calculateLeadScore } from '@/lib/scoring'

export interface SyncResult {
  newCards: CrmCard[]
  totalImported: number
}

export async function syncConversationsToCards(
  pipeline: CrmPipeline,
  existingCards: CrmCard[],
): Promise<SyncResult> {
  const firstStage = pipeline.stages[0]
  if (!firstStage) {
    return { newCards: [], totalImported: 0 }
  }

  const existingContactIds = new Set(
    existingCards
      .filter((c) => c.pipelineId === pipeline.id)
      .map((c) => c.contactId),
  )

  const { contacts } = await listContacts(1)

  const newCards: CrmCard[] = []

  for (const contact of contacts) {
    if (existingContactIds.has(contact.id)) continue

    const card: CrmCard = {
      id: `card-${contact.id}`,
      contactId: contact.id,
      contact,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      lastMessage: null,
      lastMessageAt: contact.last_activity_at,
      labels: [],
      assignedAgent: null,
      conversations: [],
      phone: contact.phone_number,
      priority: 'media',
      value: 0,
      checklist: [],
      notes: [],
      products: [],
      score: 0,
    }
    card.score = calculateLeadScore(card)
    newCards.push(card)
  }

  return {
    newCards,
    totalImported: newCards.length,
  }
}

export function autoMoveResolvedCards(
  cards: CrmCard[],
  pipeline: CrmPipeline,
): CrmCard[] {
  const lastStage = pipeline.stages[pipeline.stages.length - 1]
  if (!lastStage) return cards

  return cards.map((card) => {
    if (card.pipelineId !== pipeline.id) return card

    const hasResolvedConversation = card.conversations.some(
      (conv) => conv.status === 'resolved',
    )

    if (hasResolvedConversation && card.stageId !== lastStage.id) {
      return { ...card, stageId: lastStage.id }
    }

    return card
  })
}
