'use client'

import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { KanbanBoard } from '@/components/kanban/board'
import { PipelineSelector } from '@/components/pipeline/pipeline-selector'
import { PipelineSettings } from '@/components/pipeline/pipeline-settings'
import { PipelineStats } from '@/components/kanban/pipeline-stats'
import { FilterBar } from '@/components/filters/filter-bar'
import { ToastContainer } from '@/components/ui/toast-container'
import { Button } from '@/components/ui/button'
import { Settings, RefreshCw, Kanban, BarChart3, RefreshCcw, Sun, Moon, Package, Info, X } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isEmbedded } from '@/lib/dashboard-app'

function RealtimeIndicator() {
  const { isRealtimeConnected, lastRealtimeEventAt } = usePipelineStore()
  const [isPulsing, setIsPulsing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (lastRealtimeEventAt === null) return
    setIsPulsing(true)
    const timer = setTimeout(() => setIsPulsing(false), 1500)
    return () => clearTimeout(timer)
  }, [lastRealtimeEventAt])

  if (!mounted) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all duration-300 ${
        isRealtimeConnected
          ? isPulsing
            ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'
      }`}
      title={isRealtimeConnected ? 'Sincronização em tempo real ativa entre abas' : 'Sincronização em tempo real inativa'}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${
          isRealtimeConnected
            ? isPulsing
              ? 'animate-ping bg-emerald-400'
              : 'bg-emerald-400'
            : 'bg-zinc-400'
        }`}
      />
      {isRealtimeConnected ? 'Ao vivo' : 'Offline'}
    </span>
  )
}

function AutoSyncIndicator() {
  const { autoSyncEnabled, setAutoSyncEnabled, useMockData } = usePipelineStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (useMockData) return null

  const active = autoSyncEnabled

  return (
    <button
      type="button"
      onClick={() => setAutoSyncEnabled(!active)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all duration-200 ${
        active
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
          : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 dark:text-zinc-400'
      }`}
      title={
        active
          ? 'Auto-sync ativo — novos leads do Chatwoot aparecem automaticamente. Clique para pausar.'
          : 'Auto-sync pausado — clique para ativar a sincronização automática de novos leads.'
      }
    >
      <span
        className={`inline-block size-1.5 rounded-full ${
          active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-zinc-400'
        }`}
      />
      {active ? 'Auto-sync ativo' : 'Auto-sync pausado'}
    </button>
  )
}

function EmbedBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const embedded = isEmbedded()
    const onEmbedRoute = window.location.pathname.startsWith('/embed')
    if (embedded && !onEmbedRoute) setShow(true)
  }, [])

  if (!show || dismissed) return null

  return (
    <div className="flex items-start gap-2 border-b border-[#1F93FF]/30 bg-[#1F93FF]/10 px-4 py-2 text-xs text-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-[#1F93FF]" />
      <p className="flex-1">
        Você está vendo o board completo dentro do Chatwoot. Para uma visão focada no contato da conversação, configure o Dashboard App para apontar para <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/embed</code>.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Fechar aviso"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function GlobalKeyboardShortcuts() {
  const { filteredCards, chatwootUrl, chatwootAccountId, useMockData } = usePipelineStore()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey
      if (!isMeta || e.key.toLowerCase() !== 'k') return

      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

      e.preventDefault()

      if (!chatwootUrl || !chatwootAccountId || useMockData) return

      // Tenta card com foco (via data-card-id)
      const focused = document.activeElement as HTMLElement | null
      const focusedCardId = focused?.closest('[data-card-id]')?.getAttribute('data-card-id')
      let target = focusedCardId ? filteredCards.find((c) => c.id === focusedCardId) : null
      if (!target) target = filteredCards[0] ?? null
      if (!target) return

      const convId = target.conversations[0]?.id
      const url = convId
        ? `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${convId}`
        : `${chatwootUrl}/app/accounts/${chatwootAccountId}/contacts/${target.contactId}`

      if (isEmbedded()) {
        try {
          window.parent.location.href = url
          return
        } catch {
          window.parent.postMessage({ event: 'navigate', url }, '*')
          return
        }
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCards, chatwootUrl, chatwootAccountId, useMockData])

  return null
}

function CrmApp() {
  const { useMockData, refreshData, isLoading, isSyncing, syncConversations } = usePipelineStore()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <GlobalKeyboardShortcuts />
      <EmbedBanner />
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#1F93FF]/10">
              <Kanban className="size-4.5 text-[#1F93FF]" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">CRM Kanban</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Chatwoot</p>
            </div>
          </div>
          <RealtimeIndicator />
          <AutoSyncIndicator />
          {useMockData && (
            <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-medium text-yellow-400">
              Dados de demonstração
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncConversations()}
            disabled={isSyncing || isLoading}
          >
            <RefreshCcw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} data-icon="inline-start" />
            Sincronizar
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </Button>
          <Link href="/relatorios">
            <Button variant="ghost" size="sm">
              <BarChart3 className="size-3.5" data-icon="inline-start" />
              Relatórios
            </Button>
          </Link>
          <Link href="/produtos">
            <Button variant="ghost" size="sm">
              <Package className="size-3.5" data-icon="inline-start" />
              Produtos
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => refreshData()}
            disabled={isLoading}
            title="Atualizar dados"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon-sm" title="Configurações">
              <Settings className="size-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Pipeline selector + settings */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2">
        <PipelineSelector />
        <PipelineSettings />
      </div>

      {/* Pipeline stats */}
      <PipelineStats />

      {/* Filters */}
      <FilterBar />

      {/* Kanban board */}
      <div className="flex flex-1 overflow-hidden">
        <KanbanBoard />
      </div>

      <ToastContainer />
    </div>
  )
}

export default function Home() {
  return (
    <PipelineProvider>
      <CrmApp />
    </PipelineProvider>
  )
}
