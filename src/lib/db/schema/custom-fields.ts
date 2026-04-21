import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const customFieldType = pgEnum('custom_field_type', [
  'text',
  'textarea',
  'number',
  'currency',
  'select',
  'multiselect',
  'date',
  'checkbox',
  'phone',
  'email',
  'url',
])

export const customFieldAppliesTo = pgEnum('custom_field_applies_to', ['contact', 'deal'])

export const customFieldDefinitions = pgTable(
  'custom_field_definitions',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    type: customFieldType('type').notNull(),
    appliesTo: customFieldAppliesTo('applies_to').notNull().default('contact'),
    options: jsonb('options').$type<{ label: string; value: string }[] | null>().default(null),
    isRequired: boolean('is_required').notNull().default(false),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantKeyIdx: uniqueIndex('custom_fields_tenant_key_idx').on(table.tenantId, table.key),
    tenantIdx: index('custom_fields_tenant_idx').on(table.tenantId),
  }),
)

export const customFieldValues = pgTable(
  'custom_field_values',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => customFieldDefinitions.id, { onDelete: 'cascade' }),
    entityType: customFieldAppliesTo('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    value: jsonb('value').$type<unknown>(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueValueIdx: uniqueIndex('custom_field_values_unique_idx').on(
      table.tenantId,
      table.fieldId,
      table.entityType,
      table.entityId,
    ),
    tenantEntityIdx: index('custom_field_values_tenant_entity_idx').on(
      table.tenantId,
      table.entityType,
      table.entityId,
    ),
  }),
)

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect
export type NewCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert
export type CustomFieldValue = typeof customFieldValues.$inferSelect
export type NewCustomFieldValue = typeof customFieldValues.$inferInsert
