'use client'
import { useState, FormEvent, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import PhoneInput from '@/components/PhoneInput'

// ─── Eye Icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
    </svg>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const baseInput: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '12px 14px',
  fontSize: '15px',
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'var(--font)',
  boxSizing: 'border-box',
}

const btnStyle = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  background: loading ? 'var(--text-muted)' : 'var(--accent)',
  color: 'var(--color-white)',
  fontWeight: 700,
  fontSize: '15px',
  padding: '13px',
  borderRadius: '12px',
  border: 'none',
  cursor: loading ? 'not-allowed' : 'pointer',
  fontFamily: 'var(--font)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
})

// ─── Error helper ─────────────────────────────────────────────────────────────
function extractApiError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } })?.response?.data
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0] as { msg?: string }
    return first.msg ?? fallback
  }
  return data.message ?? data.error ?? fallback
}

// ─── Social login divider ─────────────────────────────────────────────────────
function OrDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { lang } = useLang()

  const ROLE_REDIRECT: Record<string, string> = {
    admin: '/admin',
    moderator: '/moderator',
    manager: '/manager',
    support: '/support',
  }

  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone')
  const [identifier, setIdentifier] = useState('+992')
  const [emailIdentifier, setEmailIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    const detail = searchParams.get('detail')
    if (err === 'google_cancelled') {
      setError(t('authForm.googleCancelled', lang))
    } else if (err === 'google_failed') {
      const msg = detail ? `Google: ${detail}` : t('authForm.googleError', lang)
      setError(msg)
    } else if (err === 'banned') {
      setError(t('authForm.accountBanned', lang))
    } else if (err === 'oauth_failed') {
      setError(t('authForm.authError', lang))
    }
  }, [searchParams, lang])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (loginMode === 'phone') {
      const localDigits = identifier.replace(/^\+\d{1,4}/, '')
      if (!localDigits.trim() || !password) {
        setError(t('authForm.fillAllFields', lang))
        return
      }
    } else {
      if (!emailIdentifier.trim() || !password) {
        setError(t('authForm.fillAllFields', lang))
        return
      }
    }

    try {
      setLoading(true)
      const res = loginMode === 'email'
        ? await authApi.loginEmail(emailIdentifier.trim(), password)
        : await authApi.login(identifier.trim(), password)
      const data = res.data.data!
      login(data.token.access_token, data.user)
      const raw = searchParams.get('redirect') ?? '/'
      // Only allow same-origin relative paths — reject absolute URLs and protocol-relative URLs
      const redirectTo = raw.startsWith('/') && !raw.startsWith('//') && !raw.includes(':') ? raw : '/'
      const destination = ROLE_REDIRECT[data.user?.role] ?? redirectTo
      router.push(destination)
    } catch (err) {
      setError(extractApiError(err, t('authForm.invalidCredentials', lang)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Logo */}
      <Link href="/" style={{ marginBottom: '32px', display: 'flex', alignItems: 'baseline', gap: '2px', textDecoration: 'none' }}>
        <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--accent)', letterSpacing: '-0.02em' }}>TAJCAR</span><span style={{ fontSize: 'inherit', color: 'var(--text)', fontWeight: 800 }}>.TJ</span>

      </Link>

      {/* Card */}
      <div className="slide-up" style={{ width: '100%', maxWidth: '400px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(24px, 5vw, 40px)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '28px', textAlign: 'center' }}>
          {t('authForm.loginTitle', lang)}
        </h1>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Phone / Email toggle */}
          <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
            {(['phone', 'email'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setLoginMode(mode); setError('') }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  background: loginMode === mode ? 'var(--card)' : 'transparent',
                  color: loginMode === mode ? 'var(--accent)' : 'var(--text-muted)',
                  boxShadow: loginMode === mode ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'phone' ? t('auth.loginByPhone', lang) : t('auth.loginByEmail', lang)}
              </button>
            ))}
          </div>

          {/* Identifier */}
          <div>
            {loginMode === 'phone' ? (
              <PhoneInput
                value={identifier}
                onChange={setIdentifier}
                placeholder="000 000 0000"
                hasError={!!error}
                searchPlaceholder={t('auth.searchCountry', lang)}
              />
            ) : (
              <input
                type="email"
                autoComplete="email"
                value={emailIdentifier}
                onChange={(e) => setEmailIdentifier(e.target.value)}
                placeholder={t('auth.emailPlaceholder', lang)}
                style={{ ...baseInput, borderColor: error ? 'var(--color-error)' : 'var(--border)' }}
                onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
              />
            )}
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              {t('authForm.passwordLabel', lang)}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...baseInput, borderColor: error ? 'var(--color-error)' : 'var(--border)', paddingRight: '44px' }}
                onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('authForm.hidePassword', lang) : t('authForm.showPassword', lang)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600, margin: 0 }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading && <Spinner />}
            {t('authForm.loginBtn', lang)}
          </button>

          {/* Forgot password */}
          <div style={{ textAlign: 'center' }}>
            <Link href="/auth/forgot-password" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              {t('authForm.forgotPassword', lang)}
            </Link>
          </div>
        </form>

        {/* Social login */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <OrDivider label={t('auth.orContinueWith', lang)} />
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/auth/google/redirect`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'var(--font)',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.continueGoogle', lang)}
          </a>
        </div>

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {t('authForm.noAccount', lang)}{' '}
          <Link href="/auth/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            {t('authForm.registerLink', lang)}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
