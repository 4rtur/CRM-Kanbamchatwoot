import { pgTable, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { pipelines } from './pipelines'

// Regras de auto-atribuição round-robin. 1 regra por agente do Chatwoot por pipeline.
// pickAgent filtra por weekday atual + hora atual dentro de [startTime, endTime] e
// escolhe a regra habilitada com menor lastAssignedAt (ou null = nunca escolhido).
export const assignmentRules = pgTable(
  'assignment_rules',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pipelineId: text('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    agentId: integer('agent_id').notNull(),
    agentName: text('agent_name').notNull(),
    // 0=domingo, 1=segunda, ..., 6=sábado (compatível com JS Date.getDay())
    weekdays: integer('weekdays').array().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    startTime: text('start_time').notNull().default('00:00'),
    endTime: text('end_time').notNull().default('23:59'),
    enabled: boolean('enabled').notNull().default(true),
    lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantPipelineIdx: index('assignment_rules_tenant_pipeline_idx').on(
      table.tenantId,
      table.pipelineId,
    ),
    tenantEnabledIdx: index('assignment_rules_tenant_enabled_idx').on(
      table.tenantId,
      table.enabled,
    ),
  }),
)

export type AssignmentRule = typeof assignmentRules.$inferSelect
export type NewAssignmentRule = typeof assignmentRules.$inferInsert
