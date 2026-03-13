'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { lang } = useLang()

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!phone || !name || !password) {
      setError(lang === 'ru' ? 'Заполните все поля' : 'Ҳама майдонҳоро пур кунед')
      return
    }

    if (password.length < 6) {
      setError(lang === 'ru' ? 'Пароль должен быть минимум 6 символов' : 'Рамз бояд ҳадди ақал 6 аломат бошад')
      return
    }

    try {
      setLoading(true)
      const res = await authApi.register(phone, name, password)
      const data = res.data.data
      login(data.token.access_token, data.user)
      router.push('/')
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? (lang === 'ru' ? 'Ошибка при регистрации' : 'Хато ҳангоми бақайдгирӣ'))
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    background: 'var(--bg)',
    border: `1px solid ${hasError ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'var(--font)',
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ marginBottom: '32px', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--accent)', letterSpacing: '-0.02em' }}>
          AVTOMARKET
        </span>
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)' }}>
          .TJ
        </span>
      </Link>

      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: 'clamp(24px, 5vw, 40px)',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          {t('auth.registerTitle', lang)}
        </h1>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="name"
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              {t('auth.name', lang)}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ru' ? 'Ваше имя' : 'Номи шумо'}
              style={inputStyle(!!error)}
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              {t('auth.phone', lang)}
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('auth.phonePlaceholder', lang)}
              style={inputStyle(!!error)}
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              {t('auth.password', lang)}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle(!!error)}
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>

          {error && (
            <p
              id="register-error"
              role="alert"
              style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--text-muted)' : 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
              fontFamily: 'var(--font)',
            }}
          >
            {loading ? t('common.loading', lang) : t('auth.registerBtn', lang)}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <Link
            href="/auth/login"
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            {t('auth.switchToLogin', lang)}
          </Link>
        </p>
      </div>
    </div>
  )
}
