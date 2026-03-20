'use client'
import { useState, useEffect, useMemo } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CarCard from '@/components/CarCard'
import { listingsApi } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'
import type { Listing } from '@/types'

const TJS_RATE = 10.93 // 1 USD ≈ 10.93 TJS

function calcMonthly(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12 / 100
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function buildAmortization(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100
  const payment = calcMonthly(principal, annualRate, months)
  const rows: Array<{ month: number; payment: number; principal: number; interest: number; balance: number }> = []
  let balance = principal
  for (let i = 1; i <= months; i++) {
    const interest = balance * r
    const principalPaid = payment - interest
    balance = Math.max(0, balance - principalPaid)
    rows.push({
      month: i,
      payment: Math.round(payment),
      principal: Math.round(principalPaid),
      interest: Math.round(interest),
      balance: Math.round(balance),
    })
  }
  return rows
}

export default function InstallmentPage() {
  const { lang } = useLang()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  // Calculator
  const [currency, setCurrency] = useState<'USD' | 'TJS'>('USD')
  const [carPrice, setCarPrice] = useState(20000)
  const [downPct, setDownPct] = useState(20)
  const [term, setTerm] = useState(24)
  const [rate, setRate] = useState(18)

  useEffect(() => {
    listingsApi
      .list({ installment: true, limit: 20 })
      .then((res) => setListings(res.data.data.items))
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [])

  const downAmount = useMemo(() => Math.round(carPrice * (downPct / 100)), [carPrice, downPct])
  const loanAmount = useMemo(() => carPrice - downAmount, [carPrice, downAmount])
  const monthly = useMemo(() => Math.round(calcMonthly(loanAmount, rate, term)), [loanAmount, rate, term])
  const totalPayable = useMemo(() => Math.round(downAmount + monthly * term), [downAmount, monthly, term])
  const totalInterest = useMemo(() => Math.round(totalPayable - carPrice), [totalPayable, carPrice])

  const amortization = useMemo(() => buildAmortization(loanAmount, rate, term), [loanAmount, rate, term])

  // Preview rows: first 3 + last
  const previewRows = useMemo(() => {
    if (amortization.length <= 4) return amortization
    return [...amortization.slice(0, 3), { ...amortization[amortization.length - 1], isLast: true }]
  }, [amortization])

  function fmt(val: number) {
    if (currency === 'TJS') {
      return (val * TJS_RATE).toLocaleString('ru-RU') + ' сом.'
    }
    return '$' + val.toLocaleString('ru-RU')
  }

  const statStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '15px',
    color: 'var(--text)',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <main style={{ flex: 1 }} className="pb-mobile">
        <div className="max-w-7xl mx-auto px-4 md:px-6" style={{ paddingTop: '36px', paddingBottom: '60px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: 'var(--text)', marginBottom: '32px' }}>
            {t('installment.title', lang)}
          </h1>

          {/* Calculator */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 40px)', marginBottom: '48px', maxWidth: '780px', marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                {t('installment.calcTitle', lang)}
              </h2>
              {/* Currency toggle */}
              <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {(['USD', 'TJS'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: currency === c ? 'var(--accent)' : 'var(--surface)',
                      color: currency === c ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {currency === 'TJS' && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', background: 'var(--surface)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border)' }}>
                {t('installment.exchangeNote', lang)}
              </p>
            )}

            {/* Input grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label htmlFor="car-price" style={labelStyle}>{t('installment.carPrice', lang)} ({currency})</label>
                <input
                  id="car-price"
                  type="number"
                  min={1000}
                  max={500000}
                  step={500}
                  value={carPrice}
                  onChange={(e) => setCarPrice(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="down-pct" style={labelStyle}>{t('installment.downPayment', lang)}</label>
                <input
                  id="down-pct"
                  type="number"
                  min={0}
                  max={90}
                  step={5}
                  value={downPct}
                  onChange={(e) => setDownPct(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="term-select" style={labelStyle}>{t('installment.term', lang)}</label>
                <select id="term-select" value={term} onChange={(e) => setTerm(Number(e.target.value))} style={inputStyle}>
                  {[6, 12, 18, 24, 36, 48, 60].map((m) => (
                    <option key={m} value={m}>{m} {t('installment.months', lang)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rate-input" style={labelStyle}>{t('installment.rate', lang)}</label>
                <input
                  id="rate-input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Stat boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <div style={statStyle}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('installment.labelPrice', lang)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(carPrice)}</span>
              </div>
              <div style={statStyle}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('installment.labelDown', lang)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(downAmount)}</span>
              </div>
              <div style={statStyle}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('installment.labelTerm', lang)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{term} {t('installment.months', lang)}</span>
              </div>
              <div style={statStyle}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('installment.labelPayment', lang)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(monthly)}</span>
              </div>
              <div style={statStyle}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('installment.labelTotal', lang)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{fmt(totalPayable)}</span>
              </div>
              <div style={statStyle}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('installment.labelInterest', lang)}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: totalInterest > 0 ? '#e67e22' : 'var(--text)' }}>{fmt(totalInterest)}</span>
              </div>
            </div>

            {/* Amortization table */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                {t('installment.amortization', lang)}
              </h3>
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      {[t('installment.month', lang), t('installment.payment', lang), t('installment.principal', lang), t('installment.interest', lang), t('installment.balance', lang)].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => {
                      const isLastRow = idx === previewRows.length - 1 && amortization.length > 4
                      return (
                        <>
                          {isLastRow && (
                            <tr key="ellipsis">
                              <td colSpan={5} style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                · · ·
                              </td>
                            </tr>
                          )}
                          <tr
                            key={row.month}
                            style={{
                              borderBottom: idx < previewRows.length - 1 ? '1px solid var(--border)' : 'none',
                              background: isLastRow ? 'var(--surface)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text)' }}>{row.month}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--accent)' }}>{fmt(row.payment)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text)' }}>{fmt(row.principal)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{fmt(row.interest)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{fmt(row.balance)}</td>
                          </tr>
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                {t('installment.rateNote', lang)}
              </p>
            </div>

            <button
              style={{ width: '100%', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '16px', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.15s ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
            >
              {t('installment.applyBtn', lang)}
            </button>
          </div>

          {/* Listings */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <InstallmentSkeleton key={i} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '16px' }}>
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

function InstallmentSkeleton() {
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
