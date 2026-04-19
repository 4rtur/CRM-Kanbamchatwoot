'use client'

import { PipelineProvider, usePipelineStore } from '@/lib/store/pipeline-store'
import { KanbanBoard } from '@/components/kanban/board'
import { PipelineSelector } from '@/components/pipeline/pipeline-selector'
import { PipelineSettings } from '@/components/pipeline/pipeline-settings'
import { PipelineStats } from '@/components/kanban/pipeline-stats'
import { FilterBar } from '@/components/filters/filter-bar'
import { ToastContainer } from '@/components/ui/toast-container'
import { Button } from '@/components/ui/button'
import { Settings, RefreshCw, Kanban, BarChart3, RefreshCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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

function CrmApp() {
  const { useMockData, refreshData, isLoading, isSyncing, syncConversations } = usePipelineStore()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
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
          <Link href="/relatorios">
            <Button variant="ghost" size="sm">
              <BarChart3 className="size-3.5" data-icon="inline-start" />
              Relatórios
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
