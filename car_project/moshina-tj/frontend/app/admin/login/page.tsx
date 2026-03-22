'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import { authApi } from '@/lib/api'
import type { UserRole } from '@/types'

const ALLOWED_ROLES: UserRole[] = ['admin', 'moderator', 'manager', 'support']

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/admin',
  moderator: '/moderator',
  manager: '/manager',
  support: '/support',
}

function extractApiError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } })?.response?.data
  const status = (err as { response?: { status?: number } })?.response?.status
  if (status === 429) return fallback
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0] as { msg?: string }
    return first.msg ?? fallback
  }
  return data.message ?? data.error ?? fallback
}

function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { lang } = useLang()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const isEmail = identifier.includes('@')
      const res = isEmail
        ? await authApi.loginEmail(identifier, password)
        : await authApi.login(identifier, password)

      const { token, user } = res.data.data

      if (!ALLOWED_ROLES.includes(user.role)) {
        setError(t('adminLogin.accessDenied', lang))
        setLoading(false)
        return
      }

      login(token.access_token, user)
      router.push(ROLE_REDIRECT[user.role] ?? '/admin')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const noResponse = !(err as { response?: unknown })?.response
      if (status === 429) {
        setError(t('adminLogin.tooManyAttempts', lang))
      } else if (noResponse) {
        setError(t('adminLogin.connectionError', lang))
      } else {
        setError(extractApiError(err, t('adminLogin.invalidCredentials', lang)))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '40px 32px',
        }}
      >
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>
              TajCar.tj
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {t('adminLogin.controlPanel', lang)}
          </div>
        </div>

        {/* Shield icon + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', marginBottom: 12 }}>
            <ShieldIcon />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
            }}
          >
            {t('adminLogin.staffLogin', lang)}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Identifier */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="identifier"
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              {t('adminLogin.identifier', lang)}
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t('adminLogin.identifierPlaceholder', lang)}
              autoComplete="username"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 14,
                color: 'var(--text)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              {t('adminLogin.password', lang)}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('adminLogin.passwordPlaceholder', lang)}
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 44px 10px 14px',
                  fontSize: 14,
                  color: 'var(--text)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('adminLogin.hidePassword', lang) : t('adminLogin.showPassword', lang)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: '10px 14px',
                background: 'var(--color-error-dim)',
                border: '1px solid var(--color-error)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--color-error)',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'var(--accent-hover)' : 'var(--accent)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: 8,
              padding: '11px 0',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--accent)'
            }}
          >
            {loading ? t('adminLogin.submitting', lang) : t('adminLogin.submit', lang)}
          </button>
        </form>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link
            href="/"
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            {t('adminLogin.backToSite', lang)}
          </Link>
        </div>
      </div>
    </div>
  )
}
