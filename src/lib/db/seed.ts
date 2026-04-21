import './load-env'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  tenants,
  pipelines,
  stages,
  customFieldDefinitions,
} from './schema'

const TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'cirurgiao'

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não configurada')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client)

  console.log(`Seeding tenant: ${TENANT_ID}`)

  await db
    .insert(tenants)
    .values({
      id: TENANT_ID,
      name: 'Cirurgião Apple',
      chatwootUrl: process.env.CHATWOOT_URL ?? 'https://chat.cirurgiaoitech.tech',
      chatwootAccountId: process.env.CHATWOOT_ACCOUNT_ID ?? '3',
      chatwootTokenEncrypted: process.env.CHATWOOT_API_TOKEN ?? '',
      plan: 'enterprise',
    })
    .onConflictDoNothing({ target: tenants.id })

  const pipelineId = `${TENANT_ID}-vendas`

  await db
    .insert(pipelines)
    .values({
      id: pipelineId,
      tenantId: TENANT_ID,
      name: 'Vendas',
      isDefault: true,
      order: 0,
    })
    .onConflictDoNothing({ target: pipelines.id })

  const stageDefs: Array<{
    id: string
    name: string
    color: string
    order: number
    type: 'entry' | 'middle' | 'won' | 'lost'
  }> = [
    { id: `${pipelineId}-entrada`, name: 'Entrada', color: '#94a3b8', order: 0, type: 'entry' },
    { id: `${pipelineId}-qualificacao`, name: 'Qualificação', color: '#60a5fa', order: 1, type: 'middle' },
    { id: `${pipelineId}-aguardando-peca`, name: 'Aguardando Peça', color: '#fbbf24', order: 2, type: 'middle' },
    { id: `${pipelineId}-em-atendimento`, name: 'Em Atendimento', color: '#a78bfa', order: 3, type: 'middle' },
    { id: `${pipelineId}-orcamento-enviado`, name: 'Orçamento Enviado', color: '#f97316', order: 4, type: 'middle' },
    { id: `${pipelineId}-negociacao`, name: 'Negociação', color: '#ec4899', order: 5, type: 'middle' },
    { id: `${pipelineId}-fechado`, name: 'Fechado', color: '#22c55e', order: 6, type: 'won' },
    { id: `${pipelineId}-perdido`, name: 'Perdido', color: '#ef4444', order: 7, type: 'lost' },
  ]

  for (const stage of stageDefs) {
    await db
      .insert(stages)
      .values({
        id: stage.id,
        tenantId: TENANT_ID,
        pipelineId,
        name: stage.name,
        color: stage.color,
        order: stage.order,
        type: stage.type,
      })
      .onConflictDoNothing({ target: stages.id })
  }

  const customFields: Array<{
    id: string
    key: string
    name: string
    type:
      | 'text'
      | 'textarea'
      | 'number'
      | 'currency'
      | 'select'
      | 'multiselect'
      | 'date'
      | 'checkbox'
      | 'phone'
      | 'email'
      | 'url'
    appliesTo: 'contact' | 'deal'
    options: { label: string; value: string }[] | null
    isRequired: boolean
    order: number
  }> = [
    {
      id: `${TENANT_ID}-cf-dispositivo`,
      key: 'dispositivo',
      name: 'Dispositivo',
      type: 'select',
      appliesTo: 'deal',
      options: [
        { label: 'iPhone', value: 'iphone' },
        { label: 'MacBook', value: 'macbook' },
        { label: 'iPad', value: 'ipad' },
        { label: 'Apple Watch', value: 'apple_watch' },
        { label: 'iMac', value: 'imac' },
        { label: 'Outro', value: 'outro' },
      ],
      isRequired: false,
      order: 0,
    },
    {
      id: `${TENANT_ID}-cf-problema`,
      key: 'problema',
      name: 'Problema',
      type: 'textarea',
      appliesTo: 'deal',
      options: null,
      isRequired: false,
      order: 1,
    },
    {
      id: `${TENANT_ID}-cf-classificacao`,
      key: 'classificacao',
      name: 'Classificação',
      type: 'select',
      appliesTo: 'deal',
      options: [
        { label: 'Orçamento', value: 'orcamento' },
        { label: 'Serviço', value: 'servico' },
        { label: 'Dúvida', value: 'duvida' },
        { label: 'Garantia', value: 'garantia' },
        { label: 'Não-Apple', value: 'nao_apple' },
      ],
      isRequired: false,
      order: 2,
    },
    {
      id: `${TENANT_ID}-cf-origem`,
      key: 'origem',
      name: 'Origem',
      type: 'select',
      appliesTo: 'deal',
      options: [
        { label: 'WhatsApp Ads', value: 'whatsapp_ads' },
        { label: 'Google', value: 'google' },
        { label: 'Indicação', value: 'indicacao' },
        { label: 'Orgânico', value: 'organico' },
        { label: 'Rebuy', value: 'rebuy' },
      ],
      isRequired: false,
      order: 3,
    },
    {
      id: `${TENANT_ID}-cf-prioridade`,
      key: 'prioridade_lead',
      name: 'Prioridade',
      type: 'select',
      appliesTo: 'deal',
      options: [
        { label: 'Quente', value: 'quente' },
        { label: 'Morno', value: 'morno' },
        { label: 'Frio', value: 'frio' },
      ],
      isRequired: false,
      order: 4,
    },
  ]

  for (const field of customFields) {
    await db
      .insert(customFieldDefinitions)
      .values({
        id: field.id,
        tenantId: TENANT_ID,
        key: field.key,
        name: field.name,
        type: field.type,
        appliesTo: field.appliesTo,
        options: field.options,
        isRequired: field.isRequired,
        order: field.order,
      })
      .onConflictDoNothing({ target: customFieldDefinitions.id })
  }

  console.log(`Seed OK. Tenant "${TENANT_ID}" com ${stageDefs.length} stages e ${customFields.length} custom fields.`)

  await client.end()
}

main().catch((error: unknown) => {
  console.error('Seed falhou:', error)
  process.exit(1)
})
