'use client'

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type {
  CrmPipeline,
  CrmCard,
  ChatwootContact,
  ChatwootAgent,
  ChatwootConversation,
  CrmChecklistItem,
  CrmNote,
  CrmProduct,
  CrmAutomationRule,
} from '@/lib/chatwoot/types'
import {
  DEFAULT_PIPELINES,
  MOCK_CONTACTS,
  MOCK_AGENTS,
  MOCK_LABELS,
  MOCK_INBOXES,
  MOCK_PRODUCTS,
  getMockConversations,
  getMockContactLastMessage,
  getMockAssignedAgent,
  getMockLabelsForContact,
  getMockPriority,
  getMockValue,
  getMockProducts,
} from '@/lib/chatwoot/mock-data'
import { isConfigured, getChatwootConfig } from '@/lib/config'
import {
  listContacts,
  listAgents as fetchAgents,
  listLabels as fetchLabels,
  listInboxes as fetchInboxes,
  updateContactCustomAttributes,
  updateContactLabels as apiUpdateContactLabels,
  createContact as apiCreateContact,
} from '@/lib/chatwoot/api'
import type { ChatwootLabel, ChatwootInbox } from '@/lib/chatwoot/types'
import { calculateLeadScore } from '@/lib/scoring'
import { evaluateAutomations } from '@/lib/automations'
import { fireWebhook } from '@/lib/webhooks'
import { showToast } from '@/lib/toast'
import {
  fetchPipelinesFromDb,
  createPipelineInDb,
  updatePipelineInDb,
  deletePipelineInDb,
  fetchProductsFromDb,
  createProductInDb,
  updateProductInDb,
  deleteProductInDb,
  fetchAutomationsFromDb,
  createAutomationInDb,
  updateAutomationInDb,
  deleteAutomationInDb,
} from '@/lib/store/db-persistence'
import {
  initRealtime,
  broadcastEvent,
  isBroadcastChannelActive,
  type RealtimeEvent,
} from '@/lib/realtime'

const PIPELINES_STORAGE_KEY = 'chatwoot-crm-pipelines'
const CARDS_EXTRA_STORAGE_KEY = 'chatwoot-crm-cards-extra'
const PRODUCTS_STORAGE_KEY = 'chatwoot-crm-products'
const AUTO_MOVE_STORAGE_KEY = 'chatwoot-crm-auto-move'
const ACCESS_CONTROL_STORAGE_KEY = 'chatwoot-crm-access-control'
const AUTO_SYNC_ENABLED_KEY = 'chatwoot-crm-auto-sync-enabled'
const AUTO_SYNC_INTERVAL_MS = 30_000

interface CardsExtraData {
  [cardId: string]: {
    checklist?: CrmChecklistItem[]
    notes?: CrmNote[]
    products?: string[]
    priority?: CrmCard['priority']
    value?: number
    labels?: string[]
  }
}

interface Filters {
  agentId: number | null
  labels: string[]
  inboxId: number | null
  searchQuery: string
}

interface AccessControl {
  [pipelineId: string]: {
    visibleTo: 'all' | number[]
  }
}

interface PipelineStore {
  pipelines: CrmPipeline[]
  activePipelineId: string
  cards: CrmCard[]
  agents: ChatwootAgent[]
  labels: ChatwootLabel[]
  inboxes: ChatwootInbox[]
  products: CrmProduct[]
  automationRules: CrmAutomationRule[]
  filters: Filters
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  useMockData: boolean
  autoMoveEnabled: boolean
  autoSyncEnabled: boolean
  accessControl: AccessControl

  setActivePipeline: (id: string) => void
  setFilters: (filters: Partial<Filters>) => void
  clearFilters: () => void
  moveCard: (cardId: string, toStageId: string) => void
  moveCardToPipeline: (cardId: string, toPipelineId: string, toStageId?: string) => void
  addPipeline: (pipeline: CrmPipeline) => void
  updatePipeline: (pipeline: CrmPipeline) => void
  deletePipeline: (id: string) => void
  refreshData: () => Promise<void>
  updateCardChecklist: (cardId: string, checklist: CrmChecklistItem[]) => void
  addCardNote: (cardId: string, note: CrmNote) => void
  updateCardProducts: (cardId: string, productIds: string[]) => void
  updateCardPriority: (cardId: string, priority: CrmCard['priority']) => void
  updateCardValue: (cardId: string, value: number) => void
  updateCardLabels: (cardId: string, labels: string[]) => void
  addProduct: (product: CrmProduct) => void
  updateProduct: (product: CrmProduct) => void
  deleteProduct: (id: string) => void
  addAutomationRule: (rule: CrmAutomationRule) => void
  updateAutomationRule: (rule: CrmAutomationRule) => void
  deleteAutomationRule: (id: string) => void
  addCard: (card: CrmCard) => void
  setAutoMoveEnabled: (enabled: boolean) => void
  setAutoSyncEnabled: (enabled: boolean) => void
  setAccessControl: (pipelineId: string, visibleTo: 'all' | number[]) => void
  syncConversations: (options?: { silent?: boolean }) => Promise<number>

  activePipeline: CrmPipeline | undefined
  filteredCards: CrmCard[]
  chatwootUrl: string
  chatwootAccountId: string
  isRealtimeConnected: boolean
  lastRealtimeEventAt: number | null
}

const PipelineContext = createContext<PipelineStore | null>(null)

function loadPipelines(): CrmPipeline[] {
  if (typeof window === 'undefined') return DEFAULT_PIPELINES
  try {
    const stored = localStorage.getItem(PIPELINES_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CrmPipeline[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_PIPELINES
}

function savePipelines(pipelines: CrmPipeline[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PIPELINES_STORAGE_KEY, JSON.stringify(pipelines))
}

function loadCardsExtra(): CardsExtraData {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(CARDS_EXTRA_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as CardsExtraData
  } catch {
    // fallback
  }
  return {}
}

function saveCardsExtra(data: CardsExtraData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CARDS_EXTRA_STORAGE_KEY, JSON.stringify(data))
}

function loadProducts(): CrmProduct[] {
  if (typeof window === 'undefined') return MOCK_PRODUCTS
  try {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CrmProduct[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return MOCK_PRODUCTS
}

function saveProducts(products: CrmProduct[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
}

function loadAutoMove(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AUTO_MOVE_STORAGE_KEY) === 'true'
}

function saveAutoMove(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTO_MOVE_STORAGE_KEY, String(enabled))
}

function loadAccessControl(): AccessControl {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(ACCESS_CONTROL_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as AccessControl
  } catch {
    // fallback
  }
  return {}
}

function saveAccessControl(data: AccessControl): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_CONTROL_STORAGE_KEY, JSON.stringify(data))
}

function loadAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(AUTO_SYNC_ENABLED_KEY)
  // default: true (ativo por padrão)
  if (stored === null) return true
  return stored === 'true'
}

function saveAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTO_SYNC_ENABLED_KEY, String(enabled))
}

function buildMockCards(extraData: CardsExtraData): CrmCard[] {
  return MOCK_CONTACTS.map((contact) => {
    const pipelineId = (contact.custom_attributes.crm_pipeline as string) || 'vendas'
    const stageId = (contact.custom_attributes.crm_stage as string) || 'novo'
    const conversations = getMockConversations(contact.id)
    const agent = getMockAssignedAgent(contact.id)
    const labels = getMockLabelsForContact(contact.id)
    const lastMessage = getMockContactLastMessage(contact.id)
    const cardId = `card-${contact.id}`
    const extra = extraData[cardId]

    const card: CrmCard = {
      id: cardId,
      contactId: contact.id,
      contact,
      pipelineId,
      stageId,
      lastMessage,
      lastMessageAt: contact.last_activity_at,
      labels: extra?.labels ?? labels,
      assignedAgent: agent,
      conversations,
      phone: contact.phone_number,
      priority: extra?.priority ?? getMockPriority(contact.id),
      value: extra?.value ?? getMockValue(contact.id),
      checklist: extra?.checklist ?? [],
      notes: extra?.notes ?? [],
      products: extra?.products ?? getMockProducts(contact.id),
      score: 0,
    }

    card.score = calculateLeadScore(card)
    return card
  })
}

function resolveStageId(rawStage: string, pipeline: CrmPipeline): string {
  if (!rawStage) return pipeline.stages[0]?.id || 'novo'
  // Match by exact ID
  const byId = pipeline.stages.find((s) => s.id === rawStage)
  if (byId) return byId.id
  // Match by name (case-insensitive, accent-insensitive)
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const normalizedRaw = normalize(rawStage)
  const byName = pipeline.stages.find((s) => normalize(s.name) === normalizedRaw || normalize(s.id) === normalizedRaw)
  if (byName) return byName.id
  // Partial match
  const byPartial = pipeline.stages.find((s) => normalize(s.name).includes(normalizedRaw) || normalizedRaw.includes(normalize(s.id)))
  if (byPartial) return byPartial.id
  // Fallback to first stage
  return pipeline.stages[0]?.id || 'novo'
}

function resolvePipelineId(rawPipeline: string, pipelines: CrmPipeline[]): string {
  if (!rawPipeline) return pipelines[0]?.id || 'vendas'
  const byId = pipelines.find((p) => p.id === rawPipeline)
  if (byId) return byId.id
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  const byName = pipelines.find((p) => normalize(p.name) === normalize(rawPipeline))
  if (byName) return byName.id
  return pipelines[0]?.id || 'vendas'
}

async function buildLiveCards(contacts: ChatwootContact[], extraData: CardsExtraData, pipelines?: CrmPipeline[]): Promise<CrmCard[]> {
  const allPipelines = pipelines || loadPipelines()
  return contacts.map((contact) => {
    const rawPipeline = (contact.custom_attributes.crm_pipeline as string) || ''
    const rawStage = (contact.custom_attributes.crm_stage as string) || ''
    const pipelineId = resolvePipelineId(rawPipeline, allPipelines)
    const pipeline = allPipelines.find((p) => p.id === pipelineId) || allPipelines[0]
    const stageId = pipeline ? resolveStageId(rawStage, pipeline) : 'novo'
    const cardId = `card-${contact.id}`
    const extra = extraData[cardId]

    const card: CrmCard = {
      id: cardId,
      contactId: contact.id,
      contact,
      pipelineId,
      stageId,
      lastMessage: null,
      lastMessageAt: contact.last_activity_at,
      labels: extra?.labels ?? [],
      assignedAgent: null,
      conversations: [],
      phone: contact.phone_number,
      priority: extra?.priority ?? 'media',
      value: extra?.value ?? 0,
      checklist: extra?.checklist ?? [],
      notes: extra?.notes ?? [],
      products: extra?.products ?? [],
      score: 0,
    }

    card.score = calculateLeadScore(card)
    return card
  })
}

const EMPTY_FILTERS: Filters = {
  agentId: null,
  labels: [],
  inboxId: null,
  searchQuery: '',
}

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipelines, setPipelines] = useState<CrmPipeline[]>(DEFAULT_PIPELINES)
  const [activePipelineId, setActivePipelineId] = useState('vendas')
  const [cards, setCards] = useState<CrmCard[]>([])
  const [agents, setAgents] = useState<ChatwootAgent[]>([])
  const [labels, setLabels] = useState<ChatwootLabel[]>([])
  const [inboxes, setInboxes] = useState<ChatwootInbox[]>([])
  const [products, setProducts] = useState<CrmProduct[]>(MOCK_PRODUCTS)
  const [automationRules, setAutomationRules] = useState<CrmAutomationRule[]>([])
  const [filters, setFiltersState] = useState<Filters>(EMPTY_FILTERS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useMockData, setUseMockData] = useState(true)
  const [cardsExtra, setCardsExtra] = useState<CardsExtraData>({})
  const [autoMoveEnabled, setAutoMoveEnabledState] = useState(false)
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(true)
  const [accessControl, setAccessControlState] = useState<AccessControl>({})
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<number | null>(null)
  const suppressBroadcastRef = useRef(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    let resolvedPipelines: CrmPipeline[]
    try {
      const fromDb = await fetchPipelinesFromDb()
      resolvedPipelines = fromDb.length > 0 ? fromDb : loadPipelines()
    } catch {
      resolvedPipelines = loadPipelines()
    }
    setPipelines(resolvedPipelines)

    if (resolvedPipelines.length > 0) {
      setActivePipelineId((current) => {
        const exists = resolvedPipelines.some((p) => p.id === current)
        if (exists) return current
        const preferred = resolvedPipelines.find((p) => p.id.endsWith('-vendas'))
        return preferred?.id ?? resolvedPipelines[0].id
      })
    }

    const storedExtra = loadCardsExtra()
    setCardsExtra(storedExtra)

    try {
      const productsFromDb = await fetchProductsFromDb()
      setProducts(productsFromDb.length > 0 ? productsFromDb : loadProducts())
    } catch {
      setProducts(loadProducts())
    }

    try {
      const rulesFromDb = await fetchAutomationsFromDb()
      setAutomationRules(rulesFromDb)
    } catch {
      setAutomationRules([])
    }

    const storedAutoMove = loadAutoMove()
    setAutoMoveEnabledState(storedAutoMove)

    const storedAutoSync = loadAutoSyncEnabled()
    setAutoSyncEnabledState(storedAutoSync)

    const storedAccess = loadAccessControl()
    setAccessControlState(storedAccess)

    if (!isConfigured()) {
      setUseMockData(true)
      setCards(buildMockCards(storedExtra))
      setAgents(MOCK_AGENTS)
      setLabels(MOCK_LABELS)
      setInboxes(MOCK_INBOXES)
      setIsLoading(false)
      return
    }

    setUseMockData(false)
    try {
      const [contactsResult, agentsResult, labelsResult, inboxesResult] = await Promise.all([
        listContacts(1),
        fetchAgents(),
        fetchLabels(),
        fetchInboxes(),
      ])

      const liveCards = await buildLiveCards(contactsResult.contacts, storedExtra)
      setCards(liveCards)
      setAgents(agentsResult)
      setLabels(labelsResult)
      setInboxes(inboxesResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados do Chatwoot'
      setError(message)
      setUseMockData(true)
      setCards(buildMockCards(storedExtra))
      setAgents(MOCK_AGENTS)
      setLabels(MOCK_LABELS)
      setInboxes(MOCK_INBOXES)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Inicializa o sistema de sincronização em tempo real entre abas
  useEffect(() => {
    setIsRealtimeConnected(isBroadcastChannelActive() || typeof window !== 'undefined')

    const cleanup = initRealtime((event: RealtimeEvent) => {
      setLastRealtimeEventAt(event.timestamp)
      suppressBroadcastRef.current = true

      try {
        switch (event.type) {
          case 'card_moved': {
            const { cardId, toStageId } = event.payload as { cardId: string; toStageId: string }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, stageId: toStageId }
              }),
            )
            break
          }
          case 'card_added': {
            const { card: newCard } = event.payload as { card: CrmCard }
            setCards((prev) => {
              if (prev.some((c) => c.id === newCard.id)) return prev
              return [...prev, newCard]
            })
            break
          }
          case 'card_pipeline_moved': {
            const { cardId, toPipelineId, toStageId } = event.payload as {
              cardId: string
              toPipelineId: string
              toStageId: string
            }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, pipelineId: toPipelineId, stageId: toStageId }
              }),
            )
            break
          }
          case 'labels_changed': {
            const { cardId, labels: newLabels } = event.payload as { cardId: string; labels: string[] }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, labels: newLabels }
              }),
            )
            const storedExtra = loadCardsExtra()
            storedExtra[cardId as string] = { ...storedExtra[cardId as string], labels: newLabels }
            setCardsExtra(storedExtra)
            break
          }
          case 'note_added': {
            const { cardId, note } = event.payload as { cardId: string; note: CrmNote }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, notes: [...card.notes, note] }
              }),
            )
            const storedExtra2 = loadCardsExtra()
            const existing = storedExtra2[cardId as string]?.notes ?? []
            storedExtra2[cardId as string] = { ...storedExtra2[cardId as string], notes: [...existing, note] }
            setCardsExtra(storedExtra2)
            break
          }
          case 'checklist_updated': {
            const { cardId, checklist } = event.payload as { cardId: string; checklist: CrmChecklistItem[] }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, checklist }
              }),
            )
            const storedExtra3 = loadCardsExtra()
            storedExtra3[cardId as string] = { ...storedExtra3[cardId as string], checklist }
            setCardsExtra(storedExtra3)
            break
          }
          case 'priority_changed': {
            const { cardId, priority } = event.payload as { cardId: string; priority: CrmCard['priority'] }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, priority }
              }),
            )
            break
          }
          case 'value_changed': {
            const { cardId, value } = event.payload as { cardId: string; value: number }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, value }
              }),
            )
            break
          }
          case 'products_changed': {
            const { cardId, productIds } = event.payload as { cardId: string; productIds: string[] }
            setCards((prev) =>
              prev.map((card) => {
                if (card.id !== cardId) return card
                return { ...card, products: productIds }
              }),
            )
            break
          }
          case 'pipeline_updated': {
            const { pipeline } = event.payload as { pipeline: CrmPipeline }
            setPipelines((prev) => {
              const next = prev.map((p) => (p.id === pipeline.id ? pipeline : p))
              savePipelines(next)
              return next
            })
            break
          }
          case 'pipeline_added': {
            const { pipeline } = event.payload as { pipeline: CrmPipeline }
            setPipelines((prev) => {
              if (prev.some((p) => p.id === pipeline.id)) return prev
              const next = [...prev, pipeline]
              savePipelines(next)
              return next
            })
            break
          }
          case 'pipeline_deleted': {
            const { pipelineId } = event.payload as { pipelineId: string }
            setPipelines((prev) => {
              const next = prev.filter((p) => p.id !== pipelineId)
              savePipelines(next)
              return next
            })
            break
          }
          case 'product_added': {
            const { product } = event.payload as { product: CrmProduct }
            setProducts((prev) => {
              if (prev.some((p) => p.id === product.id)) return prev
              const next = [...prev, product]
              saveProducts(next)
              return next
            })
            break
          }
          case 'product_updated': {
            const { product } = event.payload as { product: CrmProduct }
            setProducts((prev) => {
              const next = prev.map((p) => (p.id === product.id ? product : p))
              saveProducts(next)
              return next
            })
            break
          }
          case 'product_deleted': {
            const { productId } = event.payload as { productId: string }
            setProducts((prev) => {
              const next = prev.filter((p) => p.id !== productId)
              saveProducts(next)
              return next
            })
            break
          }
          case 'auto_move_changed': {
            const { enabled } = event.payload as { enabled: boolean }
            setAutoMoveEnabledState(enabled)
            saveAutoMove(enabled)
            break
          }
          case 'data_refreshed': {
            loadData()
            break
          }
        }
      } finally {
        suppressBroadcastRef.current = false
      }
    })

    setIsRealtimeConnected(true)

    return cleanup
  }, [loadData])

  // Auto-sync: poll Chatwoot periodicamente (não bloqueante)
  // Cleanup: clear interval when disabled or component unmounts
  useEffect(() => {
    if (useMockData) return
    if (!autoSyncEnabled) return
    if (typeof window === 'undefined') return

    const intervalId = setInterval(() => {
      // Chamada silenciosa: só mostra toast se houver novos leads
      void (async () => {
        if (useMockData) return
        try {
          const { syncConversationsToCards } = await import('@/lib/chatwoot/sync')
          const pipeline = pipelines.find((p) => p.id === activePipelineId)
          if (!pipeline) return
          const result = await syncConversationsToCards(pipeline, cards)
          if (result.newCards.length > 0) {
            setCards((prev) => [...prev, ...result.newCards])
            showToast(`${result.totalImported} novo(s) lead(s) recebido(s)`, 'success')
          }
        } catch {
          // silencioso — não polui a UI com erros de polling
        }
      })()
    }, AUTO_SYNC_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [autoSyncEnabled, useMockData, pipelines, activePipelineId, cards])

  const setActivePipeline = useCallback((id: string) => {
    setActivePipelineId(id)
  }, [])

  const setFilters = useCallback((partial: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(EMPTY_FILTERS)
  }, [])

  const moveCard = useCallback(
    (cardId: string, toStageId: string) => {
      let fromStageName = ''
      let toStageName = ''
      let pipelineName = ''

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          if (card.stageId === toStageId) return card

          const previousStageId = card.stageId
          fromStageName = previousStageId
          toStageName = toStageId
          pipelineName = card.pipelineId

          const updated = { ...card, stageId: toStageId }

          const note: CrmNote = {
            id: `note-${Date.now()}`,
            text: `Movido para etapa: ${toStageId}`,
            author: 'Sistema',
            timestamp: new Date().toISOString(),
            type: 'stage_change',
          }
          updated.notes = [...updated.notes, note]
          updated.score = calculateLeadScore(updated)

          const newExtra = { ...cardsExtra }
          newExtra[cardId] = {
            ...newExtra[cardId],
            notes: updated.notes,
          }
          setCardsExtra(newExtra)
          saveCardsExtra(newExtra)

          const result = evaluateAutomations(automationRules, {
            card: updated,
            previousStageId,
          })
          if (result?.newStageId && result.newStageId !== toStageId) {
            updated.stageId = result.newStageId
          }
          if (result?.newLabel && !updated.labels.includes(result.newLabel)) {
            updated.labels = [...updated.labels, result.newLabel]
          }

          return updated
        }),
      )

      // Broadcast para outras abas
      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'card_moved',
          payload: { cardId, toStageId },
        })
      }

      // Fire webhook
      const card = cards.find((c) => c.id === cardId)
      if (card) {
        fireWebhook({
          event: 'card.moved',
          card: {
            id: card.id,
            contactId: card.contactId,
            contactName: card.contact.name,
            stageId: toStageId,
          },
          from_stage: fromStageName,
          to_stage: toStageName,
          pipeline: pipelineName,
          timestamp: new Date().toISOString(),
        })

        showToast(`${card.contact.name} movido para nova etapa`, 'success')
      }

      if (card && !useMockData) {
        updateContactCustomAttributes(card.contactId, {
          ...card.contact.custom_attributes,
          crm_stage: toStageId,
        }).catch(() => {
          setCards((prev) =>
            prev.map((c) => {
              if (c.id !== cardId) return c
              return { ...c, stageId: card.stageId }
            }),
          )
        })
      }
    },
    [cards, useMockData, cardsExtra, automationRules],
  )

  const moveCardToPipeline = useCallback(
    (cardId: string, toPipelineId: string, toStageId?: string) => {
      const card = cards.find((c) => c.id === cardId)
      if (!card) return

      const targetPipeline = pipelines.find((p) => p.id === toPipelineId)
      if (!targetPipeline || targetPipeline.stages.length === 0) return

      const fromPipelineId = card.pipelineId
      const fromPipeline = pipelines.find((p) => p.id === fromPipelineId)
      const targetStageId = toStageId ?? targetPipeline.stages[0].id
      const targetStage = targetPipeline.stages.find((s) => s.id === targetStageId)

      const note: CrmNote = {
        id: `note-${Date.now()}`,
        text: `Movido de "${fromPipeline?.name ?? fromPipelineId}" para "${targetPipeline.name}" → ${targetStage?.name ?? targetStageId}`,
        author: 'Sistema',
        timestamp: new Date().toISOString(),
        type: 'stage_change',
      }

      setCards((prev) =>
        prev.map((c) => {
          if (c.id !== cardId) return c
          const updated = {
            ...c,
            pipelineId: toPipelineId,
            stageId: targetStageId,
            notes: [...c.notes, note],
          }
          updated.score = calculateLeadScore(updated)
          return updated
        }),
      )

      const newExtra = { ...cardsExtra }
      const existingNotes = newExtra[cardId]?.notes ?? card.notes
      newExtra[cardId] = {
        ...newExtra[cardId],
        notes: [...existingNotes, note],
      }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'card_pipeline_moved',
          payload: { cardId, toPipelineId, toStageId: targetStageId },
        })
      }

      fireWebhook({
        event: 'card.pipeline_moved',
        card: {
          id: card.id,
          contactId: card.contactId,
          contactName: card.contact.name,
          stageId: targetStageId,
        },
        from_pipeline: fromPipelineId,
        to_pipeline: toPipelineId,
        to_stage: targetStageId,
        timestamp: new Date().toISOString(),
      })

      showToast(
        `${card.contact.name} movido para ${targetPipeline.name} → ${targetStage?.name ?? targetStageId}`,
        'success',
      )

      if (!useMockData) {
        updateContactCustomAttributes(card.contactId, {
          ...card.contact.custom_attributes,
          crm_pipeline: toPipelineId,
          crm_stage: targetStageId,
        }).catch(() => {
          // revert on failure
          setCards((prev) =>
            prev.map((c) => {
              if (c.id !== cardId) return c
              return { ...c, pipelineId: fromPipelineId, stageId: card.stageId }
            }),
          )
        })
      }
    },
    [cards, pipelines, cardsExtra, useMockData],
  )

  const updateCardLabels = useCallback(
    (cardId: string, newLabels: string[]) => {
      const newExtra = { ...cardsExtra, [cardId]: { ...cardsExtra[cardId], labels: newLabels } }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const updated = { ...card, labels: newLabels }
          updated.score = calculateLeadScore(updated)
          return updated
        }),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'labels_changed',
          payload: { cardId, labels: newLabels },
        })
      }

      const card = cards.find((c) => c.id === cardId)
      if (card && !useMockData) {
        apiUpdateContactLabels(card.contactId, newLabels).catch(() => {
          // revert on failure
        })
      }

      showToast('Labels atualizadas', 'success')
    },
    [cardsExtra, cards, useMockData],
  )

  const updateCardChecklist = useCallback(
    (cardId: string, checklist: CrmChecklistItem[]) => {
      const newExtra = { ...cardsExtra, [cardId]: { ...cardsExtra[cardId], checklist } }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'checklist_updated',
          payload: { cardId, checklist },
        })
      }

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const updated = { ...card, checklist }
          updated.score = calculateLeadScore(updated)

          if (checklist.length > 0 && checklist.every((item) => item.done)) {
            const result = evaluateAutomations(automationRules, { card: updated })
            if (result?.newStageId) {
              updated.stageId = result.newStageId
            }
          }

          return updated
        }),
      )
    },
    [cardsExtra, automationRules],
  )

  const addCardNote = useCallback(
    (cardId: string, note: CrmNote) => {
      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'note_added',
          payload: { cardId, note },
        })
      }

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const newNotes = [...card.notes, note]
          const newExtra = { ...cardsExtra, [cardId]: { ...cardsExtra[cardId], notes: newNotes } }
          setCardsExtra(newExtra)
          saveCardsExtra(newExtra)
          return { ...card, notes: newNotes }
        }),
      )
    },
    [cardsExtra],
  )

  const updateCardProducts = useCallback(
    (cardId: string, productIds: string[]) => {
      const newExtra = { ...cardsExtra, [cardId]: { ...cardsExtra[cardId], products: productIds } }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'products_changed',
          payload: { cardId, productIds },
        })
      }

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const updated = { ...card, products: productIds }
          updated.score = calculateLeadScore(updated)
          return updated
        }),
      )
    },
    [cardsExtra],
  )

  const updateCardPriority = useCallback(
    (cardId: string, priority: CrmCard['priority']) => {
      const newExtra = { ...cardsExtra, [cardId]: { ...cardsExtra[cardId], priority } }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'priority_changed',
          payload: { cardId, priority },
        })
      }

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          return { ...card, priority }
        }),
      )
    },
    [cardsExtra],
  )

  const updateCardValue = useCallback(
    (cardId: string, value: number) => {
      const newExtra = { ...cardsExtra, [cardId]: { ...cardsExtra[cardId], value } }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'value_changed',
          payload: { cardId, value },
        })
      }

      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          return { ...card, value }
        }),
      )
    },
    [cardsExtra],
  )

  const addCard = useCallback(
    (card: CrmCard) => {
      setCards((prev) => [...prev, card])

      if (!suppressBroadcastRef.current) {
        broadcastEvent({
          type: 'card_added',
          payload: { card },
        })
      }

      const newExtra = {
        ...cardsExtra,
        [card.id]: {
          labels: card.labels,
          priority: card.priority,
          value: card.value,
          notes: card.notes,
          checklist: card.checklist,
          products: card.products,
        },
      }
      setCardsExtra(newExtra)
      saveCardsExtra(newExtra)

      if (!useMockData) {
        apiCreateContact({
          name: card.contact.name,
          email: card.contact.email ?? undefined,
          phone_number: card.contact.phone_number ?? undefined,
        }).catch(() => {
          // silently fail
        })
      }

      showToast(`Lead "${card.contact.name}" adicionado`, 'success')

      fireWebhook({
        event: 'card.created',
        card: {
          id: card.id,
          contactId: card.contactId,
          contactName: card.contact.name,
          stageId: card.stageId,
        },
        pipeline: card.pipelineId,
        timestamp: new Date().toISOString(),
      })
    },
    [cardsExtra, useMockData],
  )

  const setAutoMoveEnabled = useCallback((enabled: boolean) => {
    setAutoMoveEnabledState(enabled)
    saveAutoMove(enabled)
    if (!suppressBroadcastRef.current) {
      broadcastEvent({
        type: 'auto_move_changed',
        payload: { enabled },
      })
    }
  }, [])

  const setAccessControlFn = useCallback(
    (pipelineId: string, visibleTo: 'all' | number[]) => {
      const next = { ...accessControl, [pipelineId]: { visibleTo } }
      setAccessControlState(next)
      saveAccessControl(next)
    },
    [accessControl],
  )

  const syncConversations = useCallback(async (options?: { silent?: boolean }): Promise<number> => {
    const silent = options?.silent ?? false

    if (useMockData) {
      if (!silent) {
        showToast('Sincronização disponível apenas com Chatwoot conectado', 'info')
      }
      return 0
    }

    setIsSyncing(true)
    try {
      const { syncConversationsToCards } = await import('@/lib/chatwoot/sync')
      const pipeline = pipelines.find((p) => p.id === activePipelineId)
      if (!pipeline) {
        setIsSyncing(false)
        return 0
      }

      const result = await syncConversationsToCards(pipeline, cards)
      if (result.newCards.length > 0) {
        setCards((prev) => [...prev, ...result.newCards])
        if (silent) {
          showToast(`${result.totalImported} novo(s) lead(s) recebido(s)`, 'success')
        } else {
          showToast(`${result.totalImported} novo(s) lead(s) importado(s)`, 'success')
        }
      } else if (!silent) {
        showToast('Nenhum novo lead encontrado', 'info')
      }

      return result.totalImported
    } catch (err) {
      if (!silent) {
        const message = err instanceof Error ? err.message : 'Erro ao sincronizar'
        showToast(message, 'error')
      }
      return 0
    } finally {
      setIsSyncing(false)
    }
  }, [useMockData, pipelines, activePipelineId, cards])

  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setAutoSyncEnabledState(enabled)
    saveAutoSyncEnabled(enabled)
    showToast(
      enabled ? 'Auto-sync ativado' : 'Auto-sync pausado',
      enabled ? 'success' : 'info',
    )
  }, [])

  const addProduct = useCallback((product: CrmProduct) => {
    const previous = products
    setProducts((prev) => [...prev, product])
    createProductInDb(product).catch((err: unknown) => {
      setProducts(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao criar produto', 'error')
    })
    if (!suppressBroadcastRef.current) {
      broadcastEvent({ type: 'product_added', payload: { product } })
    }
  }, [products])

  const updateProduct = useCallback((product: CrmProduct) => {
    const previous = products
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)))
    updateProductInDb(product).catch((err: unknown) => {
      setProducts(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao atualizar produto', 'error')
    })
    if (!suppressBroadcastRef.current) {
      broadcastEvent({ type: 'product_updated', payload: { product } })
    }
  }, [products])

  const deleteProduct = useCallback((id: string) => {
    const previous = products
    setProducts((prev) => prev.filter((p) => p.id !== id))
    deleteProductInDb(id).catch((err: unknown) => {
      setProducts(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao remover produto', 'error')
    })
    if (!suppressBroadcastRef.current) {
      broadcastEvent({ type: 'product_deleted', payload: { productId: id } })
    }
  }, [products])

  const addAutomationRule = useCallback((rule: CrmAutomationRule) => {
    const previous = automationRules
    setAutomationRules((prev) => [...prev, rule])
    createAutomationInDb(rule).catch((err: unknown) => {
      setAutomationRules(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao criar automação', 'error')
    })
  }, [automationRules])

  const updateAutomationRule = useCallback((rule: CrmAutomationRule) => {
    const previous = automationRules
    setAutomationRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)))
    updateAutomationInDb(rule).catch((err: unknown) => {
      setAutomationRules(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao atualizar automação', 'error')
    })
  }, [automationRules])

  const deleteAutomationRule = useCallback((id: string) => {
    const previous = automationRules
    setAutomationRules((prev) => prev.filter((r) => r.id !== id))
    deleteAutomationInDb(id).catch((err: unknown) => {
      setAutomationRules(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao remover automação', 'error')
    })
  }, [automationRules])

  const addPipeline = useCallback((pipeline: CrmPipeline) => {
    const previous = pipelines
    setPipelines((prev) => [...prev, pipeline])
    createPipelineInDb(pipeline).catch((err: unknown) => {
      setPipelines(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao criar pipeline', 'error')
    })
    if (!suppressBroadcastRef.current) {
      broadcastEvent({ type: 'pipeline_added', payload: { pipeline } })
    }
  }, [pipelines])

  const updatePipeline = useCallback((pipeline: CrmPipeline) => {
    const previous = pipelines
    setPipelines((prev) => prev.map((p) => (p.id === pipeline.id ? pipeline : p)))
    updatePipelineInDb(pipeline).catch((err: unknown) => {
      setPipelines(previous)
      showToast(err instanceof Error ? err.message : 'Falha ao atualizar pipeline', 'error')
    })
    if (!suppressBroadcastRef.current) {
      broadcastEvent({ type: 'pipeline_updated', payload: { pipeline } })
    }
  }, [pipelines])

  const deletePipeline = useCallback(
    (id: string) => {
      const previousPipelines = pipelines
      setPipelines((prev) => prev.filter((p) => p.id !== id))
      deletePipelineInDb(id).catch((err: unknown) => {
        setPipelines(previousPipelines)
        showToast(err instanceof Error ? err.message : 'Falha ao remover pipeline', 'error')
      })
      if (activePipelineId === id) {
        setActivePipelineId(() => {
          const remaining = pipelines.filter((p) => p.id !== id)
          return remaining[0]?.id ?? ''
        })
      }
      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'pipeline_deleted', payload: { pipelineId: id } })
      }
    },
    [activePipelineId, pipelines],
  )

  const config = getChatwootConfig()
  const chatwootUrl = config.url.replace(/\/$/, '')
  const chatwootAccountId = config.accountId

  const activePipeline = useMemo(
    () => pipelines.find((p) => p.id === activePipelineId) ?? pipelines[0],
    [pipelines, activePipelineId],
  )

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (card.pipelineId !== activePipelineId) return false

      if (filters.agentId !== null && card.assignedAgent?.id !== filters.agentId) return false

      if (filters.labels.length > 0) {
        const hasLabel = filters.labels.some((l) => card.labels.includes(l))
        if (!hasLabel) return false
      }

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        const nameMatch = card.contact.name.toLowerCase().includes(q)
        const emailMatch = card.contact.email?.toLowerCase().includes(q) ?? false
        const phoneMatch = card.contact.phone_number?.includes(q) ?? false
        if (!nameMatch && !emailMatch && !phoneMatch) return false
      }

      return true
    })
  }, [cards, activePipelineId, filters])

  const value = useMemo<PipelineStore>(
    () => ({
      pipelines,
      activePipelineId,
      cards,
      agents,
      labels,
      inboxes,
      products,
      automationRules,
      filters,
      isLoading,
      isSyncing,
      error,
      useMockData,
      autoMoveEnabled,
      autoSyncEnabled,
      accessControl,
      chatwootUrl,
      chatwootAccountId,
      setActivePipeline,
      setFilters,
      clearFilters,
      moveCard,
      moveCardToPipeline,
      addPipeline,
      updatePipeline,
      deletePipeline,
      refreshData: loadData,
      updateCardChecklist,
      addCardNote,
      updateCardProducts,
      updateCardPriority,
      updateCardValue,
      updateCardLabels,
      addProduct,
      updateProduct,
      deleteProduct,
      addAutomationRule,
      updateAutomationRule,
      deleteAutomationRule,
      addCard,
      setAutoMoveEnabled,
      setAutoSyncEnabled,
      setAccessControl: setAccessControlFn,
      syncConversations,
      activePipeline,
      filteredCards,
      isRealtimeConnected,
      lastRealtimeEventAt,
    }),
    [
      pipelines,
      activePipelineId,
      cards,
      agents,
      labels,
      inboxes,
      products,
      automationRules,
      filters,
      isLoading,
      isSyncing,
      error,
      useMockData,
      autoMoveEnabled,
      autoSyncEnabled,
      accessControl,
      chatwootUrl,
      chatwootAccountId,
      setActivePipeline,
      setFilters,
      clearFilters,
      moveCard,
      moveCardToPipeline,
      addPipeline,
      updatePipeline,
      deletePipeline,
      loadData,
      updateCardChecklist,
      addCardNote,
      updateCardProducts,
      updateCardPriority,
      updateCardValue,
      updateCardLabels,
      addProduct,
      updateProduct,
      deleteProduct,
      addAutomationRule,
      updateAutomationRule,
      deleteAutomationRule,
      addCard,
      setAutoMoveEnabled,
      setAutoSyncEnabled,
      setAccessControlFn,
      syncConversations,
      activePipeline,
      filteredCards,
      isRealtimeConnected,
      lastRealtimeEventAt,
    ],
  )

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>
}

export function usePipelineStore(): PipelineStore {
  const ctx = useContext(PipelineContext)
  if (!ctx) {
    throw new Error('usePipelineStore deve ser usado dentro de PipelineProvider')
  }
  return ctx
}
