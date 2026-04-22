'use client'

import { useEffect, useMemo, useState } from 'react'
import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { listenToDashboardEvents, isEmbedded } from '@/lib/dashboard-app'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Mail,
  Phone,
  CheckSquare,
  Tag,
  FileText,
  ExternalLink,
  DollarSign,
  Plus,
  X,
  TrendingUp,
  Package,
} from 'lucide-react'
import { LeadScoreBadge } from '@/components/kanban/lead-score'
import { CardChecklist } from '@/components/kanban/card-checklist'
import type { CrmCard, CrmNote, CrmPriority } from '@/lib/chatwoot/types'

const LABEL_COLORS: Record<string, string> = {
  vip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  urgente: 'bg-red-500/20 text-red-400 border-red-500/30',
  novo: 'bg-green-500/20 text-green-400 border-green-500/30',
  recorrente: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  enterprise: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const PRIORITY_OPTIONS: { value: CrmPriority; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: 'text-red-400' },
  { value: 'media', label: 'Média', color: 'text-yellow-400' },
  { value: 'baixa', label: 'Baixa', color: 'text-green-400' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

function EmbedContent() {
  const {
    cards,
    activePipeline,
    pipelines,
    labels,
    products,
    chatwootUrl,
    chatwootAccountId,
    useMockData,
    isLoading,
    moveCard,
    updateCardChecklist,
    updateCardPriority,
    updateCardValue,
    updateCardLabels,
    addCardNote,
  } = usePipelineStore()

  const [contactId, setContactId] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [noteText, setNoteText] = useState('')

  // Ouve eventos do Chatwoot parent via postMessage
  useEffect(() => {
    const cleanup = listenToDashboardEvents((event) => {
      if (event.data?.contact?.id) {
        setContactId(event.data.contact.id)
      }
      if (event.data?.conversation?.id) {
        setConversationId(event.data.conversation.id)
      }
    })
    return cleanup
  }, [])

  // Fallback: lê ?contact_id=X ou ?conversation_id=Y da URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const c = params.get('contact_id')
    const conv = params.get('conversation_id')
    if (c) setContactId(Number(c))
    if (conv) setConversationId(Number(conv))
  }, [])

  const card = useMemo<CrmCard | null>(() => {
    if (!contactId && !conversationId) return null
    return (
      cards.find((c) => {
        if (contactId && c.contactId === contactId) return true
        if (conversationId && c.conversations.some((cv) => cv.id === conversationId)) return true
        return false
      }) ?? null
    )
  }, [cards, contactId, conversationId])

  const fullBoardUrl =
    chatwootUrl && chatwootAccountId && card
      ? `${window.location.origin}/?pipeline=${encodeURIComponent(card.pipelineId)}&stage=${encodeURIComponent(card.stageId)}&card=${encodeURIComponent(card.id)}`
      : `${typeof window !== 'undefined' ? window.location.origin : ''}/`

  function openFullBoard(): void {
    if (typeof window === 'undefined') return
    window.open(fullBoardUrl, '_blank', 'noopener,noreferrer')
  }

  function toggleLabel(label: string): void {
    if (!card) return
    const next = card.labels.includes(label)
      ? card.labels.filter((l) => l !== label)
      : [...card.labels, label]
    updateCardLabels(card.id, next)
  }

  function handleAddNote(): void {
    if (!card || !noteText.trim()) return
    const note: CrmNote = {
      id: `note-${Date.now()}`,
      text: noteText.trim(),
      author: 'Agente',
      timestamp: new Date().toISOString(),
      type: 'note',
    }
    addCardNote(card.id, note)
    setNoteText('')
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 text-xs text-muted-foreground">
        Carregando contato...
      </div>
    )
  }

  if (!contactId && !conversationId) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Aguardando contexto da conversação do Chatwoot.
        </p>
        {!isEmbedded() && (
          <p className="text-[10px] text-muted-foreground/70">
            Esta rota é para uso embutido no Chatwoot Dashboard App.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={openFullBoard}>
          Abrir CRM completo
        </Button>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Contato ainda não está no CRM.
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          Sincronize a conversação para criar um card.
        </p>
        <Button size="sm" variant="outline" onClick={openFullBoard}>
          Abrir CRM completo
        </Button>
      </div>
    )
  }

  const phone = card.phone ?? card.contact.phone_number
  const stages = activePipeline?.stages ?? []
  const cardPipeline = pipelines.find((p) => p.id === card.pipelineId) ?? activePipeline
  const cardStages = cardPipeline?.stages ?? stages
  const attachedProducts = products.filter((p) => card.products.includes(p.id))
  const productsTotal = attachedProducts.reduce((sum, p) => sum + p.price, 0)

  const chatwootConversationUrl =
    chatwootUrl && chatwootAccountId && !useMockData
      ? card.conversations[0]?.id
        ? `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${card.conversations[0].id}`
        : `${chatwootUrl}/app/accounts/${chatwootAccountId}/contacts/${card.contactId}`
      : null

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <Avatar>
            {card.contact.thumbnail && <AvatarImage src={card.contact.thumbnail} />}
            <AvatarFallback className="bg-[#1F93FF]/20 text-[#1F93FF] text-xs">
              {getInitials(card.contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{card.contact.name}</p>
              <LeadScoreBadge score={card.score} />
            </div>
            <p className="truncate text-[10px] text-muted-foreground">
              Contato #{card.contactId}
            </p>
          </div>
        </div>
      </div>

      {/* Body scrollable */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          {/* Contact info */}
          <section className="space-y-1.5">
            {card.contact.email && (
              <div className="flex items-center gap-1.5 text-xs">
                <Mail className="size-3 text-muted-foreground" />
                <span className="truncate">{card.contact.email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5 text-xs">
                <Phone className="size-3 text-muted-foreground" />
                <a
                  href={`https://wa.me/${cleanPhone(phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline"
                >
                  {phone}
                </a>
              </div>
            )}
          </section>

          <Separator />

          {/* Stage selector */}
          <section>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Etapa
            </label>
            <Select
              value={card.stageId}
              onValueChange={(val) => {
                if (val) moveCard(card.id, val)
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cardStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Priority */}
          <section>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="mr-0.5 inline size-3" />
              Prioridade
            </label>
            <div className="flex gap-1">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateCardPriority(card.id, opt.value)}
                  className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all ${
                    card.priority === opt.value
                      ? `${opt.color} border-current bg-current/10`
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Value */}
          <section>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <DollarSign className="mr-0.5 inline size-3" />
              Valor (R$)
            </label>
            <Input
              type="number"
              value={card.value || ''}
              onChange={(e) => updateCardValue(card.id, Number(e.target.value) || 0)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </section>

          <Separator />

          {/* Labels */}
          <section>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Tag className="mr-0.5 inline size-3" />
              Labels
            </label>
            <div className="flex flex-wrap gap-1">
              {card.labels.map((label) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                    LABEL_COLORS[label] ?? 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className="opacity-60 transition-opacity hover:opacity-100"
                    aria-label={`Remover ${label}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
            {labels.length > 0 && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                  <Plus className="mr-0.5 inline size-2.5" />
                  Adicionar label
                </summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  {labels
                    .filter((l) => !card.labels.includes(l.title))
                    .map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLabel(l.title)}
                        className="rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-[#1F93FF]/50 hover:text-[#1F93FF]"
                      >
                        {l.title}
                      </button>
                    ))}
                </div>
              </details>
            )}
          </section>

          <Separator />

          {/* Checklist */}
          <section>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckSquare className="mr-0.5 inline size-3" />
              Tarefas
              {card.checklist.length > 0 && (
                <span className="ml-1 text-muted-foreground/70">
                  ({card.checklist.filter((i) => i.done).length}/{card.checklist.length})
                </span>
              )}
            </label>
            <CardChecklist
              checklist={card.checklist}
              onChange={(cl) => updateCardChecklist(card.id, cl)}
            />
          </section>

          {/* Products */}
          {attachedProducts.length > 0 && (
            <>
              <Separator />
              <section>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="mr-0.5 inline size-3" />
                  Produtos
                </label>
                <div className="space-y-1">
                  {attachedProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-[11px]"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="font-semibold text-green-400">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-md bg-green-500/10 px-2 py-1 text-xs font-semibold">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-green-400">{formatCurrency(productsTotal)}</span>
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Add note */}
          <section>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="mr-0.5 inline size-3" />
              Nova nota
            </label>
            <div className="flex gap-1">
              <Input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Adicionar nota..."
                className="h-8 flex-1 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                <Plus className="size-3" />
              </Button>
            </div>
            {card.notes.length > 0 && (
              <div className="mt-2 space-y-1">
                {card.notes
                  .slice(-3)
                  .reverse()
                  .map((n) => (
                    <div key={n.id} className="rounded-md bg-muted/30 px-2 py-1 text-[10px]">
                      <p className="text-muted-foreground italic">{n.text}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="border-t border-border p-2">
        <div className="flex gap-1.5">
          {chatwootConversationUrl && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-[11px]"
              onClick={() => {
                if (chatwootConversationUrl) {
                  window.open(chatwootConversationUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              <ExternalLink className="mr-1 size-3" />
              Conversação
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-[11px]"
            onClick={openFullBoard}
            title="Abrir no CRM completo"
          >
            <ExternalLink className="mr-1 size-3" />
            CRM completo
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EmbedPage() {
  return (
    <PipelineProvider>
      <EmbedContent />
    </PipelineProvider>
  )
}
