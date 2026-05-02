'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
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

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function FavoritesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function MobileBottomNav() {
  const { lang } = useLang()
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Pulse the FAB once on first mount, then stop
  const fabPulsedRef = useRef(false)
  const [fabPulse, setFabPulse] = useState(false)

  useEffect(() => {
    if (fabPulsedRef.current) return
    fabPulsedRef.current = true
    setFabPulse(true)
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

  const currentTab = searchParams.get('tab')
  const profileHref = user ? '/dashboard' : '/auth/login'
  const profileActive = (pathname === '/dashboard' && !currentTab) || pathname === '/auth/login'
  const favoritesHref = user ? '/dashboard?tab=favorites' : '/auth/login'
  const favoritesActive = pathname === '/dashboard' && currentTab === 'favorites'

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    height: '64px',
    minHeight: '44px',
    color: active ? 'var(--accent)' : 'var(--muted)',
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
  })

  return (
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
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
          style={navItemStyle(isActive('/'))}
        >
          <HomeIcon active={isActive('/')} />
          <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
            {t('nav.home', lang)}
          </span>
        </Link>

        {/* Catalog */}
        <Link
          href="/catalog"
          aria-label={t('nav.catalog', lang)}
          aria-current={isActive('/catalog') ? 'page' : undefined}
          style={navItemStyle(isActive('/catalog'))}
        >
          <CatalogIcon active={isActive('/catalog')} />
          <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
            {t('nav.catalog', lang)}
          </span>
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
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'translateY(-10px)',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(200,56,8,.35)',
              transition: 'opacity 0.15s ease',
              WebkitTapHighlightColor: 'transparent',
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
          style={navItemStyle(favoritesActive)}
        >
          <FavoritesIcon active={favoritesActive} />
          <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
            {t('favorites.title', lang)}
          </span>
        </Link>

        {/* Profile */}
        <Link
          href={profileHref}
          aria-label={t('nav.dashboard', lang)}
          aria-current={profileActive ? 'page' : undefined}
          style={navItemStyle(profileActive)}
        >
          <ProfileIcon active={profileActive} />
          <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>
            {t('nav.dashboard', lang)}
          </span>
        </Link>
      </div>
    </nav>
  )
}
