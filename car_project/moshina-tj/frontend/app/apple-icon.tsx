import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const C_ACCENT = '#c83808'
const C_WHITE  = '#ffffff'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: C_ACCENT,
          width: 180,
          height: 180,
          borderRadius: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <svg width="110" height="64" viewBox="0 0 24 14" fill="none">
          <path
            d="M3 8L5.2 4.5C5.6 3.6 6.5 3 7.5 3H16.5C17.5 3 18.4 3.6 18.8 4.5L21 8H22C22.6 8 23 8.4 23 9V12.5C23 13.1 22.6 13.5 22 13.5H21C21 14.3 20.3 15 19.5 15C18.7 15 18 14.3 18 13.5H6C6 14.3 5.3 15 4.5 15C3.7 15 3 14.3 3 13.5H2C1.4 13.5 1 13.1 1 12.5V9C1 8.4 1.4 8 2 8H3Z"
            fill={C_WHITE}
          />
          <path d="M7 5L5.5 8H18.5L17 5H7Z" fill={C_ACCENT} />
          <circle cx="4.5"  cy="13.5" r="1.5" fill={C_ACCENT} />
          <circle cx="19.5" cy="13.5" r="1.5" fill={C_ACCENT} />
        </svg>
        <div
          style={{
            color: C_WHITE,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: '1',
            fontFamily: 'sans-serif',
          }}
        >
          TAJCAR
        </div>
      </div>
    ),
    { ...size },
  )
}
