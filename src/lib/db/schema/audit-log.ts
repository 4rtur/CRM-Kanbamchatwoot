import { pgTable, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    agentId: integer('agent_id'),
    agentName: text('agent_name').notNull().default('system'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantCreatedIdx: index('audit_log_tenant_created_idx').on(table.tenantId, table.createdAt),
    tenantEntityIdx: index('audit_log_tenant_entity_idx').on(
      table.tenantId,
      table.entityType,
      table.entityId,
    ),
    tenantActionIdx: index('audit_log_tenant_action_idx').on(table.tenantId, table.action),
  }),
)

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
