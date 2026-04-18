'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'

const STORAGE_KEY = 'tjc_visited'

export default function FirstVisitModal() {
  const { user, loading } = useAuth()
  const { lang } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (loading) return
    // Already logged in — never show
    if (user) return
    // Already visited before — never show
    if (localStorage.getItem(STORAGE_KEY)) return
    // Small delay so the page renders first
    const id = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(id)
  }, [loading, user])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        style={{
          background: 'var(--card)',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          padding: 'clamp(28px, 5vw, 44px)',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
          animation: 'fvModalIn 0.25s ease',
        }}
      >
        <style>{`@keyframes fvModalIn { from { opacity:0; transform:translateY(16px) scale(0.97) } to { opacity:1; transform:none } }`}</style>

        {/* Icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'var(--accent-dim)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M5 17h-2v-6l2 -5h9l4 4h1a2 2 0 0 1 2 2v5h-2m-4 0h-6m-6 -6h15m-6 0v-5" />
          </svg>
        </div>

        {/* Headline */}
        <h2 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.02em' }}>
          {lang === 'ru' ? 'Добро пожаловать на TAJCAR.TJ' : 'Ба TAJCAR.TJ хуш омадед'}
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '28px' }}>
          {lang === 'ru'
            ? 'Крупнейший автомобильный маркетплейс Таджикистана. Зарегистрируйтесь, чтобы продавать, сохранять объявления и получать уведомления.'
            : 'Бузургтарин бозори мошин дар Тоҷикистон. Ба қайд гиред то фурӯшед, эълонҳоро нигоҳ доред ва огоҳиномаҳо гиред.'}
        </p>

        {/* Primary CTA */}
        <Link
          href="/auth/register"
          onClick={dismiss}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 0',
            borderRadius: '12px',
            background: 'var(--accent)',
            color: 'var(--color-white)',
            fontWeight: 800,
            fontSize: '15px',
            textDecoration: 'none',
            marginBottom: '10px',
            transition: 'opacity 0.13s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          {lang === 'ru' ? 'Зарегистрироваться' : 'Ба қайд гирифтан'}
        </Link>

        {/* Secondary: login */}
        <Link
          href="/auth/login"
          onClick={dismiss}
          style={{
            display: 'block',
            width: '100%',
            padding: '13px 0',
            borderRadius: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            marginBottom: '16px',
            transition: 'border-color 0.13s',
          }}
        >
          {lang === 'ru' ? 'Уже есть аккаунт — Войти' : 'Аллакай аккаунт дорам — Даромадан'}
        </Link>

        {/* Skip */}
        <button
          onClick={dismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--text-muted)',
            padding: '4px 8px',
            transition: 'color 0.13s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          {lang === 'ru' ? 'Продолжить без регистрации' : 'Бидуни қайд идома додан'}
        </button>
      </div>
    </div>
  )
}
