'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, setInMemoryToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, user: User) => void
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
    // Restore cached user profile for instant UI render (not the token itself)
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User)
      } catch {
        localStorage.removeItem('user')
      }
    }

    // Always validate with the server — this both refreshes user data and
    // lets the HttpOnly cookie authenticate the request (no JS-accessible token needed).
    authApi.me().then((res) => {
      const freshUser = res.data.data
      if (freshUser.is_banned) {
        _clearAuth()
        return
      }
      setUser(freshUser)
      const { phone: _phone, email: _email, whatsapp_number: _wa, ban_reason: _br, ...safeUser } = freshUser
      localStorage.setItem('user', JSON.stringify(safeUser))
      const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `auth_session=${freshUser.role ?? 'user'}; path=/; max-age=604800; samesite=lax${secureFlag}`
    }).catch(() => {
      // Token expired or revoked — clear everything
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
    document.cookie = 'auth_session=; path=/; max-age=0; samesite=lax'
  }

  function login(accessToken: string, userData: User) {
    // Keep an in-memory copy for Authorization headers (needed cross-origin
    // since SameSite=None HttpOnly cookies require Secure + same-eTLD+1).
    setInMemoryToken(accessToken)
    setToken(accessToken)
    const { phone: _phone, email: _email, whatsapp_number: _wa, ban_reason: _br, ...safeUser } = userData
    localStorage.setItem('user', JSON.stringify(safeUser))
    setUser(userData)
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `auth_session=${userData.role ?? 'user'}; path=/; max-age=604800; samesite=lax${secureFlag}`
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
