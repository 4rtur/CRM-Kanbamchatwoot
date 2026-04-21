import { pgTable, text, timestamp, boolean, integer, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { deals } from './deals'

export const checklistPriority = pgEnum('checklist_priority', ['alta', 'media', 'baixa'])

export const checklistItems = pgTable(
  'checklist_items',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    dealId: text('deal_id')
      .notNull()
      .references(() => deals.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    done: boolean('done').notNull().default(false),
    dueDate: timestamp('due_date', { withTimezone: true }),
    priority: checklistPriority('priority').notNull().default('media'),
    assignedTo: text('assigned_to'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantDealIdx: index('checklist_items_tenant_deal_idx').on(table.tenantId, table.dealId),
  }),
)

export type ChecklistItem = typeof checklistItems.$inferSelect
export type NewChecklistItem = typeof checklistItems.$inferInsert
