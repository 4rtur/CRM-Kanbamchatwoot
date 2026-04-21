import { pgTable, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core'
import { pipelines } from './pipelines'
import { tenants } from './tenants'

export const stageType = pgEnum('stage_type', ['entry', 'middle', 'won', 'lost'])

export const stages = pgTable(
  'stages',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pipelineId: text('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#94a3b8'),
    order: integer('order').notNull().default(0),
    type: stageType('type').notNull().default('middle'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('stages_tenant_idx').on(table.tenantId),
    pipelineIdx: index('stages_pipeline_idx').on(table.pipelineId),
  }),
)

export type Stage = typeof stages.$inferSelect
export type NewStage = typeof stages.$inferInsert
