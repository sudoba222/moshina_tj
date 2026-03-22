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
    // Restore token from localStorage first so API calls work immediately
    // on page refresh without waiting for /auth/me round-trip.
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user')

    if (savedToken) {
      setInMemoryToken(savedToken)
      setToken(savedToken)
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User)
      } catch {
        localStorage.removeItem('user')
      }
    }

    // Validate with the server — refreshes user data and catches revoked tokens.
    authApi.me().then((res) => {
      const freshUser = res.data.data
      if (freshUser.is_banned) {
        setInMemoryToken(null)
        setToken(null)
        setUser(null)
        localStorage.removeItem('user')
        localStorage.removeItem('auth_token')
        document.cookie = 'auth_session=; path=/; max-age=0; samesite=lax'
        return
      }
      setUser(freshUser)
      localStorage.setItem('user', JSON.stringify(freshUser))
      document.cookie = 'auth_session=1; path=/; max-age=604800; samesite=lax'
    }).catch(() => {
      // Token expired or revoked — clear everything
      setInMemoryToken(null)
      setToken(null)
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('auth_token')
      document.cookie = 'auth_session=; path=/; max-age=0; samesite=lax'
    })
  }, [])

  function login(accessToken: string, userData: User) {
    setInMemoryToken(accessToken)
    setToken(accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    // Persist token so it survives page refreshes (SameSite=None cookie fix
    // handles cross-origin HttpOnly cookie, but localStorage is the reliable fallback).
    localStorage.setItem('auth_token', accessToken)
    setUser(userData)
    document.cookie = 'auth_session=1; path=/; max-age=604800; samesite=lax'
  }

  function logout() {
    authApi.logout().catch(() => {}) // best-effort server-side token revocation
    setInMemoryToken(null)
    setToken(null)
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
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
