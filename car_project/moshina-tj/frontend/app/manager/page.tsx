'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { ManagerStats, Listing, UserRole } from '@/types'
import type { ModeratorActivity } from '@/lib/api'

type Tab = 'stats' | 'listings' | 'moderators'
type Period = 'today' | 'week' | 'month' | 'total'

const ALLOWED_ROLES: UserRole[] = ['manager', 'admin']

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function ManagerPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('stats')

  // Stats
  const [stats, setStats] = useState<ManagerStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [period, setPeriod] = useState<Period>('today')

  // Moderators
  const [moderators, setModerators] = useState<ModeratorActivity[]>([])
  const [moderatorsLoading, setModeratorsLoading] = useState(false)

  // Listings
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsTotal, setListingsTotal] = useState(0)
  const [listingsPages, setListingsPages] = useState(1)
  const [listingsPage, setListingsPage] = useState(1)
  const [listingsLoading, setListingsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    if (tab === 'stats' && !stats) {
      setStatsLoading(true)
      adminApi.getManagerStats()
        .then((res) => setStats(res.data.data))
        .catch(() => {})
        .finally(() => setStatsLoading(false))
    }
    if (tab === 'moderators' && moderators.length === 0) {
      setModeratorsLoading(true)
      adminApi.getModeratorActivity()
        .then((res) => setModerators(res.data.data))
        .catch(() => {})
        .finally(() => setModeratorsLoading(false))
    }
  }, [tab, user, stats, moderators.length])

  const fetchListings = useCallback(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    setListingsLoading(true)
    const status = activeFilter === 'all' ? undefined : activeFilter
    adminApi.getListings(status, listingsPage)
      .then((res) => {
        setListings(res.data.data.items)
        setListingsTotal(res.data.data.total)
        setListingsPages(res.data.data.pages)
      })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false))
  }, [user, activeFilter, listingsPage])

  useEffect(() => {
    if (tab === 'listings') fetchListings()
  }, [tab, fetchListings])

  async function handleActivate(id: string) {
    setActionLoading(id + '_activate')
    try {
      await adminApi.activateListing(id)
      fetchListings()
    } catch {
      // no-op
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDeactivate(id: string) {
    setActionLoading(id + '_deactivate')
    try {
      await adminApi.deactivateListing(id)
      fetchListings()
    } catch {
      // no-op
    } finally {
      setActionLoading(null)
    }
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  function UsersIcon() {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    )
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stats',      label: t('manager.statsTab', lang),      icon: <ChartIcon /> },
    { key: 'listings',   label: t('manager.listingsTab', lang),   icon: <ListIcon /> },
    { key: 'moderators', label: t('manager.moderatorsTab', lang), icon: <UsersIcon /> },
  ]

  const FILTER_OPTIONS: { value: 'all' | 'active' | 'inactive'; label: string }[] = [
    { value: 'all',      label: lang === 'ru' ? 'Все'       : 'Ҳама' },
    { value: 'active',   label: lang === 'ru' ? 'Активные'  : 'Фаъол' },
    { value: 'inactive', label: lang === 'ru' ? 'Неактивные': 'Ғайрифаъол' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6" style={{ paddingTop: '40px', paddingBottom: '60px' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>
              {t('nav.manager', lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {user.name ?? user.phone} · {user.role}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px', marginBottom: '28px', width: 'fit-content' }}>
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 600,
                  background: tab === key ? 'var(--card)' : 'transparent',
                  color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
                  boxShadow: tab === key ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          {tab === 'stats' && (
            <div className="animate-fade-in-up">
              {/* Period selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {(['today', 'week', 'month', 'total'] as Period[]).map((p) => {
                  const labels: Record<Period, string> = {
                    today: t('manager.today', lang),
                    week: t('manager.week', lang),
                    month: t('manager.month', lang),
                    total: t('manager.allTime', lang),
                  }
                  return (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                      padding: '7px 18px', borderRadius: '100px', fontWeight: 600, fontSize: '13px',
                      background: period === p ? 'var(--accent)' : 'var(--card)',
                      color: period === p ? 'var(--color-white)' : 'var(--text-muted)',
                      border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {labels[p]}
                    </button>
                  )
                })}
              </div>

              {statsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                      <div style={{ height: '32px', width: '60%', borderRadius: '6px', marginBottom: '8px' }} className="skeleton" />
                      <div style={{ height: '12px', width: '80%', borderRadius: '4px' }} className="skeleton" />
                    </div>
                  ))}
                </div>
              ) : stats ? (() => {
                type PeriodData = { new_users?: number; new_listings?: number; approved?: number; rejected?: number; users?: number; listings?: number; active?: number; pending?: number; dealers?: number }
                const data: PeriodData = period === 'total' ? stats.total : stats[period]
                const cards = period === 'total'
                  ? [
                      { label: t('manager.allTime', lang) + ' — ' + t('support.totalUsers', lang), value: data.users ?? 0, color: 'var(--accent)' },
                      { label: t('support.totalListings', lang), value: data.listings ?? 0, color: 'var(--accent)' },
                      { label: t('support.activeListings', lang), value: data.active ?? 0, color: 'var(--color-online)' },
                      { label: t('support.pendingListings', lang), value: data.pending ?? 0, color: 'var(--color-warning-alt)' },
                      { label: t('support.rejectedListings', lang), value: data.rejected ?? 0, color: 'var(--color-error)' },
                      { label: t('support.totalDealers', lang), value: data.dealers ?? 0, color: 'var(--accent)' },
                    ]
                  : [
                      { label: t('manager.newUsers', lang), value: data.new_users ?? 0, color: 'var(--accent)' },
                      { label: t('manager.newListings', lang), value: data.new_listings ?? 0, color: 'var(--accent)' },
                      { label: t('manager.approved', lang), value: data.approved ?? 0, color: 'var(--color-online)' },
                      { label: t('manager.rejected', lang), value: data.rejected ?? 0, color: 'var(--color-error)' },
                    ]
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {cards.map((card, i) => (
                      <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: card.color, display: 'block', marginBottom: '6px' }}>
                          {card.value.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</span>
                      </div>
                    ))}
                  </div>
                )
              })() : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '15px' }}>
                  {t('common.noData', lang)}
                </div>
              )}

              {/* Pending queue summary */}
              {stats && stats.total.pending > 0 && (
                <div style={{
                  marginTop: '24px', padding: '16px 20px', background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>
                    <strong style={{ color: 'var(--color-warning-alt)' }}>{stats.total.pending}</strong> {t('manager.awaitingReview', lang)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Listings Tab */}
          {tab === 'listings' && (
            <div className="animate-fade-in-up">
              {/* Filter pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setActiveFilter(opt.value); setListingsPage(1) }}
                    style={{
                      padding: '7px 16px', borderRadius: '20px', border: '1px solid',
                      borderColor: activeFilter === opt.value ? 'var(--accent)' : 'var(--border)',
                      background: activeFilter === opt.value ? 'var(--accent)' : 'var(--card)',
                      color: activeFilter === opt.value ? 'var(--color-white)' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '4px' }}>
                  {listingsTotal.toLocaleString()} {lang === 'ru' ? 'всего' : 'ҳамагӣ'}
                </span>
              </div>

              {listingsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '64px', height: '48px', borderRadius: '8px', flexShrink: 0 }} className="skeleton" />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ height: '14px', width: '55%', borderRadius: '4px' }} className="skeleton" />
                        <div style={{ height: '12px', width: '35%', borderRadius: '4px' }} className="skeleton" />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ width: '80px', height: '32px', borderRadius: '8px' }} className="skeleton" />
                        <div style={{ width: '80px', height: '32px', borderRadius: '8px' }} className="skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '15px' }}>
                  {t('catalog.noResults', lang)}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {listings.map((listing, i) => (
                      <div
                        key={listing.id}
                        className={`animate-fade-in-up delay-${Math.min(i + 1, 8) as 1|2|3|4|5|6|7|8}`}
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                      >
                        {/* Thumbnail */}
                        <div style={{ width: '72px', height: '52px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                          {listing.images && listing.images.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={(listing.images.find((img) => img.is_primary) ?? listing.images[0]).url}
                              alt={`${listing.brand} ${listing.model}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round">
                                <rect x="2" y="6" width="20" height="13" rx="2" />
                                <path d="M6 6l2-3h8l2 3" />
                                <circle cx="12" cy="13" r="3" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link
                            href={`/car/${listing.id}`}
                            style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                          >
                            {listing.brand} {listing.model} {listing.year}
                            <ExternalLinkIcon />
                          </Link>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                              {listing.price?.toLocaleString()} {listing.currency ?? 'USD'}
                            </span>
                            <span
                              style={{
                                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                                background: listing.is_active ? 'var(--color-success-dim)' : 'var(--color-error-dim)',
                                color: listing.is_active ? 'var(--color-success)' : 'var(--color-error)',
                              }}
                            >
                              {listing.is_active
                                ? (lang === 'ru' ? 'Активно' : 'Фаъол')
                                : (lang === 'ru' ? 'Неактивно' : 'Ғайрифаъол')}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              ID: {listing.id.slice(0, 8)}…
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {!listing.is_active && (
                            <button
                              onClick={() => handleActivate(listing.id)}
                              disabled={actionLoading === listing.id + '_activate'}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'var(--color-success-dim)', color: 'var(--color-success)',
                                fontSize: '13px', fontWeight: 700,
                                opacity: actionLoading === listing.id + '_activate' ? 0.5 : 1,
                                transition: 'opacity 0.15s ease',
                              }}
                            >
                              <CheckIcon />
                              {lang === 'ru' ? 'Активировать' : 'Фаъол кардан'}
                            </button>
                          )}
                          {listing.is_active && (
                            <button
                              onClick={() => handleDeactivate(listing.id)}
                              disabled={actionLoading === listing.id + '_deactivate'}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'var(--color-error-dim)', color: 'var(--color-error)',
                                fontSize: '13px', fontWeight: 700,
                                opacity: actionLoading === listing.id + '_deactivate' ? 0.5 : 1,
                                transition: 'opacity 0.15s ease',
                              }}
                            >
                              <XIcon />
                              {lang === 'ru' ? 'Деактивировать' : 'Хомӯш кардан'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {listingsPages > 1 && (
                    <div style={{ marginTop: '32px' }}>
                      <Pagination
                        page={listingsPage}
                        pages={listingsPages}
                        onPageChange={(p) => {
                          setListingsPage(p)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {/* Moderators Tab */}
          {tab === 'moderators' && (
            <div className="animate-fade-in-up">
              {moderatorsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('common.loading', lang)}</div>
              ) : moderators.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {t('common.noData', lang)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {moderators.map((mod) => (
                    <div key={mod.phone} style={{
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
                      padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '160px' }}>
                        <span style={{
                          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                          background: mod.is_online ? 'var(--color-online)' : 'var(--border)',
                        }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{mod.moderator_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mod.phone}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{mod.posts_today}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('manager.postsToday', lang)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{mod.sessions_today}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('manager.sessionsToday', lang)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: mod.is_online ? 'var(--color-online)' : 'var(--text-muted)' }}>
                            {mod.is_online ? t('manager.onlineNow', lang) : t('manager.offlineNow', lang)}
                          </div>
                          {mod.active_session_started_at && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {t('manager.activeSince', lang)} {new Date(mod.active_session_started_at).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  )
}
