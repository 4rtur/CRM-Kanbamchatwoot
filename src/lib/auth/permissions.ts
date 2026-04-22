import type { CrmCard } from '@/lib/chatwoot/types'

export type CrmRole = 'administrator' | 'agent' | 'supervisor'

export interface CrmUser {
  id: number
  name: string
  email: string
  role: CrmRole
  accountId: number
  chatwootToken: string
}

export type Permission =
  | 'pipelines:create'
  | 'pipelines:edit'
  | 'pipelines:delete'
  | 'products:create'
  | 'products:edit'
  | 'products:delete'
  | 'cards:move'
  | 'cards:edit'
  | 'cards:delete'
  | 'cards:view_all'
  | 'cards:view_assigned_only'
  | 'automations:manage'
  | 'settings:access'
  | 'reports:view'
  | 'audit:view'

const ALL_PERMISSIONS: Permission[] = [
  'pipelines:create',
  'pipelines:edit',
  'pipelines:delete',
  'products:create',
  'products:edit',
  'products:delete',
  'cards:move',
  'cards:edit',
  'cards:delete',
  'cards:view_all',
  'cards:view_assigned_only',
  'automations:manage',
  'settings:access',
  'reports:view',
  'audit:view',
]

export const ROLE_PERMISSIONS: Record<CrmRole, Permission[] | ['*']> = {
  administrator: ['*'],
  supervisor: [
    'pipelines:create',
    'pipelines:edit',
    'products:create',
    'products:edit',
    'cards:move',
    'cards:edit',
    'cards:delete',
    'cards:view_all',
    'automations:manage',
    'settings:access',
    'reports:view',
    'audit:view',
  ],
  agent: [
    'cards:move',
    'cards:edit',
    'cards:view_assigned_only',
    'reports:view',
  ],
}

export function hasPermission(
  user: CrmUser | null,
  permission: Permission,
): boolean {
  if (!user) return false
  const perms = ROLE_PERMISSIONS[user.role]
  if (!perms) return false
  if (perms[0] === '*') return true
  return (perms as Permission[]).includes(permission)
}

export function canViewCard(user: CrmUser | null, card: CrmCard): boolean {
  if (!user) return false
  if (hasPermission(user, 'cards:view_all')) return true
  if (hasPermission(user, 'cards:view_assigned_only')) {
    return card.assignedAgent?.id === user.id
  }
  return false
}

export function permissionsForRole(role: CrmRole): Permission[] {
  const perms = ROLE_PERMISSIONS[role]
  if (perms[0] === '*') return [...ALL_PERMISSIONS]
  return [...(perms as Permission[])]
}

export const PERMISSION_DENIED_MESSAGE =
  'Você não tem permissão pra isso. Pergunte ao administrador.'
