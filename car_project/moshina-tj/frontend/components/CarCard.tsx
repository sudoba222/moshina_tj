'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n'
import { favoritesApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import StaffStatusRibbon from '@/components/StaffStatusRibbon'
import type { Listing, Lang } from '@/types'

interface CarCardProps {
  listing: Listing
  lang: Lang
  className?: string
  moderatorMode?: boolean
  initialFavorited?: boolean
  priority?: boolean
}

const STATUS_STRIPE: Record<string, string> = {
  pending: 'var(--color-warning-alt)',
  active: 'var(--color-online)',
  rejected: 'var(--color-error)',
  draft: 'var(--text-muted)',
}

const STATUS_I18N_KEY: Record<string, string> = {
  pending: 'common.inModeration',
  active: 'dashboard.active_badge',
  rejected: 'dashboard.rejected_badge',
  draft: 'dashboard.inactive_badge',
}

function formatMileage(km: number): string {
  if (km >= 10000) return Math.round(km / 1000) + ',' + String(km % 1000).padStart(3, '0') + ' км'
  return km.toLocaleString('ru-RU') + ' км'
}

function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return t('common.today', lang)
  if (diffDays === 1) return t('common.yesterday', lang)
  if (diffDays < 7) return `${diffDays} ${t('common.daysAgo', lang)}`
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { day: 'numeric', month: 'short' })
}

function formatPrice(price: number, currency: string, lang: Lang): string {
  if (currency === 'USD') {
    return '$' + price.toLocaleString('en-US')
  }
  return price.toLocaleString('ru-RU') + ' ' + t('common.som', lang)
}

function CreditCardIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <rect x="1" y="1" width="14" height="10" rx="2" />
      <line x1="1" y1="5" x2="15" y2="5" />
      <line x1="4" y1="8.5" x2="7" y2="8.5" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--color-error)' : 'none'}
      stroke={filled ? 'var(--color-error)' : 'var(--text-muted)'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function CarCard({
  listing,
  lang,
  className,
  moderatorMode = false,
  initialFavorited,
  priority = false,
}: CarCardProps) {
  const primaryImage = listing.images.find((img) => img.is_primary) ?? listing.images[0]
  const stripeColor = moderatorMode ? (STATUS_STRIPE[listing.status] ?? 'var(--text-muted)') : null
  const statusI18nKey = moderatorMode ? (STATUS_I18N_KEY[listing.status] ?? null) : null
  const statusLabel = statusI18nKey
    ? t(statusI18nKey, lang)
    : moderatorMode
    ? listing.status
    : null

  const [imgLoaded, setImgLoaded] = useState(false)
  const { user } = useAuth()
  const isStaff = user
    ? ['admin', 'moderator', 'manager', 'support'].includes(user.role)
    : false
  const router = useRouter()
  const [favorited, setFavorited] = useState<boolean>(
    initialFavorited ?? listing.is_favorited ?? false
  )
  const [favLoading, setFavLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (favLoading) return
    const prev = favorited
    setFavorited(!prev)
    setFavLoading(true)
    try {
      const res = await favoritesApi.toggle(listing.id)
      setFavorited(res.data.data.favorited)
    } catch {
      setFavorited(prev)
    } finally {
      setFavLoading(false)
    }
  }

  return (
    <Link
      href={`/car/${listing.id}`}
      style={{ display: 'block', textDecoration: 'none' }}
      className={className}
    >
      <article
        className="animate-fade-in-up"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          ...(stripeColor ? { borderLeft: `4px solid ${stripeColor}` } : {}),
        }}
      >
        {/* Image wrapper — 16:9 on mobile via padding trick, 200px fixed on desktop */}
        <div
          className="card-image-outer"
          style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}
        >
          {/* Mobile: 16:9 via padding-bottom trick */}
          <div
            className="card-image-wrap"
            style={{ position: 'relative', background: 'var(--bg)' }}
          >
            {primaryImage ? (
              <>
                {!imgLoaded && (
                  <div
                    className="skeleton"
                    style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
                    aria-hidden="true"
                  />
                )}
                <Image
                  src={primaryImage.url}
                  alt={`${listing.brand} ${listing.model}`}
                  fill
                  priority={priority}
                  loading={priority ? 'eager' : 'lazy'}
                  sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  style={{
                    objectFit: 'cover',
                    opacity: imgLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                  onLoad={() => setImgLoaded(true)}
                />
              </>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface)',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth="1.2"
                  aria-hidden="true"
                >
                  <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                  <circle cx="7.5" cy="17" r="2.5" />
                  <circle cx="16.5" cy="17" r="2.5" />
                </svg>
              </div>
            )}

            {/* Top-left badges: Rent, Installment */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                display: 'flex',
                gap: '4px',
                zIndex: 1,
              }}
            >
              {listing.type === 'rent' && (
                <span
                  style={{
                    background: 'var(--color-info)',
                    color: 'var(--color-white)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {t('badges.rent', lang)}
                </span>
              )}
              {listing.installment_available && (
                <span
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--color-white)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <CreditCardIcon />
                  {t('badges.installment', lang)}
                </span>
              )}
            </div>

            {/* Moderator status badge — top right */}
            {moderatorMode && statusLabel && stripeColor && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1 }}>
                <span
                  style={{
                    background: stripeColor,
                    color: 'var(--color-white)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '20px',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            )}

            {/* Favorite button — top right circle, 40x40, hidden in moderator mode */}
            {!moderatorMode && (
              <button
                onClick={handleFavoriteClick}
                aria-label={favorited ? t('favorites.remove', lang) : t('favorites.add', lang)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  flexShrink: 0,
                  transition: 'opacity 0.15s ease, transform 0.15s ease',
                  transform: favLoading ? 'scale(0.85)' : 'scale(1)',
                }}
              >
                <HeartIcon filled={favorited} />
              </button>
            )}

            {/* Dealer badge — bottom left */}
            {listing.is_dealer_listing && (
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 1 }}>
                <span
                  style={{
                    background: 'rgba(0,0,0,0.72)',
                    color: 'var(--color-white)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <StarIcon />
                  {t('badges.dealer', lang)}
                </span>
              </div>
            )}

            {/* Staff status ribbon */}
            {isStaff && !moderatorMode && <StaffStatusRibbon listing={listing} />}
          </div>
        </div>

        {/* Card content */}
        <div style={{ padding: '10px 12px 12px' }}>
          {/* Brand + Model + Year on one line */}
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.01em',
            }}
          >
            {listing.brand} {listing.model}
            {listing.year ? (
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                {' '}&middot;{' '}{listing.year}
              </span>
            ) : null}
          </p>

          {/* Price — large, bold, accent */}
          <p
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: 'var(--accent)',
              marginBottom: '8px',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {formatPrice(Number(listing.price), listing.currency, lang)}
          </p>

          {/* Spec chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: '4px',
              marginBottom: '8px',
              overflow: 'hidden',
            }}
          >
            {listing.transmission && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'var(--tag-bg)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                }}
              >
                {listing.transmission}
              </span>
            )}
            {listing.mileage != null && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  background: 'var(--tag-bg)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                }}
              >
                {formatMileage(listing.mileage)}
              </span>
            )}
          </div>

          {/* Location + date row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            {listing.city ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="1.5"
                  style={{ flexShrink: 0 }}
                  aria-hidden="true"
                >
                  <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.6 3.5 6.5 3.5 6.5s3.5-3.9 3.5-6.5C9.5 2.57 7.93 1 6 1z" />
                  <circle cx="6" cy="4.5" r="1" />
                </svg>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {listing.city}
                </span>
              </div>
            ) : (
              <span />
            )}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
              {formatDate(listing.created_at, lang)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
