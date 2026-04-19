import type {
  ChatwootContact,
  ChatwootConversation,
  ChatwootMessage,
  ChatwootAgent,
  ChatwootLabel,
  ChatwootInbox,
  CrmPipeline,
  CrmProduct,
  CrmPriority,
} from './types'

export const MOCK_AGENTS: ChatwootAgent[] = [
  {
    id: 1,
    name: 'Ana Silva',
    email: 'ana@empresa.com',
    thumbnail: '',
    availability_status: 'online',
    role: 'administrator',
  },
  {
    id: 2,
    name: 'Carlos Oliveira',
    email: 'carlos@empresa.com',
    thumbnail: '',
    availability_status: 'online',
    role: 'agent',
  },
  {
    id: 3,
    name: 'Mariana Santos',
    email: 'mariana@empresa.com',
    thumbnail: '',
    availability_status: 'busy',
    role: 'agent',
  },
  {
    id: 4,
    name: 'Pedro Costa',
    email: 'pedro@empresa.com',
    thumbnail: '',
    availability_status: 'offline',
    role: 'agent',
  },
]

export const MOCK_LABELS: ChatwootLabel[] = [
  { id: 1, title: 'vip', description: 'Cliente VIP', color: '#FFD700', show_on_sidebar: true },
  { id: 2, title: 'urgente', description: 'Atendimento urgente', color: '#EF4444', show_on_sidebar: true },
  { id: 3, title: 'novo', description: 'Novo lead', color: '#22C55E', show_on_sidebar: true },
  { id: 4, title: 'recorrente', description: 'Cliente recorrente', color: '#3B82F6', show_on_sidebar: true },
  { id: 5, title: 'enterprise', description: 'Conta enterprise', color: '#8B5CF6', show_on_sidebar: true },
]

export const MOCK_INBOXES: ChatwootInbox[] = [
  { id: 1, name: 'WhatsApp Business', channel_type: 'Channel::Whatsapp', avatar_url: '' },
  { id: 2, name: 'Website Chat', channel_type: 'Channel::WebWidget', avatar_url: '' },
  { id: 3, name: 'Email Suporte', channel_type: 'Channel::Email', avatar_url: '' },
  { id: 4, name: 'Instagram', channel_type: 'Channel::Instagram', avatar_url: '' },
]

export const MOCK_PRODUCTS: CrmProduct[] = [
  {
    id: 'prod-1',
    name: 'Troca de Tela iPhone',
    price: 450,
    category: 'Reparo iPhone',
    description: 'Substituição completa da tela com peças originais',
  },
  {
    id: 'prod-2',
    name: 'Troca de Bateria iPhone',
    price: 250,
    category: 'Reparo iPhone',
    description: 'Troca de bateria com peça original Apple',
  },
  {
    id: 'prod-3',
    name: 'Troca de Bateria MacBook',
    price: 890,
    category: 'Reparo MacBook',
    description: 'Substituição da bateria do MacBook Pro/Air',
  },
  {
    id: 'prod-4',
    name: 'Recuperação de Dados',
    price: 1200,
    category: 'Serviços',
    description: 'Recuperação de dados de HD/SSD danificado',
  },
  {
    id: 'prod-5',
    name: 'Reparo Placa Mãe MacBook',
    price: 2500,
    category: 'Reparo MacBook',
    description: 'Reparo de componentes na placa lógica',
  },
  {
    id: 'prod-6',
    name: 'Troca de Tela MacBook',
    price: 3200,
    category: 'Reparo MacBook',
    description: 'Substituição do display Retina completo',
  },
  {
    id: 'prod-7',
    name: 'Limpeza Interna Mac',
    price: 180,
    category: 'Manutenção',
    description: 'Limpeza interna e troca de pasta térmica',
  },
  {
    id: 'prod-8',
    name: 'Upgrade SSD MacBook',
    price: 650,
    category: 'Upgrade',
    description: 'Upgrade de armazenamento SSD NVMe',
  },
  {
    id: 'prod-9',
    name: 'Reparo Conector de Carga',
    price: 350,
    category: 'Reparo iPhone',
    description: 'Troca do conector Lightning/USB-C',
  },
  {
    id: 'prod-10',
    name: 'Blindagem Cerâmica',
    price: 150,
    category: 'Acessórios',
    description: 'Aplicação de película cerâmica premium',
  },
]

const now = Date.now() / 1000

export const MOCK_CONTACTS: ChatwootContact[] = [
  {
    id: 1,
    name: 'Roberto Mendes',
    email: 'roberto@techcorp.com',
    phone_number: '+5511999001122',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'qualificacao' },
    created_at: '2024-01-15T10:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    availability_status: 'online',
  },
  {
    id: 2,
    name: 'Fernanda Lima',
    email: 'fernanda@startupx.io',
    phone_number: '+5521988776655',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'proposta' },
    created_at: '2024-02-01T14:30:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    availability_status: 'offline',
  },
  {
    id: 3,
    name: 'Lucas Andrade',
    email: 'lucas@megastore.com.br',
    phone_number: '+5531977665544',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'novo' },
    created_at: '2024-03-10T08:15:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    availability_status: 'online',
  },
  {
    id: 4,
    name: 'Juliana Rocha',
    email: 'juliana@designlab.com',
    phone_number: '+5548966554433',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'negociacao' },
    created_at: '2024-01-20T16:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    availability_status: null,
  },
  {
    id: 5,
    name: 'Marcelo Souza',
    email: 'marcelo@industria.com',
    phone_number: '+5541955443322',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'qualificacao' },
    created_at: '2024-02-28T11:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    availability_status: 'offline',
  },
  {
    id: 6,
    name: 'Patricia Almeida',
    email: 'patricia@edutech.com',
    phone_number: '+5571944332211',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'fechado' },
    created_at: '2024-01-05T09:30:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    availability_status: null,
  },
  {
    id: 7,
    name: 'Diego Ferreira',
    email: 'diego@logistica.com',
    phone_number: '+5551933221100',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'novo' },
    created_at: '2024-03-15T13:45:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    availability_status: 'online',
  },
  {
    id: 8,
    name: 'Camila Nunes',
    email: 'camila@saude360.com',
    phone_number: '+5561922110099',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'suporte', crm_stage: 'aberto' },
    created_at: '2024-02-14T10:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    availability_status: 'online',
  },
  {
    id: 9,
    name: 'Thiago Barbosa',
    email: 'thiago@fintech.io',
    phone_number: '+5511911009988',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'suporte', crm_stage: 'em_andamento' },
    created_at: '2024-03-01T15:20:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    availability_status: 'offline',
  },
  {
    id: 10,
    name: 'Isabela Castro',
    email: 'isabela@agencia.com',
    phone_number: '+5521900998877',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'vendas', crm_stage: 'proposta' },
    created_at: '2024-03-12T09:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    availability_status: null,
  },
  {
    id: 11,
    name: 'Rafael Moreira',
    email: 'rafael@construtora.com',
    phone_number: '+5531988776655',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'pos-venda', crm_stage: 'onboarding' },
    created_at: '2024-01-25T12:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    availability_status: 'online',
  },
  {
    id: 12,
    name: 'Amanda Vieira',
    email: 'amanda@varejo.com',
    phone_number: '+5548977665544',
    thumbnail: '',
    additional_attributes: {},
    custom_attributes: { crm_pipeline: 'pos-venda', crm_stage: 'acompanhamento' },
    created_at: '2024-02-10T14:00:00Z',
    last_activity_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    availability_status: null,
  },
]

const MOCK_MESSAGES_MAP: Record<number, string> = {
  1: 'Ola, gostaria de saber mais sobre o plano enterprise.',
  2: 'Recebi a proposta, vou analisar com meu time essa semana.',
  3: 'Vi o anuncio de voces no Instagram, podem me ajudar?',
  4: 'Podemos negociar um desconto de 15% para fechamento nesse mes?',
  5: 'Preciso de uma integracao com nosso ERP, isso e possivel?',
  6: 'Muito obrigada pelo atendimento! Ja estamos usando a plataforma.',
  7: 'Boa tarde, quero entender como funciona a automacao de WhatsApp.',
  8: 'O relatorio de metricas nao esta carregando corretamente.',
  9: 'Ja fiz a atualizacao que voces pediram mas o erro persiste.',
  10: 'Enviei o contrato assinado por email hoje cedo.',
  11: 'Quando comeca o treinamento da equipe?',
  12: 'Esta tudo funcionando bem, so quero tirar uma duvida sobre relatorios.',
}

const MOCK_PRIORITIES: Record<number, CrmPriority> = {
  1: 'alta',
  2: 'media',
  3: 'baixa',
  4: 'alta',
  5: 'media',
  6: 'baixa',
  7: 'baixa',
  8: 'alta',
  9: 'alta',
  10: 'media',
  11: 'media',
  12: 'baixa',
}

const MOCK_VALUES: Record<number, number> = {
  1: 8500,
  2: 3200,
  3: 1500,
  4: 12000,
  5: 4800,
  6: 6500,
  7: 900,
  8: 0,
  9: 0,
  10: 5500,
  11: 2800,
  12: 1200,
}

const MOCK_CARD_PRODUCTS: Record<number, string[]> = {
  1: ['prod-5', 'prod-3'],
  2: ['prod-1', 'prod-10'],
  3: ['prod-7'],
  4: ['prod-6', 'prod-4', 'prod-8'],
  5: ['prod-3', 'prod-7'],
  6: ['prod-5'],
  7: ['prod-2'],
  8: [],
  9: [],
  10: ['prod-1', 'prod-9'],
  11: ['prod-8'],
  12: ['prod-7'],
}

export function getMockConversations(contactId: number): ChatwootConversation[] {
  const agent = MOCK_AGENTS[contactId % MOCK_AGENTS.length]
  const labelsForContact = contactId % 2 === 0
    ? [MOCK_LABELS[0].title, MOCK_LABELS[3].title]
    : [MOCK_LABELS[2].title]

  return [
    {
      id: contactId * 100 + 1,
      account_id: 1,
      inbox_id: (contactId % MOCK_INBOXES.length) + 1,
      status: 'open',
      assignee: agent,
      team: null,
      contact: MOCK_CONTACTS.find(c => c.id === contactId) ?? MOCK_CONTACTS[0],
      messages: [],
      labels: labelsForContact,
      created_at: now - 86400 * contactId,
      last_activity_at: now - 60 * contactId * 5,
      additional_attributes: {},
      custom_attributes: {},
      meta: {
        sender: {
          id: contactId,
          name: MOCK_CONTACTS.find(c => c.id === contactId)?.name ?? 'Contato',
          thumbnail: '',
        },
        assignee: agent,
      },
    },
  ]
}

export function getMockMessages(conversationId: number): ChatwootMessage[] {
  const contactId = Math.floor(conversationId / 100)
  const contact = MOCK_CONTACTS.find(c => c.id === contactId) ?? MOCK_CONTACTS[0]
  const agent = MOCK_AGENTS[contactId % MOCK_AGENTS.length]
  const lastMsg = MOCK_MESSAGES_MAP[contactId] ?? 'Ola, preciso de ajuda.'

  return [
    {
      id: conversationId * 10 + 1,
      content: lastMsg,
      content_type: 'text',
      message_type: 0,
      created_at: now - 300,
      sender: { id: contact.id, name: contact.name, thumbnail: '', type: 'contact' },
      conversation_id: conversationId,
    },
    {
      id: conversationId * 10 + 2,
      content: 'Ola! Claro, vou te ajudar com isso.',
      content_type: 'text',
      message_type: 1,
      created_at: now - 240,
      sender: { id: agent.id, name: agent.name, thumbnail: '', type: 'user' },
      conversation_id: conversationId,
    },
    {
      id: conversationId * 10 + 3,
      content: 'Pode me enviar mais detalhes por favor?',
      content_type: 'text',
      message_type: 1,
      created_at: now - 180,
      sender: { id: agent.id, name: agent.name, thumbnail: '', type: 'user' },
      conversation_id: conversationId,
    },
    {
      id: conversationId * 10 + 4,
      content: 'Sim, segue as informacoes.',
      content_type: 'text',
      message_type: 0,
      created_at: now - 120,
      sender: { id: contact.id, name: contact.name, thumbnail: '', type: 'contact' },
      conversation_id: conversationId,
    },
    {
      id: conversationId * 10 + 5,
      content: 'Perfeito! Vou processar e retorno em breve.',
      content_type: 'text',
      message_type: 1,
      created_at: now - 60,
      sender: { id: agent.id, name: agent.name, thumbnail: '', type: 'user' },
      conversation_id: conversationId,
    },
  ]
}

export function getMockContactLastMessage(contactId: number): string {
  return MOCK_MESSAGES_MAP[contactId] ?? 'Ola, preciso de ajuda.'
}

export function getMockAssignedAgent(contactId: number): ChatwootAgent {
  return MOCK_AGENTS[contactId % MOCK_AGENTS.length]
}

export function getMockLabelsForContact(contactId: number): string[] {
  if (contactId % 3 === 0) return ['vip', 'recorrente']
  if (contactId % 3 === 1) return ['novo']
  return ['urgente', 'enterprise']
}

export function getMockPriority(contactId: number): CrmPriority {
  return MOCK_PRIORITIES[contactId] ?? 'media'
}

export function getMockValue(contactId: number): number {
  return MOCK_VALUES[contactId] ?? 0
}

export function getMockProducts(contactId: number): string[] {
  return MOCK_CARD_PRODUCTS[contactId] ?? []
}

export const DEFAULT_PIPELINES: CrmPipeline[] = [
  {
    id: 'vendas',
    name: 'Vendas',
    stages: [
      { id: 'novo', name: 'Novo Lead', color: '#6B7280', order: 0 },
      { id: 'qualificacao', name: 'Qualificação', color: '#3B82F6', order: 1 },
      { id: 'proposta', name: 'Proposta', color: '#F59E0B', order: 2 },
      { id: 'negociacao', name: 'Negociação', color: '#8B5CF6', order: 3 },
      { id: 'fechado', name: 'Fechado', color: '#22C55E', order: 4 },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'suporte',
    name: 'Suporte',
    stages: [
      { id: 'aberto', name: 'Aberto', color: '#EF4444', order: 0 },
      { id: 'em_andamento', name: 'Em Andamento', color: '#F59E0B', order: 1 },
      { id: 'aguardando', name: 'Aguardando Cliente', color: '#6B7280', order: 2 },
      { id: 'resolvido', name: 'Resolvido', color: '#22C55E', order: 3 },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'pos-venda',
    name: 'Pós-venda',
    stages: [
      { id: 'onboarding', name: 'Onboarding', color: '#3B82F6', order: 0 },
      { id: 'acompanhamento', name: 'Acompanhamento', color: '#8B5CF6', order: 1 },
      { id: 'renovacao', name: 'Renovação', color: '#F59E0B', order: 2 },
      { id: 'concluido', name: 'Concluído', color: '#22C55E', order: 3 },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
]
