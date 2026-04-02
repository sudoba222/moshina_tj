'use client'
import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { listingsApi, authApi, usersApi, favoritesApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import CarCard from '@/components/CarCard'
import type { Listing } from '@/types'

type Tab = 'profile' | 'listings' | 'favorites' | 'settings'

// ─── SearchParams reader (must be inside Suspense) ────────────────────────────
function SearchParamsReader({ onParams }: { onParams: (tab: Tab | null) => void }) {
  const params = useSearchParams()
  const tabParam = params.get('tab') as Tab | null
  useEffect(() => {
    onParams(tabParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam])
  return null
}

export default function DashboardPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user, loading: authLoading, updateUser, logout } = useAuth()

  const [tab, setTab] = useState<Tab>('profile')
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsFilter, setListingsFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [listingsPage, setListingsPage] = useState(1)
  const [listingsTotalPages, setListingsTotalPages] = useState(1)

  const [favorites, setFavorites] = useState<Listing[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  // Profile edit state
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Listing count for profile hero
  const [profileListingCount, setProfileListingCount] = useState<number | null>(null)

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth/login'); return }
    setName(user.name ?? '')
    setPhone(user.phone ?? '')
    setWhatsappNumber(user.whatsapp_number ?? '')
    // Fetch listing count for profile hero
    usersApi.getListings(user.id, 1)
      .then((res) => setProfileListingCount(res.data.data.total ?? 0))
      .catch(() => setProfileListingCount(0))
  }, [user, authLoading, router])

  useEffect(() => {
    if (tab !== 'listings' || !user) return
    setListingsPage(1)
    setListingsTotalPages(1)
    setListings([])
  }, [tab, user, listingsFilter])

  useEffect(() => {
    if (tab !== 'listings' || !user) return
    setListingsLoading(true)
    usersApi.getListings(user.id, listingsPage)
      .then((res) => {
        const data = res.data.data
        setListings((prev) => listingsPage === 1 ? data.items : [...prev, ...data.items])
        setListingsTotalPages(data.pages ?? 1)
      })
      .catch(() => { if (listingsPage === 1) setListings([]) })
      .finally(() => setListingsLoading(false))
  }, [tab, user, listingsPage])

  useEffect(() => {
    if (tab !== 'favorites' || !user) return
    setFavoritesLoading(true)
    favoritesApi.list(1)
      .then((res) => setFavorites(res.data.data.items))
      .catch(() => setFavorites([]))
      .finally(() => setFavoritesLoading(false))
  }, [tab, user])

  async function saveProfile() {
    setProfileError(''); setProfileSuccess(false)
    if (!name.trim()) { setProfileError(t('dashboard.enterName', lang)); return }
    setProfileSaving(true)
    try {
      const res = await authApi.updateProfile({
        name: name.trim(),
        whatsapp_number: whatsappNumber.trim() || null,
      })
      updateUser(res.data.data)
      setProfileSuccess(true)
      setEditMode(false)
    } catch {
      setProfileError(t('common.errorSave', lang))
    } finally {
      setProfileSaving(false)
    }
  }

  async function changePassword() {
    setPwdError(''); setPwdSuccess(false)
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError(t('dashboard.fillAllFields', lang))
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError(t('dashboard.passMismatch', lang))
      return
    }
    if (newPwd.length < 6) {
      setPwdError(t('dashboard.minPassword', lang))
      return
    }
    setPwdLoading(true)
    try {
      await authApi.changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwdError(msg ?? t('common.error', lang))
    } finally {
      setPwdLoading(false)
    }
  }

  async function deleteListing(id: string) {
    if (!window.confirm(t('dashboard.confirmDelete', lang))) return
    try {
      await listingsApi.remove(id)
      setListings((prev) => prev.filter((l) => l.id !== id))
      if (profileListingCount !== null) setProfileListingCount((c) => Math.max(0, (c ?? 1) - 1))
    } catch {
      // swallow
    }
  }

  async function toggleListingStatus(id: string, currentlyActive: boolean) {
    try {
      if (currentlyActive) {
        await listingsApi.deactivate(id)
      } else {
        await listingsApi.activate(id)
      }
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_active: !currentlyActive } : l))
    } catch {
      // swallow
    }
  }

  if (!user) return null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '15px',
    color: 'var(--text)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    display: 'block',
  }

  const filteredListings = listings.filter((l) => {
    if (listingsFilter === 'all') return true
    if (listingsFilter === 'active') return l.status === 'active' && l.is_active
    return !l.is_active || l.status === 'pending' || l.status === 'rejected'
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <Suspense fallback={null}>
        <SearchParamsReader onParams={(tabParam) => {
          if (tabParam) setTab(tabParam)
        }} />
      </Suspense>

      <main style={{ flex: 1 }} className="pb-mobile">
        <div className="max-w-5xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '28px' }}>
            {t('dashboard.title', lang)}
          </h1>

          {/* Tabs */}
          <div className="scrollbar-hide" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '28px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {(['profile', 'listings', 'favorites', 'settings'] as Tab[]).map((tabKey) => {
              const labelMap: Record<Tab, string> = {
                profile: t('dashboard.profile', lang),
                listings: t('dashboard.myListings', lang),
                favorites: t('favorites.title', lang),
                settings: t('dashboard.settings', lang),
              }
              return (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  style={{
                    padding: '12px 24px',
                    fontWeight: 700,
                    fontSize: '14px',
                    minHeight: '44px',
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    borderBottom: tab === tabKey ? '2px solid var(--accent)' : '2px solid transparent',
                    color: tab === tabKey ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s, border-color 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {tabKey === 'favorites' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={tab === 'favorites' ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                  {labelMap[tabKey]}
                </button>
              )
            })}
          </div>

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <div className="animate-fade-in" style={{ maxWidth: '560px' }}>

              {/* Profile hero */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px',
                padding: 'clamp(20px, 4vw, 28px)', marginBottom: '12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                textAlign: 'center',
              }}>
                {/* Large avatar circle */}
                <div style={{
                  width: '84px', height: '84px', borderRadius: '50%',
                  background: 'var(--accent)', color: 'var(--color-white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '34px', fontWeight: 800, flexShrink: 0,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}>
                  {(user.name ?? user.phone ?? '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>
                    {user.name ?? (user.phone && user.phone.startsWith('+') ? user.phone : '—')}
                  </div>
                  {user.email && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {user.email}
                    </div>
                  )}
                  {user.user_number !== undefined && (
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      ID: #{user.user_number}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '3px 10px', borderRadius: '8px', textTransform: 'capitalize' }}>
                      {user.role}
                    </span>
                    {profileListingCount !== null && (
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: '8px' }}>
                        {profileListingCount} {t('dashboard.myListings', lang).toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline edit form */}
              {editMode && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(16px, 4vw, 24px)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label htmlFor="dash-name" style={labelStyle}>{t('admin.name', lang)}</label>
                    <input id="dash-name" type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="dash-whatsapp" style={labelStyle}>{t('settings.whatsapp', lang)}</label>
                    <input
                      id="dash-whatsapp" type="tel" value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder={t('settings.whatsappPlaceholder', lang)} style={inputStyle}
                    />
                  </div>
                  {profileError && <p style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 600 }}>{profileError}</p>}
                  {profileSuccess && <p style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>{t('dashboard.savedSuccess', lang)}</p>}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={saveProfile} disabled={profileSaving}
                      style={{ flex: 1, background: profileSaving ? 'var(--text-muted)' : 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: profileSaving ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                      {profileSaving ? t('common.loading', lang) : t('dashboard.save', lang)}
                    </button>
                    <button onClick={() => { setEditMode(false); setProfileError('') }}
                      style={{ padding: '11px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>
                      {t('dashboard.cancel', lang)}
                    </button>
                  </div>
                </div>
              )}

              {/* Info rows — hidden in edit mode */}
              {!editMode && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', marginBottom: '12px' }}>
                  <MenuRow
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    label={t('admin.name', lang)}
                    value={user.name ?? '—'}
                  />
                  <MenuRow
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
                    label={t('auth.phone', lang)}
                    value={user.phone && user.phone.startsWith('+') ? user.phone : '—'}
                  />
                  {user.email && (
                    <MenuRow
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                      label="Email"
                      value={user.email}
                    />
                  )}
                  {user.whatsapp_number && (
                    <MenuRow
                      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>}
                      label={t('settings.whatsapp', lang)}
                      value={user.whatsapp_number}
                    />
                  )}
                </div>
              )}

              {/* Action menu */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
                {!editMode ? (
                  <MenuRow
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                    label={t('dashboard.editProfile', lang)}
                    onClick={() => { setEditMode(true); setProfileSuccess(false) }}
                    accent
                  />
                ) : null}
                <MenuRow
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  label={t('dashboard.changePassword', lang)}
                  onClick={() => setTab('settings')}
                />
                <MenuRow
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
                  label={t('nav.logout', lang)}
                  onClick={() => { logout(); router.replace('/') }}
                  danger
                />
              </div>
            </div>
          )}

          {/* ── My listings tab ── */}
          {tab === 'listings' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                {/* Active/Inactive toggle */}
                <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {(['all', 'active', 'inactive'] as const).map((f) => {
                    const label = f === 'all'
                      ? t('dashboard.filterAll', lang)
                      : t(`dashboard.${f}` as Parameters<typeof t>[0], lang)
                    // count pending in "all" tab
                    const pendingCount = listings.filter((l) => l.status === 'pending').length
                    return (
                      <button
                        key={f}
                        onClick={() => setListingsFilter(f)}
                        style={{
                          padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                          background: listingsFilter === f ? 'var(--accent)' : 'var(--surface)',
                          color: listingsFilter === f ? 'var(--color-white)' : 'var(--text-muted)',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                        }}
                      >
                        {label}
                        {f === 'all' && pendingCount > 0 && (
                          <span style={{ background: 'var(--color-warning-alt)', color: 'var(--color-white)', fontSize: '10px', fontWeight: 800, borderRadius: '10px', padding: '1px 5px', lineHeight: 1.4 }}>
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <Link
                  href="/post"
                  style={{ height: '36px', padding: '0 16px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '13px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5.5" y1="1" x2="5.5" y2="10" />
                    <line x1="1" y1="5.5" x2="10" y2="5.5" />
                  </svg>
                  {t('dashboard.newListing', lang)}
                </Link>
              </div>

              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ height: '120px', borderRadius: '12px' }} className="skeleton" />
                  ))}
                </div>
              ) : filteredListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                    <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                    <circle cx="7.5" cy="17" r="2.5" /><circle cx="16.5" cy="17" r="2.5" />
                  </svg>
                  <p style={{ marginBottom: '16px' }}>{t('dashboard.noListings', lang)}</p>
                  <Link href="/post" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
                    {t('dashboard.addFirst', lang)}
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredListings.map((listing) => (
                    <DashboardListingRow
                      key={listing.id}
                      listing={listing}
                      lang={lang}
                      onToggle={() => toggleListingStatus(listing.id, listing.is_active)}
                      onDelete={() => deleteListing(listing.id)}
                    />
                  ))}
                  {listingsPage < listingsTotalPages && (
                    <button
                      onClick={() => setListingsPage((p) => p + 1)}
                      disabled={listingsLoading}
                      style={{ marginTop: '8px', padding: '11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 700, fontSize: '14px', color: 'var(--text)', cursor: listingsLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {listingsLoading ? t('common.loading', lang) : t('dashboard.loadMore', lang)}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Favorites tab ── */}
          {tab === 'favorites' && (
            <div className="animate-fade-in">
              {favoritesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: '260px', borderRadius: '8px' }} className="skeleton" />
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <p>{t('favorites.empty', lang)}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((listing) => (
                    <CarCard
                      key={listing.id}
                      listing={listing}
                      lang={lang}
                      initialFavorited={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Settings tab ── */}
          {tab === 'settings' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
                {/* Change password */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 28px)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>
                    {t('dashboard.changePassword', lang)}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label htmlFor="cur-pwd" style={labelStyle}>{t('dashboard.currentPassword', lang)}</label>
                      <input id="cur-pwd" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="new-pwd" style={labelStyle}>{t('dashboard.newPassword', lang)}</label>
                      <input id="new-pwd" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label htmlFor="conf-pwd" style={labelStyle}>{t('dashboard.confirmPassword', lang)}</label>
                      <input id="conf-pwd" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} style={inputStyle} />
                    </div>
                    {pwdError && <p style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 600 }}>{pwdError}</p>}
                    {pwdSuccess && <p style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>{t('dashboard.passChanged', lang)}</p>}
                    <button
                      onClick={changePassword}
                      disabled={pwdLoading}
                      style={{ background: pwdLoading ? 'var(--text-muted)' : 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: pwdLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {pwdLoading ? t('common.loading', lang) : t('dashboard.save', lang)}
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 28px)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
                    {t('dashboard.language', lang)}
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {t('dashboard.langHint', lang)}
                  </p>
                </div>

                {/* Notifications placeholder */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 28px)' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
                    {t('dashboard.notifications', lang)}
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {t('dashboard.notifHint', lang)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function MenuRow({
  icon,
  label,
  value,
  onClick,
  accent,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  onClick?: () => void
  accent?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        minHeight: '52px',
      }}
    >
      <span style={{ color: danger ? 'var(--color-error)' : accent ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: danger ? 'var(--color-error)' : accent ? 'var(--accent)' : 'var(--text)' }}>
        {label}
      </span>
      {value && (
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px', textAlign: 'right' }}>
          {value}
        </span>
      )}
      {onClick && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={danger ? 'var(--color-error)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  )
}

function DashboardListingRow({
  listing,
  lang,
  onToggle,
  onDelete,
}: {
  listing: Listing
  lang: 'ru' | 'tj'
  onToggle: () => void
  onDelete: () => void
}) {
  const primaryImage = listing.images.find((img) => img.is_primary) ?? listing.images[0]
  const formatPrice = (p: number, c: string) => c === 'USD' ? `$${p.toLocaleString('en-US')}` : `${p.toLocaleString()} сом.`

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      gap: '14px',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Inactive overlay */}
      {!listing.is_active && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)', pointerEvents: 'none' }} />
      )}

      {/* Thumbnail */}
      <div style={{ width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, position: 'relative' }}>
        {primaryImage ? (
          <Image src={primaryImage.url} alt={`${listing.brand} ${listing.model}`} fill sizes="80px" style={{ objectFit: 'cover', opacity: listing.is_active ? 1 : 0.5 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
              <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
          <Link href={`/car/${listing.id}`} style={{ fontSize: '14px', fontWeight: 700, color: listing.is_active ? 'var(--text)' : 'var(--text-muted)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.brand} {listing.model} {listing.year}
          </Link>
          {listing.is_active && listing.status === 'active' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-dim)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('dashboard.active_badge', lang)}
            </span>
          )}
          {listing.status === 'pending' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-warning-alt)', background: 'var(--color-warning-dim)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('dashboard.pending_badge', lang)}
            </span>
          )}
          {listing.status === 'rejected' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-error)', background: 'var(--color-error-dim, rgba(239,68,68,0.1))', padding: '1px 7px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              {t('dashboard.rejected_badge', lang)}
            </span>
          )}
          {!listing.is_active && listing.status === 'active' && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--tag-bg)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
              {t('dashboard.inactive_badge', lang)}
            </span>
          )}
        </div>
        {listing.status === 'rejected' && listing.rejection_reason && (
          <p style={{ fontSize: '11px', color: 'var(--color-error)', marginTop: '4px', marginBottom: '2px', background: 'var(--color-error-dim)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
            {t('dashboard.rejectionReason', lang)}: {listing.rejection_reason}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(listing.price, listing.currency)}</span>
          <span>{listing.city}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            {listing.views}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
        {listing.status === 'rejected' ? (
          <Link
            href={`/post?edit=${listing.id}`}
            style={{ padding: '6px 12px', background: 'var(--color-error-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-error)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {t('dashboard.fixAndResubmit', lang)}
          </Link>
        ) : (
          <Link
            href={`/post?edit=${listing.id}`}
            style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            {t('dashboard.edit', lang)}
          </Link>
        )}
        {listing.status !== 'pending' && listing.status !== 'rejected' && (
          <button
            onClick={onToggle}
            style={{
              padding: '6px 12px',
              background: listing.is_active ? 'var(--color-error-dim, rgba(239,68,68,0.08))' : 'var(--color-success-dim)',
              border: listing.is_active ? '1px solid var(--color-error-border, rgba(239,68,68,0.3))' : '1px solid rgba(22,163,74,0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: listing.is_active ? 'var(--color-error)' : 'var(--color-success)',
              cursor: 'pointer',
            }}
          >
            {listing.is_active ? t('dashboard.deactivate', lang) : t('dashboard.activate', lang)}
          </button>
        )}
        <button
          onClick={onDelete}
          aria-label={t('dashboard.deleteLabel', lang)}
          style={{
            padding: '6px 10px',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-error-dim)'
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            e.currentTarget.style.color = 'var(--color-error)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
