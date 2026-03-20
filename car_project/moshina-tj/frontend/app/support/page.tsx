'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { SupportStats, User, Listing, UserRole } from '@/types'

const ALLOWED_ROLES: UserRole[] = ['support', 'manager', 'admin']

type Tab = 'stats' | 'banned' | 'rejected'

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <span style={{ fontSize: '28px', fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {value.toLocaleString()}
      </span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

export default function SupportPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<SupportStats | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Banned users
  const [bannedUsers, setBannedUsers] = useState<User[]>([])
  const [bannedPage, setBannedPage] = useState(1)
  const [bannedTotal, setBannedTotal] = useState(0)
  const [bannedPages, setBannedPages] = useState(1)

  // Rejected listings
  const [rejectedListings, setRejectedListings] = useState<Listing[]>([])
  const [rejectedPage, setRejectedPage] = useState(1)
  const [rejectedTotal, setRejectedTotal] = useState(0)
  const [rejectedPages, setRejectedPages] = useState(1)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  const fetchStats = useCallback(() => {
    setLoading(true)
    adminApi.getSupportStats()
      .then((res) => { setStats(res.data.data); setLastRefresh(new Date()) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchBannedUsers = useCallback((page: number) => {
    adminApi.getUsers(page, undefined, undefined, true)
      .then((res) => {
        setBannedUsers(res.data.data.items)
        setBannedTotal(res.data.data.total)
        setBannedPages(res.data.data.pages)
      })
      .catch(() => {})
  }, [])

  const fetchRejectedListings = useCallback((page: number) => {
    adminApi.getListings('rejected', page)
      .then((res) => {
        setRejectedListings(res.data.data.items)
        setRejectedTotal(res.data.data.total)
        setRejectedPages(res.data.data.pages)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    fetchStats()
  }, [user, fetchStats])

  useEffect(() => {
    if (tab === 'banned') fetchBannedUsers(bannedPage)
  }, [tab, bannedPage, fetchBannedUsers])

  useEffect(() => {
    if (tab === 'rejected') fetchRejectedListings(rejectedPage)
  }, [tab, rejectedPage, fetchRejectedListings])

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: t('admin.stats', lang) },
    { key: 'banned', label: t('support.bannedTab', lang) },
    { key: 'rejected', label: t('support.rejectedTab', lang) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            {t('support.title', lang)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>
            {user.name ?? user.phone} · {user.role}
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {TABS.map((tb) => (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{
                padding: '8px 20px', borderRadius: '100px', fontWeight: 600, fontSize: '14px',
                background: tab === tb.key ? 'var(--accent)' : 'var(--card)',
                color: tab === tb.key ? 'var(--color-white)' : 'var(--text-muted)',
                border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {tb.label}
              </button>
            ))}
          </div>

          {/* Stats Tab */}
          {tab === 'stats' && (
            <div>
              {stats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    <StatCard label={t('support.totalUsers', lang)} value={stats.total_users} accent />
                    <StatCard label={t('support.bannedUsers', lang)} value={stats.banned_users} />
                    <StatCard label={t('support.totalListings', lang)} value={stats.total_listings} accent />
                    <StatCard label={t('support.activeListings', lang)} value={stats.active_listings} />
                    <StatCard label={t('support.pendingListings', lang)} value={stats.pending_listings} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <StatCard label={t('support.rejectedListings', lang)} value={stats.rejected_listings} />
                    <StatCard label={t('support.totalDealers', lang)} value={stats.total_dealers} accent />
                    <StatCard label={t('support.verifiedDealers', lang)} value={stats.verified_dealers} />
                    <StatCard label={t('support.todayNewUsers', lang)} value={stats.today_new_users} accent />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-8" style={{ maxWidth: '400px' }}>
                    <StatCard label={t('support.todayNewListings', lang)} value={stats.today_new_listings} accent />
                  </div>

                  {/* System Health */}
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px',
                    padding: '24px', marginTop: '8px',
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
                      {t('support.systemHealth', lang)}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-online)', display: 'inline-block' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>API: {t('support.systemOk', lang)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-online)', display: 'inline-block' }} />
                        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>DB: {t('support.systemOk', lang)}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {t('support.lastRefresh', lang)}: {lastRefresh.toLocaleTimeString()}
                      </div>
                      <button onClick={fetchStats} disabled={loading} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                        background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      }}>
                        <RefreshIcon />
                        {t('support.refresh', lang)}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {t('common.loading', lang)}
                </div>
              )}
            </div>
          )}

          {/* Banned Users Tab */}
          {tab === 'banned' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {bannedTotal} {t('support.bannedUsers', lang).toLowerCase()}
              </p>
              {bannedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {t('support.noBannedUsers', lang)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bannedUsers.map((u) => (
                    <div key={u.id} style={{
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
                      padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                          {u.name ?? u.phone}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{u.phone}</div>
                        {u.ban_reason && (
                          <div style={{ fontSize: '13px', color: 'var(--color-error)', background: 'var(--color-error-dim)', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
                            {t('support.banReason', lang)}: {u.ban_reason}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {bannedPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={bannedPage} pages={bannedPages} onPageChange={setBannedPage} />
                </div>
              )}
            </div>
          )}

          {/* Rejected Listings Tab */}
          {tab === 'rejected' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {rejectedTotal} {t('support.rejectedListings', lang).toLowerCase()}
              </p>
              {rejectedListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {t('support.noRejectedListings', lang)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {rejectedListings.map((l) => (
                    <div key={l.id} style={{
                      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
                      padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                          {l.brand} {l.model} {l.year} · {l.city}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          {l.price.toLocaleString()} {l.currency}
                        </div>
                        {l.rejection_reason && (
                          <div style={{ fontSize: '13px', color: 'var(--color-error)', background: 'var(--color-error-dim)', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>
                            {t('support.rejectionReason', lang)}: {l.rejection_reason}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(l.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {rejectedPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={rejectedPage} pages={rejectedPages} onPageChange={setRejectedPage} />
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
