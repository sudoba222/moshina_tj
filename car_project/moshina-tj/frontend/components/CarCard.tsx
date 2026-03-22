'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/i18n'
import { favoritesApi } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'
import { useChatDrawer } from '@/lib/ChatDrawerContext'
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

function formatDate(iso: string, lang: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return lang === 'ru' ? 'Сегодня' : 'Имрӯз'
  if (diffDays === 1) return lang === 'ru' ? 'Вчера' : 'Дирӯз'
  if (diffDays < 7) return lang === 'ru' ? `${diffDays} дн. назад` : `${diffDays} рӯз пеш`
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { day: 'numeric', month: 'short' })
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'USD') {
    return '$' + price.toLocaleString('en-US')
  }
  return price.toLocaleString('ru-RU') + ' сом.'
}

// Chat SVG icon
function ChatIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// Credit card SVG icon
function CreditCardIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="14" height="10" rx="2" />
      <line x1="1" y1="5" x2="15" y2="5" />
      <line x1="4" y1="8.5" x2="7" y2="8.5" />
    </svg>
  )
}

// Star SVG icon
function StarIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" />
    </svg>
  )
}

// Heart SVG icon
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--color-error)' : 'none'}
      stroke={filled ? 'var(--color-error)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function CarCard({ listing, lang, className, moderatorMode = false, initialFavorited, priority = false }: CarCardProps) {
  const primaryImage = listing.images.find((img) => img.is_primary) ?? listing.images[0]
  const stripeColor = moderatorMode ? (STATUS_STRIPE[listing.status] ?? 'var(--text-muted)') : null
  const statusI18nKey = moderatorMode ? (STATUS_I18N_KEY[listing.status] ?? null) : null
  const statusLabel = statusI18nKey ? t(statusI18nKey, lang) : (moderatorMode ? listing.status : null)
  const [imgLoaded, setImgLoaded] = useState(false)

  const { user } = useAuth()
  const { openChat } = useChatDrawer()
  const router = useRouter()
  const [favorited, setFavorited] = useState<boolean>(
    initialFavorited ?? listing.is_favorited ?? false
  )
  const [favLoading, setFavLoading] = useState(false)

  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (favLoading) return
    // Optimistic update — flip immediately, revert if API fails
    const prev = favorited
    setFavorited(!prev)
    setFavLoading(true)
    try {
      const res = await favoritesApi.toggle(listing.id)
      setFavorited(res.data.data.favorited)
    } catch {
      setFavorited(prev) // revert
    } finally {
      setFavLoading(false)
    }
  }

  function handleWriteMessage(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/auth/login')
      return
    }
    openChat(listing.user_id, listing.id)
  }

  return (
    <Link href={`/car/${listing.id}`} style={{ display: 'block', textDecoration: 'none' }} className={className}>
      <article
        className="animate-fade-in-up card-hover"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'pointer',
          ...(stripeColor ? { borderLeft: `4px solid ${stripeColor}` } : {}),
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: '180px', background: 'var(--bg)', overflow: 'hidden' }}>
          {primaryImage ? (
            <>
              {/* Skeleton shown while image is loading */}
              {!imgLoaded && (
                <div
                  className="skeleton"
                  style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
                />
              )}
              <Image
                src={primaryImage.url}
                alt={`${listing.brand} ${listing.model}`}
                fill
                priority={priority}
                loading={priority ? 'eager' : 'lazy'}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                style={{ objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
                onLoad={() => setImgLoaded(true)}
              />
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
                <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
                <circle cx="7.5" cy="17" r="2.5" />
                <circle cx="16.5" cy="17" r="2.5" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
            {listing.type === 'rent' && (
              <span style={{
                background: 'var(--color-info)',
                color: 'var(--color-white)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
              }}>
                {t('badges.rent', lang)}
              </span>
            )}
            {listing.installment_available && (
              <span style={{
                background: 'var(--accent)',
                color: 'var(--color-white)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}>
                <CreditCardIcon />
                {t('badges.installment', lang)}
              </span>
            )}
          </div>

          {/* Moderator status badge */}
          {moderatorMode && statusLabel && stripeColor && (
            <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
              <span style={{
                background: stripeColor,
                color: 'var(--color-white)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '20px',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                {statusLabel}
              </span>
            </div>
          )}

          {/* Favorite button — top-right (hidden in moderator mode where status badge lives there) */}
          {!moderatorMode && (
            <button
              onClick={handleFavoriteClick}
              aria-label={favorited ? t('favorites.remove', lang) : t('favorites.add', lang)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: favorited ? 'var(--color-error)' : 'var(--color-white)',
                opacity: favLoading ? 0.6 : 1,
                transition: 'opacity 0.1s ease, transform 0.1s ease',
                transform: favLoading ? 'scale(0.85)' : 'scale(1)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                flexShrink: 0,
              }}
            >
              <HeartIcon filled={favorited} />
            </button>
          )}

          {listing.is_dealer_listing && (
            <div style={{ position: 'absolute', bottom: '8px', left: '8px' }}>
              <span style={{
                background: 'rgba(0,0,0,0.72)',
                color: 'var(--color-white)',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}>
                <StarIcon />
                {t('badges.dealer', lang)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px' }}>
          {/* Price — prominent */}
          <p style={{
            fontSize: '18px',
            fontWeight: 900,
            color: 'var(--accent)',
            marginBottom: '4px',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            {formatPrice(Number(listing.price), listing.currency)}
          </p>

          {/* Brand + Model */}
          <p style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {listing.brand} {listing.model}
          </p>

          {/* Specs row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 0',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            <span>{listing.year}</span>
            {listing.mileage != null && (
              <>
                <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
                <span>{formatMileage(listing.mileage)}</span>
              </>
            )}
            {listing.transmission && (
              <>
                <span style={{ margin: '0 5px', opacity: 0.5 }}>·</span>
                <span>{listing.transmission}</span>
              </>
            )}
          </div>

          {/* Location */}
          {listing.city && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M6 1C4.07 1 2.5 2.57 2.5 4.5c0 2.6 3.5 6.5 3.5 6.5s3.5-3.9 3.5-6.5C9.5 2.57 7.93 1 6 1z" />
                <circle cx="6" cy="4.5" r="1" />
              </svg>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{listing.city}</span>
            </div>
          )}

          {/* Date + poster row */}
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {formatDate(listing.created_at, lang)}
            </span>
            {listing.user_name && (
              <span style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px',
              }}>
                {listing.user_name}
              </span>
            )}
          </div>

          {/* Write message button — only for other sellers */}
          {!moderatorMode && user && listing.user_id !== user.id && (
            <button
              onClick={handleWriteMessage}
              aria-label={t('chat.writeMessage', lang)}
              style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                width: '100%',
                padding: '7px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'transparent',
                border: '1px solid var(--accent)',
                borderRadius: '8px',
                cursor: 'pointer',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <ChatIcon />
              {t('chat.writeMessage', lang)}
            </button>
          )}
        </div>
      </article>
    </Link>
  )
}
