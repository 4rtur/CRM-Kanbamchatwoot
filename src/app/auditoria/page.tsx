'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/lib/auth/use-user'
import { hasPermission, PERMISSION_DENIED_MESSAGE } from '@/lib/auth/permissions'

interface AuditEntry {
  id: string
  tenantId: string
  agentId: number | null
  agentName: string
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { hour12: false })
  } catch {
    return iso
  }
}

function toCsv(entries: AuditEntry[]): string {
  const header = ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'ID Entidade', 'Detalhes']
  const rows = entries.map((e) => [
    formatDateTime(e.createdAt),
    e.agentName,
    e.action,
    e.entityType,
    e.entityId,
    JSON.stringify(e.details ?? {}),
  ])
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export default function AuditoriaPage() {
  const { user, loading } = useUser()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentFilter, setAgentFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const canView = hasPermission(user, 'audit:view')

  useEffect(() => {
    if (!canView) return
    const params = new URLSearchParams()
    if (agentFilter) params.set('agent', agentFilter)
    if (actionFilter) params.set('action', actionFilter)
    if (fromDate) params.set('from', new Date(fromDate).toISOString())
    if (toDate) params.set('to', new Date(toDate).toISOString())
    params.set('limit', '100')

    setFetching(true)
    setError(null)
    fetch(`/api/audit?${params.toString()}`)
      .then(async (r) => {
        const data = (await r.json()) as { success: boolean; data?: AuditEntry[]; error?: string }
        if (!r.ok || !data.success) {
          throw new Error(data.error ?? 'Falha ao carregar auditoria')
        }
        setEntries(data.data ?? [])
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      })
      .finally(() => setFetching(false))
  }, [canView, agentFilter, actionFilter, fromDate, toDate])

  const csvData = useMemo(() => toCsv(entries), [entries])

  function handleExport() {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-2 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <p className="text-sm">{PERMISSION_DENIED_MESSAGE}</p>
          <Link href="/" className="text-xs text-[#1F93FF] hover:underline">
            Voltar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon-sm">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-muted-foreground" />
                <h1 className="text-lg font-bold">Auditoria</h1>
              </div>
              <span className="text-xs text-muted-foreground">
                {entries.length} registro{entries.length !== 1 ? 's' : ''}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={entries.length === 0}>
              <Download className="size-3.5" data-icon="inline-start" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input
            placeholder="Filtrar por usuário"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          />
          <Input
            placeholder="Filtrar por ação"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
          <Input
            type="datetime-local"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="De"
          />
          <Input
            type="datetime-local"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="Até"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Data/Hora</th>
                <th className="px-3 py-2 text-left font-medium">Usuário</th>
                <th className="px-3 py-2 text-left font-medium">Ação</th>
                <th className="px-3 py-2 text-left font-medium">Entidade</th>
                <th className="px-3 py-2 text-left font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{formatDateTime(e.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{e.agentName}</td>
                    <td className="px-3 py-2 text-xs">
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{e.action}</code>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {e.entityType} <span className="text-muted-foreground">#{e.entityId}</span>
                    </td>
                    <td className="max-w-md px-3 py-2 text-[11px] text-muted-foreground">
                      <code className="line-clamp-1 break-all">{JSON.stringify(e.details ?? {})}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
