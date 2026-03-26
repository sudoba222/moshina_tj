'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import { dealersApi, subscriptionsApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { useAuth } from '@/lib/AuthContext'
import { t } from '@/lib/i18n'
import type { Dealer, Listing } from '@/types'

function BuildingIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="18" rx="1" />
      <line x1="9" y1="21" x2="9" y2="9" />
      <line x1="15" y1="21" x2="15" y2="9" />
      <line x1="2" y1="9" x2="22" y2="9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="2 6 5 9 10 3" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.5 1.18 2 2 0 012.5 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.75-.75a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.5z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BellSubscribeIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export default function DealerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lang } = useLang()
  const { user } = useAuth()

  const [dealer, setDealer] = useState<Dealer | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    dealersApi.get(id)
      .then((res) => {
        setDealer(res.data.data.dealer)
        setListings(res.data.data.listings)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !user) return
    subscriptionsApi.check(id)
      .then((res) => setSubscribed(res.data.data.subscribed))
      .catch(() => {})
  }, [id, user])

  async function handleSubscribeToggle() {
    if (!user || !id || subLoading) return
    setSubLoading(true)
    try {
      const res = await subscriptionsApi.toggle(id)
      setSubscribed(res.data.data.subscribed)
    } catch {
      // swallow
    } finally {
      setSubLoading(false)
    }
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

  if (notFound || !dealer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{t('dealers.notFound', lang)}</p>
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

      <main style={{ flex: 1 }} className="pb-mobile">
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '28px', paddingBottom: '60px' }}>
          <button
            onClick={() => router.back()}
            style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {t('common.back', lang)}
          </button>

          {/* Dealer header */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '28px', marginBottom: '36px' }}>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              {/* Logo */}
              <div style={{ width: '88px', height: '88px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {dealer.logo_url ? (
                  <Image src={dealer.logo_url} alt={dealer.business_name} fill sizes="88px" style={{ objectFit: 'cover' }} />
                ) : (
                  <BuildingIcon />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
                    {dealer.business_name}
                  </h1>
                  {dealer.verified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-dim)', padding: '3px 10px', borderRadius: '6px' }}>
                      <CheckIcon />
                      {t('dealers.verified', lang)}
                    </span>
                  )}
                  {user && (
                    <button
                      onClick={handleSubscribeToggle}
                      disabled={subLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: subscribed ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: subscribed ? 'var(--accent-dim, rgba(37,99,235,0.08))' : 'var(--surface)',
                        color: subscribed ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: subLoading ? 'not-allowed' : 'pointer',
                        opacity: subLoading ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <BellSubscribeIcon active={subscribed} />
                      {subscribed ? t('dealers.unsubscribe', lang) : t('dealers.subscribe', lang)}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {dealer.city && (
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <PinIcon />
                      {dealer.city}
                    </span>
                  )}
                  {dealer.address && (
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <HomeIcon />
                      {dealer.address}
                    </span>
                  )}
                  {dealer.phone && (
                    <a href={`tel:${dealer.phone}`} style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <PhoneIcon />
                      {dealer.phone}
                    </a>
                  )}
                </div>

                {dealer.description && (
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.6 }}>
                    {dealer.description}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 24px', flexShrink: 0 }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent)' }}>{listings.length}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dealers.listings', lang)}</p>
              </div>
            </div>
          </div>

          {/* Listings */}
          {listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '16px' }}>
              {t('dealers.noListings', lang)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((listing, i) => (
                <CarCard key={listing.id} listing={listing} lang={lang} className={`delay-${Math.min(i + 1, 8) as 1|2|3|4|5|6|7|8}`} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
