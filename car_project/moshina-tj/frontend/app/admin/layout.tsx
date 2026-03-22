'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import { adminApi } from '@/lib/api'
import type { AdminStats } from '@/types'
import type { UserRole } from '@/types'
import { ToastProvider } from './components/ToastContext'
import {
  IconDashboard, IconUsers, IconListings, IconShield,
  IconBuilding, IconCar, IconImage, IconSettings,
  IconArrowLeft, IconMenu, IconClose,
} from './components/icons'

const ALLOWED_ROLES: UserRole[] = ['admin', 'moderator', 'manager', 'support']

interface NavItem {
  href: string
  labelRu: string
  labelTj: string
  icon: ReactNode
  roles: UserRole[]
  badge?: (stats: AdminStats | null) => number | null
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin/dashboard',
    labelRu: 'Обзор',
    labelTj: 'Баррасӣ',
    icon: <IconDashboard />,
    roles: ['admin', 'moderator', 'manager', 'support'],
  },
  {
    href: '/admin/users',
    labelRu: 'Пользователи',
    labelTj: 'Корбарон',
    icon: <IconUsers />,
    roles: ['admin', 'manager', 'support'],
  },
  {
    href: '/admin/listings',
    labelRu: 'Объявления',
    labelTj: 'Эълонҳо',
    icon: <IconListings />,
    roles: ['admin', 'moderator', 'manager'],
  },
  {
    href: '/admin/catalog',
    labelRu: 'Марки и модели',
    labelTj: 'Марка ва модел',
    icon: <IconCar />,
    roles: ['admin'],
  },
  {
    href: '/admin/dealers',
    labelRu: 'Дилеры',
    labelTj: 'Дилерҳо',
    icon: <IconBuilding />,
    roles: ['admin', 'manager'],
  },
  {
    href: '/admin/banners',
    labelRu: 'Баннеры',
    labelTj: 'Баннерҳо',
    icon: <IconImage />,
    roles: ['admin'],
  },
  {
    href: '/admin/system',
    labelRu: 'Система',
    labelTj: 'Система',
    icon: <IconSettings />,
    roles: ['admin'],
  },
]

function AdminSidebarNav({
  stats,
  onNavigate,
}: {
  stats: AdminStats | null
  onNavigate?: () => void
}) {
  const { user } = useAuth()
  const { lang } = useLang()
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    (item) => user?.role && item.roles.includes(user.role as UserRole)
  )

  return (
    <aside
      className="flex-shrink-0 flex flex-col sticky top-0 h-screen overflow-hidden border-r"
      style={{
        width: '240px',
        background: 'var(--card)',
        borderColor: 'var(--border)',
      }}
      aria-label={t('admin.title', lang)}
    >
      {/* Header */}
      <div className="px-4 pt-[18px] pb-[14px] border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-[10px] mb-3">
          <Link
            href="/dashboard"
            aria-label={lang === 'ru' ? 'Назад в профиль' : 'Ба профил баргашт'}
            className="flex items-center justify-center w-7 h-7 rounded-[6px] border shrink-0"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <IconArrowLeft />
          </Link>
          <div>
            <div className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text)' }}>
              {t('admin.title', lang)}
            </div>
            <div className="text-[11px] mt-px" style={{ color: 'var(--text-muted)' }}>
              MOSHINA.TJ
            </div>
          </div>
        </div>

        {user && (
          <div
            className="flex items-center gap-2 px-[10px] py-2 rounded-lg border"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold shrink-0"
              style={{
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
              }}
              aria-hidden="true"
            >
              {(user.name ?? user.phone ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div
                className="text-[12px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: 'var(--text)' }}
              >
                {user.name ?? user.phone}
              </div>
              <div
                className="text-[10px] font-bold uppercase tracking-[0.05em]"
                style={{ color: 'var(--accent)' }}
              >
                {user.role}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-[10px] py-3 overflow-y-auto"
        aria-label={lang === 'ru' ? 'Навигация' : 'Навигатсия'}
      >
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href + '/'))
          const label = lang === 'ru' ? item.labelRu : item.labelTj
          const badgeCount = item.badge ? item.badge(stats) : null

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className="w-full flex items-center gap-[10px] px-3 py-[9px] rounded-lg mb-px relative no-underline"
              style={{
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-[2px]"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
              )}
              {item.icon}
              <span className="flex-1">{label}</span>
              {badgeCount !== null && badgeCount > 0 && (
                <span
                  className="rounded-[100px] text-[10px] font-bold px-[6px] py-px min-w-[18px] text-center"
                  style={{
                    background: 'var(--color-error)',
                    color: 'var(--color-white)',
                  }}
                  aria-label={`${badgeCount}`}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-center text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        MOSHINA.TJ &copy; {new Date().getFullYear()}
      </div>
    </aside>
  )
}

function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const pathname = usePathname()

  // Auth guard — skip for login route
  useEffect(() => {
    if (pathname.startsWith('/admin/login')) return
    if (!user) {
      router.replace('/admin/login')
      return
    }
    if (!ALLOWED_ROLES.includes(user.role as UserRole)) {
      router.replace('/')
    }
  }, [user, router, pathname])

  // Fetch stats for sidebar badge (silently)
  useEffect(() => {
    if (pathname.startsWith('/admin/login')) return
    if (!user || !ALLOWED_ROLES.includes(user.role as UserRole)) return
    adminApi.getStats().then((res) => setStats(res.data.data)).catch(() => {})
  }, [user, pathname])

  // Login page renders without sidebar
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>
  }

  // While auth is resolving, render nothing to avoid flicker
  if (!user || !ALLOWED_ROLES.includes(user.role as UserRole)) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Mobile top bar */}
      <div
        className="admin-mobile-topbar items-center justify-between px-4 py-3 sticky top-0 z-50 border-b"
        style={{
          display: 'none',
          background: 'var(--card)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
          {t('admin.title', 'ru')}
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        >
          <IconMenu />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <div className="admin-sidebar-desktop" style={{ display: 'contents' }}>
          <AdminSidebarNav stats={stats} />
        </div>

        {/* Mobile overlay + drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <div
          className="admin-mobile-drawer fixed top-0 left-0 bottom-0 z-[101]"
          style={{
            width: '240px',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="relative h-full">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer z-[102]"
              style={{
                right: '-44px',
                background: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              <IconClose />
            </button>
            <AdminSidebarNav stats={stats} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-mobile-topbar { display: flex !important; }
        }
        @media (min-width: 768px) {
          .admin-mobile-drawer { display: none; }
          .admin-mobile-topbar { display: none; }
        }
      `}</style>
    </div>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  )
}
