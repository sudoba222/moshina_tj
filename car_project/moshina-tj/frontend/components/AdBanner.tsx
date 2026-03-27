'use client'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

// Static Unsplash car photo URLs — stable CDN links, no authentication required
const CAR_PHOTOS = [
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=480&q=75',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=480&q=75',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=480&q=75',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=480&q=75',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=480&q=75',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=480&q=75',
]

interface AdBannerProps {
  adLink?: string
}

export default function AdBanner({ adLink = '#' }: AdBannerProps) {
  const { lang } = useLang()

  return (
    <a
      href={adLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('adBanner.title', lang)}
      style={{
        display: 'block',
        textDecoration: 'none',
        position: 'relative',
        width: '100%',
        height: '200px',
        overflow: 'hidden',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        cursor: adLink === '#' ? 'default' : 'pointer',
      }}
      onClick={adLink === '#' ? (e) => e.preventDefault() : undefined}
    >
      {/* Horizontally scrollable photo strip */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          width: '100%',
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
        }}
      >
        {CAR_PHOTOS.map((src, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{
              flexShrink: 0,
              width: `${100 / CAR_PHOTOS.length}%`,
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        ))}
      </div>

      {/* Dark gradient overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 50%, rgba(0,0,0,0.62) 100%)',
        }}
      />

      {/* Content overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 'clamp(16px, 4vw, 32px)',
          gap: '8px',
        }}
      >
        {/* Ad label badge */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-white)',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}
        >
          AD
        </span>

        <h2
          style={{
            margin: 0,
            fontSize: 'clamp(18px, 3vw, 26px)',
            fontWeight: 800,
            color: 'var(--color-white)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {t('adBanner.title', lang)}
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: 'clamp(12px, 1.8vw, 14px)',
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.5,
            maxWidth: '420px',
          }}
        >
          {t('adBanner.sub', lang)}
        </p>

        {/* CTA button */}
        <div
          style={{
            marginTop: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--accent)',
            color: 'var(--color-white)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            minHeight: '36px',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.85' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
        >
          {t('adBanner.cta', lang)}
          {/* Chevron right icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 6h8M6 2l4 4-4 4" />
          </svg>
        </div>
      </div>
    </a>
  )
}
