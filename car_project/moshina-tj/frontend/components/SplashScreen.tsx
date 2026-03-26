'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Only show once per session
    if (typeof window === 'undefined') return
    const shown = sessionStorage.getItem('splash_shown')
    if (shown) return

    sessionStorage.setItem('splash_shown', '1')
    setVisible(true)

    // Start fade-out after 2.2s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2200)
    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => setVisible(false), 2700)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Logo */}
      <Image
        src="/logo.png"
        alt="TajCar.tj"
        width={220}
        height={120}
        style={{ objectFit: 'contain' }}
        priority
      />

      {/* Loading bar container */}
      <div
        style={{
          width: '180px',
          height: '3px',
          background: 'var(--border)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--accent)',
            borderRadius: '999px',
            animation: 'splashProgress 2s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes splashProgress {
          0%   { width: 0%; }
          40%  { width: 60%; }
          80%  { width: 85%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  )
}
