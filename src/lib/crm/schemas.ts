import { z } from 'zod'

export const stageTypeSchema = z.enum(['entry', 'middle', 'won', 'lost'])

export const pipelineInputSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
  order: z.number().int().nonnegative().optional(),
})

export const pipelineUpdateSchema = pipelineInputSchema.partial()

export const stageInputSchema = z.object({
  pipelineId: z.string().min(1),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  order: z.number().int().nonnegative().optional(),
  type: stageTypeSchema.optional(),
})

export const stageUpdateSchema = stageInputSchema.partial().omit({ pipelineId: true })

export const customFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'currency',
  'select',
  'multiselect',
  'date',
  'checkbox',
  'phone',
  'email',
  'url',
])

export const customFieldAppliesToSchema = z.enum(['contact', 'deal'])

export const customFieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
})

export const customFieldDefinitionInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, 'key deve ser snake_case iniciando com letra'),
  name: z.string().min(1).max(100),
  type: customFieldTypeSchema,
  appliesTo: customFieldAppliesToSchema.default('contact'),
  options: z.array(customFieldOptionSchema).nullable().default(null),
  isRequired: z.boolean().default(false),
  order: z.number().int().nonnegative().default(0),
})

export const customFieldDefinitionUpdateSchema = customFieldDefinitionInputSchema
  .partial()
  .omit({ key: true })

export const customFieldValueInputSchema = z.object({
  fieldId: z.string().min(1),
  entityType: customFieldAppliesToSchema,
  entityId: z.string().min(1),
  value: z.unknown().nullable(),
})

export const dealStatusSchema = z.enum(['active', 'won', 'lost'])

export const dealInputSchema = z.object({
  chatwootContactId: z.number().int().positive(),
  chatwootConversationId: z.number().int().positive().optional().nullable(),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  status: dealStatusSchema.optional(),
  valueEstimated: z.number().nonnegative().optional().nullable(),
  valueClosed: z.number().nonnegative().optional().nullable(),
  score: z.number().int().min(0).max(100).optional(),
})

export const dealUpdateSchema = dealInputSchema.partial().omit({ chatwootContactId: true })

export const dealMoveSchema = z.object({
  stageId: z.string().min(1),
})

export const productInputSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).default(''),
  description: z.string().max(2000).default(''),
  price: z.number().nonnegative().default(0),
})

export const productUpdateSchema = productInputSchema.partial()

export const checklistItemInputSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().min(1).max(500),
  done: z.boolean().default(false),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['alta', 'media', 'baixa']).default('media'),
  assignedTo: z.string().optional().nullable(),
  order: z.number().int().nonnegative().default(0),
})

export const checklistItemUpdateSchema = checklistItemInputSchema
  .partial()
  .omit({ dealId: true })

export const noteInputSchema = z.object({
  chatwootContactId: z.number().int().positive(),
  dealId: z.string().optional().nullable(),
  text: z.string().min(1).max(10000),
  author: z.string().min(1).max(200),
  type: z.enum(['note', 'stage_change', 'agent_change', 'system']).default('note'),
})

export const automationConditionTypeSchema = z.enum([
  'label_added',
  'stage_changed',
  'score_above',
  'checklist_completed',
  'inactive_for',
  'value_above',
])

export const automationActionTypeSchema = z.enum([
  'move_to_stage',
  'assign_agent',
  'add_label',
  'send_notification',
  'mark_lost',
])

export const automationRuleInputSchema = z.object({
  pipelineId: z.string().min(1),
  name: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
  conditionType: automationConditionTypeSchema,
  conditionValue: z.unknown().nullable(),
  actionType: automationActionTypeSchema,
  actionValue: z.unknown().nullable(),
})

export const automationRuleUpdateSchema = automationRuleInputSchema.partial()

export const migrateFromLocalStoragePayloadSchema = z.object({
  pipelines: z.array(z.unknown()).optional(),
  products: z.array(z.unknown()).optional(),
  automations: z.array(z.unknown()).optional(),
  cardsExtra: z.record(z.string(), z.unknown()).optional(),
  accessControl: z.record(z.string(), z.unknown()).optional(),
})

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string | Record<string, unknown>
  meta?: { total: number; page: number; limit: number }
}

export function badRequest(details: unknown): Response {
  return Response.json({ success: false, error: details }, { status: 400 })
}

export function notFound(message = 'Recurso não encontrado'): Response {
  return Response.json({ success: false, error: message }, { status: 404 })
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data }, init)
}
