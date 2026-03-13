'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { adminApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing, UserRole } from '@/types'

const ALLOWED_ROLES: UserRole[] = ['moderator', 'admin']

export default function ModeratorPage() {
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()

  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [rejectModal, setRejectModal] = useState<Listing | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectUpdating, setRejectUpdating] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return }
    if (!ALLOWED_ROLES.includes(user.role)) { router.replace('/'); return }
  }, [user, router])

  function fetchPending() {
    setLoading(true)
    adminApi.getPendingListings(1)
      .then((res) => {
        setListings(res.data.data.items)
        setTotal(res.data.data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return
    fetchPending()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function approveListing(id: string) {
    try {
      await adminApi.approveListing(id)
      setListings((prev) => prev.filter((l) => l.id !== id))
      setTotal((t) => t - 1)
    } catch {}
  }

  async function doReject(id: string) {
    if (!rejectReason.trim()) return
    setRejectUpdating(true)
    try {
      await adminApi.rejectListing(id, rejectReason)
      setListings((prev) => prev.filter((l) => l.id !== id))
      setTotal((t) => t - 1)
      setRejectModal(null)
      setRejectReason('')
    } catch {}
    setRejectUpdating(false)
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            {t('moderator.title', lang)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            {t('moderator.pending', lang)}: <strong style={{ color: 'var(--text)' }}>{total}</strong>
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: '120px', borderRadius: '12px' }} className="skeleton" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p style={{ fontSize: '15px' }}>{t('moderator.noPending', lang)}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {listings.map((listing) => {
                const primary = listing.images.find((i) => i.is_primary) ?? listing.images[0]
                const formatPrice = (p: number, c: string) => c === 'USD' ? `$${p.toLocaleString('en-US')}` : `${p.toLocaleString()} сом.`

                return (
                  <div
                    key={listing.id}
                    className="animate-fade-in-up"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: '96px', height: '72px', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg)', flexShrink: 0, position: 'relative' }}>
                      {primary ? (
                        <Image src={primary.url} alt="" fill sizes="96px" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
                            <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/car/${listing.id}`} style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', textDecoration: 'none' }}>
                        {listing.brand} {listing.model} {listing.year}
                      </Link>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(listing.price, listing.currency)}</span>
                        <span>{listing.city}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0116 0v2" /></svg>
                          {t('moderator.postedBy', lang)}: #{listing.user_id.slice(0, 6)}
                        </span>
                      </div>
                      {listing.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                          {listing.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => approveListing(listing.id)}
                        style={{
                          padding: '8px 16px', background: 'rgba(22,163,74,0.1)', color: '#16a34a',
                          border: '1px solid rgba(22,163,74,0.3)', borderRadius: '8px',
                          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('moderator.approve', lang)}
                      </button>
                      <button
                        onClick={() => { setRejectModal(listing); setRejectReason('') }}
                        style={{
                          padding: '8px 16px', background: 'rgba(200,56,8,0.08)', color: 'var(--accent)',
                          border: '1px solid rgba(200,56,8,0.3)', borderRadius: '8px',
                          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('moderator.reject', lang)}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Reject modal */}
      {rejectModal && (
        <>
          <div onClick={() => setRejectModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
          <div className="animate-scale-in" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(420px, 90vw)', background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '28px', zIndex: 401,
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              {t('moderator.reject', lang)}
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
                onClick={() => doReject(rejectModal.id)}
                disabled={rejectUpdating || !rejectReason.trim()}
                style={{ flex: 1, background: rejectUpdating || !rejectReason.trim() ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: '10px', border: 'none', cursor: rejectUpdating || !rejectReason.trim() ? 'not-allowed' : 'pointer' }}
              >
                {rejectUpdating ? t('common.loading', lang) : t('moderator.reject', lang)}
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
