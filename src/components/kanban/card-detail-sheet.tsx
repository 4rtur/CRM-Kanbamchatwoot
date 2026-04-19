'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  Phone,
  MessageSquare,
  User,
  Calendar,
  ArrowRightLeft,
  Tag,
  CheckSquare,
  Package,
  FileText,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react'
import type { CrmCard, ChatwootMessage, CrmPriority } from '@/lib/chatwoot/types'
import { usePipelineStore } from '@/lib/store/pipeline-store'
import { isConfigured } from '@/lib/config'
import { getMockMessages } from '@/lib/chatwoot/mock-data'
import { getConversationMessages } from '@/lib/chatwoot/api'
import { LeadScoreBadge } from './lead-score'
import { CardChecklist } from './card-checklist'
import { CardNotes } from './card-notes'
import { ProductPicker } from '@/components/catalog/product-picker'
import { Input } from '@/components/ui/input'

interface CardDetailSheetProps {
  card: CrmCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
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

const PRIORITY_OPTIONS: { value: CrmPriority; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: 'text-red-400' },
  { value: 'media', label: 'Média', color: 'text-yellow-400' },
  { value: 'baixa', label: 'Baixa', color: 'text-green-400' },
]

function LabelPicker({
  currentLabels,
  onToggle,
}: {
  currentLabels: string[]
  onToggle: (label: string) => void
}) {
  const { labels } = usePipelineStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-6 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-[#1F93FF]/50 hover:text-[#1F93FF]"
        title="Adicionar label"
      >
        <Plus className="size-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 min-w-[200px] rounded-lg border border-border bg-popover p-2 shadow-lg">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Selecionar labels
          </p>
          <div className="space-y-1">
            {labels.map((label) => {
              const isActive = currentLabels.includes(label.title)
              return (
                <button
                  key={label.id}
                  onClick={() => onToggle(label.title)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'bg-[#1F93FF]/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-left">{label.title}</span>
                  {isActive && (
                    <span className="text-[#1F93FF]">
                      <X className="size-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function CardDetailSheet({ card, open, onOpenChange }: CardDetailSheetProps) {
  const {
    activePipeline,
    pipelines,
    moveCard,
    moveCardToPipeline,
    products,
    updateCardChecklist,
    addCardNote,
    updateCardProducts,
    updateCardPriority,
    updateCardValue,
    updateCardLabels,
    filteredCards,
    useMockData,
    chatwootUrl,
    chatwootAccountId,
  } = usePipelineStore()
  const [messages, setMessages] = useState<ChatwootMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [activeTab, setActiveTab] = useState('info')
  const [moveToPipelineId, setMoveToPipelineId] = useState<string>('')
  const [moveToStageId, setMoveToStageId] = useState<string>('')

  const liveCard = card ? filteredCards.find((c) => c.id === card.id) ?? card : null

  useEffect(() => {
    if (!liveCard || !open) {
      setMessages([])
      return
    }

    setLoadingMessages(true)

    if (!isConfigured()) {
      const conversationId = liveCard.conversations[0]?.id
      if (conversationId) {
        setMessages(getMockMessages(conversationId))
      }
      setLoadingMessages(false)
      return
    }

    const conversationId = liveCard.conversations[0]?.id
    if (!conversationId) {
      setLoadingMessages(false)
      return
    }

    getConversationMessages(conversationId)
      .then((msgs) => setMessages(msgs.slice(0, 5)))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [liveCard, open])

  // Keyboard shortcut: Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!liveCard) return null

  const stages = activePipeline?.stages ?? []
  const phone = liveCard.phone ?? liveCard.contact.phone_number

  const attachedProducts = products.filter((p) => liveCard.products.includes(p.id))
  const productsTotal = attachedProducts.reduce((sum, p) => sum + p.price, 0)

  const conversationId = liveCard.conversations[0]?.id
  const conversationUrl = conversationId && chatwootUrl && chatwootAccountId
    ? `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${conversationId}`
    : null

  function handleLabelToggle(label: string) {
    if (!liveCard) return
    const current = liveCard.labels
    const next = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label]
    updateCardLabels(liveCard.id, next)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {liveCard.contact.thumbnail && (
                <AvatarImage src={liveCard.contact.thumbnail} />
              )}
              <AvatarFallback className="bg-[#1F93FF]/20 text-[#1F93FF] text-sm">
                {getInitials(liveCard.contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle>{liveCard.contact.name}</SheetTitle>
              <SheetDescription className="mt-0.5">
                Contato #{liveCard.contactId}
              </SheetDescription>
            </div>
            <LeadScoreBadge score={liveCard.score} size="md" />
          </div>
        </SheetHeader>

        {/* Conversation link button */}
        {conversationUrl ? (
          <div className="mx-4 mt-3">
            <a
              href={conversationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                useMockData
                  ? 'pointer-events-none border-border/50 bg-muted/20 text-muted-foreground/50'
                  : 'border-[#1F93FF]/30 bg-[#1F93FF]/5 text-[#1F93FF] hover:bg-[#1F93FF]/10'
              }`}
            >
              <ExternalLink className="size-3.5" />
              Abrir conversa no Chatwoot
            </a>
          </div>
        ) : null}

        <div className="flex-1 overflow-hidden px-4 pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="checklist">
                Tarefas
                {liveCard.checklist.length > 0 && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {liveCard.checklist.filter((i) => i.done).length}/{liveCard.checklist.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="products">
                Produtos
                {liveCard.products.length > 0 && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {liveCard.products.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
              <TabsTrigger value="messages">Chat</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-220px)]">
              {/* INFO TAB */}
              <TabsContent value="info">
                <div className="space-y-5 py-4">
                  {/* Contact info */}
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Informações
                    </h4>
                    <div className="space-y-2">
                      {liveCard.contact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="size-3.5 text-muted-foreground" />
                          <span>{liveCard.contact.email}</span>
                        </div>
                      )}
                      {phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="size-3.5 text-muted-foreground" />
                          <a
                            href={`https://wa.me/${cleanPhone(phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 underline-offset-2 hover:underline"
                          >
                            {phone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span>Criado em {formatDate(liveCard.contact.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="size-3.5 text-muted-foreground" />
                        <span>Última atividade: {formatDate(liveCard.lastMessageAt)}</span>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Priority & Value */}
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <TrendingUp className="mr-1 inline size-3" />
                      Qualificação
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Prioridade</label>
                        <div className="flex gap-1.5">
                          {PRIORITY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateCardPriority(liveCard.id, opt.value)}
                              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                                liveCard.priority === opt.value
                                  ? `${opt.color} border-current bg-current/10`
                                  : 'border-border text-muted-foreground hover:border-border/80'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">
                          <DollarSign className="mr-0.5 inline size-3" />
                          Valor (R$)
                        </label>
                        <Input
                          type="number"
                          value={liveCard.value || ''}
                          onChange={(e) => updateCardValue(liveCard.id, Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-40"
                        />
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Labels with add/remove */}
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Tag className="mr-1 inline size-3" />
                      Labels
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {liveCard.labels.map((label) => (
                        <span
                          key={label}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            LABEL_COLORS[label] ?? 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {label}
                          <button
                            onClick={() => handleLabelToggle(label)}
                            className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                      <LabelPicker
                        currentLabels={liveCard.labels}
                        onToggle={handleLabelToggle}
                      />
                    </div>
                    {liveCard.labels.length === 0 && (
                      <p className="mt-1 text-[10px] text-muted-foreground/50">
                        Nenhuma label. Clique em + para adicionar.
                      </p>
                    )}
                  </section>

                  <Separator />

                  {/* Quick actions */}
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <ArrowRightLeft className="mr-1 inline size-3" />
                      Ações rápidas
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Mover para etapa</label>
                        <Select
                          value={liveCard.stageId}
                          onValueChange={(val) => {
                            if (val) moveCard(liveCard.id, val)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: s.color }}
                                  />
                                  {s.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {liveCard.assignedAgent && (
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Agente atribuído</label>
                          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                            <User className="size-3.5 text-muted-foreground" />
                            {liveCard.assignedAgent.name}
                          </div>
                        </div>
                      )}

                      {/* Move to another pipeline */}
                      {pipelines.length > 1 && (
                        <div className="pt-2 border-t border-border/50">
                          <label className="mb-1 block text-xs text-muted-foreground">Mover para outro funil</label>
                          <Select
                            value={moveToPipelineId}
                            onValueChange={(val) => {
                              setMoveToPipelineId(val ?? '')
                              setMoveToStageId('')
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecionar funil..." />
                            </SelectTrigger>
                            <SelectContent>
                              {pipelines
                                .filter((p) => p.id !== liveCard.pipelineId)
                                .map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>

                          {moveToPipelineId && (() => {
                            const targetPipeline = pipelines.find((p) => p.id === moveToPipelineId)
                            if (!targetPipeline) return null
                            return (
                              <div className="mt-2 space-y-2">
                                <Select
                                  value={moveToStageId}
                                  onValueChange={(val) => setMoveToStageId(val ?? '')}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecionar etapa..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {targetPipeline.stages.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="size-2 rounded-full"
                                            style={{ backgroundColor: s.color }}
                                          />
                                          {s.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    const stageId = moveToStageId || undefined
                                    moveCardToPipeline(liveCard.id, moveToPipelineId, stageId)
                                    setMoveToPipelineId('')
                                    setMoveToStageId('')
                                    onOpenChange(false)
                                  }}
                                >
                                  <ArrowRightLeft className="mr-1.5 size-3.5" />
                                  Mover para {targetPipeline.name}
                                </Button>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </TabsContent>

              {/* CHECKLIST TAB */}
              <TabsContent value="checklist">
                <div className="py-4">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CheckSquare className="size-3" />
                    Checklist de Tarefas
                  </h4>
                  <CardChecklist
                    checklist={liveCard.checklist}
                    onChange={(checklist) => updateCardChecklist(liveCard.id, checklist)}
                  />
                </div>
              </TabsContent>

              {/* PRODUCTS TAB */}
              <TabsContent value="products">
                <div className="py-4">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Package className="size-3" />
                    Produtos Vinculados
                  </h4>

                  {attachedProducts.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {attachedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-xs"
                        >
                          <span>{product.name}</span>
                          <span className="font-semibold text-green-400">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-md bg-green-500/10 px-2.5 py-2 text-sm font-semibold">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-green-400">{formatCurrency(productsTotal)}</span>
                      </div>
                    </div>
                  )}

                  <Separator className="my-3" />

                  <p className="mb-2 text-[10px] text-muted-foreground">
                    Selecione produtos do catálogo para vincular a este lead:
                  </p>
                  <ProductPicker
                    selectedProductIds={liveCard.products}
                    onChange={(productIds) => updateCardProducts(liveCard.id, productIds)}
                  />
                </div>
              </TabsContent>

              {/* NOTES TAB */}
              <TabsContent value="notes">
                <div className="py-4">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="size-3" />
                    Notas e Atividades
                  </h4>
                  <CardNotes
                    notes={liveCard.notes}
                    onAddNote={(note) => addCardNote(liveCard.id, note)}
                  />
                </div>
              </TabsContent>

              {/* MESSAGES TAB */}
              <TabsContent value="messages">
                <div className="py-4">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="size-3" />
                    Últimas Mensagens
                  </h4>
                  {loadingMessages ? (
                    <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                      Carregando mensagens...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                      Nenhuma mensagem encontrada
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => {
                        const isAgent = msg.message_type === 1
                        return (
                          <div
                            key={msg.id}
                            className={`rounded-lg p-2.5 text-xs ${
                              isAgent
                                ? 'ml-4 bg-[#1F93FF]/10 text-foreground'
                                : 'mr-4 bg-muted text-foreground'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="font-medium text-muted-foreground">
                                {msg.sender?.name ?? 'Sistema'}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {formatMessageTime(msg.created_at)}
                              </span>
                            </div>
                            <p>{msg.content ?? '(sem conteúdo)'}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
