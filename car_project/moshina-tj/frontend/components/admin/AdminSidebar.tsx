'use client'
import { useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import type { Lang, User } from '@/types'
import type { AdminStats } from '@/types'

type Tab = 'dashboard' | 'users' | 'listings' | 'moderation' | 'dealers' | 'brands' | 'categories' | 'banners' | 'system'

interface AdminSidebarProps {
  tab: Tab
  setTab: (tab: Tab) => void
  stats: AdminStats | null
  user: User | null
  lang: Lang
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconListings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="13" rx="1" />
      <path d="M8 9V5a1 1 0 011-1h6a1 1 0 011 1v4" />
      <line x1="12" y1="12" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v10a2 2 0 01-2 2h-2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ── Nav section type ──────────────────────────────────────────────────────────
interface NavSection {
  sectionLabel: string
  items: { id: Tab; labelKey: string; icon: React.ReactNode }[]
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminSidebar({ tab, setTab, stats, user, lang }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const sections: NavSection[] = [
    {
      sectionLabel: t('admin.sectionOverview', lang),
      items: [
        { id: 'dashboard', labelKey: 'admin.dashboard', icon: <IconDashboard /> },
      ],
    },
    {
      sectionLabel: t('admin.sectionUsers', lang),
      items: [
        { id: 'users', labelKey: 'admin.users', icon: <IconUsers /> },
      ],
    },
    {
      sectionLabel: t('admin.sectionInventory', lang),
      items: [
        { id: 'listings',   labelKey: 'admin.listings',   icon: <IconListings /> },
        { id: 'moderation', labelKey: 'admin.moderation', icon: <IconShield /> },
      ],
    },
    {
      sectionLabel: t('admin.sectionDealers', lang),
      items: [
        { id: 'dealers', labelKey: 'admin.tabDealers', icon: <IconBuilding /> },
      ],
    },
    {
      sectionLabel: t('admin.sectionCatalog', lang),
      items: [
        { id: 'brands',     labelKey: 'admin.tabBrandsModels', icon: <IconCar /> },
        { id: 'categories', labelKey: 'admin.tabCategories',   icon: <IconTag /> },
        { id: 'banners',    labelKey: 'admin.tabBanners',      icon: <IconImage /> },
      ],
    },
    {
      sectionLabel: t('admin.sectionSystem', lang),
      items: [
        { id: 'system', labelKey: 'admin.system', icon: <IconSettings /> },
      ],
    },
  ]

  function getLabel(item: NavSection['items'][0]): string {
    return t(item.labelKey as Parameters<typeof t>[0], lang)
  }

  const sidebarContent = (
    <aside
      style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}
      aria-label={t('admin.title', lang)}
    >
      {/* ── Header ── */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Link
            href="/dashboard"
            aria-label={t('admin.navBack', lang)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              color: 'var(--text-secondary)',
              background: 'var(--surface)',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <IconArrowLeft />
          </Link>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              {t('admin.title', lang)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
              TAJCAR.TJ
            </div>
          </div>
        </div>

        {/* User badge */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {(user.name ?? user.phone ?? '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name ?? user.phone}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.role}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }} aria-label={t('admin.navLabel', lang)}>
        {sections.map((section) => (
          <div key={section.sectionLabel} style={{ marginBottom: '4px' }}>
            {/* Section label */}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '10px 12px 4px',
              }}
            >
              {section.sectionLabel}
            </div>

            {/* Items */}
            {section.items.map((navItem) => {
              const { id, icon } = navItem
              const label = getLabel(navItem)
              const isActive = tab === id
              return (
                <button
                  key={id}
                  onClick={() => { setTab(id); setMobileOpen(false) }}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left',
                    marginBottom: '1px',
                    transition: 'background 0.12s, color 0.12s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--surface)'
                      e.currentTarget.style.color = 'var(--text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }
                  }}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '6px',
                        bottom: '6px',
                        width: '3px',
                        background: 'var(--accent)',
                        borderRadius: '0 2px 2px 0',
                      }}
                      aria-hidden="true"
                    />
                  )}
                  {icon}
                  <span style={{ flex: 1 }}>{label}</span>
                  {/* Pending badge on moderation */}
                  {id === 'moderation' && stats && stats.pending_listings > 0 && (
                    <span
                      style={{
                        background: 'var(--color-error)',
                        color: 'var(--color-white)',
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        minWidth: '18px',
                        textAlign: 'center',
                      }}
                      aria-label={`${stats.pending_listings} ${t('admin.pendingWait', lang)}`}
                    >
                      {stats.pending_listings}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          TAJCAR.TJ &copy; {new Date().getFullYear()}
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="admin-sidebar-desktop" style={{ display: 'contents' }}>
        {sidebarContent}
      </div>

      {/* Mobile: hamburger button + overlay drawer */}
      <div className="admin-sidebar-mobile">
        {/* Mobile top bar */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--card)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
          className="admin-mobile-topbar"
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            {t('admin.title', lang)}
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label={t('admin.navOpen', lang)}
            aria-expanded={mobileOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            <IconMenu />
          </button>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
            }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '240px',
            zIndex: 101,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.title', lang)}
        >
          <div style={{ position: 'relative', height: '100%' }}>
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label={t('admin.navClose', lang)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '-44px',
                width: '36px',
                height: '36px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text)',
                zIndex: 102,
              }}
            >
              <IconClose />
            </button>
            {sidebarContent}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-topbar { display: flex !important; }
        }
        @media (min-width: 768px) {
          .admin-sidebar-mobile { display: none; }
        }
      `}</style>
    </>
  )
}
