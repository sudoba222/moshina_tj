'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, setInMemoryToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // On mount: call /auth/me — the HttpOnly cookie is sent automatically.
    // If valid, populate in-memory token + user state.
    // User object is cached in localStorage (non-sensitive) for instant UI render;
    // the token itself is NEVER stored in localStorage (XSS risk).
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User)
      } catch {
        localStorage.removeItem('user')
      }
    }

    authApi.me().then((res) => {
      const freshUser = res.data.data
      if (freshUser.is_banned) {
        setInMemoryToken(null)
        setToken(null)
        setUser(null)
        localStorage.removeItem('user')
        return
      }
      // me() returns the token in the response header via the HttpOnly cookie path;
      // if the server also returns it in the body, store in-memory only.
      setUser(freshUser)
      setToken('cookie') // sentinel — real auth is via HttpOnly cookie
      localStorage.setItem('user', JSON.stringify(freshUser))
      document.cookie = 'auth_session=1; path=/; max-age=604800; samesite=lax'
    }).catch(() => {
      setInMemoryToken(null)
      setToken(null)
      setUser(null)
      localStorage.removeItem('user')
      document.cookie = 'auth_session=; path=/; max-age=0; samesite=lax'
    })
  }, [])

  function login(accessToken: string, userData: User) {
    // Store token in memory only — never in localStorage (XSS risk).
    // The server also sets an HttpOnly cookie for persistence across refreshes.
    setInMemoryToken(accessToken)
    setToken(accessToken)
    // Cache non-sensitive user object for instant UI render on next load
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    // Set a non-HttpOnly flag cookie so Next.js middleware can detect auth state.
    // This does NOT contain the JWT — it's just a session presence flag.
    document.cookie = 'auth_session=1; path=/; max-age=604800; samesite=lax'
  }

  function logout() {
    authApi.logout().catch(() => {}) // best-effort server-side token revocation
    setInMemoryToken(null)
    setToken(null)
    setUser(null)
    localStorage.removeItem('user')
    document.cookie = 'auth_session=; path=/; max-age=0; samesite=lax'
  }

  function updateUser(userData: User) {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
