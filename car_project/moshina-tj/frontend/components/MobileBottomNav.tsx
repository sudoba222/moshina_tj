'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/ThemeContext'
import { t } from '@/lib/i18n'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CatalogIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-white)" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="4" x2="20" y2="20" />
      <line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const [themeMounted, setThemeMounted] = useState(false)
  // Pulse the FAB once on first mount, then stop
  const fabPulsedRef = useRef(false)
  const [fabPulse, setFabPulse] = useState(false)

  useEffect(() => {
    setThemeMounted(true)
  }, [])

  useEffect(() => {
    if (fabPulsedRef.current) return
    fabPulsedRef.current = true
    setFabPulse(true)
    // Run the pulse animation for ~3 cycles (2.5s each), then stop
    const timer = setTimeout(() => setFabPulse(false), 7500)
    return () => clearTimeout(timer)
  }, [])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Suppress on CRM/staff pages and car detail pages
  const isCrmRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/moderator') ||
    pathname.startsWith('/manager') ||
    pathname.startsWith('/support')
  const isCarDetail = pathname.startsWith('/car/')
  if (isCrmRoute || isCarDetail) return null

  const profileHref = user ? '/dashboard' : '/auth/login'
  const profileActive = isActive('/dashboard') || isActive('/auth/login')
  const favoritesHref = user ? '/dashboard?tab=favorites' : '/auth/login'
  const favoritesActive = pathname === '/dashboard' && false // favorites tab doesn't have its own route

  return (
    <>
      {/* Bottom nav bar — mobile only (hidden on md+) */}
      <nav
        className="md:hidden"
        role="navigation"
        aria-label="Bottom navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'rgba(var(--nav-bg-rgb), 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            width: '100%',
            height: '64px',
            position: 'relative',
          }}
        >
          {/* Home */}
          <Link
            href="/"
            aria-label={t('nav.home', lang)}
            aria-current={isActive('/') ? 'page' : undefined}
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
            }}
          >
            <HomeIcon active={isActive('/')} />
            {isActive('/') && (
              <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
                {t('nav.home', lang)}
              </span>
            )}
          </Link>

          {/* Catalog */}
          <Link
            href="/catalog"
            aria-label={t('nav.catalog', lang)}
            aria-current={isActive('/catalog') ? 'page' : undefined}
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
            }}
          >
            <CatalogIcon active={isActive('/catalog')} />
            {isActive('/catalog') && (
              <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
                {t('nav.catalog', lang)}
              </span>
            )}
          </Link>

          {/* Center FAB — Post (elevated accent circle) */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '64px',
              position: 'relative',
            }}
          >
            <Link
              href="/post"
              aria-label={t('nav.addListing', lang)}
              className={fabPulse ? 'fab-pulse' : ''}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '2px',
                transform: 'translateY(-10px)',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
            >
              <PlusIcon />
            </Link>
          </div>

          {/* Favorites */}
          <Link
            href={favoritesHref}
            aria-label={t('favorites.title', lang)}
            aria-current={favoritesActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: '64px',
              minHeight: '44px',
              color: favoritesActive ? 'var(--accent)' : 'var(--text-muted)',
              textDecoration: 'none',
            }}
          >
            <HeartIcon active={favoritesActive} />
            {favoritesActive && (
              <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
                {t('favorites.title', lang)}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link
            href={profileHref}
            aria-label={t('nav.dashboard', lang)}
            aria-current={profileActive ? 'page' : undefined}
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
            }}
          >
            <ProfileIcon active={profileActive} />
            {profileActive && (
              <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
                {t('nav.dashboard', lang)}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* More sheet backdrop — only used for theme/lang controls on mobile */}
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
          aria-hidden="true"
        />
      )}

      {/* More sheet panel */}
      {moreOpen && (
        <div
          className="md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.more', lang)}
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
              {themeMounted
                ? (dark ? t('common.lightMode', lang) : t('common.darkMode', lang))
                : t('common.darkMode', lang)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {themeMounted
                ? (dark ? <SunIcon /> : <MoonIcon />)
                : <MoonIcon />}
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
