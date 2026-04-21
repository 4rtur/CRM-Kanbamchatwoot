import { pgTable, text, timestamp, boolean, jsonb, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { pipelines } from './pipelines'

export const automationConditionType = pgEnum('automation_condition_type', [
  'label_added',
  'stage_changed',
  'score_above',
  'checklist_completed',
  'inactive_for',
  'value_above',
])

export const automationActionType = pgEnum('automation_action_type', [
  'move_to_stage',
  'assign_agent',
  'add_label',
  'send_notification',
  'mark_lost',
])

export const automationRules = pgTable(
  'automation_rules',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pipelineId: text('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    conditionType: automationConditionType('condition_type').notNull(),
    conditionValue: jsonb('condition_value').$type<unknown>(),
    actionType: automationActionType('action_type').notNull(),
    actionValue: jsonb('action_value').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantPipelineIdx: index('automations_tenant_pipeline_idx').on(table.tenantId, table.pipelineId),
    tenantEnabledIdx: index('automations_tenant_enabled_idx').on(table.tenantId, table.enabled),
  }),
)

export type AutomationRule = typeof automationRules.$inferSelect
export type NewAutomationRule = typeof automationRules.$inferInsert
