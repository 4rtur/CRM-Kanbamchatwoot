import { pgTable, text, timestamp, numeric, primaryKey, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { deals } from './deals'

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull().default(''),
    description: text('description').notNull().default(''),
    price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('products_tenant_idx').on(table.tenantId),
  }),
)

export const dealProducts = pgTable(
  'deal_products',
  {
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    dealId: text('deal_id')
      .notNull()
      .references(() => deals.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dealId, table.productId] }),
    tenantIdx: index('deal_products_tenant_idx').on(table.tenantId),
  }),
)

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type DealProduct = typeof dealProducts.$inferSelect
export type NewDealProduct = typeof dealProducts.$inferInsert
