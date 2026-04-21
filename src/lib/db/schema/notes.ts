import { pgTable, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const noteType = pgEnum('note_type', ['note', 'stage_change', 'agent_change', 'system'])

export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    chatwootContactId: integer('chatwoot_contact_id').notNull(),
    dealId: text('deal_id'),
    text: text('text').notNull(),
    author: text('author').notNull(),
    type: noteType('type').notNull().default('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantContactIdx: index('notes_tenant_contact_idx').on(table.tenantId, table.chatwootContactId),
    tenantDealIdx: index('notes_tenant_deal_idx').on(table.tenantId, table.dealId),
  }),
)

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
