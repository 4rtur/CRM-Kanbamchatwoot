export interface ChatwootContact {
  id: number
  name: string
  email: string | null
  phone_number: string | null
  thumbnail: string
  additional_attributes: Record<string, unknown>
  custom_attributes: Record<string, unknown>
  created_at: string
  last_activity_at: string | null
  availability_status: 'online' | 'offline' | null
}

export interface ChatwootContactPayload {
  payload: ChatwootContact[]
  meta: {
    count: number
    current_page: number
  }
}

export interface ChatwootConversation {
  id: number
  account_id: number
  inbox_id: number
  status: 'open' | 'resolved' | 'pending' | 'snoozed'
  assignee: ChatwootAgent | null
  team: ChatwootTeam | null
  contact: ChatwootContact
  messages: ChatwootMessage[]
  labels: string[]
  created_at: number
  last_activity_at: number
  additional_attributes: Record<string, unknown>
  custom_attributes: Record<string, unknown>
  meta: {
    sender: {
      id: number
      name: string
      thumbnail: string
    }
    assignee: ChatwootAgent | null
  }
}

export interface ChatwootConversationPayload {
  data: {
    payload: ChatwootConversation[]
    meta: {
      all_count: number
      mine_count: number
      assigned_count: number
      unassigned_count: number
    }
  }
}

export interface ChatwootMessage {
  id: number
  content: string | null
  content_type: 'text' | 'input_text' | 'input_email' | 'cards' | 'form'
  message_type: 0 | 1 | 2 | 3
  created_at: number
  sender: {
    id: number
    name: string
    thumbnail: string
    type: 'contact' | 'user'
  } | null
  conversation_id: number
}

export interface ChatwootAgent {
  id: number
  name: string
  email: string
  thumbnail: string
  availability_status: 'online' | 'offline' | 'busy'
  role: 'administrator' | 'agent'
}

export interface ChatwootTeam {
  id: number
  name: string
  description: string | null
}

export interface ChatwootLabel {
  id: number
  title: string
  description: string | null
  color: string
  show_on_sidebar: boolean
}

export interface ChatwootCustomAttribute {
  id: number
  attribute_display_name: string
  attribute_display_type: 'text' | 'number' | 'currency' | 'percent' | 'link' | 'date' | 'list' | 'checkbox'
  attribute_key: string
  attribute_model: 'contact_attribute' | 'conversation_attribute'
  attribute_values: string[]
  default_value: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface ChatwootInbox {
  id: number
  name: string
  channel_type: string
  avatar_url: string
}

export interface CrmPipeline {
  id: string
  name: string
  stages: CrmStage[]
  createdAt: string
}

export interface CrmStage {
  id: string
  name: string
  color: string
  order: number
}

export type CrmPriority = 'alta' | 'media' | 'baixa'

export interface CrmChecklistItem {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  priority: CrmPriority
  assignedTo: string | null
}

export interface CrmNote {
  id: string
  text: string
  author: string
  timestamp: string
  type: 'note' | 'stage_change' | 'agent_change'
}

export interface CrmProduct {
  id: string
  name: string
  price: number
  category: string
  description: string
}

export interface CrmCard {
  id: string
  contactId: number
  contact: ChatwootContact
  pipelineId: string
  stageId: string
  lastMessage: string | null
  lastMessageAt: string | null
  labels: string[]
  assignedAgent: ChatwootAgent | null
  conversations: ChatwootConversation[]
  phone: string | null
  priority: CrmPriority
  value: number
  checklist: CrmChecklistItem[]
  notes: CrmNote[]
  products: string[]
  score: number
}

export interface CrmAutomationRule {
  id: string
  name: string
  pipelineId: string
  enabled: boolean
  condition: CrmAutomationCondition
  action: CrmAutomationAction
}

export interface CrmAutomationCondition {
  type: 'label_added' | 'stage_changed' | 'score_above' | 'checklist_completed'
  value: string
}

export interface CrmAutomationAction {
  type: 'move_to_stage' | 'assign_agent' | 'add_label' | 'send_notification'
  value: string
}
