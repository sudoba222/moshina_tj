'use client'
import { useEffect, useRef, useCallback } from 'react'

interface ImageLightboxProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export default function ImageLightbox({ images, initialIndex = 0, isOpen, onClose }: ImageLightboxProps) {
  const currentIndexRef = useRef(initialIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number | null>(null)

  // Keep current index ref in sync with prop
  useEffect(() => {
    currentIndexRef.current = initialIndex
  }, [initialIndex])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(images.length - 1, index))
    currentIndexRef.current = clamped
    // Update the DOM directly to avoid re-renders that cause flicker
    const img = containerRef.current?.querySelector<HTMLImageElement>('[data-lightbox-img]')
    const counter = containerRef.current?.querySelector<HTMLSpanElement>('[data-lightbox-counter]')
    if (img) img.src = images[clamped]
    if (counter) counter.textContent = `${clamped + 1} / ${images.length}`
  }, [images])

  const goPrev = useCallback(() => goTo(currentIndexRef.current - 1), [goTo])
  const goNext = useCallback(() => goTo(currentIndexRef.current + 1), [goTo])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, goPrev, goNext, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  function onTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext()
      else goPrev()
    }
    touchStartXRef.current = null
  }

  if (!isOpen) return null

  const showNav = images.length > 1
  const initialSrc = images[initialIndex] ?? ''
  const initialCounter = `${initialIndex + 1} / ${images.length}`

  const arrowBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.55)',
    border: 'none',
    borderRadius: '50%',
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--color-white)',
    zIndex: 1001,
    transition: 'background 0.15s ease',
    flexShrink: 0,
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)',
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Image viewer"
    >
      {/* Backdrop click to close */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, zIndex: 1000 }}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close lightbox"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(0,0,0,0.55)',
          border: 'none',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--color-white)',
          zIndex: 1002,
        }}
      >
        <CloseIcon />
      </button>

      {/* Prev button */}
      {showNav && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          aria-label="Previous image"
          style={{ ...arrowBtnStyle, left: '16px' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }}
        >
          <ChevronLeftIcon />
        </button>
      )}

      {/* Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '90vw',
          maxHeight: '85vh',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-lightbox-img
          src={initialSrc}
          alt="Lightbox image"
          style={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: '8px',
            display: 'block',
          }}
        />
      </div>

      {/* Next button */}
      {showNav && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          aria-label="Next image"
          style={{ ...arrowBtnStyle, right: '16px' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }}
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* Counter */}
      {showNav && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)',
            color: 'var(--color-white)',
            fontSize: '14px',
            fontWeight: 600,
            padding: '6px 16px',
            borderRadius: '100px',
            zIndex: 1002,
            whiteSpace: 'nowrap',
          }}
        >
          <span data-lightbox-counter>{initialCounter}</span>
        </div>
      )}
    </div>
  )
}
