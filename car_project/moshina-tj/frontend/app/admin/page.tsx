'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Pagination from '@/components/Pagination'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { AdminStats, User, Listing, Dealer, UserRole } from '@/types'

type Tab = 'stats' | 'users' | 'listings' | 'moderation' | 'dealers'

const ALLOWED_ROLES: UserRole[] = ['admin', 'moderator', 'manager']
const ALL_ROLES: UserRole[] = ['user', 'dealer', 'moderator', 'manager', 'support', 'admin']

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text)',
  borderBottom: '1px solid var(--border)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
}

export default function AdminPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('stats')

  // ─── Stats ───────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // ─── Users ───────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPages, setUsersPages] = useState(1)
  const [usersPage, setUsersPage] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [bannedFilter, setBannedFilter] = useState<'' | 'banned' | 'active'>('')

  // Role modal
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [roleUpdating, setRoleUpdating] = useState(false)

  // Ban modal
  const [banModalUser, setBanModalUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banUpdating, setBanUpdating] = useState(false)

  // ─── Listings ────────────────────────────────────────────────────────────
  const [adminListings, setAdminListings] = useState<Listing[]>([])
  const [adminListingsTotal, setAdminListingsTotal] = useState(0)
  const [adminListingsPages, setAdminListingsPages] = useState(1)
  const [adminListingsPage, setAdminListingsPage] = useState(1)
  const [adminListingsLoading, setAdminListingsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all')
  const [listingSearch, setListingSearch] = useState('')

  // ─── Moderation ──────────────────────────────────────────────────────────
  const [pendingListings, setPendingListings] = useState<Listing[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [pendingPages, setPendingPages] = useState(1)
  const [pendingPage, setPendingPage] = useState(1)
  const [pendingLoading, setPendingLoading] = useState(false)

  // Reject modal
  const [rejectModal, setRejectModal] = useState<Listing | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectUpdating, setRejectUpdating] = useState(false)

  // ─── Dealers ─────────────────────────────────────────────────────────────
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [dealersTotal, setDealersTotal] = useState(0)
  const [dealersPages, setDealersPages] = useState(1)
  const [dealersPage, setDealersPage] = useState(1)
  const [dealersLoading, setDealersLoading] = useState(false)
  const [dealerVerifiedFilter, setDealerVerifiedFilter] = useState<'' | 'verified' | 'unverified'>('')

  // ─── Guards ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  // ─── Stats fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'stats' && !stats) {
      setStatsLoading(true)
      adminApi.getStats()
        .then((res) => setStats(res.data.data))
        .catch(() => {})
        .finally(() => setStatsLoading(false))
    }
  }, [tab, stats])

  // ─── Users fetch ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(() => {
    setUsersLoading(true)
    const isBanned = bannedFilter === 'banned' ? true : bannedFilter === 'active' ? false : undefined
    adminApi.getUsers(usersPage, roleFilter || undefined, userSearch || undefined, isBanned)
      .then((res) => {
        setUsers(res.data.data.items)
        setUsersTotal(res.data.data.total)
        setUsersPages(res.data.data.pages)
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false))
  }, [usersPage, roleFilter, userSearch, bannedFilter])

  useEffect(() => {
    if (tab === 'users') fetchUsers()
  }, [tab, fetchUsers])

  // ─── Listings fetch ───────────────────────────────────────────────────────
  const fetchAdminListings = useCallback(() => {
    setAdminListingsLoading(true)
    const status = statusFilter === 'all' ? undefined : statusFilter
    adminApi.getListings(status, adminListingsPage, listingSearch || undefined)
      .then((res) => {
        setAdminListings(res.data.data.items)
        setAdminListingsTotal(res.data.data.total)
        setAdminListingsPages(res.data.data.pages)
      })
      .catch(() => {})
      .finally(() => setAdminListingsLoading(false))
  }, [statusFilter, adminListingsPage, listingSearch])

  useEffect(() => {
    if (tab === 'listings') fetchAdminListings()
  }, [tab, fetchAdminListings])

  // ─── Pending fetch ────────────────────────────────────────────────────────
  const fetchPending = useCallback(() => {
    setPendingLoading(true)
    adminApi.getPendingListings(pendingPage)
      .then((res) => {
        setPendingListings(res.data.data.items)
        setPendingTotal(res.data.data.total)
        setPendingPages(res.data.data.pages)
      })
      .catch(() => {})
      .finally(() => setPendingLoading(false))
  }, [pendingPage])

  useEffect(() => {
    if (tab === 'moderation') fetchPending()
  }, [tab, fetchPending])

  // ─── Dealers fetch ────────────────────────────────────────────────────────
  const fetchDealers = useCallback(() => {
    setDealersLoading(true)
    const verified = dealerVerifiedFilter === 'verified' ? true : dealerVerifiedFilter === 'unverified' ? false : undefined
    adminApi.getDealers(dealersPage, verified)
      .then((res) => {
        setDealers(res.data.data.items)
        setDealersTotal(res.data.data.total)
        setDealersPages(res.data.data.pages)
      })
      .catch(() => {})
      .finally(() => setDealersLoading(false))
  }, [dealersPage, dealerVerifiedFilter])

  useEffect(() => {
    if (tab === 'dealers') fetchDealers()
  }, [tab, fetchDealers])

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function updateRole(userId: string, role: string) {
    setRoleUpdating(true)
    try {
      await adminApi.updateUserRole(userId, role)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as UserRole } : u))
      setRoleModalUser(null)
    } catch {}
    setRoleUpdating(false)
  }

  async function handleBan(userId: string) {
    setBanUpdating(true)
    try {
      await adminApi.banUser(userId, banReason || undefined)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: true, ban_reason: banReason || undefined } : u))
      setBanModalUser(null)
      setBanReason('')
    } catch {}
    setBanUpdating(false)
  }

  async function handleUnban(userId: string) {
    try {
      await adminApi.unbanUser(userId)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: false, ban_reason: undefined } : u))
    } catch {}
  }

  async function deleteUser(userId: string) {
    if (!window.confirm(t('admin.confirmDelete', lang))) return
    try {
      await adminApi.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch {}
  }

  async function toggleAdminListing(id: string, isActive: boolean) {
    try {
      if (isActive) {
        await adminApi.deactivateListing(id)
        setAdminListings((prev) => prev.map((l) => l.id === id ? { ...l, is_active: false, status: 'rejected' } : l))
      } else {
        await adminApi.activateListing(id)
        setAdminListings((prev) => prev.map((l) => l.id === id ? { ...l, is_active: true, status: 'active' } : l))
      }
    } catch {}
  }

  async function approveListing(id: string) {
    try {
      await adminApi.approveListing(id)
      setPendingListings((prev) => prev.filter((l) => l.id !== id))
      setPendingTotal((t) => t - 1)
      if (stats) setStats({ ...stats, pending_listings: stats.pending_listings - 1, active_listings: stats.active_listings + 1 })
    } catch {}
  }

  async function rejectListing(id: string, reason: string) {
    setRejectUpdating(true)
    try {
      await adminApi.rejectListing(id, reason)
      setPendingListings((prev) => prev.filter((l) => l.id !== id))
      setPendingTotal((t) => t - 1)
      if (stats) setStats({ ...stats, pending_listings: stats.pending_listings - 1 })
      setRejectModal(null)
      setRejectReason('')
    } catch {}
    setRejectUpdating(false)
  }

  async function toggleDealerVerification(dealerId: string, verified: boolean) {
    try {
      if (verified) {
        await adminApi.unverifyDealer(dealerId)
      } else {
        await adminApi.verifyDealer(dealerId)
      }
      setDealers((prev) => prev.map((d) => d.id === dealerId ? { ...d, verified: !verified } : d))
    } catch {}
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  const tabDefs: { key: Tab; label: string }[] = [
    { key: 'stats', label: t('admin.stats', lang) },
    { key: 'users', label: t('admin.users', lang) },
    { key: 'listings', label: t('admin.listings', lang) },
    { key: 'moderation', label: `${lang === 'ru' ? 'Модерация' : 'Тасдиқ'}${stats ? ` (${stats.pending_listings})` : ''}` },
    { key: 'dealers', label: lang === 'ru' ? 'Дилеры' : 'Фурӯшандагон' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '28px' }}>
            {t('admin.title', lang)}
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px', overflowX: 'auto' }}>
            {tabDefs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '10px 20px', fontWeight: 700, fontSize: '14px',
                  background: 'none', border: 'none',
                  borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                  color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Stats ── */}
          {tab === 'stats' && (
            <div className="animate-fade-in">
              {statsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ height: '100px', borderRadius: '12px' }} className="skeleton" />
                  ))}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: t('admin.totalUsers', lang), value: stats.total_users },
                    { label: t('admin.totalListings', lang), value: stats.total_listings },
                    { label: t('admin.activeListings', lang), value: stats.active_listings },
                    { label: t('admin.totalDealers', lang), value: stats.total_dealers },
                    { label: t('admin.pending', lang), value: stats.pending_listings },
                  ].map((stat) => (
                    <div key={stat.label} className="animate-fade-in-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent)' }}>{stat.value.toLocaleString()}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>{t('common.noData', lang)}</p>
              )}
            </div>
          )}

          {/* ── Users ── */}
          {tab === 'users' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={lang === 'ru' ? 'Поиск по имени или телефону' : 'Ном ё телефон...'}
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1) }}
                  style={{ ...inputStyle, minWidth: '200px', flex: 1 }}
                />
                <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setUsersPage(1) }} style={inputStyle}>
                  <option value="">{t('admin.all', lang)}</option>
                  {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={bannedFilter} onChange={(e) => { setBannedFilter(e.target.value as typeof bannedFilter); setUsersPage(1) }} style={inputStyle}>
                  <option value="">{t('admin.all', lang)}</option>
                  <option value="banned">{lang === 'ru' ? 'Заблокированные' : 'Бандшуда'}</option>
                  <option value="active">{lang === 'ru' ? 'Активные' : 'Фаъол'}</option>
                </select>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {usersTotal.toLocaleString()} {lang === 'ru' ? 'польз.' : 'корбар'}
                </span>
              </div>

              {usersLoading ? (
                <div style={{ height: '300px', borderRadius: '12px' }} className="skeleton" />
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                    <thead style={{ background: 'var(--surface)' }}>
                      <tr>
                        <th style={thStyle}>{t('admin.name', lang)}</th>
                        <th style={thStyle}>{t('admin.phone', lang)}</th>
                        <th style={thStyle}>{t('admin.role', lang)}</th>
                        <th style={thStyle}>{lang === 'ru' ? 'Статус' : 'Ҳолат'}</th>
                        <th style={thStyle}>{t('admin.created', lang)}</th>
                        <th style={thStyle}>{t('admin.actions', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                          <td style={tdStyle}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.name ?? '—'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.id.slice(0, 8)}...</div>
                            </div>
                          </td>
                          <td style={tdStyle}>{u.phone}</td>
                          <td style={tdStyle}>
                            <span style={{ background: 'var(--tag-bg)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {u.is_banned ? (
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(200,56,8,0.1)', color: 'var(--accent)' }}>
                                {lang === 'ru' ? 'Заблокирован' : 'Бандшуда'}
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                                {lang === 'ru' ? 'Активен' : 'Фаъол'}
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {user.role === 'admin' && (
                                <button
                                  onClick={() => { setRoleModalUser(u); setNewRole(u.role) }}
                                  style={{ padding: '4px 8px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {t('admin.changeRole', lang)}
                                </button>
                              )}
                              {u.id !== user.id && (
                                u.is_banned ? (
                                  <button
                                    onClick={() => handleUnban(u.id)}
                                    style={{ padding: '4px 8px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    {lang === 'ru' ? 'Разбан' : 'Барқарор'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { setBanModalUser(u); setBanReason('') }}
                                    style={{ padding: '4px 8px', background: 'rgba(200,56,8,0.08)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    {lang === 'ru' ? 'Заблок.' : 'Банд'}
                                  </button>
                                )
                              )}
                              {user.role === 'admin' && u.id !== user.id && (
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  style={{ padding: '4px 8px', background: 'rgba(200,56,8,0.08)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {t('admin.deleteUser', lang)}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('catalog.noResults', lang)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {usersPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={usersPage} pages={usersPages} onPageChange={setUsersPage} />
                </div>
              )}
            </div>
          )}

          {/* ── Listings ── */}
          {tab === 'listings' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={lang === 'ru' ? 'Поиск: марка, модель, город' : 'Ҷустуҷӯ: марка, модел, шаҳр'}
                  value={listingSearch}
                  onChange={(e) => { setListingSearch(e.target.value); setAdminListingsPage(1) }}
                  style={{ ...inputStyle, minWidth: '200px', flex: 1 }}
                />
                {(['all', 'active', 'pending', 'rejected'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setAdminListingsPage(1) }}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                      background: statusFilter === f ? 'var(--accent)' : 'var(--surface)',
                      color: statusFilter === f ? '#fff' : 'var(--text-muted)',
                      border: statusFilter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {f === 'all' ? t('admin.all', lang) : f === 'active' ? (lang === 'ru' ? 'Активные' : 'Фаъол') : f === 'pending' ? (lang === 'ru' ? 'На проверке' : 'Дар интизор') : (lang === 'ru' ? 'Отклонённые' : 'Рад шуда')}
                  </button>
                ))}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {adminListingsTotal.toLocaleString()} {lang === 'ru' ? 'объявл.' : 'эълон'}
                </span>
              </div>

              {adminListingsLoading ? (
                <div style={{ height: '300px', borderRadius: '12px' }} className="skeleton" />
              ) : (
                <AdminListingsTable
                  listings={adminListings}
                  lang={lang}
                  onToggle={toggleAdminListing}
                />
              )}

              {adminListingsPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={adminListingsPage} pages={adminListingsPages} onPageChange={setAdminListingsPage} />
                </div>
              )}
            </div>
          )}

          {/* ── Moderation ── */}
          {tab === 'moderation' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                    {lang === 'ru' ? 'Очередь модерации' : 'Навбати тасдиқ'}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {lang === 'ru' ? 'Новые объявления ждут проверки' : 'Эълонҳои нав дар интизори тасдиқ'}
                    {' '}<strong style={{ color: 'var(--accent)' }}>{pendingTotal}</strong>
                  </p>
                </div>
                <button
                  onClick={fetchPending}
                  style={{ padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
                >
                  {lang === 'ru' ? 'Обновить' : 'Янавкунӣ'}
                </button>
              </div>

              {pendingLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ height: '100px', borderRadius: '12px' }} className="skeleton" />
                  ))}
                </div>
              ) : pendingListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p style={{ fontSize: '16px', fontWeight: 600 }}>
                    {lang === 'ru' ? 'Очередь пуста — все проверено!' : 'Навбат холӣ аст — ҳама тасдиқ шуд!'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingListings.map((listing) => {
                    const primary = listing.images.find((i) => i.is_primary) ?? listing.images[0]
                    return (
                      <div key={listing.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ width: '100px', height: '76px', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, position: 'relative' }}>
                          {primary ? (
                            <Image src={primary.url} alt="" fill sizes="100px" style={{ objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'var(--border)' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <Link href={`/car/${listing.id}`} target="_blank" style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)', textDecoration: 'none' }}>
                              {listing.brand} {listing.model} {listing.year}
                            </Link>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(234,179,8,0.15)', color: '#ca8a04', fontWeight: 700 }}>
                              {lang === 'ru' ? 'На проверке' : 'Дар интизор'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>{listing.city}</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                              {listing.currency === 'USD' ? '$' : ''}{Number(listing.price).toLocaleString()}{listing.currency === 'TJS' ? ' сом.' : ''}
                            </span>
                            <span>{listing.type}</span>
                            <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                          </div>
                          {listing.description && (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {listing.description}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button
                            onClick={() => approveListing(listing.id)}
                            style={{ padding: '8px 18px', background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {lang === 'ru' ? 'Одобрить' : 'Тасдиқ'}
                          </button>
                          <button
                            onClick={() => { setRejectModal(listing); setRejectReason('') }}
                            style={{ padding: '8px 18px', background: 'rgba(200,56,8,0.08)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {lang === 'ru' ? 'Отклонить' : 'Рад кардан'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {pendingPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={pendingPage} pages={pendingPages} onPageChange={setPendingPage} />
                </div>
              )}
            </div>
          )}

          {/* ── Dealers ── */}
          {tab === 'dealers' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(['', 'verified', 'unverified'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setDealerVerifiedFilter(f); setDealersPage(1) }}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                      background: dealerVerifiedFilter === f ? 'var(--accent)' : 'var(--surface)',
                      color: dealerVerifiedFilter === f ? '#fff' : 'var(--text-muted)',
                      border: dealerVerifiedFilter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {f === '' ? t('admin.all', lang) : f === 'verified' ? (lang === 'ru' ? 'Верифицированные' : 'Тасдиқшуда') : (lang === 'ru' ? 'Неверифицированные' : 'Тасдиқнашуда')}
                  </button>
                ))}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                  {dealersTotal} {lang === 'ru' ? 'дилеров' : 'дилер'}
                </span>
              </div>

              {dealersLoading ? (
                <div style={{ height: '300px', borderRadius: '12px' }} className="skeleton" />
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
                    <thead style={{ background: 'var(--surface)' }}>
                      <tr>
                        <th style={thStyle}>{lang === 'ru' ? 'Компания' : 'Ширкат'}</th>
                        <th style={thStyle}>{t('catalog.city', lang)}</th>
                        <th style={thStyle}>{t('admin.phone', lang)}</th>
                        <th style={thStyle}>{lang === 'ru' ? 'Верификация' : 'Тасдиқ'}</th>
                        <th style={thStyle}>{t('admin.created', lang)}</th>
                        <th style={thStyle}>{t('admin.actions', lang)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealers.map((d) => (
                        <tr key={d.id} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 700 }}>{d.business_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.address ?? ''}</div>
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{d.city ?? '—'}</td>
                          <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{d.phone ?? '—'}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                              background: d.verified ? 'rgba(22,163,74,0.1)' : 'rgba(200,56,8,0.1)',
                              color: d.verified ? '#16a34a' : 'var(--accent)',
                            }}>
                              {d.verified ? (lang === 'ru' ? 'Верифицирован' : 'Тасдиқшуда') : (lang === 'ru' ? 'Не верифицирован' : 'Тасдиқнашуда')}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                            {new Date(d.created_at).toLocaleDateString()}
                          </td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => toggleDealerVerification(d.id, d.verified)}
                              style={{
                                padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none',
                                background: d.verified ? 'rgba(200,56,8,0.08)' : 'rgba(22,163,74,0.1)',
                                color: d.verified ? 'var(--accent)' : '#16a34a',
                              }}
                            >
                              {d.verified ? (lang === 'ru' ? 'Снять' : 'Бекор') : (lang === 'ru' ? 'Верифицировать' : 'Тасдиқ кардан')}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {dealers.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('catalog.noResults', lang)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {dealersPages > 1 && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination page={dealersPage} pages={dealersPages} onPageChange={setDealersPage} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* ── Role Modal ── */}
      {roleModalUser && (
        <>
          <div onClick={() => setRoleModalUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
          <div className="animate-scale-in" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(360px, 90vw)', background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '28px', zIndex: 401,
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px' }}>
              {t('admin.changeRole', lang)}: {roleModalUser.name ?? roleModalUser.phone}
            </h3>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', color: 'var(--text)', outline: 'none', marginBottom: '16px' }}
            >
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => updateRole(roleModalUser.id, newRole)}
                disabled={roleUpdating}
                style={{ flex: 1, background: roleUpdating ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: roleUpdating ? 'not-allowed' : 'pointer' }}
              >
                {roleUpdating ? t('common.loading', lang) : t('dashboard.save', lang)}
              </button>
              <button
                onClick={() => setRoleModalUser(null)}
                style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {t('dashboard.cancel', lang)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Ban Modal ── */}
      {banModalUser && (
        <>
          <div onClick={() => setBanModalUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
          <div className="animate-scale-in" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(400px, 90vw)', background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '28px', zIndex: 401,
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              {lang === 'ru' ? 'Заблокировать пользователя' : 'Корбарро банд кардан'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {banModalUser.name ?? banModalUser.phone}
            </p>
            <textarea
              placeholder={lang === 'ru' ? 'Причина блокировки (необязательно)' : 'Сабаби банд кардан (ихтиёрӣ)'}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', color: 'var(--text)', outline: 'none', resize: 'vertical', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleBan(banModalUser.id)}
                disabled={banUpdating}
                style={{ flex: 1, background: banUpdating ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: banUpdating ? 'not-allowed' : 'pointer' }}
              >
                {banUpdating ? t('common.loading', lang) : (lang === 'ru' ? 'Заблокировать' : 'Банд кардан')}
              </button>
              <button
                onClick={() => setBanModalUser(null)}
                style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {t('dashboard.cancel', lang)}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <>
          <div onClick={() => setRejectModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
          <div className="animate-scale-in" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(420px, 90vw)', background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '28px', zIndex: 401,
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              {lang === 'ru' ? 'Отклонить объявление' : 'Эълонро рад кардан'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {rejectModal.brand} {rejectModal.model} {rejectModal.year}
            </p>
            <textarea
              placeholder={lang === 'ru' ? 'Причина отклонения (обязательно)' : 'Сабаби рад кардан (ҳатмӣ)'}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', color: 'var(--text)', outline: 'none', resize: 'vertical', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => rejectListing(rejectModal.id, rejectReason)}
                disabled={rejectUpdating || !rejectReason.trim()}
                style={{ flex: 1, background: rejectUpdating || !rejectReason.trim() ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: rejectUpdating || !rejectReason.trim() ? 'not-allowed' : 'pointer' }}
              >
                {rejectUpdating ? t('common.loading', lang) : (lang === 'ru' ? 'Отклонить' : 'Рад кардан')}
              </button>
              <button
                onClick={() => setRejectModal(null)}
                style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {t('dashboard.cancel', lang)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AdminListingsTable({
  listings,
  lang,
  onToggle,
}: {
  listings: Listing[]
  lang: 'ru' | 'tj'
  onToggle: (id: string, isActive: boolean) => void
}) {
  if (listings.length === 0) {
    return <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('catalog.noResults', lang)}</p>
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
        <thead style={{ background: 'var(--surface)' }}>
          <tr>
            <th style={thStyle}>{lang === 'ru' ? 'Авто' : 'Мошина'}</th>
            <th style={thStyle}>{lang === 'ru' ? 'Тип' : 'Навъ'}</th>
            <th style={thStyle}>{t('catalog.city', lang)}</th>
            <th style={thStyle}>{lang === 'ru' ? 'Цена' : 'Нарх'}</th>
            <th style={thStyle}>{lang === 'ru' ? 'Статус' : 'Ҳолат'}</th>
            <th style={thStyle}>{lang === 'ru' ? 'Просм.' : 'Намоишҳо'}</th>
            <th style={thStyle}>{t('admin.actions', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            const primary = listing.images.find((i) => i.is_primary) ?? listing.images[0]
            const statusColor = listing.status === 'active' ? '#16a34a' : listing.status === 'pending' ? '#ca8a04' : 'var(--accent)'
            const statusBg = listing.status === 'active' ? 'rgba(22,163,74,0.1)' : listing.status === 'pending' ? 'rgba(234,179,8,0.15)' : 'rgba(200,56,8,0.1)'
            const statusLabel = listing.status === 'active' ? (lang === 'ru' ? 'Активно' : 'Фаъол') : listing.status === 'pending' ? (lang === 'ru' ? 'На проверке' : 'Дар интизор') : (lang === 'ru' ? 'Отклонено' : 'Рад шуда')
            return (
              <tr key={listing.id} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '52px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, position: 'relative' }}>
                      {primary ? (
                        <Image src={primary.url} alt="" fill sizes="52px" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'var(--border)' }} />
                      )}
                    </div>
                    <Link href={`/car/${listing.id}`} style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                      {listing.brand} {listing.model}
                    </Link>
                  </div>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{listing.type}</td>
                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{listing.city}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--accent)' }}>
                  {listing.currency === 'USD' ? '$' : ''}{Number(listing.price).toLocaleString()}{listing.currency === 'TJS' ? ' сом.' : ''}
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: statusBg, color: statusColor }}>
                    {statusLabel}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{listing.views}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => onToggle(listing.id, listing.is_active)}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: 'none',
                      background: listing.is_active ? 'rgba(200,56,8,0.08)' : 'rgba(22,163,74,0.1)',
                      color: listing.is_active ? 'var(--accent)' : '#16a34a',
                    }}
                  >
                    {listing.is_active ? t('admin.deactivate', lang) : t('admin.activate', lang)}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
