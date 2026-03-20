'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { AdBanner } from '@/lib/api'
import type { Lang } from '@/types'

interface Props {
  banners: AdBanner[]
  lang: Lang
}

export default function HeroBannerSlider({ banners, lang }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = banners.length

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total)
  }, [total])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total)
  }, [total])

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (total <= 1 || isPaused) return
    timerRef.current = setTimeout(next, 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, isPaused, next, total])

  if (total === 0) return null

  const banner = banners[current]

  function handleClick() {
    if (!banner.link_url) return
    if (banner.link_url.startsWith('http')) {
      window.open(banner.link_url, '_blank', 'noopener')
    } else {
      router.push(banner.link_url)
    }
  }

  return (
    <section
      className="hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div
        className="hero-slider-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((b, i) => (
          <div
            key={b.id}
            className="hero-slide"
            onClick={b.link_url ? handleClick : undefined}
            style={{ cursor: b.link_url ? 'pointer' : 'default' }}
            aria-hidden={i !== current}
          >
            <Image
              src={b.image_url}
              alt={lang === 'ru' ? b.title_ru : b.title_tj}
              fill
              priority={i === 0}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
            {/* Gradient overlay */}
            <div className="hero-slide-overlay" />
            {/* Text */}
            <div className="hero-slide-text">
              <p className="hero-slide-title">{lang === 'ru' ? b.title_ru : b.title_tj}</p>
              {(lang === 'ru' ? b.subtitle_ru : b.subtitle_tj) && (
                <p className="hero-slide-sub">{lang === 'ru' ? b.subtitle_ru : b.subtitle_tj}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next arrows — only show if multiple */}
      {total > 1 && (
        <>
          <button
            className="slider-arrow slider-arrow-prev"
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            className="slider-arrow slider-arrow-next"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="slider-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              className={`slider-dot${i === current ? ' active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style>{`
        .hero-slider {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
          border-radius: 16px;
          background: var(--surface);
        }
        @media (min-width: 640px) { .hero-slider { height: 260px; } }
        @media (min-width: 1024px) { .hero-slider { height: 340px; } }

        .hero-slider-track {
          display: flex;
          height: 100%;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform;
        }
        .hero-slide {
          flex-shrink: 0;
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .hero-slide-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%);
        }
        .hero-slide-text {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 20px 20px 24px;
        }
        .hero-slide-title {
          font-size: clamp(16px, 3vw, 26px);
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0 0 4px;
        }
        .hero-slide-sub {
          font-size: clamp(12px, 1.5vw, 15px);
          color: rgba(255,255,255,0.82);
          margin: 0;
        }

        /* Arrows */
        .slider-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0,0,0,0.45);
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: background 0.15s;
          backdrop-filter: blur(4px);
        }
        .slider-arrow:hover { background: rgba(0,0,0,0.7); }
        .slider-arrow-prev { left: 10px; }
        .slider-arrow-next { right: 10px; }

        /* Dots */
        .slider-dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          z-index: 10;
        }
        .slider-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.45);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: background 0.2s, width 0.2s;
        }
        .slider-dot.active {
          background: #fff;
          width: 18px;
          border-radius: 3px;
        }
      `}</style>
    </section>
  )
}
