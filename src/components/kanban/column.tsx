'use client'

import { useState, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanCard } from './card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, Inbox, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { calculateLeadScore } from '@/lib/scoring'
import type { CrmStage, CrmCard } from '@/lib/chatwoot/types'

const COLLAPSED_STORAGE_KEY = 'chatwoot-crm-collapsed-columns'

function loadCollapsedState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Record<string, boolean>
  } catch {
    // fallback
  }
  return {}
}

function saveCollapsedState(state: Record<string, boolean>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(state))
}

interface KanbanColumnProps {
  stage: CrmStage
  cards: CrmCard[]
  onCardClick: (card: CrmCard) => void
}

function QuickAddForm({
  stage,
  onClose,
}: {
  stage: CrmStage
  onClose: () => void
}) {
  const { activePipelineId, addCard } = usePipelineStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  function handleSubmit() {
    if (!name.trim()) return

    const contactId = Date.now()
    const card: CrmCard = {
      id: `card-${contactId}`,
      contactId,
      contact: {
        id: contactId,
        name: name.trim(),
        email: email.trim() || null,
        phone_number: phone.trim() || null,
        thumbnail: '',
        additional_attributes: {},
        custom_attributes: {
          crm_pipeline: activePipelineId,
          crm_stage: stage.id,
        },
        created_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        availability_status: null,
      },
      pipelineId: activePipelineId,
      stageId: stage.id,
      lastMessage: null,
      lastMessageAt: new Date().toISOString(),
      labels: [],
      assignedAgent: null,
      conversations: [],
      phone: phone.trim() || null,
      priority: 'media',
      value: 0,
      checklist: [],
      notes: [],
      products: [],
      score: 0,
    }
    card.score = calculateLeadScore(card)
    addCard(card)
    onClose()
  }

  return (
    <div className="mx-2 mb-2 space-y-2 rounded-lg border border-[#1F93FF]/20 bg-card p-2.5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome *"
        className="text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onClose()
        }}
      />
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telefone"
        className="text-xs"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onClose()
        }}
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="text-xs"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onClose()
        }}
      />
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="flex-1 text-xs"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          Adicionar
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function KanbanColumn({ stage, cards, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  useEffect(() => {
    const state = loadCollapsedState()
    if (state[stage.id]) {
      setIsCollapsed(true)
    }
  }, [stage.id])

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev
      const state = loadCollapsedState()
      state[stage.id] = next
      saveCollapsedState(state)
      return next
    })
  }

  const cardIds = cards.map((c) => c.id)
  const totalValue = cards.reduce((sum, c) => sum + (c.value || 0), 0)

  function formatStageValue(value: number): string {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
    }
    return `R$ ${value.toLocaleString('pt-BR')}`
  }

  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        className={`flex h-full w-12 min-w-12 flex-col items-center rounded-xl bg-muted/30 transition-all duration-300 ${
          isOver ? 'bg-[#1F93FF]/5 ring-1 ring-inset ring-[#1F93FF]/20' : ''
        }`}
      >
        <button
          onClick={toggleCollapse}
          className="flex w-full flex-col items-center gap-2 px-1 py-3 transition-colors hover:bg-muted/50"
        >
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {cards.length}
          </span>
          <ChevronRight className="size-3 text-muted-foreground" />
        </button>
        <div className="flex flex-1 items-center">
          <span
            className="text-[10px] font-medium text-muted-foreground"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
          >
            {stage.name}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[300px] min-w-[300px] flex-col rounded-xl bg-muted/30 transition-all duration-300">
      {/* Column header with gradient */}
      <div
        className="flex items-center gap-2 rounded-t-xl px-3 py-3"
        style={{
          background: `linear-gradient(135deg, ${stage.color}15 0%, transparent 100%)`,
        }}
      >
        <div
          className="size-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: stage.color }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-sm font-semibold text-foreground">{stage.name}</h3>
          {totalValue > 0 && (
            <span className="text-[10px] font-medium leading-tight text-emerald-600 dark:text-emerald-400">
              {formatStageValue(totalValue)}
            </span>
          )}
        </div>
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
          {cards.length}
        </span>
        <button
          onClick={toggleCollapse}
          className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Recolher coluna"
        >
          <ChevronLeft className="size-3" />
        </button>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-hidden transition-colors ${
          isOver ? 'bg-[#1F93FF]/5 ring-1 ring-inset ring-[#1F93FF]/20' : ''
        }`}
      >
        <ScrollArea className="h-full px-2 pb-2">
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {cards.map((card) => (
                <KanbanCard key={card.id} card={card} onClick={onCardClick} />
              ))}
              {cards.length === 0 && (
                <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 text-muted-foreground/40">
                  <Inbox className="size-5" />
                  <span className="text-xs">Nenhum lead nesta etapa</span>
                </div>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>

      {/* Quick add button / form */}
      {showQuickAdd ? (
        <QuickAddForm
          stage={stage}
          onClose={() => setShowQuickAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="mx-2 mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 py-2 text-xs text-muted-foreground/60 transition-colors hover:border-[#1F93FF]/30 hover:bg-[#1F93FF]/5 hover:text-[#1F93FF]"
        >
          <Plus className="size-3" />
          Adicionar lead
        </button>
      )}
    </div>
  )
}
