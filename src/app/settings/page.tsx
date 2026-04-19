'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Kanban, Webhook, ToggleLeft, ToggleRight } from 'lucide-react'
import { getChatwootConfig, saveChatwootConfig } from '@/lib/config'
import {
  getWebhookUrl,
  setWebhookUrl,
  isWebhookEnabled,
  setWebhookEnabled,
} from '@/lib/webhooks'
import Link from 'next/link'

export default function SettingsPage() {
  const [url, setUrl] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [accountId, setAccountId] = useState('')
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState('')

  const [webhookUrl, setWebhookUrlState] = useState('')
  const [webhookEnabled, setWebhookEnabledState] = useState(false)
  const [webhookSaved, setWebhookSaved] = useState(false)

  useEffect(() => {
    const config = getChatwootConfig()
    setUrl(config.url)
    setApiToken(config.apiToken)
    setAccountId(config.accountId)
    setWebhookUrlState(getWebhookUrl())
    setWebhookEnabledState(isWebhookEnabled())
  }, [])

  function handleSave() {
    saveChatwootConfig({ url, apiToken, accountId })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleSaveWebhook() {
    setWebhookUrl(webhookUrl)
    setWebhookEnabled(webhookEnabled)
    setWebhookSaved(true)
    setTimeout(() => setWebhookSaved(false), 3000)
  }

  async function handleTest() {
    if (!url || !apiToken || !accountId) {
      setTestResult('error')
      setTestError('Preencha todos os campos antes de testar.')
      return
    }

    setTestResult('loading')
    setTestError('')

    try {
      const response = await fetch('/api/chatwoot/agents', {
        headers: {
          'Content-Type': 'application/json',
          'x-chatwoot-url': url,
          'x-chatwoot-token': apiToken,
          'x-chatwoot-account-id': accountId,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      setTestResult('success')
    } catch (err) {
      setTestResult('error')
      setTestError(err instanceof Error ? err.message : 'Erro ao conectar')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Kanban className="size-5 text-[#1F93FF]" />
          <h1 className="text-base font-semibold">Configurações</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-4 py-8">
        {/* Chatwoot Connection */}
        <section>
          <h2 className="text-lg font-semibold">Conexão com Chatwoot</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure a URL, token de API e ID da conta para conectar ao seu Chatwoot.
            Os dados são salvos localmente no navegador.
          </p>
        </section>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL do Chatwoot</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://app.chatwoot.com"
              type="url"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Exemplo: https://app.chatwoot.com ou sua instância self-hosted
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Token de API</label>
            <Input
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="seu-api-token"
              type="password"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Encontre em Configurações {'>'} Conta {'>'} Token de Acesso
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">ID da Conta</label>
            <Input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="1"
              type="text"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Número da conta visível na URL do Chatwoot
            </p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>
            <Save className="size-3.5" data-icon="inline-start" />
            Salvar
          </Button>
          <Button variant="outline" onClick={handleTest}>
            Testar conexão
          </Button>

          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="size-3.5" />
              Salvo
            </span>
          )}
        </div>

        {/* Test result */}
        {testResult === 'loading' && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Testando conexão...
          </div>
        )}
        {testResult === 'success' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
            <CheckCircle2 className="size-4" />
            Conexão bem sucedida! Retorne ao CRM para ver os dados.
          </div>
        )}
        {testResult === 'error' && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Falha na conexão</p>
              <p className="text-xs">{testError}</p>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Webhook Configuration */}
        <section>
          <div className="flex items-center gap-2">
            <Webhook className="size-5 text-[#1F93FF]" />
            <h2 className="text-lg font-semibold">Webhooks</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Receba notificações quando cards se moverem entre etapas.
            Um POST será enviado para a URL configurada.
          </p>
        </section>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = !webhookEnabled
                setWebhookEnabledState(next)
              }}
              className="shrink-0"
            >
              {webhookEnabled ? (
                <ToggleRight className="size-6 text-green-400" />
              ) : (
                <ToggleLeft className="size-6 text-muted-foreground" />
              )}
            </button>
            <span className="text-sm">
              {webhookEnabled ? 'Webhook ativo' : 'Webhook desativado'}
            </span>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">URL do Webhook</label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrlState(e.target.value)}
              placeholder="https://seu-servidor.com/webhook"
              type="url"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Payload: {`{ event, card, from_stage, to_stage, pipeline, timestamp }`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveWebhook}>
              <Save className="size-3.5" data-icon="inline-start" />
              Salvar Webhook
            </Button>
            {webhookSaved && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="size-3.5" />
                Salvo
              </span>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Environment variables */}
        <section>
          <h3 className="text-sm font-semibold">Variáveis de ambiente (alternativa)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Você também pode configurar via variáveis de ambiente no servidor:
          </p>
          <div className="mt-3 space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-xs">
            <p>NEXT_PUBLIC_CHATWOOT_URL=https://app.chatwoot.com</p>
            <p>NEXT_PUBLIC_CHATWOOT_API_TOKEN=seu-token</p>
            <p>NEXT_PUBLIC_CHATWOOT_ACCOUNT_ID=1</p>
          </div>
        </section>
      </div>
    </div>
  )
}
