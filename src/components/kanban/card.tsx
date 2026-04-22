'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Clock, User, Phone, CheckSquare, Info, MessagesSquare } from 'lucide-react'
import { LeadScoreBadge } from './lead-score'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { isEmbedded } from '@/lib/dashboard-app'
import type { CrmCard } from '@/lib/chatwoot/types'

interface KanbanCardProps {
  card: CrmCard
  onClick: (card: CrmCard) => void
}

function openChatwootUrl(url: string): void {
  if (typeof window === 'undefined') return
  if (isEmbedded()) {
    try {
      window.parent.location.href = url
      return
    } catch {
      // Se cross-origin bloquear, cai no postMessage
      try {
        window.parent.postMessage({ event: 'navigate', url }, '*')
        return
      } catch {
        // fallback final
      }
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Sem atividade'
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}sem`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

const LABEL_COLORS: Record<string, string> = {
  vip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  urgente: 'bg-red-500/20 text-red-400 border-red-500/30',
  novo: 'bg-green-500/20 text-green-400 border-green-500/30',
  recorrente: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-500',
  media: 'bg-yellow-500',
  baixa: 'bg-green-500',
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const { chatwootUrl, chatwootAccountId, useMockData } = usePipelineStore()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 200ms ease, box-shadow 200ms ease',
  }

  const phone = card.phone ?? card.contact.phone_number
  const checklistDone = card.checklist.filter((i) => i.done).length
  const checklistTotal = card.checklist.length
  const lastNote = card.notes.length > 0 ? card.notes[card.notes.length - 1] : null

  const conversationId = card.conversations[0]?.id
  const hasChatwoot = Boolean(chatwootUrl && chatwootAccountId && !useMockData)
  const chatwootTarget = hasChatwoot
    ? conversationId
      ? `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${conversationId}`
      : `${chatwootUrl}/app/accounts/${chatwootAccountId}/contacts/${card.contactId}`
    : null

  function handleConversationClick(e: React.MouseEvent): void {
    e.stopPropagation()
    if (chatwootTarget) {
      openChatwootUrl(chatwootTarget)
    } else {
      // Sem Chatwoot configurado, fallback para detalhes
      onClick(card)
    }
  }

  function handleDetailsClick(e: React.MouseEvent): void {
    e.stopPropagation()
    onClick(card)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-card-id={card.id}
      data-card-root="true"
      onClick={handleConversationClick}
      className={`group animate-in fade-in slide-in-from-bottom-2 cursor-pointer rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#1F93FF]/5 hover:border-[#1F93FF]/30 ${
        isDragging ? 'z-50 rotate-2 opacity-90 shadow-xl' : ''
      }`}
      title={chatwootTarget ? 'Abrir conversação no Chatwoot' : 'Abrir detalhes'}
    >
      {/* Header: Avatar + Name + Priority + Score + Link */}
      <div className="flex items-start gap-2.5">
        <div className="relative">
          <Avatar size="sm">
            {card.contact.thumbnail && (
              <AvatarImage src={card.contact.thumbnail} />
            )}
            <AvatarFallback className="bg-[#1F93FF]/20 text-[#1F93FF] text-[10px]">
              {getInitials(card.contact.name)}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card ${PRIORITY_COLORS[card.priority]}`}
            title={`Prioridade: ${card.priority}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-sm font-semibold text-foreground hover:text-[#1F93FF] transition-colors">
              {card.contact.name}
            </p>
            <div className="flex items-center gap-1">
              {chatwootTarget && (
                <span
                  className="flex size-5 items-center justify-center rounded text-[#1F93FF]"
                  title="Clique no card para abrir conversação"
                  aria-hidden="true"
                >
                  <MessagesSquare className="size-3.5" />
                </span>
              )}
              <button
                type="button"
                onClick={handleDetailsClick}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex size-5 items-center justify-center rounded text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                title="Abrir detalhes para edição"
                aria-label="Abrir detalhes"
              >
                <Info className="size-3.5" />
              </button>
              <LeadScoreBadge score={card.score} />
            </div>
          </div>
          {card.contact.email && (
            <p className="truncate text-[11px] text-muted-foreground">
              {card.contact.email}
            </p>
          )}
        </div>
      </div>

      {/* Phone + WhatsApp */}
      {phone && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <a
            href={`https://wa.me/${cleanPhone(phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400 transition-colors hover:bg-green-500/20"
            title="Abrir WhatsApp"
          >
            <Phone className="size-2.5" />
            <span>{phone}</span>
          </a>
        </div>
      )}

      {/* Value */}
      {card.value > 0 && (
        <div className="mt-1.5">
          <span className="text-xs font-semibold text-green-400">
            {formatCurrency(card.value)}
          </span>
        </div>
      )}

      {/* Last message */}
      {card.lastMessage && (
        <div className="mt-1.5 flex items-start gap-1.5">
          <MessageSquare className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {card.lastMessage}
          </p>
        </div>
      )}

      {/* Last note preview */}
      {lastNote && lastNote.type === 'note' && (
        <div className="mt-1 rounded-md bg-muted/40 px-2 py-1">
          <p className="line-clamp-1 text-[10px] text-muted-foreground italic">
            {lastNote.text}
          </p>
        </div>
      )}

      {/* Checklist progress */}
      {checklistTotal > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <CheckSquare className="size-3 text-muted-foreground/60" />
          <div className="flex flex-1 items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#1F93FF] transition-all"
                style={{ width: `${checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {checklistDone}/{checklistTotal}
            </span>
          </div>
        </div>
      )}

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                LABEL_COLORS[label] ?? 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {label}
            </span>
          ))}
          {card.labels.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{card.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Agent + Time */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {card.assignedAgent ? (
            <>
              <User className="size-3" />
              <span className="truncate max-w-[100px]">{card.assignedAgent.name}</span>
            </>
          ) : (
            <span className="italic text-muted-foreground/50">Sem agente</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="size-3" />
          <span>{timeAgo(card.lastMessageAt)}</span>
        </div>
      </div>
    </div>
  )
}
