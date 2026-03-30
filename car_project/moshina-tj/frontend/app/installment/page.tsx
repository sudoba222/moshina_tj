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
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', padding: 'clamp(20px, 4vw, 40px)', marginBottom: '48px' }}>
            <style>{`
              input[type=range] {
                width: 100%;
                height: 4px;
                border-radius: 2px;
                background: linear-gradient(to right, var(--accent) 0%, var(--accent) var(--pct, 0%), var(--border) var(--pct, 0%), var(--border) 100%);
                outline: none;
                cursor: pointer;
                -webkit-appearance: none;
                appearance: none;
                margin: 8px 0 4px;
              }
              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--accent);
                border: 2px solid var(--card);
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                cursor: pointer;
              }
              input[type=range]::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--accent);
                border: 2px solid var(--card);
                cursor: pointer;
              }
            `}</style>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                {t('installment.calcTitle', lang)}
              </h2>
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
                      color: currency === c ? 'var(--color-white)' : 'var(--text-muted)',
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
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', background: 'var(--surface)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border)' }}>
                {t('installment.exchangeNote', lang)}
              </p>
            )}

            {/* Two-column layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px',
              marginBottom: '32px',
            }}>
              {/* Left: sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Car price */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {t('installment.carPrice', lang)} ({currency})
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(carPrice)}</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={carPrice}
                    onChange={(e) => setCarPrice(Number(e.target.value))}
                    style={{ ['--pct' as string]: `${((carPrice - 1000) / (500000 - 1000)) * 100}%` } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmt(1000)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmt(500000)}</span>
                  </div>
                </div>

                {/* Down payment % */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {t('installment.downPayment', lang)}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>{downPct}% — {fmt(downAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={downPct}
                    onChange={(e) => setDownPct(Number(e.target.value))}
                    style={{ ['--pct' as string]: `${(downPct / 90) * 100}%` } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>90%</span>
                  </div>
                </div>

                {/* Term */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {t('installment.term', lang)}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>{term} {t('installment.months', lang)}</span>
                  </div>
                  <select
                    value={term}
                    onChange={(e) => setTerm(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: 'var(--text)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {[6, 12, 18, 24, 36, 48, 60].map((m) => (
                      <option key={m} value={m}>{m} {t('installment.months', lang)}</option>
                    ))}
                  </select>
                </div>

                {/* Interest rate */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {t('installment.rate', lang)}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>{rate}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={0.5}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    style={{ ['--pct' as string]: `${(rate / 50) * 100}%` } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0%</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>50%</span>
                  </div>
                </div>

              </div>

              {/* Right: results */}
              <div style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
              }}>
                {/* Big monthly payment */}
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    {t('installment.labelPayment', lang)}
                  </span>
                  <span style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1, display: 'block' }}>
                    {fmt(monthly)}
                  </span>
                </div>

                {/* Breakdown bar */}
                {(() => {
                  const principalPct = Math.min(100, Math.round((loanAmount / totalPayable) * 100))
                  const interestPct = 100 - principalPct
                  return (
                    <>
                      <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--border)', margin: '12px 0 16px' }}>
                        <div style={{ display: 'flex', height: '100%' }}>
                          <div style={{ width: `${principalPct}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                          <div style={{ width: `${interestPct}%`, background: 'var(--color-warning)', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                          {t('installment.labelDown', lang)} {principalPct}%
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-warning)', flexShrink: 0, display: 'inline-block' }} />
                          {t('installment.labelInterest', lang)} {interestPct}%
                        </div>
                      </div>
                    </>
                  )
                })()}

                {/* Stat rows */}
                {[
                  { label: t('installment.labelDown', lang), value: fmt(downAmount), accent: false },
                  { label: t('installment.labelTotal', lang), value: fmt(totalPayable), accent: false },
                  { label: t('installment.labelInterest', lang), value: fmt(totalInterest), accent: totalInterest > 0 },
                ].map((row, idx, arr) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: row.accent ? '#e67e22' : 'var(--text)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amortization table */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                {t('installment.amortization', lang)}
              </h3>
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      {[t('installment.month', lang), t('installment.payment', lang), t('installment.principal', lang), t('installment.interest', lang), t('installment.balance', lang)].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', borderBottom: '1px solid var(--border)' }}>
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
                              background: idx % 2 !== 0 ? 'var(--surface)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text)' }}>{row.month}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent)' }}>{fmt(row.payment)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(row.principal)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(row.interest)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{fmt(row.balance)}</td>
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
              style={{ width: '100%', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '16px', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.15s ease' }}
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
