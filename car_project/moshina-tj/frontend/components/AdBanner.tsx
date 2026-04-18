'use client'
import { useEffect, useState } from 'react'
import { catalogApi } from '@/lib/api'
import type { AdBanner } from '@/lib/api'
import { useLang } from '@/lib/LanguageContext'

export default function AdBannerSection() {
  const { lang } = useLang()
  const [banners, setBanners] = useState<AdBanner[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    catalogApi.getBanners()
      .then((res) => setBanners(res.data.data ?? []))
      .catch(() => {})
  }, [])

  // Auto-rotate every 5 seconds when there are multiple banners
  useEffect(() => {
    if (banners.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000)
    return () => clearInterval(id)
  }, [banners.length])

  if (banners.length === 0) return null

  const banner = banners[index]
  const title = lang === 'ru' ? banner.title_ru : (banner.title_tj || banner.title_ru)
  const subtitle = lang === 'ru' ? banner.subtitle_ru : (banner.subtitle_tj || banner.subtitle_ru)
  const href = banner.link_url ?? '#'

  return (
    <a
      href={href}
      target={href !== '#' ? '_blank' : undefined}
      rel="noopener noreferrer"
      aria-label={title}
      style={{
        display: 'block',
        textDecoration: 'none',
        position: 'relative',
        width: '100%',
        height: '200px',
        overflow: 'hidden',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        cursor: href === '#' ? 'default' : 'pointer',
      }}
      onClick={href === '#' ? (e) => e.preventDefault() : undefined}
    >
      {/* Background image */}
      {banner.image_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={banner.image_url}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
        />
      )}

      {/* Dark gradient overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 50%, rgba(0,0,0,0.62) 100%)',
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
        {/* Ad badge */}
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
          {title}
        </h2>

        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(12px, 1.8vw, 14px)',
              color: 'rgba(255,255,255,0.82)',
              lineHeight: 1.5,
              maxWidth: '420px',
            }}
          >
            {subtitle}
          </p>
        )}

        {href !== '#' && (
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
            }}
          >
            {lang === 'ru' ? 'Подробнее' : 'Бештар'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 6h8M6 2l4 4-4 4" />
            </svg>
          </div>
        )}
      </div>

      {/* Dot indicators for multiple banners */}
      {banners.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '14px',
            display: 'flex',
            gap: '5px',
          }}
        >
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setIndex(i) }}
              aria-label={`Banner ${i + 1}`}
              style={{
                width: i === index ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === index ? 'var(--color-white)' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </a>
  )
}
