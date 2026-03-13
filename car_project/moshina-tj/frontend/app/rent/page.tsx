'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import { listingsApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

interface RentalCondition {
  icon: React.ReactNode
  textKey: string
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0116 0v2" />
    </svg>
  )
}
function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 13a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}
function FuelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22V6a2 2 0 012-2h8a2 2 0 012 2v5" />
      <path d="M16 11h2a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
      <line x1="4" y1="10" x2="14" y2="10" />
    </svg>
  )
}
function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

const RENTAL_CONDITIONS: RentalCondition[] = [
  { icon: <PersonIcon />, textKey: 'rent.age' },
  { icon: <WalletIcon />, textKey: 'rent.deposit' },
  { icon: <FuelIcon />,   textKey: 'rent.fuel' },
  { icon: <TruckIcon />,  textKey: 'rent.delivery' },
]

export default function RentPage() {
  const { lang } = useLang()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listingsApi
      .list({ type: 'rent', limit: 20 })
      .then((res) => setListings(res.data.data.items))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'var(--text)', marginBottom: '32px' }}>
            {t('rent.title', lang)}
          </h1>

          {/* Rental conditions */}
          <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
              {t('rent.conditions', lang)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {RENTAL_CONDITIONS.map((cond) => (
                <div
                  key={cond.textKey}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}
                >
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{cond.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    {t(cond.textKey, lang)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Listings */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <RentSkeleton key={i} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '16px' }}>
              {t('catalog.noResults', lang)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((listing, i) => (
                <CarCard key={listing.id} listing={listing} lang={lang} className={`delay-${Math.min(i + 1, 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function RentSkeleton() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ height: '190px' }} className="skeleton" />
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '18px', borderRadius: '6px', width: '70%' }} className="skeleton" />
        <div style={{ height: '13px', borderRadius: '6px', width: '90%' }} className="skeleton" />
        <div style={{ height: '22px', borderRadius: '6px', width: '45%' }} className="skeleton" />
      </div>
    </div>
  )
}
