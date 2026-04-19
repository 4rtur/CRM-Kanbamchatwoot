'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { KanbanColumn } from './column'
import { KanbanCard } from './card'
import { CardDetailSheet } from './card-detail-sheet'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { Loader2 } from 'lucide-react'
import type { CrmCard } from '@/lib/chatwoot/types'

function LoadingSkeleton() {
  return (
    <div className="flex flex-1 gap-4 overflow-x-auto px-4 pb-4">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div key={colIdx} className="flex h-full w-[300px] min-w-[300px] flex-col rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="size-2.5 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="ml-auto size-5 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="flex-1 space-y-2 px-2">
            {Array.from({ length: 3 - colIdx }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-lg border border-border/30 bg-card p-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="size-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-36 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
                <div className="mt-2 flex gap-1">
                  <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function KanbanBoard() {
  const { activePipeline, filteredCards, moveCard, isLoading, isSyncing, error } = usePipelineStore()
  const [activeCard, setActiveCard] = useState<CrmCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<CrmCard | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !detailOpen) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"]')
        searchInput?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [detailOpen])

  const cardsByStage = useMemo(() => {
    const map = new Map<string, CrmCard[]>()
    for (const stage of activePipeline?.stages ?? []) {
      map.set(stage.id, [])
    }
    for (const card of filteredCards) {
      const existing = map.get(card.stageId)
      if (existing) {
        existing.push(card)
      }
    }
    return map
  }, [filteredCards, activePipeline])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = filteredCards.find((c) => c.id === event.active.id)
      if (card) setActiveCard(card)
    },
    [filteredCards],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCard(null)
      const { active, over } = event
      if (!over) return

      const cardId = active.id as string
      const overId = over.id as string

      const stage = activePipeline?.stages.find((s) => s.id === overId)
      if (stage) {
        moveCard(cardId, stage.id)
        return
      }

      const overCard = filteredCards.find((c) => c.id === overId)
      if (overCard) {
        moveCard(cardId, overCard.stageId)
      }
    },
    [activePipeline, filteredCards, moveCard],
  )

  const handleCardClick = useCallback((card: CrmCard) => {
    setSelectedCard(card)
    setDetailOpen(true)
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isSyncing) {
    return (
      <div className="relative flex flex-1 overflow-hidden">
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-[#1F93FF]" />
            <p className="text-sm text-muted-foreground">Sincronizando com Chatwoot...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Erro ao carregar</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!activePipeline) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Selecione um pipeline para visualizar o quadro.</p>
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto px-4 pb-4">
          {activePipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              cards={cardsByStage.get(stage.id) ?? []}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[280px] rotate-2 scale-105 opacity-90 shadow-2xl">
              <KanbanCard card={activeCard} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CardDetailSheet
        card={selectedCard}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
