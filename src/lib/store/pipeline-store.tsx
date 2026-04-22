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
import { isConfigured, getChatwootConfig, fetchServerConfigStatus } from '@/lib/config'
import {
  listContacts,
  listAgents as fetchAgents,
  listLabels as fetchLabels,
  listInboxes as fetchInboxes,
  listContactConversations,
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
  fetchDealsFromDb,
  upsertDealInDb,
  updateDealInDb,
  setDealProductsInDb,
  fetchDealProductsFromDb,
  fetchChecklistFromDb,
  createChecklistItemInDb,
  updateChecklistItemInDb,
  deleteChecklistItemInDb,
  fetchNotesFromDb,
  createNoteInDb,
  fetchPipelineAccessFromDb,
  grantPipelineAccessInDb,
  revokePipelineAccessInDb,
  type DbDealRow,
} from '@/lib/store/db-persistence'
import { autoMigrateIfNeeded } from '@/lib/db/migrate-local'
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
const AUTO_ASSIGNMENT_ENABLED_KEY = 'chatwoot-crm-auto-assignment-enabled'
const CARDS_EXTRA_MIGRATED_KEY = 'chatwoot-crm-cards-migrated-to-deals-v1'
const AUTO_SYNC_INTERVAL_MS = 30_000

function wasCardsExtraMigrated(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(CARDS_EXTRA_MIGRATED_KEY) === 'true'
}

function markCardsExtraMigrated(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CARDS_EXTRA_MIGRATED_KEY, 'true')
}

function archiveCardsExtra(): void {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(CARDS_EXTRA_STORAGE_KEY)
  if (raw) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    localStorage.setItem(`${CARDS_EXTRA_STORAGE_KEY}__archived_${stamp}`, raw)
    localStorage.removeItem(CARDS_EXTRA_STORAGE_KEY)
  }
}

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
  autoAssignmentEnabled: boolean
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
  setAutoAssignmentEnabled: (enabled: boolean) => void
  setAccessControl: (pipelineId: string, visibleTo: 'all' | number[]) => void
  syncConversations: (options?: { silent?: boolean }) => Promise<number>
  hydrateCardConversations: (cardId: string) => Promise<ChatwootConversation[]>

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

function loadAutoAssignmentEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AUTO_ASSIGNMENT_ENABLED_KEY) === 'true'
}

function saveAutoAssignmentEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTO_ASSIGNMENT_ENABLED_KEY, String(enabled))
}

interface AssignApiResponse {
  success: boolean
  data?: {
    agent: { agentId: number; agentName: string; ruleId: string } | null
    reason?: string
  }
}

async function requestAutoAssignment(
  pipelineId: string,
  contactId: number,
): Promise<{ agentId: number; agentName: string } | null> {
  try {
    const response = await fetch('/api/crm/assignment-rules/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipelineId,
        entityType: 'contact',
        entityId: String(contactId),
      }),
    })
    if (!response.ok) return null
    const json = (await response.json()) as AssignApiResponse
    if (!json.success || !json.data?.agent) return null
    return { agentId: json.data.agent.agentId, agentName: json.data.agent.agentName }
  } catch {
    return null
  }
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
      dealId: null,
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

async function buildLiveCards(
  contacts: ChatwootContact[],
  extraData: CardsExtraData,
  pipelines: CrmPipeline[] | undefined,
  dealsByKey: Map<string, DbDealRow>,
  dealProductsByDealId: Map<string, string[]>,
): Promise<CrmCard[]> {
  const allPipelines = pipelines || loadPipelines()
  return contacts.map((contact) => {
    const rawPipeline = (contact.custom_attributes.crm_pipeline as string) || ''
    const rawStage = (contact.custom_attributes.crm_stage as string) || ''
    const pipelineId = resolvePipelineId(rawPipeline, allPipelines)
    const pipeline = allPipelines.find((p) => p.id === pipelineId) || allPipelines[0]
    const stageId = pipeline ? resolveStageId(rawStage, pipeline) : 'novo'
    const cardId = `card-${contact.id}`
    const extra = extraData[cardId]

    // Banco é fonte da verdade. localStorage só complementa onde o deal ainda
    // não existe (primeiro load antes do upsert).
    const dealKey = `${contact.id}:${pipelineId}`
    const deal = dealsByKey.get(dealKey)

    const card: CrmCard = {
      id: cardId,
      contactId: contact.id,
      dealId: deal?.id ?? null,
      contact,
      pipelineId,
      stageId: deal?.stageId ?? stageId,
      lastMessage: null,
      lastMessageAt: contact.last_activity_at,
      labels: extra?.labels ?? [],
      assignedAgent: null,
      conversations: [],
      phone: contact.phone_number,
      priority: deal?.priority ?? extra?.priority ?? 'media',
      value: deal?.valueEstimated != null ? Number(deal.valueEstimated) : extra?.value ?? 0,
      checklist: extra?.checklist ?? [],
      notes: extra?.notes ?? [],
      products: deal ? dealProductsByDealId.get(deal.id) ?? [] : extra?.products ?? [],
      score: deal?.score ?? 0,
    }

    card.score = calculateLeadScore(card)
    return card
  })
}

// Hidrata banco em background após o primeiro render:
// 1) Upsert de deals pra cards que ainda não têm um (inclui migração retroativa
//    dos campos de trabalho que estavam só em localStorage)
// 2) Fetch de checklist e notes por deal/contato
// Aplica tudo via setCards sem bloquear o load inicial.
async function hydrateMissingDealsAndRelations(
  initialCards: CrmCard[],
  existingDeals: DbDealRow[],
  storedExtra: CardsExtraData,
  setCards: React.Dispatch<React.SetStateAction<CrmCard[]>>,
): Promise<void> {
  const needsMigration = !wasCardsExtraMigrated()

  const upsertResults = await Promise.all(
    initialCards.map(async (card) => {
      if (card.dealId) return { cardId: card.id, dealId: card.dealId, wasNew: false }
      try {
        const extra = storedExtra[card.id]
        const deal = await upsertDealInDb({
          chatwootContactId: card.contactId,
          pipelineId: card.pipelineId,
          stageId: card.stageId,
          priority: extra?.priority ?? card.priority,
          valueEstimated:
            extra?.value != null && extra.value > 0
              ? extra.value
              : card.value > 0
                ? card.value
                : null,
          score: card.score,
        })
        return { cardId: card.id, dealId: deal.id, wasNew: true }
      } catch {
        return { cardId: card.id, dealId: null as string | null, wasNew: false }
      }
    }),
  )

  const dealIdByCardId = new Map<string, string>()
  for (const r of upsertResults) {
    if (r.dealId) dealIdByCardId.set(r.cardId, r.dealId)
  }

  // Aplica dealIds
  setCards((prev) =>
    prev.map((c) => {
      const dealId = dealIdByCardId.get(c.id) ?? c.dealId
      return dealId === c.dealId ? c : { ...c, dealId }
    }),
  )

  // Migração retroativa — acontece UMA VEZ por browser. Após o primeiro upsert
  // de cada deal, manda pro banco os products, checklist e notes que estavam
  // em localStorage pra garantir que nada se perca.
  if (needsMigration) {
    await Promise.all(
      initialCards.map(async (card) => {
        const dealId = dealIdByCardId.get(card.id) ?? card.dealId
        const extra = storedExtra[card.id]
        if (!dealId || !extra) return

        if (extra.products && extra.products.length > 0) {
          await setDealProductsInDb(dealId, extra.products).catch(() => {})
        }

        if (extra.checklist && extra.checklist.length > 0) {
          for (let i = 0; i < extra.checklist.length; i += 1) {
            const item = extra.checklist[i]
            await createChecklistItemInDb({
              dealId,
              title: item.title,
              done: item.done,
              dueDate: item.dueDate,
              priority: item.priority,
              assignedTo: item.assignedTo,
              order: i,
            }).catch(() => {})
          }
        }

        if (extra.notes && extra.notes.length > 0) {
          for (const note of extra.notes) {
            await createNoteInDb({
              chatwootContactId: card.contactId,
              dealId,
              text: note.text,
              author: note.author,
              type: note.type,
            }).catch(() => {})
          }
        }
      }),
    )
    markCardsExtraMigrated()
    archiveCardsExtra()
  }

  // Fetch checklist + notes por card em paralelo (banco é fonte da verdade)
  const hydration = await Promise.all(
    initialCards.map(async (card) => {
      const dealId = dealIdByCardId.get(card.id) ?? card.dealId
      const [checklistRows, noteRows] = await Promise.all([
        dealId ? fetchChecklistFromDb(dealId).catch(() => []) : Promise.resolve([]),
        fetchNotesFromDb(card.contactId).catch(() => []),
      ])

      const checklist: CrmChecklistItem[] = checklistRows.map((ci) => ({
        id: ci.id,
        title: ci.title,
        done: ci.done,
        dueDate: ci.dueDate,
        priority: ci.priority,
        assignedTo: ci.assignedTo,
      }))

      const notes: CrmNote[] = noteRows
        .map((n) => ({
          id: n.id,
          text: n.text,
          author: n.author,
          timestamp: n.createdAt,
          type: n.type === 'system' ? ('note' as const) : n.type,
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      return { cardId: card.id, checklist, notes }
    }),
  )

  const byId = new Map(hydration.map((h) => [h.cardId, h]))
  setCards((prev) =>
    prev.map((c) => {
      const hyd = byId.get(c.id)
      if (!hyd) return c
      return { ...c, checklist: hyd.checklist, notes: hyd.notes }
    }),
  )
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
  const [autoAssignmentEnabled, setAutoAssignmentEnabledState] = useState(false)
  const [accessControl, setAccessControlState] = useState<AccessControl>({})
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState<number | null>(null)
  const suppressBroadcastRef = useRef(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Auto-migração de localStorage → banco (1x por browser). Silenciosa em caso
    // de falha — fallback para localStorage segue funcionando.
    await autoMigrateIfNeeded()

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

    const storedAutoAssignment = loadAutoAssignmentEnabled()
    setAutoAssignmentEnabledState(storedAutoAssignment)

    // Access control vem do banco (pipeline_access). Fallback pra localStorage
    // só se API falhar — cenário raro que a UI ainda permite operar.
    try {
      const rows = await fetchPipelineAccessFromDb()
      const accessMap: AccessControl = {}
      for (const r of rows) {
        const current = accessMap[r.pipelineId]
        if (r.chatwootUserId === null) {
          accessMap[r.pipelineId] = { visibleTo: 'all' }
        } else if (!current || current.visibleTo === 'all') {
          accessMap[r.pipelineId] = { visibleTo: [r.chatwootUserId] }
        } else {
          accessMap[r.pipelineId] = {
            visibleTo: [...(current.visibleTo as number[]), r.chatwootUserId],
          }
        }
      }
      setAccessControlState(accessMap)
    } catch {
      setAccessControlState(loadAccessControl())
    }

    // Credenciais podem vir de 3 fontes: (1) localStorage do browser,
    // (2) env vars do servidor (proxy server-side), (3) sessão Chatwoot SSO
    // (token pessoal no cookie). isConfigured() só vê (1). Se não houver (1),
    // consultamos /api/config pra descobrir se o servidor resolve.
    let hasCredentials = isConfigured()
    if (!hasCredentials) {
      try {
        const serverStatus = await fetchServerConfigStatus()
        hasCredentials = serverStatus.serverConfigured
      } catch {
        hasCredentials = false
      }
    }

    if (!hasCredentials) {
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
      const [contactsResult, agentsResult, labelsResult, inboxesResult, dbDeals] = await Promise.all([
        listContacts(1),
        fetchAgents(),
        fetchLabels(),
        fetchInboxes(),
        fetchDealsFromDb().catch(() => [] as DbDealRow[]),
      ])

      // Index deals por (contactId, pipelineId) pra lookup O(1) no build
      const dealsByKey = new Map<string, DbDealRow>()
      for (const d of dbDeals) {
        dealsByKey.set(`${d.chatwootContactId}:${d.pipelineId}`, d)
      }

      // Busca products vinculados em paralelo por deal (só os que existem)
      const dealProductsByDealId = new Map<string, string[]>()
      if (dbDeals.length > 0) {
        const productsPerDeal = await Promise.all(
          dbDeals.map((d) =>
            fetchDealProductsFromDb(d.id)
              .then((ids) => ({ dealId: d.id, ids }))
              .catch(() => ({ dealId: d.id, ids: [] as string[] })),
          ),
        )
        for (const { dealId, ids } of productsPerDeal) {
          dealProductsByDealId.set(dealId, ids)
        }
      }

      const liveCards = await buildLiveCards(
        contactsResult.contacts,
        storedExtra,
        resolvedPipelines,
        dealsByKey,
        dealProductsByDealId,
      )
      setCards(liveCards)
      setAgents(agentsResult)
      setLabels(labelsResult)
      setInboxes(inboxesResult)

      // Upsert deals faltantes em background — cada card precisa de um deal
      // persistido pra suportar escrita de checklist/notes/products.
      // Migra 1x o localStorage antigo pra banco. Hidrata notes/checklist.
      void hydrateMissingDealsAndRelations(liveCards, dbDeals, storedExtra, setCards)
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

  // Aplica regras de auto-atribuição aos novos cards (se toggle ativo).
  // Retorna array de cards com assignedAgent populado quando uma regra ativa casou.
  const applyAutoAssignment = useCallback(
    async (newCards: CrmCard[]): Promise<CrmCard[]> => {
      if (!autoAssignmentEnabled || newCards.length === 0) return newCards

      const results = await Promise.all(
        newCards.map(async (card) => {
          const assigned = await requestAutoAssignment(card.pipelineId, card.contactId)
          if (!assigned) return card
          const fullAgent = agents.find((a) => a.id === assigned.agentId)
          const agentToApply: ChatwootAgent = fullAgent ?? {
            id: assigned.agentId,
            name: assigned.agentName,
            email: '',
            thumbnail: '',
            availability_status: 'offline',
            role: 'agent',
          }
          return { ...card, assignedAgent: agentToApply }
        }),
      )
      return results
    },
    [autoAssignmentEnabled, agents],
  )

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
            const assignedCards = await applyAutoAssignment(result.newCards)
            setCards((prev) => [...prev, ...assignedCards])
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
  }, [autoSyncEnabled, useMockData, pipelines, activePipelineId, cards, applyAutoAssignment])

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
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore || cardBefore.stageId === toStageId) return

      const previousStageId = cardBefore.stageId
      const note: CrmNote = {
        id: `note-${Date.now()}`,
        text: `Movido para etapa: ${toStageId}`,
        author: 'Sistema',
        timestamp: new Date().toISOString(),
        type: 'stage_change',
      }

      // Optimistic update
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card

          const updated = {
            ...card,
            stageId: toStageId,
            notes: [...card.notes, note],
          }
          updated.score = calculateLeadScore(updated)

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

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'card_moved', payload: { cardId, toStageId } })
      }

      fireWebhook({
        event: 'card.moved',
        card: {
          id: cardBefore.id,
          contactId: cardBefore.contactId,
          contactName: cardBefore.contact.name,
          stageId: toStageId,
        },
        from_stage: previousStageId,
        to_stage: toStageId,
        pipeline: cardBefore.pipelineId,
        timestamp: new Date().toISOString(),
      })
      showToast(`${cardBefore.contact.name} movido para nova etapa`, 'success')

      if (useMockData) return

      // Persistência: Chatwoot custom_attribute + deal + note no banco
      updateContactCustomAttributes(cardBefore.contactId, {
        ...cardBefore.contact.custom_attributes,
        crm_stage: toStageId,
      }).catch(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, stageId: previousStageId } : c)),
        )
        showToast('Falha ao salvar movimentação no Chatwoot', 'error')
      })

      if (cardBefore.dealId) {
        void updateDealInDb(cardBefore.dealId, { stageId: toStageId }).catch(() => {
          showToast('Falha ao persistir movimentação no banco', 'error')
        })
        void createNoteInDb({
          chatwootContactId: cardBefore.contactId,
          dealId: cardBefore.dealId,
          text: note.text,
          author: note.author,
          type: 'stage_change',
        }).catch(() => {
          // não critical — nota só não persiste no banco
        })
      }
    },
    [cards, useMockData, automationRules],
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

      if (useMockData) return

      updateContactCustomAttributes(card.contactId, {
        ...card.contact.custom_attributes,
        crm_pipeline: toPipelineId,
        crm_stage: targetStageId,
      }).catch(() => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== cardId) return c
            return { ...c, pipelineId: fromPipelineId, stageId: card.stageId }
          }),
        )
      })

      // Mudar de pipeline = deal do pipeline antigo fica inativo, upsert no novo.
      // Mantemos o dealId antigo no card porque é fonte da verdade pra checklist/notes,
      // mas atualizamos stageId no banco. Se não existir deal no novo pipeline,
      // será criado no próximo loadData pelo hydrate.
      if (card.dealId) {
        void updateDealInDb(card.dealId, {
          pipelineId: toPipelineId,
          stageId: targetStageId,
        }).catch(() => {})
        void createNoteInDb({
          chatwootContactId: card.contactId,
          dealId: card.dealId,
          text: note.text,
          author: note.author,
          type: 'stage_change',
        }).catch(() => {})
      }
    },
    [cards, pipelines, useMockData],
  )

  const updateCardLabels = useCallback(
    (cardId: string, newLabels: string[]) => {
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore) return

      // Optimistic update
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const updated = { ...card, labels: newLabels }
          updated.score = calculateLeadScore(updated)
          return updated
        }),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'labels_changed', payload: { cardId, labels: newLabels } })
      }

      if (useMockData) return

      // Labels persistem no Chatwoot (labels do contato).
      apiUpdateContactLabels(cardBefore.contactId, newLabels).catch(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, labels: cardBefore.labels } : c)),
        )
        showToast('Falha ao salvar labels no Chatwoot', 'error')
      })

      showToast('Labels atualizadas', 'success')
    },
    [cards, useMockData],
  )

  const updateCardChecklist = useCallback(
    (cardId: string, checklist: CrmChecklistItem[]) => {
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore) return

      const previousItems = cardBefore.checklist
      const previousById = new Map(previousItems.map((i) => [i.id, i]))

      // Optimistic update + automação
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const updated = { ...card, checklist }
          updated.score = calculateLeadScore(updated)
          if (checklist.length > 0 && checklist.every((item) => item.done)) {
            const result = evaluateAutomations(automationRules, { card: updated })
            if (result?.newStageId) updated.stageId = result.newStageId
          }
          return updated
        }),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'checklist_updated', payload: { cardId, checklist } })
      }

      if (useMockData || !cardBefore.dealId) return
      const dealId = cardBefore.dealId

      // Diff → create/update/delete no banco
      const nextIds = new Set(checklist.map((i) => i.id))

      // Deletar removidos
      const toDelete = previousItems.filter((i) => !nextIds.has(i.id))
      for (const item of toDelete) {
        void deleteChecklistItemInDb(item.id).catch(() => {})
      }

      // Criar/atualizar
      for (let idx = 0; idx < checklist.length; idx += 1) {
        const item = checklist[idx]
        const prev = previousById.get(item.id)
        if (!prev) {
          void createChecklistItemInDb({
            dealId,
            title: item.title,
            done: item.done,
            dueDate: item.dueDate,
            priority: item.priority,
            assignedTo: item.assignedTo,
            order: idx,
          })
            .then((saved) => {
              // Substitui id local pelo id real do banco
              setCards((prev2) =>
                prev2.map((c) => {
                  if (c.id !== cardId) return c
                  return {
                    ...c,
                    checklist: c.checklist.map((ci) =>
                      ci.id === item.id ? { ...ci, id: saved.id } : ci,
                    ),
                  }
                }),
              )
            })
            .catch(() => {})
        } else if (
          prev.title !== item.title ||
          prev.done !== item.done ||
          prev.dueDate !== item.dueDate ||
          prev.priority !== item.priority ||
          prev.assignedTo !== item.assignedTo
        ) {
          void updateChecklistItemInDb(item.id, {
            title: item.title,
            done: item.done,
            dueDate: item.dueDate,
            priority: item.priority,
            assignedTo: item.assignedTo,
            order: idx,
          }).catch(() => {})
        }
      }
    },
    [cards, automationRules, useMockData],
  )

  const addCardNote = useCallback(
    (cardId: string, note: CrmNote) => {
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore) return

      // Optimistic
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          return { ...card, notes: [...card.notes, note] }
        }),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'note_added', payload: { cardId, note } })
      }

      if (useMockData) return

      void createNoteInDb({
        chatwootContactId: cardBefore.contactId,
        dealId: cardBefore.dealId,
        text: note.text,
        author: note.author,
        type: note.type === 'stage_change' || note.type === 'agent_change' ? note.type : 'note',
      })
        .then((saved) => {
          // Substitui id local pelo id real
          setCards((prev) =>
            prev.map((c) => {
              if (c.id !== cardId) return c
              return {
                ...c,
                notes: c.notes.map((n) => (n.id === note.id ? { ...n, id: saved.id } : n)),
              }
            }),
          )
        })
        .catch(() => {
          setCards((prev) =>
            prev.map((c) => {
              if (c.id !== cardId) return c
              return { ...c, notes: c.notes.filter((n) => n.id !== note.id) }
            }),
          )
          showToast('Falha ao salvar nota', 'error')
        })
    },
    [cards, useMockData],
  )

  const updateCardProducts = useCallback(
    (cardId: string, productIds: string[]) => {
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore) return

      const productsTotal = productIds.reduce((sum, id) => {
        const product = products.find((p) => p.id === id)
        return sum + (product?.price ?? 0)
      }, 0)

      const previousProducts = cardBefore.products
      const previousValue = cardBefore.value

      // Optimistic
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== cardId) return card
          const updated = { ...card, products: productIds, value: productsTotal }
          updated.score = calculateLeadScore(updated)
          return updated
        }),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'products_changed', payload: { cardId, productIds } })
      }

      if (useMockData || !cardBefore.dealId) return
      const dealId = cardBefore.dealId

      // Persiste em paralelo: vinculação de produtos + value recalculado
      Promise.all([
        setDealProductsInDb(dealId, productIds),
        updateDealInDb(dealId, {
          valueEstimated: productsTotal > 0 ? productsTotal : null,
        }),
      ]).catch(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId ? { ...c, products: previousProducts, value: previousValue } : c,
          ),
        )
        showToast('Falha ao salvar produtos do lead', 'error')
      })
    },
    [cards, products, useMockData],
  )

  const updateCardPriority = useCallback(
    (cardId: string, priority: CrmCard['priority']) => {
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore) return

      const previousPriority = cardBefore.priority
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, priority } : card)),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'priority_changed', payload: { cardId, priority } })
      }

      if (useMockData || !cardBefore.dealId) return
      void updateDealInDb(cardBefore.dealId, { priority }).catch(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, priority: previousPriority } : c)),
        )
        showToast('Falha ao salvar prioridade', 'error')
      })
    },
    [cards, useMockData],
  )

  const updateCardValue = useCallback(
    (cardId: string, value: number) => {
      const cardBefore = cards.find((c) => c.id === cardId)
      if (!cardBefore) return

      const previousValue = cardBefore.value
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? { ...card, value } : card)),
      )

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'value_changed', payload: { cardId, value } })
      }

      if (useMockData || !cardBefore.dealId) return
      void updateDealInDb(cardBefore.dealId, {
        valueEstimated: value > 0 ? value : null,
      }).catch(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, value: previousValue } : c)),
        )
        showToast('Falha ao salvar valor', 'error')
      })
    },
    [cards, useMockData],
  )

  const addCard = useCallback(
    (card: CrmCard) => {
      setCards((prev) => [...prev, card])

      if (!suppressBroadcastRef.current) {
        broadcastEvent({ type: 'card_added', payload: { card } })
      }

      if (!useMockData) {
        // Criar contato no Chatwoot e upsert deal no banco em paralelo.
        void apiCreateContact({
          name: card.contact.name,
          email: card.contact.email ?? undefined,
          phone_number: card.contact.phone_number ?? undefined,
        }).catch(() => {})

        void upsertDealInDb({
          chatwootContactId: card.contactId,
          pipelineId: card.pipelineId,
          stageId: card.stageId,
          priority: card.priority,
          valueEstimated: card.value > 0 ? card.value : null,
          score: card.score,
        })
          .then((deal) => {
            setCards((prev) =>
              prev.map((c) => (c.id === card.id ? { ...c, dealId: deal.id } : c)),
            )
          })
          .catch(() => {
            showToast('Falha ao persistir deal — dados podem não sincronizar', 'error')
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
      const previous = accessControl
      const next = { ...accessControl, [pipelineId]: { visibleTo } }
      setAccessControlState(next)

      if (useMockData) return

      // Reconcilia com o banco: apaga regras atuais do pipeline e reinsere conforme visibleTo.
      void (async () => {
        try {
          const prevVisible = previous[pipelineId]?.visibleTo ?? 'all'

          // Remove as regras anteriores que não estão na nova config
          if (prevVisible === 'all') {
            await revokePipelineAccessInDb(pipelineId, null)
          } else {
            await Promise.all(
              prevVisible.map((userId) => revokePipelineAccessInDb(pipelineId, userId)),
            )
          }

          // Adiciona novas regras
          if (visibleTo === 'all') {
            await grantPipelineAccessInDb(pipelineId, null)
          } else {
            await Promise.all(
              visibleTo.map((userId) => grantPipelineAccessInDb(pipelineId, userId)),
            )
          }
        } catch {
          setAccessControlState(previous)
          showToast('Falha ao salvar controle de acesso', 'error')
        }
      })()
    },
    [accessControl, useMockData],
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
        const assignedCards = await applyAutoAssignment(result.newCards)
        setCards((prev) => [...prev, ...assignedCards])
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
  }, [useMockData, pipelines, activePipelineId, cards, applyAutoAssignment])

  const hydrateCardConversations = useCallback(async (cardId: string): Promise<ChatwootConversation[]> => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return []
    if (card.conversations.length > 0) return card.conversations
    if (useMockData) return []

    try {
      const conversations = await listContactConversations(card.contactId)
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, conversations } : c)),
      )
      return conversations
    } catch {
      return []
    }
  }, [cards, useMockData])

  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setAutoSyncEnabledState(enabled)
    saveAutoSyncEnabled(enabled)
    showToast(
      enabled ? 'Auto-sync ativado' : 'Auto-sync pausado',
      enabled ? 'success' : 'info',
    )
  }, [])

  const setAutoAssignmentEnabled = useCallback((enabled: boolean) => {
    setAutoAssignmentEnabledState(enabled)
    saveAutoAssignmentEnabled(enabled)
    showToast(
      enabled ? 'Auto-atribuição ativada' : 'Auto-atribuição desativada',
      'info',
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
      autoAssignmentEnabled,
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
      setAutoAssignmentEnabled,
      setAccessControl: setAccessControlFn,
      syncConversations,
      hydrateCardConversations,
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
      autoAssignmentEnabled,
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
      setAutoAssignmentEnabled,
      setAccessControlFn,
      syncConversations,
      hydrateCardConversations,
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
