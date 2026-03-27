'use client'
import { useEffect } from 'react'

// global-error.tsx replaces the root layout entirely, so it must provide
// its own <html> and <body> tags. Keep it minimal — no i18n context available.

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Global error boundary]', error)
  }, [error])

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#f2f4f7',
          color: '#191f28',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e4e8ef',
            borderRadius: '20px',
            padding: '40px 32px',
            maxWidth: '400px',
            width: '100%',
            margin: '24px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Logo */}
          <div>
            <span
              style={{
                fontWeight: 800,
                fontSize: '18px',
                color: '#c83808',
                letterSpacing: '-0.03em',
              }}
            >
              TAJCAR
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: '11px',
                color: '#8a95a8',
              }}
            >
              .TJ
            </span>
          </div>

          {/* Warning icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ca8a04"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>

          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#191f28',
              margin: 0,
            }}
          >
            Произошла ошибка / Хато рӯй дод
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#8a95a8',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Что-то пошло не так. / Чизе нодуруст шуд.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: '11px',
                color: '#8a95a8',
                fontFamily: 'monospace',
                background: '#f2f4f7',
                border: '1px solid #e4e8ef',
                borderRadius: '6px',
                padding: '6px 10px',
                margin: 0,
                wordBreak: 'break-all',
              }}
            >
              {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              background: '#c83808',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Попробовать снова / Дубора кӯшиш кунед
          </button>
        </div>
      </body>
    </html>
  )
}
