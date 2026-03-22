import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#c83808',
          width: 32,
          height: 32,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '-0.02em',
        }}
      >
        M
      </div>
    ),
    { ...size },
  )
}
