'use client'
import { useState, FormEvent, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import NotificationBell from './NotificationBell'
import type { UserRole } from '@/types'

const NAV_TABS = [
  { href: '/catalog',     key: 'nav.catalog' },
  { href: '/rent',        key: 'nav.rent' },
  { href: '/installment', key: 'nav.installment' },
  { href: '/dealers',     key: 'nav.dealers' },
  { href: '/auction',     key: 'nav.auction' },
] as const

function getRoleNavLink(role: UserRole): { href: string; key: string } | null {
  switch (role) {
    case 'admin':     return { href: '/admin',     key: 'nav.admin' }
    case 'moderator': return { href: '/moderator', key: 'nav.moderator' }
    case 'manager':   return { href: '/manager',   key: 'nav.manager' }
    case 'support':   return { href: '/support',   key: 'nav.support' }
    case 'dealer':    return { href: '/dashboard', key: 'nav.dashboard' }
    default:          return null
  }
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="6" y1="1" x2="6" y2="11" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  )
}

export default function Navbar() {
  const { lang } = useLang()
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    router.push(query.trim() ? `/catalog?q=${encodeURIComponent(query.trim())}` : '/catalog')
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const roleLink = user ? getRoleNavLink(user.role) : null
  const userInitial = user ? (user.name ?? user.phone).charAt(0).toUpperCase() : ''

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Top bar */}
      <div style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}>
        <div
          className="max-w-7xl mx-auto px-4 md:px-6"
          style={{ height: '60px', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <Image src="/logo-icon.png" alt="TajCar.tj" width={36} height={24} style={{ objectFit: 'contain', display: 'block', background: 'transparent' }} priority />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
              <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--accent)', letterSpacing: '-0.03em' }}>
                TAJCAR
              </span>
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text)' }}>
                .TJ
              </span>
            </div>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            role="search"
            style={{ flex: 1, maxWidth: '580px', display: 'flex' }}
            className="hidden md:flex"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('hero.searchPlaceholder', lang)}
              style={{
                flex: 1,
                height: '40px',
                padding: '0 14px',
                background: 'var(--bg)',
                border: '1.5px solid var(--border)',
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                fontSize: '14px',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                height: '40px',
                padding: '0 18px',
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                borderRadius: '0 6px 6px 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t('hero.searchBtn', lang)}
            </button>
          </form>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div className="hidden md:flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            {user && (
              <div className="hidden md:flex">
                <NotificationBell />
              </div>
            )}

            {user ? (
              <div className="hidden md:flex items-center gap-2" ref={dropdownRef} style={{ position: 'relative' }}>
                {/* User avatar button */}
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: '1.5px solid var(--border)',
                    borderRadius: '8px',
                    padding: '4px 10px 4px 4px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'var(--accent)',
                    color: 'var(--color-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {userInitial}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name ?? user.phone}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M2 3.5l3 3 3-3" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div
                    className="animate-scale-in"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      minWidth: '180px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-md)',
                      overflow: 'hidden',
                      zIndex: 200,
                    }}
                  >
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {t('nav.dashboard', lang)}
                    </Link>
                    {roleLink && (
                      <Link
                        href={roleLink.href}
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'block',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--accent)',
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        {t(roleLink.key, lang)}
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); setDropdownOpen(false) }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {t('nav.logout', lang)}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:inline-flex items-center"
                style={{
                  height: '34px',
                  padding: '0 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                {t('nav.login', lang)}
              </Link>
            )}

            <Link
              href="/post"
              style={{
                height: '38px',
                padding: '0 16px',
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease, transform 0.1s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              }}
              className="hidden md:inline-flex"
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              <PlusIcon />
              {t('nav.addListing', lang)}
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              className="flex md:hidden items-center justify-center"
              style={{
                width: '44px',
                height: '44px',
                background: 'none',
                border: '1.5px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text)',
                flexShrink: 0,
              }}
            >
              {mobileOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="14" y2="14" />
                  <line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="2" y1="4" x2="14" y2="4" />
                  <line x1="2" y1="8" x2="14" y2="8" />
                  <line x1="2" y1="12" x2="14" y2="12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category tab bar — hidden on mobile (bottom nav handles navigation), visible on md+ */}
      <div className="hidden md:block" style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 scrollbar-hide" style={{ display: 'flex', gap: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {NAV_TABS.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '40px',
                  padding: '0 16px',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--text)'
                    e.currentTarget.style.borderBottomColor = 'var(--border-strong)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.borderBottomColor = 'transparent'
                  }
                }}
              >
                {t(tab.key, lang)}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Mobile drawer — backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 299 }}
        />
      )}

      {/* Mobile drawer — panel */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="md:hidden animate-slide-right"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '288px',
            maxWidth: 'calc(100vw - 48px)',
            background: 'var(--nav-bg)',
            borderRight: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {/* Drawer header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <Link href="/" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <Image src="/logo-icon.png" alt="TajCar.tj" width={30} height={20} style={{ objectFit: 'contain', display: 'block', background: 'transparent' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)', letterSpacing: '-0.03em' }}>TAJCAR</span>
                <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text)' }}>.TJ</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="16" y2="16" /><line x1="16" y1="2" x2="2" y2="16" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false) }} role="search" style={{ display: 'flex', width: '100%' }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder', lang)}
                style={{ flex: 1, height: '44px', minHeight: '44px', padding: '0 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: '14px', color: 'var(--text)', outline: 'none', width: '100%' }}
              />
              <button type="submit" style={{ height: '44px', minHeight: '44px', padding: '0 14px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 600, border: 'none', borderRadius: '0 6px 6px 0', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>
                {t('hero.searchBtn', lang)}
              </button>
            </form>
          </div>

          {/* Nav links */}
          <nav style={{ padding: '8px 0', flex: 1 }}>
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 20px', fontSize: '15px', fontWeight: 600, color: isActive(tab.href) ? 'var(--accent)' : 'var(--text)', borderLeft: isActive(tab.href) ? '3px solid var(--accent)' : '3px solid transparent' }}
              >
                {t(tab.key, lang)}
              </Link>
            ))}

            {user && (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 20px', fontSize: '15px', fontWeight: 600, color: isActive('/dashboard') ? 'var(--accent)' : 'var(--text)', borderLeft: isActive('/dashboard') ? '3px solid var(--accent)' : '3px solid transparent' }}>
                {t('nav.dashboard', lang)}
              </Link>
            )}
            {user && roleLink && (
              <Link href={roleLink.href} onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 20px', fontSize: '15px', fontWeight: 600, color: 'var(--accent)', borderLeft: '3px solid transparent' }}>
                {t(roleLink.key, lang)}
              </Link>
            )}
          </nav>

          {/* Bottom actions */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href="/post"
              onClick={() => setMobileOpen(false)}
              style={{ height: '44px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <PlusIcon />
              {t('nav.addListing', lang)}
            </Link>
            <div style={{ display: 'flex', gap: '8px' }}>
              <LanguageToggle />
              <ThemeToggle />
              {user ? (
                <button onClick={() => { logout(); setMobileOpen(false) }} style={{ flex: 1, height: '36px', background: 'none', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {t('nav.logout', lang)}
                </button>
              ) : (
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} style={{ flex: 1, height: '36px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('nav.login', lang)}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

    </header>
  )
}
