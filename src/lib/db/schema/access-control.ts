import { pgTable, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { pipelines } from './pipelines'

export const pipelineAccess = pgTable(
  'pipeline_access',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pipelineId: text('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    chatwootUserId: integer('chatwoot_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniquePipelineUserIdx: uniqueIndex('pipeline_access_unique_idx').on(
      table.pipelineId,
      table.chatwootUserId,
    ),
    tenantIdx: index('pipeline_access_tenant_idx').on(table.tenantId),
  }),
)

export type PipelineAccess = typeof pipelineAccess.$inferSelect
export type NewPipelineAccess = typeof pipelineAccess.$inferInsert
