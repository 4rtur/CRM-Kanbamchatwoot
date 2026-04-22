'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { CrmUser, CrmRole } from './permissions'

interface UserContextValue {
  user: CrmUser | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

interface MeResponse {
  success: boolean
  user?: {
    id: number
    name: string
    email: string
    role: CrmRole
    accountId: number
    chatwootToken: string
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CrmUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!response.ok) {
        setUser(null)
        return
      }
      const data = (await response.json()) as MeResponse
      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          accountId: data.user.accountId,
          chatwootToken: data.user.chatwootToken,
        })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <UserContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): { user: CrmUser | null; loading: boolean } {
  const ctx = useContext(UserContext)
  if (!ctx) {
    return { user: null, loading: false }
  }
  return { user: ctx.user, loading: ctx.loading }
}

export function useUserActions(): {
  logout: () => Promise<void>
  refresh: () => Promise<void>
} {
  const ctx = useContext(UserContext)
  if (!ctx) {
    return {
      logout: async () => {},
      refresh: async () => {},
    }
  }
  return { logout: ctx.logout, refresh: ctx.refresh }
}
