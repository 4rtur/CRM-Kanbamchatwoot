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

const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const assignmentRuleInputSchema = z
  .object({
    pipelineId: z.string().min(1),
    agentId: z.number().int().positive(),
    agentName: z.string().min(1).max(200),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos 1 dia'),
    startTime: z.string().regex(hhmmRegex, 'Formato HH:MM'),
    endTime: z.string().regex(hhmmRegex, 'Formato HH:MM'),
    enabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const [sh, sm] = data.startTime.split(':').map(Number)
    const [eh, em] = data.endTime.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Hora final deve ser maior que inicial (turno overnight não suportado ainda — use 2 regras)',
      })
    }
  })

export const assignmentRuleUpdateSchema = z
  .object({
    pipelineId: z.string().min(1).optional(),
    agentId: z.number().int().positive().optional(),
    agentName: z.string().min(1).max(200).optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
    startTime: z.string().regex(hhmmRegex).optional(),
    endTime: z.string().regex(hhmmRegex).optional(),
    enabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime) {
      const [sh, sm] = data.startTime.split(':').map(Number)
      const [eh, em] = data.endTime.split(':').map(Number)
      if (eh * 60 + em <= sh * 60 + sm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endTime'],
          message: 'Hora final deve ser maior que inicial',
        })
      }
    }
  })

export const productCategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#71717a'),
  order: z.number().int().nonnegative().default(0),
})

export const productCategoryUpdateSchema = productCategoryInputSchema.partial()

export const migrateFromLocalStoragePayloadSchema = z.object({
  pipelines: z.array(z.unknown()).optional(),
  products: z.array(z.unknown()).optional(),
  automations: z.array(z.unknown()).optional(),
  cardsExtra: z.record(z.string(), z.unknown()).optional(),
  accessControl: z.record(z.string(), z.unknown()).optional(),
  categories: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
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
