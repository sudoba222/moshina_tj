import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#c83808',
          width: 180,
          height: 180,
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: 80,
          fontWeight: 800,
          letterSpacing: '-0.03em',
        }}
      >
        M
      </div>
    ),
    { ...size },
  )
}
