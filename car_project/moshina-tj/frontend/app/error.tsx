'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function AlertIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-warning)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const { lang } = useLang()

  useEffect(() => {
    // Log to monitoring service when one is integrated
    console.error('[Error boundary]', error)
  }, [error])

  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '40px 32px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <AlertIcon />

        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
          }}
        >
          {t('error.title', lang)}
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {t('error.body', lang)}
        </p>

        {error.digest && (
          <p
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 10px',
              margin: 0,
            }}
          >
            {error.digest}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            marginTop: '8px',
          }}
        >
          <button
            onClick={reset}
            style={{
              background: 'var(--accent)',
              color: 'var(--color-white)',
              fontWeight: 700,
              fontSize: '15px',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
            }}
          >
            {t('error.retry', lang)}
          </button>

          <Link
            href="/"
            style={{
              display: 'block',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '15px',
              padding: '13px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            {t('error.home', lang)}
          </Link>
        </div>
      </div>
    </main>
  )
}
