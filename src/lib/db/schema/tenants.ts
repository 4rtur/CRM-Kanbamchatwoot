import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const tenantPlan = pgEnum('tenant_plan', ['starter', 'pro', 'enterprise'])

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  chatwootUrl: text('chatwoot_url').notNull(),
  chatwootAccountId: text('chatwoot_account_id').notNull(),
  chatwootTokenEncrypted: text('chatwoot_token_encrypted').notNull(),
  plan: tenantPlan('plan').notNull().default('starter'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
