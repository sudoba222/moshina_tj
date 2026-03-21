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
    // Restore token + user from localStorage so the Bearer header works across refreshes
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User
        setInMemoryToken(savedToken)
        setToken(savedToken)
        setUser(parsedUser)

        // Verify token is still valid server-side (Bearer header now works)
        authApi.me().then((res) => {
          setUser(res.data.data)
          localStorage.setItem('user', JSON.stringify(res.data.data))
        }).catch(() => {
          // Token expired or revoked — clear everything
          setInMemoryToken(null)
          setToken(null)
          setUser(null)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  function login(accessToken: string, userData: User) {
    setInMemoryToken(accessToken)
    setToken(accessToken)
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  function logout() {
    authApi.logout().catch(() => {}) // best-effort server-side token revocation
    setInMemoryToken(null)
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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
