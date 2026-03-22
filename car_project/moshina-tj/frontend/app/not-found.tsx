import Link from 'next/link'
import { t } from '@/lib/i18n'
import type { Lang } from '@/types'

// Default to Russian since this is a server component without language context.
// The user's preferred language is set in LanguageContext (client-side), but
// not-found is rendered outside the normal layout tree in some Next.js scenarios.
const lang: Lang = 'ru'

function CarIcon() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--border-strong)"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
      <circle cx="7.5" cy="17" r="2.5" />
      <circle cx="16.5" cy="17" r="2.5" />
    </svg>
  )
}

export const metadata = {
  title: '404 — Страница не найдена | MOSHINA.TJ',
}

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '1px',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: '20px',
              color: 'var(--accent)',
              letterSpacing: '-0.03em',
            }}
          >
            MOSHINA
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            .TJ
          </span>
        </Link>

        {/* Illustration */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            width: '100%',
          }}
        >
          <CarIcon />

          <span
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: 'var(--accent)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
            }}
          >
            404
          </span>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {t('notFound.title', lang)}
          </h1>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {t('notFound.body', lang)}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '100%',
              marginTop: '8px',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'block',
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontWeight: 700,
                fontSize: '15px',
                padding: '13px',
                borderRadius: '12px',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              {t('notFound.btn', lang)}
            </Link>

            <Link
              href="/catalog"
              style={{
                display: 'block',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '15px',
                padding: '13px',
                borderRadius: '12px',
                textAlign: 'center',
                textDecoration: 'none',
                border: '1px solid var(--border)',
              }}
            >
              {t('notFound.catalog', lang)}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
