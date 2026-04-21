import { pgTable, text, timestamp, integer, numeric, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { pipelines } from './pipelines'
import { stages } from './stages'

export const dealStatus = pgEnum('deal_status', ['active', 'won', 'lost'])

export const deals = pgTable(
  'deals',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    chatwootContactId: integer('chatwoot_contact_id').notNull(),
    chatwootConversationId: integer('chatwoot_conversation_id'),
    pipelineId: text('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'restrict' }),
    stageId: text('stage_id')
      .notNull()
      .references(() => stages.id, { onDelete: 'restrict' }),
    status: dealStatus('status').notNull().default('active'),
    valueEstimated: numeric('value_estimated', { precision: 12, scale: 2 }),
    valueClosed: numeric('value_closed', { precision: 12, scale: 2 }),
    score: integer('score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => ({
    tenantContactIdx: index('deals_tenant_contact_idx').on(table.tenantId, table.chatwootContactId),
    tenantStageIdx: index('deals_tenant_stage_idx').on(table.tenantId, table.stageId),
    tenantStatusIdx: index('deals_tenant_status_idx').on(table.tenantId, table.status),
  }),
)

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert
