'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function PlusCircleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

interface BottomTab {
  href: string
  label: string
  icon: React.ReactNode
  isPost?: boolean
}

export default function BottomNav() {
  const { lang } = useLang()
  const { user } = useAuth()
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const profileHref = user ? '/dashboard' : '/auth/login'

  const tabs: BottomTab[] = [
    { href: '/', label: t('nav.home', lang), icon: <HomeIcon /> },
    { href: '/catalog', label: t('nav.catalog', lang), icon: <SearchIcon /> },
    { href: '/post', label: t('nav.post', lang), icon: <PlusCircleIcon />, isPost: true },
    { href: profileHref, label: t('nav.profile', lang), icon: <UserIcon /> },
  ]

  return (
    <nav
      aria-label="Mobile navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'var(--card)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        alignItems: 'stretch',
        height: 'calc(56px + env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
      }}
      className="md:hidden"
    >
      {tabs.map((tab) => {
        const active = tab.href === '/'
          ? pathname === '/'
          : isActive(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minHeight: '56px',
              textDecoration: 'none',
              color: tab.isPost
                ? 'var(--color-white)'
                : active
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
              transition: 'color 0.15s ease',
              position: 'relative',
            }}
          >
            {tab.isPost ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--color-white)',
                  marginTop: '-8px',
                  boxShadow: '0 4px 12px rgba(200,56,8,0.4)',
                  flexShrink: 0,
                }}
              >
                <PlusCircleIcon />
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {tab.icon}
              </span>
            )}
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.01em',
              lineHeight: 1,
              marginTop: tab.isPost ? '-2px' : 0,
              color: tab.isPost
                ? 'var(--text-muted)'
                : active
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
