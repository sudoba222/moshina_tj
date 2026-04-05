'use client'
import { useState } from 'react'
import Image from 'next/image'
import { getCarBrandLogoUrl } from '@/lib/carBrandLogos'

interface CarBrandLogoProps {
  brand: string
  size?: number
  className?: string
}

/**
 * Renders a car brand logo from CDN with graceful text fallback.
 * Uses next/image for automatic optimisation + caching.
 */
export default function CarBrandLogo({ brand, size = 32, className }: CarBrandLogoProps) {
  const [failed, setFailed] = useState(false)
  const url = getCarBrandLogoUrl(brand)

  if (!url || failed) {
    // Text fallback — first 2 letters of brand name in a circle
    return (
      <span
        className={className}
        aria-label={brand}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: Math.max(9, Math.round(size * 0.35)),
          fontWeight: 700,
          color: 'var(--text-muted)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {brand.slice(0, 2).toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: '#fff',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        padding: Math.round(size * 0.1),
      }}
    >
      <Image
        src={url}
        alt={brand}
        width={size}
        height={size}
        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
        onError={() => setFailed(true)}
        unoptimized
      />
    </span>
  )
}
