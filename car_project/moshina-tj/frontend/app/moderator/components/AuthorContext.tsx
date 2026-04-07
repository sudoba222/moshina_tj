'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { IconUser, IconPhone, IconMail, IconEye, IconEyeOff, IconAlertTriangle } from './icons'
import { SECTION_HEADING_STYLE, formatPrice, formatDate } from './utils'
import { adminApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Lang, Listing, User } from '@/types'

interface ListingCount {
  active: number
  pending: number
  rejected: number
}

interface AuthorContextProps {
  lang: Lang
  listing: Listing
}

// Trust level thresholds
function getTrustLevel(rejectedCount: number): 'trusted' | 'watch' | 'high-risk' {
  if (rejectedCount >= 3) return 'high-risk'
  if (rejectedCount === 2) return 'watch'
  return 'trusted'
}

function TrustBadge({ level, lang }: { level: ReturnType<typeof getTrustLevel>; lang: Lang }) {
  const config = {
    'trusted':   { bg: 'var(--color-success-dim)', color: 'var(--color-success)', label: { ru: 'Надёжный', tj: 'Боэтимод' } },
    'watch':     { bg: 'var(--color-warning-dim)', color: 'var(--color-warning)', label: { ru: 'Внимание', tj: 'Эҳтиёт' } },
    'high-risk': { bg: 'var(--color-error-dim)',   color: 'var(--color-error)',   label: { ru: 'ВЫСОКИЙ РИСК', tj: 'ХАТАРИ БАЛАНД' } },
  }
  const c = config[level]
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      padding: '2px 8px',
      borderRadius: '100px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      {level === 'high-risk' && <IconAlertTriangle size={10} />}
      {c.label[lang]}
    </span>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'var(--color-success)',
    pending: 'var(--color-warning)',
    rejected: 'var(--color-error)',
  }
  return (
    <span style={{
      display: 'inline-block',
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: colors[status] ?? 'var(--text-muted)',
      flexShrink: 0,
    }} />
  )
}

export default function AuthorContext({ lang, listing }: AuthorContextProps) {
  const [authorUser, setAuthorUser]     = useState<User | null>(null)
  const [listingCounts, setListingCounts] = useState<ListingCount | null>(null)
  const [authorListings, setAuthorListings] = useState<Listing[]>([])
  const [showPhone, setShowPhone]       = useState(false)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    setAuthorUser(null)
    setListingCounts(null)
    setAuthorListings([])
    setShowPhone(false)
    setLoading(true)

    const userId = listing.user_id

    // Fetch author detail (name, phone, listing counts)
    adminApi
      .getUserDetail(userId)
      .then((res) => {
        const d = res.data.data
        setAuthorUser(d.user)
        const counts = d.listing_counts as Record<string, number>
        setListingCounts({
          active:   counts['active']   ?? 0,
          pending:  counts['pending']  ?? 0,
          rejected: counts['rejected'] ?? 0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Fetch author's last 5 listings via typed adminApi method
    adminApi
      .getUserListings(userId, 5)
      .then((res) => {
        const items = res.data.data.items
        setAuthorListings(items.filter((l) => l.id !== listing.id).slice(0, 5))
      })
      .catch(() => {})
  }, [listing.id, listing.user_id])

  const trustLevel = getTrustLevel(listingCounts?.rejected ?? 0)
  const isHighRisk = trustLevel === 'high-risk'

  return (
    <div
      className="mod-right"
      style={{
        width: '280px',
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--card)',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Author card */}
        <div>
          <div style={{ ...SECTION_HEADING_STYLE, marginBottom: '10px' }}>
            {t('moderator.authorCard', lang)}
          </div>
          <div style={{
            background: isHighRisk ? 'var(--color-error-dim)' : 'var(--surface)',
            borderRadius: '10px',
            padding: '12px',
            border: `1px solid ${isHighRisk ? 'var(--color-error)' : 'var(--border)'}`,
          }}>
            {loading ? (
              <div style={{ height: '60px', background: 'var(--border)', borderRadius: '8px', opacity: 0.4 }} />
            ) : (
              <>
                {/* Avatar + name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {authorUser?.avatar_url ? (
                      <Image
                        src={authorUser.avatar_url}
                        alt={authorUser.name ?? 'Author'}
                        width={36} height={36}
                        style={{ objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <IconUser />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {authorUser?.name ?? listing.user_id.slice(0, 8) + '\u2026'}
                    </div>
                    <TrustBadge level={trustLevel} lang={lang} />
                  </div>
                </div>

                {/* Phone */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px',
                }}>
                  <IconPhone />
                  {showPhone ? (
                    <span>{authorUser?.phone ?? '—'}</span>
                  ) : (
                    <span style={{ letterSpacing: '0.1em' }}>{'•••\u00a0••\u00a0••'}</span>
                  )}
                  <button
                    onClick={() => setShowPhone((v) => !v)}
                    aria-label={showPhone ? t('moderator.hidePhone', lang) : t('moderator.showPhone', lang)}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text-muted)', padding: '2px',
                    }}
                  >
                    {showPhone ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>

                {/* Email */}
                {authorUser?.email && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px',
                  }}>
                    <IconMail />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {authorUser.email}
                    </span>
                  </div>
                )}

                {/* Registration date + time */}
                {authorUser?.created_at && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {t('moderator.regDate', lang)}: {formatDate(authorUser.created_at)}
                  </div>
                )}

                {/* Listing counts */}
                {listingCounts && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'active',   value: listingCounts.active,   color: 'var(--color-success)' },
                      { label: 'pending',  value: listingCounts.pending,  color: 'var(--color-warning)' },
                      { label: 'rejected', value: listingCounts.rejected, color: 'var(--color-error)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        textAlign: 'center',
                        flex: 1,
                        minWidth: '50px',
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Recent listings by this author */}
        {authorListings.length > 0 && (
          <div>
            <div style={{ ...SECTION_HEADING_STYLE, marginBottom: '8px' }}>
              {t('moderator.authorOtherAds', lang)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {authorListings.map((l) => (
                <Link
                  key={l.id}
                  href={`/car/${l.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    textDecoration: 'none',
                  }}
                  aria-label={`${l.brand} ${l.model} ${l.year} — ${l.status}`}
                >
                  {l.images?.[0] && (
                    <div style={{
                      position: 'relative', width: '34px', height: '34px',
                      borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                    }}>
                      <Image src={l.images[0].url} alt="" fill style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '12px', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {l.brand} {l.model} {l.year}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatPrice(l.price, l.currency)}
                    </div>
                  </div>
                  <StatusDot status={l.status} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
