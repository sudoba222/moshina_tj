'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import Pagination from '@/components/Pagination'
import { usersApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import type { UserPublicProfile, Listing } from '@/types'

function formatDate(dateStr: string, lang: 'ru' | 'tj'): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { month: 'long', year: 'numeric' })
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    admin:     { bg: 'var(--color-error-dim)',   text: 'var(--color-error)' },
    moderator: { bg: 'var(--accent-dim)',        text: 'var(--accent)' },
    dealer:    { bg: 'var(--accent-dim)',        text: 'var(--accent)' },
    manager:   { bg: 'var(--color-info-dim)',    text: 'var(--color-info)' },
    support:   { bg: 'var(--color-success-dim)', text: 'var(--color-success)' },
    user:      { bg: 'var(--tag-bg)',            text: 'var(--text-muted)' },
  }
  const c = colors[role] ?? colors.user
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {role}
    </span>
  )
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang } = useLang()
  const { user: currentUser } = useAuth()

  const [profile, setProfile] = useState<UserPublicProfile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listingsLoading, setListingsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    usersApi.getProfile(id)
      .then((res) => setProfile(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setListingsLoading(true)
    usersApi.getListings(id, page)
      .then((res) => {
        setListings(res.data.data.items)
        setTotal(res.data.data.total)
        setPages(res.data.data.pages)
      })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false))
  }, [id, page])

  function handlePageChange(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('common.loading', lang)}</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{t('userProfile.notFound', lang)}</p>
          <button onClick={() => router.back()} style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            {t('common.back', lang)}
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {t('common.back', lang)}
          </button>

          {/* Profile header */}
          <div className="animate-fade-in-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', marginBottom: '36px' }}>
            <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
              {/* Avatar */}
              <div style={{
                width: '80px', height: '80px', borderRadius: '16px',
                background: profile.avatar_url ? 'var(--border)' : 'var(--accent)',
                color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 800, flexShrink: 0, overflow: 'hidden',
              }}>
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.name ?? ''} fill sizes="80px" style={{ objectFit: 'cover' }} />
                ) : (
                  (profile.name ?? 'U').charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                    {profile.name ?? (lang === 'ru' ? 'Пользователь' : 'Корбар')}
                  </h1>
                  <RoleBadge role={profile.role} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {t('userProfile.member', lang)} {formatDate(profile.created_at, lang)}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {profile.listing_count} {t('userProfile.listings', lang)}
                  </span>
                </div>
                {profile.phone && !profile.phone.startsWith('email_') && (
                  <a href={`tel:${profile.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--accent)', fontWeight: 600, fontSize: '14px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 1.18 2 2 0 012.5 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.75-.75a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.5z" />
                    </svg>
                    {profile.phone}
                  </a>
                )}
              </div>

              {/* Edit button if own profile */}
              {isOwnProfile && (
                <a
                  href="/dashboard"
                  style={{
                    height: '38px', padding: '0 16px', background: 'var(--accent)', color: 'var(--color-white)',
                    fontWeight: 700, fontSize: '13px', borderRadius: '8px', display: 'inline-flex',
                    alignItems: 'center', gap: '6px', textDecoration: 'none', flexShrink: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {t('userProfile.editProfile', lang)}
                </a>
              )}
            </div>
          </div>

          {/* Listings */}
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
            {t('userProfile.allListings', lang)} — {total}
          </h2>

          {listingsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '180px' }} className="skeleton" />
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '16px', width: '55%', borderRadius: '4px' }} className="skeleton" />
                    <div style={{ height: '12px', width: '80%', borderRadius: '4px' }} className="skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '16px' }}>
              {t('catalog.noResults', lang)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map((listing, i) => (
                  <CarCard key={listing.id} listing={listing} lang={lang} className={`delay-${Math.min(i + 1, 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`} />
                ))}
              </div>
              {pages > 1 && (
                <div style={{ marginTop: '32px' }}>
                  <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
