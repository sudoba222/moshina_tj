'use client'
import { useState, FormEvent, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import type { UserRole } from '@/types'

const NAV_TABS = [
  { href: '/catalog',     key: 'nav.catalog' },
  { href: '/rent',        key: 'nav.rent' },
  { href: '/installment', key: 'nav.installment' },
  { href: '/dealers',     key: 'nav.dealers' },
] as const

function getRoleNavLink(role: UserRole): { href: string; key: string } | null {
  switch (role) {
    case 'admin':     return { href: '/admin',     key: 'nav.admin' }
    case 'moderator': return { href: '/moderator', key: 'nav.moderator' }
    case 'manager':   return { href: '/manager',   key: 'nav.manager' }
    case 'support':   return { href: '/support',   key: 'nav.support' }
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
            style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: '1px' }}
          >
            <span style={{ fontWeight: 800, fontSize: '20px', color: 'var(--accent)', letterSpacing: '-0.03em' }}>
              AVTOMARKET
            </span>
            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)' }}>
              .TJ
            </span>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            role="search"
            style={{ flex: 1, maxWidth: '580px', display: 'flex' }}
            className="hidden sm:flex"
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
                color: '#fff',
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
          <div className="flex-1 sm:hidden" />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div className="hidden md:flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>

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
                    color: '#fff',
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
                height: '36px',
                padding: '0 14px',
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              className="hidden sm:inline-flex"
            >
              <PlusIcon />
              {t('nav.addListing', lang)}
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              className="flex md:hidden items-center justify-center"
              style={{
                width: '36px',
                height: '36px',
                background: 'none',
                border: '1.5px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--text)',
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

      {/* Category tab bar */}
      <div style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 hidden sm:flex" style={{ gap: '0' }}>
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
                }}
              >
                {t(tab.key, lang)}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }} className="animate-fade-in">
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Mobile search */}
            <form onSubmit={handleSearch} role="search" style={{ display: 'flex', marginBottom: '8px' }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder', lang)}
                style={{
                  flex: 1,
                  height: '40px',
                  padding: '0 12px',
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
                  padding: '0 14px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                }}
              >
                {t('hero.searchBtn', lang)}
              </button>
            </form>

            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 4px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: isActive(tab.href) ? 'var(--accent)' : 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {t(tab.key, lang)}
              </Link>
            ))}

            {user && (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 4px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {t('nav.dashboard', lang)}
              </Link>
            )}
            {user && roleLink && (
              <Link
                href={roleLink.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 4px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {t(roleLink.key, lang)}
              </Link>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px' }}>
              <LanguageToggle />
              <ThemeToggle />
              <Link
                href="/post"
                onClick={() => setMobileOpen(false)}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <PlusIcon />
                {t('nav.addListing', lang)}
              </Link>
              {user ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false) }}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    background: 'none',
                    border: '1.5px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {t('nav.logout', lang)}
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    border: '1.5px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
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
