'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

const STORAGE_KEY = 'cookie_consent'

export default function CookieBanner() {
  const { lang } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY)
      if (consent !== 'accepted') {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (e.g. private mode restrictions) — don't show banner
    }
  }, [])

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 'var(--bottom-nav-offset, 0px)',
        left: 0,
        right: 0,
        zIndex: 190,
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        padding: '16px',
      }}
    >
      <div
        className="max-w-7xl mx-auto"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: 0,
            flex: '1 1 240px',
            lineHeight: 1.5,
          }}
        >
          {t('cookie.text', lang)}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexShrink: 0,
            alignItems: 'center',
          }}
        >
          <Link
            href="/privacy"
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              fontWeight: 500,
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            {t('cookie.more', lang)}
          </Link>

          <button
            onClick={accept}
            style={{
              background: 'var(--accent)',
              color: 'var(--color-white)',
              fontWeight: 700,
              fontSize: '14px',
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
            }}
          >
            {t('cookie.accept', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
