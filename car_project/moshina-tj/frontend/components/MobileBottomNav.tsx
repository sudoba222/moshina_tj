'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/ThemeContext'
import { t } from '@/lib/i18n'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function CatalogIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="4" x2="20" y2="20" />
      <line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function MobileBottomNav() {
  const { lang, setLang } = useLang()
  const { user, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const profileHref = user ? '/dashboard' : '/auth/login'
  const profileActive = isActive('/dashboard') || isActive('/auth/login')

  const navItems = [
    {
      id: 'home',
      href: '/',
      label: t('nav.home', lang),
      active: isActive('/'),
      icon: (active: boolean) => <HomeIcon active={active} />,
    },
    {
      id: 'catalog',
      href: '/catalog',
      label: t('nav.catalog', lang),
      active: isActive('/catalog'),
      icon: (active: boolean) => <CatalogIcon active={active} />,
    },
    {
      id: 'profile',
      href: profileHref,
      label: t('nav.dashboard', lang),
      active: profileActive,
      icon: (active: boolean) => <ProfileIcon active={active} />,
    },
  ]

  return (
    <>
      {/* Bottom nav bar — mobile only */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: 'rgba(var(--nav-bg-rgb, 255,255,255), 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            height: '64px',
            position: 'relative',
          }}
        >
          {/* Home */}
          <Link
            href="/"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '64px',
              minHeight: '44px',
              color: isActive('/') ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            <HomeIcon active={isActive('/')} />
            <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
              {t('nav.home', lang)}
            </span>
            {isActive('/') && (
              <span style={{ position: 'absolute', bottom: '8px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
            )}
          </Link>

          {/* Catalog */}
          <Link
            href="/catalog"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '64px',
              minHeight: '44px',
              color: isActive('/catalog') ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            <CatalogIcon active={isActive('/catalog')} />
            <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
              {t('nav.catalog', lang)}
            </span>
            {isActive('/catalog') && (
              <span style={{ position: 'absolute', bottom: '8px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
            )}
          </Link>

          {/* Center FAB — Post */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '64px',
            }}
          >
            <Link
              href="/post"
              aria-label={t('nav.addListing', lang)}
              className="fab-pulse"
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '-18px',
                flexShrink: 0,
                transition: 'transform 0.15s ease',
              }}
            >
              <PlusIcon />
            </Link>
          </div>

          {/* Dashboard / Profile */}
          <Link
            href={profileHref}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '64px',
              minHeight: '44px',
              color: profileActive ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
              position: 'relative',
            }}
          >
            <ProfileIcon active={profileActive} />
            <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
              {t('nav.dashboard', lang)}
            </span>
            {profileActive && (
              <span style={{ position: 'absolute', bottom: '8px', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent)' }} />
            )}
          </Link>

          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label={t('nav.more', lang)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '64px',
              minHeight: '44px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <MoreIcon />
            <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
              {t('nav.more', lang)}
            </span>
          </button>
        </div>
      </nav>

      {/* More sheet — backdrop */}
      {moreOpen && (
        <div
          className="md:hidden"
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 299,
          }}
        />
      )}

      {/* More sheet — panel */}
      {moreOpen && (
        <div
          className="md:hidden slide-up"
          style={{
            position: 'fixed',
            bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            background: 'var(--card)',
            borderTop: '1px solid var(--border)',
            borderRadius: '16px 16px 0 0',
            zIndex: 300,
            padding: '20px 20px 24px',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
              {t('nav.more', lang)}
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px',
              }}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'ru' ? 'tj' : 'ru')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text)',
              minHeight: '44px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              {t('dashboard.language', lang)}
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--accent)',
                border: '1.5px solid var(--accent)',
                borderRadius: '6px',
                padding: '3px 10px',
                letterSpacing: '0.05em',
              }}
            >
              {lang === 'ru' ? 'ТЈ' : 'РУ'}
            </span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              background: 'none',
              border: 'none',
              borderBottom: user ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              color: 'var(--text)',
              minHeight: '44px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              {dark ? t('common.lightMode', lang) : t('common.darkMode', lang)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>

          {/* Logout — only if logged in */}
          {user && (
            <button
              onClick={() => { logout(); setMoreOpen(false) }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                minHeight: '44px',
              }}
            >
              <LogoutIcon />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {t('nav.logout', lang)}
              </span>
            </button>
          )}
        </div>
      )}
    </>
  )
}
