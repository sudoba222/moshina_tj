'use client'
import { useState } from 'react'
import Image from 'next/image'
import { IconChevronLeft, IconChevronRight, IconCar } from './icons'
import type { ListingImage } from '@/types'

interface MediaGalleryProps {
  images: ListingImage[]
  activeIndex: number
  onNavigate: (index: number) => void
}

function ImageSlot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <>
      {/* Loading shimmer — hidden once the image loads */}
      {!loaded && !errored && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--surface)',
            zIndex: 1,
          }}
          className="mod-gallery-shimmer"
        />
      )}

      {errored ? (
        /* Broken image placeholder */
        <div
          aria-label="Image failed to load"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            background: 'var(--surface)',
            zIndex: 1,
          }}
        >
          <IconCar size={40} />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: 'cover', transition: 'transform 0.2s ease', opacity: loaded ? 1 : 0 }}
          className="mod-gallery-img"
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setErrored(true) }}
        />
      )}
    </>
  )
}

function ThumbnailSlot({ src, isActive, onClick, label }: {
  src: string
  isActive: boolean
  onClick: () => void
  label: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <button
      role="option"
      aria-selected={isActive}
      aria-label={label}
      onClick={onClick}
      style={{
        position: 'relative',
        width: '52px',
        height: '52px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        background: 'var(--surface)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {!loaded && !errored && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--border)',
          }}
          className="mod-gallery-shimmer"
        />
      )}
      {errored ? (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
        }}>
          <IconCar size={16} />
        </div>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          style={{ objectFit: 'cover', opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setErrored(true) }}
        />
      )}
    </button>
  )
}

export default function MediaGallery({ images, activeIndex, onNavigate }: MediaGalleryProps) {
  const count = images.length

  if (count === 0) {
    return (
      <div
        style={{
          height: '320px',
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

  const currentImage = images[activeIndex] ?? images[0]

  return (
    <div>
      {/* Main image */}
      <div
        style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          height: '280px',
          marginBottom: '8px',
          cursor: 'zoom-in',
        }}
        className="mod-gallery-main"
      >
        <ImageSlot
          src={currentImage.url}
          alt={`Photo ${activeIndex + 1} of ${count}`}
          priority={activeIndex === 0}
        />

        {/* Prev / Next arrows */}
        {count > 1 && (
          <>
            <button
              onClick={() => onNavigate((activeIndex - 1 + count) % count)}
              aria-label="Previous photo"
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.55)',
                color: 'var(--color-white)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <IconChevronLeft />
            </button>
            <button
              onClick={() => onNavigate((activeIndex + 1) % count)}
              aria-label="Next photo"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.55)',
                color: 'var(--color-white)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <IconChevronRight />
            </button>
            {/* Counter */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '10px',
                background: 'rgba(0,0,0,0.6)',
                color: 'var(--color-white)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '100px',
                zIndex: 2,
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {activeIndex + 1} / {count}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div
          role="listbox"
          aria-label="Photo thumbnails"
          style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
        >
          {images.map((img, i) => (
            <ThumbnailSlot
              key={img.id}
              src={img.url}
              isActive={i === activeIndex}
              onClick={() => onNavigate(i)}
              label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Gallery styles */}
      <style>{`
        .mod-gallery-main:hover .mod-gallery-img {
          transform: scale(1.5);
        }
        @keyframes mod-shimmer {
          0%   { opacity: 0.5; }
          50%  { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .mod-gallery-shimmer {
          animation: mod-shimmer 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
