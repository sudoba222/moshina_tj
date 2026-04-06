'use client'
import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi, BASE_URL } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Lang, User } from '@/types'
import PhoneInput from '@/components/PhoneInput'
import WelcomeModal from '@/components/WelcomeModal'
import OnboardingWizard from '@/components/OnboardingWizard'
import type { UserPrefs } from '@/components/OnboardingWizard'

// ─── Error helper ─────────────────────────────────────────────────────────────
function extractApiError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { detail?: unknown; message?: string; error?: string } } })?.response?.data
  if (!data) return fallback
  const stripPrefix = (s: string) => s.replace(/^Value error,\s*/i, '')
  if (typeof data.detail === 'string') return stripPrefix(data.detail)
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0] as { msg?: string }
    return stripPrefix(first.msg ?? fallback)
  }
  return stripPrefix(data.message ?? data.error ?? fallback)
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

// ─── OTP Digit Boxes ──────────────────────────────────────────────────────────
interface OtpInputProps { value: string[]; onChange: (next: string[]) => void; hasError: boolean }

function OtpInput({ value, onChange, hasError }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, char: string) {
    const digit = char.replace(/\D/g, '').slice(-1)
    const next = [...value]; next[index] = digit; onChange(next)
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }
  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (value[index]) { const next = [...value]; next[index] = ''; onChange(next) }
      else if (index > 0) { refs.current[index - 1]?.focus(); const next = [...value]; next[index - 1] = ''; onChange(next) }
    } else if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    else if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus()
  }
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...value]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    onChange(next)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {value.map((digit, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1} value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = hasError ? 'var(--color-error)' : 'var(--accent)'
            e.currentTarget.style.boxShadow = hasError
              ? '0 0 0 3px var(--color-error-dim, rgba(239,68,68,0.18))'
              : '0 0 0 3px var(--accent-dim,rgba(220,38,38,0.12))'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError ? 'var(--color-error)' : 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          style={{
            width: '48px', height: '56px', textAlign: 'center', fontSize: '22px', fontWeight: 700,
            fontFamily: 'var(--font)', color: 'var(--text)', background: 'var(--bg)',
            border: `2px solid ${hasError ? 'var(--color-error)' : 'var(--border)'}`, borderRadius: '12px',
            outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
          }} />
      ))}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const baseInput: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: '10px', padding: '12px 14px', fontSize: '15px', color: 'var(--text)',
  outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
}
const submitBtn = (loading: boolean): React.CSSProperties => ({
  width: '100%', background: loading ? 'var(--text-muted)' : 'var(--accent)', color: 'var(--color-white)',
  fontWeight: 700, fontSize: '15px', padding: '13px', borderRadius: '12px', border: 'none',
  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
})

// ─── Dev banner ───────────────────────────────────────────────────────────────
function DevBanner({ lang }: { lang: Lang }) {
  return (
    <div style={{
      background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '8px',
      padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)',
      marginBottom: '16px', textAlign: 'center',
    }}>
      {t('register.devBanner', lang as import('@/types').Lang)}
    </div>
  )
}

// ─── Back button ──────────────────────────────────────────────────────────────
function BackButton({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
        fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
        marginBottom: '20px', padding: 0, fontFamily: 'var(--font)',
      }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 2L4 7l5 5" />
      </svg>
      {t('authForm.back', lang as import('@/types').Lang)}
    </button>
  )
}

// ─── Phone tab (3-step: form → OTP) ──────────────────────────────────────────
function PhoneTab({ lang, onSuccess }: { lang: Lang; onSuccess: (user: User) => void }) {
  const { login } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+992')
  const [password, setPassword] = useState('')
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null)

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(() => setCountdown((c) => {
      if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
      return c - 1
    }), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [countdown])

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(60)
  }

  // phone state now holds the full number e.g. "+992901234567"
  const fullPhone = phone

  async function handleSendOtp() {
    setError('')
    if (!name.trim()) { setError(t('register.errorEnterName', lang)); return }
    const localDigits = phone.replace(/^\+\d{1,4}/, '')
    if (!localDigits.trim()) { setError(t('register.errorEnterPhone', lang)); return }
    if (!password.trim()) { setError(t('register.errorEnterPassword', lang)); return }
    if (password.length < 8) { setError(t('register.errorPasswordLength', lang)); return }
    try {
      setLoading(true)
      const res = await authApi.sendOtp(fullPhone)
      const dc = res.data.data?.dev_code ?? null
      setDevCode(dc)
      setDigits(dc ? dc.split('').slice(0, 6) : ['', '', '', '', '', ''])
      setStep(2); startCountdown()
    } catch (err) {
      setError(extractApiError(err, t('register.errorSendCode', lang)))
    } finally { setLoading(false) }
  }

  async function handleSendOtpTelegram() {
    setError('')
    const localDigitsTg = phone.replace(/^\+\d{1,4}/, '')
    if (!localDigitsTg.trim()) { setError(t('register.errorEnterPhone', lang)); return }
    try {
      setLoading(true)
      const res = await authApi.sendOtpTelegram(fullPhone)
      const link = res.data.data?.deep_link ?? null
      setTelegramDeepLink(link)
      // Open Telegram immediately — user goes to bot, gets OTP, comes back to enter it
      if (link) window.open(link, '_blank', 'noopener,noreferrer')
      setStep(2); startCountdown()
    } catch (err) {
      setError(extractApiError(err, t('register.errorTryLater', lang)))
    } finally { setLoading(false) }
  }

  async function handleVerify() {
    setError('')
    const code = digits.join('')
    if (code.length < 6) { setError(t('register.errorEnterAllDigits', lang)); return }
    try {
      setLoading(true)
      const res = await authApi.verifyOtp(fullPhone, code, name, password)
      const data = res.data.data!
      login(data.token.access_token, data.user)
      onSuccess(data.user)
    } catch (err) {
      setError(extractApiError(err, t('register.errorWrongCode', lang)))
    } finally { setLoading(false) }
  }

  async function handleResend() {
    setError('')
    try {
      setLoading(true)
      const res = await authApi.sendOtp(fullPhone)
      const dc = res.data.data?.dev_code ?? null
      setDevCode(dc); if (dc) setDigits(dc.split('').slice(0, 6))
      startCountdown()
    } catch { setError(t('register.errorSend', lang)) } finally { setLoading(false) }
  }

  const countdownStr = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`

  if (step === 1) return (
    <div className="otp-step" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          {t('auth.name', lang)}
        </label>
        <input type="text" autoComplete="name" value={name}
          placeholder={t('auth.namePlaceholder', lang)}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          style={baseInput} />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          {t('auth.phone', lang)}
        </label>
        <PhoneInput
          value={phone}
          onChange={setPhone}
          placeholder="000 000 0000"
          hasError={!!error}
          searchPlaceholder={t('auth.searchCountry', lang as import('@/types').Lang)}
          notFoundText={t('auth.countryNotFound', lang as import('@/types').Lang)}
        />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          {t('auth.password', lang)}
        </label>
        <input type="password" autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp() }}
          onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          style={baseInput} />
      </div>
      {error && <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>}
      <button type="button" onClick={handleSendOtp} disabled={loading} style={submitBtn(loading)}>
        {loading && <Spinner />}
        {t('register.getSmsCode', lang)}
      </button>
      <button
        type="button"
        onClick={handleSendOtpTelegram}
        disabled={loading}
        style={{
          ...submitBtn(false),
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          gap: '10px',
        }}
      >
        {loading ? <Spinner /> : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-telegram)' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.93c-.12.56-.47.7-.94.44l-2.62-1.93-1.26 1.21c-.14.14-.26.26-.52.26l.19-2.66 4.82-4.36c.21-.19-.05-.3-.32-.11L7.93 14.7l-2.56-.8c-.56-.17-.57-.56.12-.83l10.01-3.86c.46-.17.87.11.14.59z" fill="currentColor"/>
          </svg>
        )}
        {t('auth.continueTelegram', lang as import('@/types').Lang)}
      </button>
    </div>
  )

  return (
    <div className="otp-step">
      {devCode !== null && process.env.NODE_ENV === 'development' && <DevBanner lang={lang} />}
      <BackButton lang={lang} onClick={() => { setStep(1); setError(''); setTelegramDeepLink(null) }} />
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
        {t('register.enterCode', lang)}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>
        {telegramDeepLink
          ? t('register.telegramOpened', lang)
          : t('register.codeSentTo', lang).replace('{phone}', fullPhone)
        }
      </p>

      {/* Telegram: show re-open button in case user closed it */}
      {telegramDeepLink && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <a
            href={telegramDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: 'var(--color-telegram)', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.93c-.12.56-.47.7-.94.44l-2.62-1.93-1.26 1.21c-.14.14-.26.26-.52.26l.19-2.66 4.82-4.36c.21-.19-.05-.3-.32-.11L7.93 14.7l-2.56-.8c-.56-.17-.57-.56.12-.83l10.01-3.86c.46-.17.87.11.14.59z"/>
            </svg>
            {t('register.reopenBot', lang)}
          </a>
        </div>
      )}

      <OtpInput value={digits} onChange={setDigits} hasError={!!error} />
      {error && <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600, textAlign: 'center', marginTop: '12px' }}>{error}</p>}
      <button type="button" onClick={handleVerify} disabled={loading} style={{ ...submitBtn(loading), marginTop: '20px' }}>
        {loading && <Spinner />}
        {t('register.confirm', lang)}
      </button>
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
        {countdown > 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>
            {t('register.resendAfter', lang)}{' '}
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{countdownStr}</span>
          </span>
        ) : (
          <button type="button" disabled={loading} onClick={handleResend}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)' }}>
            {t('register.resendAgain', lang)}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Email tab (2-step: form → OTP) ──────────────────────────────────────────
function EmailTab({ lang, onSuccess }: { lang: Lang; onSuccess: (user: User) => void }) {
  const { login } = useAuth()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(() => setCountdown((c) => {
      if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
      return c - 1
    }), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [countdown])

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(60)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError(t('register.errorFillAllFields', lang)); return
    }
    if (password.length < 8) { setError(t('register.errorPasswordLength8', lang)); return }
    try {
      setLoading(true)
      const res = await authApi.registerEmail(email, name, password)
      const dc = res.data.data?.dev_code ?? null
      setDevCode(dc)
      setDigits(dc ? dc.split('').slice(0, 6) : ['', '', '', '', '', ''])
      setStep('otp'); startCountdown()
    } catch (err) {
      setError(extractApiError(err, t('register.errorRegistration', lang)))
    } finally { setLoading(false) }
  }

  async function handleVerify() {
    setError('')
    const code = digits.join('')
    if (code.length < 6) { setError(t('register.errorEnterAllDigits', lang)); return }
    try {
      setLoading(true)
      const res = await authApi.verifyEmailOtp(email, code)
      const data = res.data.data!
      login(data.token.access_token, data.user)
      onSuccess(data.user)
    } catch (err) {
      setError(extractApiError(err, t('register.errorWrongCode', lang)))
    } finally { setLoading(false) }
  }

  async function handleResend() {
    setError('')
    try {
      setLoading(true)
      const res = await authApi.resendEmailOtp(email)
      const dc = res.data.data?.dev_code ?? null
      setDevCode(dc); if (dc) setDigits(dc.split('').slice(0, 6))
      startCountdown()
    } catch { setError(t('register.errorSend', lang)) } finally { setLoading(false) }
  }

  const countdownStr = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`

  if (step === 'form') return (
    <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          {t('register.nameLabel', lang)}
        </label>
        <input type="text" autoComplete="name" value={name}
          placeholder={t('register.namePlaceholder', lang)}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          style={baseInput} />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          Email
        </label>
        <input type="email" autoComplete="email" value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          style={{ ...baseInput, borderColor: error ? 'var(--color-error)' : 'var(--border)' }} />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
          {t('register.passwordLabel', lang)}
        </label>
        <input type="password" autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={(e) => { setTimeout(() => { e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300) }}
          style={baseInput} />
      </div>
      {error && <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>}
      <button type="submit" disabled={loading} style={submitBtn(loading)}>
        {loading && <Spinner />}
        {t('register.emailRegisterBtn', lang)}
      </button>
    </form>
  )

  return (
    <div className="otp-step">
      {devCode !== null && process.env.NODE_ENV === 'development' && <DevBanner lang={lang} />}
      <BackButton lang={lang} onClick={() => { setStep('form'); setError('') }} />
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
        {t('register.confirmEmail', lang)}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>
        {t('register.codeSentToEmail', lang).replace('{email}', email)}
      </p>
      <OtpInput value={digits} onChange={setDigits} hasError={!!error} />
      {error && <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600, textAlign: 'center', marginTop: '12px' }}>{error}</p>}
      <button type="button" onClick={handleVerify} disabled={loading} style={{ ...submitBtn(loading), marginTop: '20px' }}>
        {loading && <Spinner />}
        {t('register.confirm', lang)}
      </button>
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
        {countdown > 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>
            {t('register.resendAfter', lang)}{' '}
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{countdownStr}</span>
          </span>
        ) : (
          <button type="button" disabled={loading} onClick={handleResend}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)' }}>
            {t('register.resendAgain', lang)}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Google icon ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
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
export default function RegisterPage() {
  const { lang } = useLang()
  const router = useRouter()
  const [tab, setTab] = useState<'phone' | 'email'>('phone')
  const [registeredUser, setRegisteredUser] = useState<User | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  function handleRegistrationSuccess(user: User) {
    setRegisteredUser(user)
    setShowWelcome(true)
  }

  function handleWelcomeContinue() {
    setShowWelcome(false)
    setShowOnboarding(true)
  }

  function handleWelcomeSkip() {
    setShowWelcome(false)
    router.push('/')
  }

  function handleOnboardingComplete(_prefs: UserPrefs) {
    setShowOnboarding(false)
    router.push('/')
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontFamily: 'var(--font)',
    fontWeight: 700, fontSize: '14px', cursor: 'pointer',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--color-white)' : 'var(--text-muted)',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <>
      {showWelcome && registeredUser && (
        <WelcomeModal
          userName={registeredUser.name ?? t('users.anonymousUser', lang)}
          lang={lang}
          onContinue={handleWelcomeContinue}
          onSkip={handleWelcomeSkip}
        />
      )}
      {showOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
      <style>{`@keyframes fadeSlideIn { from { opacity:0;transform:translateY(12px) } to { opacity:1;transform:translateY(0) } } .otp-step { animation: fadeSlideIn 0.25s ease; }`}</style>

      <Link href="/" style={{ marginBottom: '32px', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--accent)', letterSpacing: '-0.02em' }}>TAJCAR</span><span style={{ fontSize: 'inherit', color: 'var(--text)', fontWeight: 800 }}>.TJ</span>

      </Link>

      <div className="slide-up" style={{ width: '100%', maxWidth: '400px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', overflow: 'hidden' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '20px', textAlign: 'center' }}>
          {t('authForm.registerTitle', lang)}
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '10px', padding: '4px', marginBottom: '24px', gap: '4px' }}>
          <button onClick={() => setTab('phone')} style={tabBtn(tab === 'phone')}>
            {t('auth.loginByPhone', lang)}
          </button>
          <button onClick={() => setTab('email')} style={tabBtn(tab === 'email')}>
            Email
          </button>
        </div>

        {tab === 'phone'
          ? <PhoneTab lang={lang} onSuccess={handleRegistrationSuccess} />
          : <EmailTab lang={lang} onSuccess={handleRegistrationSuccess} />
        }

        {/* Google sign-up */}
        <div style={{ marginTop: '20px' }}>
          <OrDivider label={t('auth.orContinueWith', lang)} />
          <div style={{ marginTop: '12px' }}>
            <a
              href={`${BASE_URL}/auth/google/redirect`}
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
              <GoogleIcon />
              {t('auth.continueGoogle', lang)}
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {t('register.haveAccount', lang)}{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {t('register.loginLink', lang)}
          </Link>
        </p>
      </div>
    </div>
    </>
  )
}
