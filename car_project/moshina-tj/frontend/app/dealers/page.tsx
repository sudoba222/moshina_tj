'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { dealersApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Dealer } from '@/types'

function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="18" rx="1" />
      <line x1="9" y1="21" x2="9" y2="9" />
      <line x1="15" y1="21" x2="15" y2="9" />
      <line x1="2" y1="9" x2="22" y2="9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 6 5 9 10 3" />
    </svg>
  )
}

export default function DealersPage() {
  const { lang } = useLang()
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dealersApi.list()
      .then((res) => setDealers(res.data.data))
      .catch(() => setDealers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'var(--text)', marginBottom: '32px' }}>
            {t('dealers.title', lang)}
          </h1>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <DealerSkeleton key={i} />)}
            </div>
          ) : dealers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', fontSize: '16px' }}>
              {t('common.noData', lang)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dealers.map((dealer, i) => (
                <DealerCard key={dealer.id} dealer={dealer} lang={lang} delay={Math.min(i + 1, 8)} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function DealerCard({ dealer, lang, delay }: { dealer: Dealer; lang: 'ru' | 'tj'; delay: number }) {
  return (
    <div
      className={`animate-fade-in-up delay-${delay as 1|2|3|4|5|6|7|8}`}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-center gap-4">
        <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {dealer.logo_url ? (
            <Image src={dealer.logo_url} alt={dealer.business_name} fill sizes="64px" style={{ objectFit: 'cover' }} />
          ) : (
            <BuildingIcon />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dealer.business_name}
          </h2>
          {dealer.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.6 3.5 6.5 3.5 6.5s3.5-3.9 3.5-6.5C9.5 2.57 7.93 1 6 1z" />
                <circle cx="6" cy="4.5" r="1" />
              </svg>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{dealer.city}</p>
            </div>
          )}
        </div>
      </div>

      {dealer.verified && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start' }}>
          <CheckIcon />
          {t('dealers.verified', lang)}
        </span>
      )}

      {dealer.description && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {dealer.description}
        </p>
      )}

      <Link
        href={`/dealers/${dealer.id}`}
        style={{ display: 'block', textAlign: 'center', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px', borderRadius: '10px', marginTop: 'auto', transition: 'background 0.15s ease', textDecoration: 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
      >
        {t('dealers.viewCatalog', lang)}
      </Link>
    </div>
  )
}

function DealerSkeleton() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="flex items-center gap-4">
        <div style={{ width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0 }} className="skeleton" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ height: '16px', borderRadius: '6px', width: '70%' }} className="skeleton" />
          <div style={{ height: '13px', borderRadius: '6px', width: '50%' }} className="skeleton" />
        </div>
      </div>
      <div style={{ height: '36px', borderRadius: '10px' }} className="skeleton" />
    </div>
  )
}
