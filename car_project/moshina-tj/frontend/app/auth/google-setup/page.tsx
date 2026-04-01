'use client'
import { useState, useEffect, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

function GoogleSetupInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { lang } = useLang()

  const token = searchParams.get('token') ?? ''
  const googleName = decodeURIComponent(searchParams.get('name') ?? '')

  const [name, setName] = useState(googleName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) router.replace('/auth/login?error=oauth_failed')
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('auth.nameRequired', lang))
      return
    }
    setLoading(true)
    setError('')
    try {
      // Update name on the backend using the Google JWT
      await authApi.updateProfile({ name: trimmed }, token)
      // Fetch the updated user
      const res = await authApi.me(token)
      login(token, res.data.data.user)
      router.replace('/')
    } catch {
      setError(lang === 'tj' ? 'Хатогӣ рух дод. Дубора кӯшиш кунед.' : 'Произошла ошибка. Попробуйте ещё раз.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '32px 28px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Google icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text)',
          textAlign: 'center',
          marginBottom: '8px',
          fontFamily: 'var(--font)',
        }}>
          {t('auth.almostDone', lang)}
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: '28px',
          fontFamily: 'var(--font)',
        }}>
          {t('auth.confirmName', lang)}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
              {t('auth.name', lang)}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder', lang)}
              maxLength={100}
              autoFocus
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '15px',
                fontFamily: 'var(--font)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--danger, #e53e3e)', fontFamily: 'var(--font)', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: 'var(--color-white)',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'var(--font)',
              transition: 'opacity 0.15s',
            }}
          >
            {loading && <Spinner />}
            {t('auth.next', lang)}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function GoogleSetupPage() {
  return (
    <Suspense fallback={null}>
      <GoogleSetupInner />
    </Suspense>
  )
}
