'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, setInMemoryToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, user: User, remember?: boolean) => void
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore cached user profile for instant UI render (non-sensitive data only)
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User)
      } catch {
        localStorage.removeItem('user')
      }
    }

    // Validate with the server — the HttpOnly cookie carries the session.
    // /auth/me now returns { token, user } so we can restore the in-memory token
    // and avoid depending on cross-domain cookie transmission for subsequent API calls.
    authApi.me().then((res) => {
      const { token: freshToken, user: freshUser } = res.data.data
      if (freshUser.is_banned) {
        _clearAuth()
        return
      }
      // Restore the in-memory token so all subsequent requests use Bearer auth
      if (freshToken?.access_token) {
        setInMemoryToken(freshToken.access_token)
        setToken(freshToken.access_token)
      }
      setUser(freshUser)
      const { phone: _phone, email: _email, whatsapp_number: _wa, ban_reason: _br, ...safeUser } = freshUser
      localStorage.setItem('user', JSON.stringify(safeUser))
    }).catch(() => {
      // No valid session — clear everything
      _clearAuth()
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  function _clearAuth() {
    setInMemoryToken(null)
    setToken(null)
    setUser(null)
    localStorage.removeItem('user')
    // Remove legacy auth_token key in case it was set by an older version
    localStorage.removeItem('auth_token')
  }

  function login(accessToken: string, userData: User, _remember = false) {
    // Keep an in-memory copy for Authorization headers (needed cross-origin
    // since SameSite=None HttpOnly cookies require Secure + same-eTLD+1).
    // The remember_me preference is sent to the backend at login time (via api.ts),
    // which sets a longer-lived HttpOnly cookie — no token is ever written to localStorage.
    setInMemoryToken(accessToken)
    setToken(accessToken)
    const { phone: _phone, email: _email, whatsapp_number: _wa, ban_reason: _br, ...safeUser } = userData
    localStorage.setItem('user', JSON.stringify(safeUser))
    setUser(userData)
  }

  function logout() {
    authApi.logout().catch(() => {}) // best-effort server-side token revocation
    localStorage.removeItem('post_draft_v2')
    _clearAuth()
  }

  function updateUser(userData: User) {
    setUser(userData)
    const { phone: _phone, email: _email, whatsapp_number: _wa, ban_reason: _br, ...safeUser } = userData
    localStorage.setItem('user', JSON.stringify(safeUser))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
