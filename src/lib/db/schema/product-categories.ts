import { pgTable, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const productCategories = pgTable(
  'product_categories',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#71717a'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantNameIdx: uniqueIndex('product_categories_tenant_name_idx').on(table.tenantId, table.name),
    tenantIdx: index('product_categories_tenant_idx').on(table.tenantId),
  }),
)

export type ProductCategory = typeof productCategories.$inferSelect
export type NewProductCategory = typeof productCategories.$inferInsert
