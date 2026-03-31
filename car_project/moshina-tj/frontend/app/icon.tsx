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
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 11L7.5 6.5C8 5.6 8.9 5 9.9 5H14.1C15.1 5 16 5.6 16.5 6.5L19 11H20C20.6 11 21 11.4 21 12V16C21 16.6 20.6 17 20 17H19C19 18.1 18.1 19 17 19C15.9 19 15 18.1 15 17H9C9 18.1 8.1 19 7 19C5.9 19 5 18.1 5 17H4C3.4 17 3 16.6 3 16V12C3 11.4 3.4 11 4 11H5Z"
            fill="white"
          />
          <circle cx="7" cy="17" r="1.2" fill="#c83808" />
          <circle cx="17" cy="17" r="1.2" fill="#c83808" />
          <path d="M9.5 7.5L8 11H16L14.5 7.5H9.5Z" fill="#c83808" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
