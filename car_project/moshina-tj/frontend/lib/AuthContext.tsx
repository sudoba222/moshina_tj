'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import Cookies from 'js-cookie'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const saved = Cookies.get('token')
    const savedUser = localStorage.getItem('user')
    if (saved && savedUser) {
      try {
        setToken(saved)
        setUser(JSON.parse(savedUser) as User)
      } catch {
        Cookies.remove('token')
        localStorage.removeItem('user')
      }
    }
  }, [])

  function login(accessToken: string, userData: User) {
    Cookies.set('token', accessToken, { expires: 7, sameSite: 'lax' })
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }

  function logout() {
    Cookies.remove('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
