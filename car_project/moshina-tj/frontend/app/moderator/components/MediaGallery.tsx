'use client'
import Image from 'next/image'
import { IconChevronLeft, IconChevronRight, IconCar } from './icons'
import type { ListingImage } from '@/types'

interface MediaGalleryProps {
  images: ListingImage[]
  activeIndex: number
  onNavigate: (index: number) => void
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
      {/* Main image with zoom-on-hover */}
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
        <Image
          src={currentImage.url}
          alt={`Photo ${activeIndex + 1} of ${count}`}
          fill
          style={{ objectFit: 'cover', transition: 'transform 0.2s ease' }}
          className="mod-gallery-img"
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
            <button
              key={img.id}
              role="option"
              aria-selected={i === activeIndex}
              aria-label={`Photo ${i + 1}`}
              onClick={() => onNavigate(i)}
              style={{
                position: 'relative',
                width: '52px',
                height: '52px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `2px solid ${i === activeIndex ? 'var(--accent)' : 'var(--border)'}`,
                background: 'var(--surface)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <Image src={img.url} alt="" fill style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {/* Zoom CSS — injected via style tag to keep component self-contained */}
      <style>{`
        .mod-gallery-main:hover .mod-gallery-img {
          transform: scale(1.5);
        }
      `}</style>
    </div>
  )
}
