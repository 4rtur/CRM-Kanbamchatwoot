'use client'

import { useState } from 'react'
import { archiveLocalStorage, migrateFromLocalStorage } from '@/lib/crm/migrate-localstorage'

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [report, setReport] = useState<Record<string, number> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleMigrate(): Promise<void> {
    setStatus('running')
    setErrorMessage(null)
    setReport(null)
    try {
      const result = await migrateFromLocalStorage()
      setReport(result.report)
      setStatus('done')
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  function handleArchive(): void {
    archiveLocalStorage()
    alert('localStorage arquivado. Chaves originais removidas, backups mantidos com sufixo __archived_*.')
  }

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Migrar dados do localStorage</h1>
        <p className="text-muted-foreground text-sm">
          Essa página lê os dados guardados hoje no browser e manda pro banco Postgres.
          Rode uma única vez. Depois, arquive o localStorage pra evitar conflitos.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleMigrate}
          disabled={status === 'running'}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium disabled:opacity-50"
        >
          {status === 'running' ? 'Migrando...' : '1) Migrar localStorage → banco'}
        </button>

        <button
          type="button"
          onClick={handleArchive}
          disabled={status !== 'done'}
          className="rounded-md border border-border px-4 py-2 font-medium disabled:opacity-50"
        >
          2) Arquivar localStorage (só depois de confirmar que migração deu certo)
        </button>
      </div>

      {status === 'done' && report ? (
        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
          <h2 className="font-semibold">Migração concluída</h2>
          <ul className="text-sm space-y-1">
            {Object.entries(report).map(([key, value]) => (
              <li key={key}>
                <span className="font-medium">{key}:</span> {value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {status === 'error' && errorMessage ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
