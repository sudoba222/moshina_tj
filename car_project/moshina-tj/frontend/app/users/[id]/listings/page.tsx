'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

export default function UserListingsPage() {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
          <button
            onClick={() => router.back()}
            style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {t('common.back', lang)}
          </button>

          {/* Mini profile header */}
          <div className="animate-fade-in-up" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--accent)', color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, flexShrink: 0 }}>
              {(profile.name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                {profile.name ?? t('userProfile.anonymousUser', lang)}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {t('userProfile.member', lang)} {formatDate(profile.created_at, lang)} · {total} {t('userProfile.listings', lang)}
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
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
                  <CarCard key={listing.id} listing={listing} lang={lang} className={`delay-${Math.min(i + 1, 8) as 1|2|3|4|5|6|7|8}`} />
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
