'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { IconCar } from './icons'
import { t } from '@/lib/i18n'
import type { Lang, ListingImage } from '@/types'

interface MediaGalleryProps {
  images: ListingImage[]
  activeIndex: number
  onNavigate: (index: number) => void
  lang?: Lang
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }: {
  images: ListingImage[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const count = images.length

  const prev = useCallback(() => setIdx((i) => (i - 1 + count) % count), [count])
  const next = useCallback(() => setIdx((i) => (i + 1) % count), [count])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const current = images[idx]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.94)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Counter */}
      <div style={{
        position: 'absolute',
        top: '18px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.65)',
        fontSize: '13px',
        fontWeight: 600,
        zIndex: 10,
        userSelect: 'none',
      }}>
        {idx + 1} / {count}
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          color: 'var(--color-white)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
        </svg>
      </button>

      {/* Main image */}
      <div
        style={{
          position: 'relative',
          width: 'min(92vw, 1100px)',
          height: 'min(78vh, 750px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={current.url}
          alt={`Photo ${idx + 1}`}
          fill
          style={{ objectFit: 'contain' }}
          priority
          sizes="92vw"
        />
      </div>

      {/* Prev / Next */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous"
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              color: 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4L6 9l5 5" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next"
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              color: 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 4l5 5-5 5" />
            </svg>
          </button>
        </>
      )}

      {/* Bottom thumbnail strip */}
      {count > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '5px',
            maxWidth: '90vw',
            overflowX: 'auto',
            padding: '4px 6px',
            scrollbarWidth: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIdx(i)}
              style={{
                position: 'relative',
                width: '52px',
                height: '38px',
                flexShrink: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                border: `2px solid ${i === idx ? 'var(--accent)' : 'rgba(255,255,255,0.25)'}`,
                cursor: 'pointer',
                padding: 0,
                background: 'rgba(0,0,0,0.5)',
                transition: 'border-color 0.15s',
              }}
            >
              <Image
                src={img.url}
                alt={`Thumb ${i + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="52px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single grid cell ─────────────────────────────────────────────────────────
function GridCell({ src, index, total, onClick, lang }: {
  src: string
  index: number
  total: number
  onClick: () => void
  lang?: Lang
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const isFirst = index === 0

  return (
    <button
      onClick={onClick}
      title={`Photo ${index + 1} of ${total}`}
      style={{
        position: 'relative',
        aspectRatio: isFirst ? '16/9' : '4/3',
        gridColumn: isFirst ? '1 / -1' : undefined,
        borderRadius: isFirst ? '10px 10px 0 0' : undefined,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        cursor: 'zoom-in',
        padding: 0,
        display: 'block',
        width: '100%',
      }}
    >
      {!loaded && !errored && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: 'var(--surface)' }}
          className="mod-gallery-shimmer"
        />
      )}
      {errored ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text-muted)',
        }}>
          <IconCar size={isFirst ? 40 : 20} />
        </div>
      ) : (
        <Image
          src={src}
          alt={`Photo ${index + 1}`}
          fill
          style={{ objectFit: 'cover', opacity: loaded ? 1 : 0, transition: 'opacity 0.2s, transform 0.2s' }}
          className="mod-grid-img"
          priority={index === 0}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setErrored(true) }}
          sizes={isFirst ? '100%' : '33vw'}
        />
      )}
      {/* Photo count badge on the first image */}
      {isFirst && total > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '10px',
          background: 'rgba(0,0,0,0.6)',
          color: 'var(--color-white)',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 9px',
          borderRadius: '100px',
        }}>
          {total} {t('moderator.photoCount', lang ?? 'ru')}
        </div>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MediaGallery({ images, activeIndex, onNavigate, lang }: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const count = images.length

  function openLightbox(i: number) {
    setLightboxIndex(i)
    onNavigate(i)
  }

  if (count === 0) {
    return (
      <div
        style={{
          height: '200px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
        aria-label="No photos available"
      >
        <IconCar size={48} />
      </div>
    )
  }

  return (
    <>
      {/* All photos in a grid — first is hero, rest fill below */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {images.map((img, i) => (
          <GridCell
            key={img.id}
            src={img.url}
            index={i}
            total={count}
            onClick={() => openLightbox(i)}
            lang={lang}
          />
        ))}
      </div>

      {/* Fullscreen lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <style>{`
        .mod-grid-img:hover { transform: scale(1.05); }
        @keyframes mod-shimmer {
          0%   { opacity: 0.5; }
          50%  { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .mod-gallery-shimmer { animation: mod-shimmer 1.4s ease-in-out infinite; }
      `}</style>
    </>
  )
}
