'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LogOut, Settings, Shield, User as UserIcon, ChevronDown } from 'lucide-react'
import { useUser, useUserActions } from '@/lib/auth/use-user'
import { hasPermission } from '@/lib/auth/permissions'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserMenu() {
  const { user, loading } = useUser()
  const { logout } = useUserActions()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (loading || !user) return null

  const isAdmin = user.role === 'administrator'
  const canViewAudit = hasPermission(user, 'audit:view')
  const canAccessSettings = hasPermission(user, 'settings:access')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={user.email}
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-[#1F93FF]/15 text-[10px] font-semibold text-[#1F93FF]">
          {initials(user.name)}
        </span>
        <span className="hidden sm:inline font-medium">{user.name}</span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            <p className="mt-1 inline-flex rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              {user.role}
            </p>
          </div>

          <div className="py-1">
            {user.role === 'agent' ? (
              <Link
                href="/?filter=mine"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <UserIcon className="size-3.5" /> Meus Leads
              </Link>
            ) : null}

            {canAccessSettings && (
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Settings className="size-3.5" /> Configurações
              </Link>
            )}

            {(isAdmin || canViewAudit) && (
              <Link
                href="/auditoria"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Shield className="size-3.5" /> Auditoria
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                void logout()
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-3.5" /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
