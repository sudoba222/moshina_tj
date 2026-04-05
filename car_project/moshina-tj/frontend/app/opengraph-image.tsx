import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TAJCAR.TJ — Авторынок Таджикистана'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Brand colours — kept as constants since edge runtime has no CSS variables
const C_ACCENT     = '#c83808'   // TAJCAR brand red
const C_BG         = '#0f0f0f'   // near-black background
const C_WHITE      = '#ffffff'
const C_MUTED      = '#999999'
const C_ACCENT_25  = 'rgba(200,56,8,0.25)'
const C_ACCENT_15  = 'rgba(200,56,8,0.15)'
const C_WHEEL_DARK = '#222222'
const C_WHEEL_RIM  = '#555555'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: C_BG,
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient accent — top-left */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -120,
            width: 600,
            height: 600,
            background: `radial-gradient(circle, ${C_ACCENT_25} 0%, transparent 70%)`,
            display: 'flex',
          }}
        />
        {/* Background gradient accent — bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 500,
            height: 500,
            background: `radial-gradient(circle, ${C_ACCENT_15} 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Car SVG — large center */}
        <svg width="280" height="160" viewBox="0 0 56 32" fill="none">
          <path
            d="M6 19L11 9.5C12 7.5 14 6.5 16.2 6.5H39.8C42 6.5 44 7.5 45 9.5L50 19H52C53.1 19 54 19.9 54 21V28C54 29.1 53.1 30 52 30H50C50 31.7 48.7 33 47 33C45.3 33 44 31.7 44 30H12C12 31.7 10.7 33 9 33C7.3 33 6 31.7 6 30H4C2.9 30 2 29.1 2 28V21C2 19.9 2.9 19 4 19H6Z"
            fill={C_WHITE}
          />
          <path d="M16 11L12.5 19H43.5L40 11H16Z" fill={C_BG} opacity="0.6" />
          <path d="M29 11L26 19H43.5L41 11H29Z" fill="#1a1a1a" opacity="0.5" />
          <circle cx="9"  cy="30" r="4" fill={C_WHEEL_DARK} />
          <circle cx="9"  cy="30" r="2" fill={C_WHEEL_RIM} />
          <circle cx="47" cy="30" r="4" fill={C_WHEEL_DARK} />
          <circle cx="47" cy="30" r="2" fill={C_WHEEL_RIM} />
          <path d="M50 19L51 22H54V21L52 19H50Z" fill={C_ACCENT} opacity="0.8" />
        </svg>

        {/* Brand name */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, marginTop: 28 }}>
          <span
            style={{
              color: C_ACCENT,
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            TAJCAR
          </span>
          <span
            style={{
              color: C_MUTED,
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            .TJ
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: C_MUTED,
            fontSize: 28,
            fontWeight: 500,
            marginTop: 16,
            letterSpacing: '0.02em',
          }}
        >
          Авторынок Таджикистана · Бозори мошини Тоҷикистон
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: C_ACCENT,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size },
  )
}
