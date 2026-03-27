import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TAJCAR.TJ — Авто рынок Таджикистана'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c83808"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h10l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
            <circle cx="7.5" cy="17" r="2.5" />
            <circle cx="16.5" cy="17" r="2.5" />
          </svg>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.03em',
            }}
          >
            TAJCAR.TJ
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#94a3b8',
            letterSpacing: '0.01em',
          }}
        >
          Авто рынок Таджикистана
        </div>
      </div>
    ),
    { ...size }
  )
}
