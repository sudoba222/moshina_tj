'use client'
import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'

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
              ? '0 0 0 3px rgba(239,68,68,0.18)'
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

const btnStyle = (loading: boolean, disabled = false): React.CSSProperties => ({
  width: '100%', background: (loading || disabled) ? 'var(--text-muted)' : 'var(--accent)',
  color: 'var(--color-white)', fontWeight: 700, fontSize: '15px', padding: '13px', borderRadius: '12px',
  border: 'none', cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
  fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
})

// ─── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ─── Check icon ───────────────────────────────────────────────────────────────
function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const { lang } = useLang()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1)

  // Step 1
  const [identifier, setIdentifier] = useState('')
  const [step1Error, setStep1Error] = useState('')
  const [step1Loading, setStep1Loading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [method, setMethod] = useState<'default' | 'telegram'>('default')

  // Step 2
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const confirmedCode = useRef('')

  // Step 3
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [step3Error, setStep3Error] = useState('')
  const [step3Loading, setStep3Loading] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [countdown])

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(60)
  }

  const countdownStr = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`

  // ── Step 1: send code ───────────────────────────────────────────────────────
  async function handleSendCode(via: 'default' | 'telegram' = 'default') {
    setStep1Error('')
    if (!identifier.trim()) {
      setStep1Error(t('forgotPassword.errorEnterIdentifier', lang))
      return
    }
    try {
      setStep1Loading(true)
      setMethod(via)
      if (via === 'telegram') {
        const res = await authApi.forgotPasswordTelegram(identifier.trim())
        if (!res.data.data?.available) {
          setStep1Error(t('forgotPassword.errorTelegramNotLinked', lang))
          return
        }
        const dc = res.data.data?.dev_code ?? null
        setDevCode(dc)
        setDigits(dc ? dc.split('').slice(0, 6) : ['', '', '', '', '', ''])
        setStep(2)
        startCountdown()
      } else {
        const res = await authApi.forgotPassword(identifier.trim())
        const dc = res.data.data?.dev_code ?? null
        setDevCode(dc)
        setDigits(dc ? dc.split('').slice(0, 6) : ['', '', '', '', '', ''])
        setStep(2)
        startCountdown()
      }
    } catch (err) {
      setStep1Error(extractApiError(err, t('forgotPassword.errorSendCode', lang)))
    } finally {
      setStep1Loading(false)
    }
  }

  // ── Step 2: resend ──────────────────────────────────────────────────────────
  async function handleResend() {
    setOtpError('')
    try {
      setOtpLoading(true)
      const res = await authApi.forgotPassword(identifier.trim())
      const dc = res.data.data?.dev_code ?? null
      setDevCode(dc)
      if (dc) setDigits(dc.split('').slice(0, 6))
      else setDigits(['', '', '', '', '', ''])
      startCountdown()
    } catch {
      setOtpError(t('forgotPassword.errorSend', lang))
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Step 2: confirm OTP (no API call — just advance) ───────────────────────
  function handleConfirmOtp() {
    setOtpError('')
    const code = digits.join('')
    if (code.length < 6) {
      setOtpError(lang === 'ru' ? 'Введите все 6 цифр' : 'Ҳамаи 6 рақамро ворид кунед')
      return
    }
    confirmedCode.current = code
    setStep(3)
  }

  // ── Step 3: reset password ──────────────────────────────────────────────────
  async function handleResetPassword() {
    setStep3Error('')
    if (!newPassword) {
      setStep3Error(lang === 'ru' ? 'Введите новый пароль' : 'Рамзи навро ворид кунед')
      return
    }
    if (newPassword.length < 6) {
      setStep3Error(lang === 'ru' ? 'Пароль не менее 6 символов' : 'Рамз камаш 6 аломат бошад')
      return
    }
    if (newPassword !== confirmPassword) {
      setStep3Error(t('forgotPassword.errorPasswordsMismatch', lang))
      return
    }
    try {
      setStep3Loading(true)
      await authApi.resetPassword(identifier.trim(), confirmedCode.current, newPassword)
      setStep('success')
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (err) {
      setStep3Error(extractApiError(err, t('forgotPassword.errorResetPassword', lang)))
    } finally {
      setStep3Loading(false)
    }
  }

  // ── Step indicator ──────────────────────────────────────────────────────────
  const steps = [1, 2, 3] as const
  const activeStep = step === 'success' ? 3 : step

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fp-step { animation: fadeSlideIn 0.25s ease; }
      `}</style>

      {/* Logo */}
      <Link href="/" style={{ marginBottom: '32px', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--accent)', letterSpacing: '-0.02em' }}>TAJCAR</span><span style={{ fontSize: 'inherit', color: 'var(--text)', fontWeight: 800 }}>.TJ</span>

      </Link>

      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(24px,5vw,40px)', overflow: 'hidden' }}>

        {/* Header */}
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', textAlign: 'center' }}>
          {t('forgotPassword.title', lang)}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>
          {t('forgotPassword.stepOf', lang).replace('{step}', String(activeStep))}
        </p>

        {/* Step dots */}
        {step !== 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '28px' }}>
            {steps.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: activeStep >= s ? 'var(--accent)' : 'var(--surface)',
                  border: `2px solid ${activeStep >= s ? 'var(--accent)' : 'var(--border)'}`,
                  color: activeStep >= s ? 'var(--color-white)' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 700, transition: 'background 0.2s, border-color 0.2s',
                }}>
                  {activeStep > s ? (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 7 5.5 10.5 12 3.5" />
                    </svg>
                  ) : s}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: '40px', height: '2px', background: activeStep > s ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1 ─────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="fp-step" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                {t('forgotPassword.identifierLabel', lang)}
              </label>
              <input
                type="text" autoComplete="username" value={identifier}
                placeholder={t('forgotPassword.identifierPlaceholder', lang)}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendCode('default') }}
                style={{ ...baseInput, borderColor: step1Error ? 'var(--color-error)' : 'var(--border)' }}
              />
            </div>
            {step1Error && (
              <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600 }}>{step1Error}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" onClick={() => handleSendCode('default')} disabled={step1Loading} style={btnStyle(step1Loading)}>
                {step1Loading && method !== 'telegram' && <Spinner />}
                {t('forgotPassword.sendCode', lang)}
              </button>
              <button
                type="button"
                onClick={() => handleSendCode('telegram')}
                disabled={step1Loading}
                style={{
                  width: '100%',
                  background: step1Loading ? 'var(--text-muted)' : 'var(--color-telegram)',
                  color: 'var(--color-white)',
                  fontWeight: 700,
                  fontSize: '15px',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: step1Loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: step1Loading ? 0.7 : 1,
                }}
              >
                {step1Loading && method === 'telegram' && <Spinner />}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                {t('forgotPassword.getTelegramCode', lang)}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ─────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="fp-step">
            {devCode && (
              <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '16px', textAlign: 'center' }}>
                {t('register.devBanner', lang)}
              </div>
            )}

            <button type="button" onClick={() => { setStep(1); setOtpError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', padding: 0, fontFamily: 'var(--font)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5" /></svg>
              {t('authForm.back', lang)}
            </button>

            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
              {t('register.enterCode', lang)}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>
              {method === 'telegram'
                ? t('forgotPassword.codeSentTelegram', lang)
                : t('register.codeSentTo', lang).replace('{phone}', identifier)}
            </p>

            <OtpInput value={digits} onChange={setDigits} hasError={!!otpError} />

            {otpError && (
              <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600, textAlign: 'center', marginTop: '12px' }}>{otpError}</p>
            )}

            <button type="button" onClick={handleConfirmOtp} disabled={otpLoading} style={{ ...btnStyle(otpLoading), marginTop: '20px' }}>
              {otpLoading && <Spinner />}
              {lang === 'ru' ? 'Подтвердить' : 'Тасдиқ кунед'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
              {countdown > 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>
                  {lang === 'ru' ? 'Повторно через' : 'Такроран баъд аз'}{' '}
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{countdownStr}</span>
                </span>
              ) : (
                <button type="button" disabled={otpLoading} onClick={handleResend}
                  style={{ background: 'none', border: 'none', cursor: otpLoading ? 'not-allowed' : 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font)' }}>
                  {t('register.resendAgain', lang)}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3 ─────────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="fp-step" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button type="button" onClick={() => { setStep(2); setStep3Error('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', padding: 0, fontFamily: 'var(--font)', alignSelf: 'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5" /></svg>
              {t('authForm.back', lang)}
            </button>

            {/* New password */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                {t('dashboard.newPassword', lang)}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...baseInput, paddingRight: '44px', borderColor: step3Error ? 'var(--color-error)' : 'var(--border)' }}
                />
                <button type="button" onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? t('authForm.hidePassword', lang) : t('authForm.showPassword', lang)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <EyeIcon open={showNew} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                {t('dashboard.confirmPassword', lang)}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword() }}
                  style={{ ...baseInput, paddingRight: '44px', borderColor: step3Error ? 'var(--color-error)' : 'var(--border)' }}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? t('authForm.hidePassword', lang) : t('authForm.showPassword', lang)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {step3Error && (
              <p role="alert" style={{ fontSize: '13px', color: 'var(--color-error)', fontWeight: 600 }}>{step3Error}</p>
            )}

            <button type="button" onClick={handleResetPassword} disabled={step3Loading} style={btnStyle(step3Loading)}>
              {step3Loading && <Spinner />}
              {t('authForm.savePassword', lang)}
            </button>
          </div>
        )}

        {/* ── Success ────────────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="fp-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '8px', paddingBottom: '8px' }}>
            <CheckCircleIcon />
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', textAlign: 'center' }}>
              {t('forgotPassword.passwordChanged', lang)}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {t('forgotPassword.redirectingToLogin', lang)}
            </p>
          </div>
        )}

        {/* Back to login */}
        {step !== 'success' && (
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {t('authForm.backToLogin', lang)}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
