'use client'
import { useEffect } from 'react'

// global-error.tsx replaces the root layout entirely — globals.css is NOT loaded.
// Dark mode is handled via a <style> tag with prefers-color-scheme media query.
// Colors are defined as named constants so they stay in sync with the design system.

const ACCENT   = '#c83808'
const WARNING  = '#ca8a04'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Global error boundary]', error)
  }, [error])

  return (
    <html lang="ru">
      <head>
        <style>{`
          :root {
            --ge-bg:      #f2f4f7;
            --ge-card:    #ffffff;
            --ge-border:  #e4e8ef;
            --ge-text:    #191f28;
            --ge-muted:   #8a95a8;
            --ge-code-bg: #f2f4f7;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --ge-bg:      #0f1117;
              --ge-card:    #1a1d24;
              --ge-border:  #2a2e38;
              --ge-text:    #e8eaf0;
              --ge-muted:   #6b7380;
              --ge-code-bg: #13161e;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background: var(--ge-bg);
            color: var(--ge-text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
          }
          .ge-card {
            background: var(--ge-card);
            border: 1px solid var(--ge-border);
            border-radius: 20px;
            padding: 40px 32px;
            max-width: 400px;
            width: 100%;
            margin: 24px 16px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .ge-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--ge-text);
            margin: 0;
          }
          .ge-body {
            font-size: 14px;
            color: var(--ge-muted);
            line-height: 1.6;
            margin: 0;
          }
          .ge-digest {
            font-size: 11px;
            color: var(--ge-muted);
            font-family: monospace;
            background: var(--ge-code-bg);
            border: 1px solid var(--ge-border);
            border-radius: 6px;
            padding: 6px 10px;
            margin: 0;
            word-break: break-all;
            width: 100%;
          }
          .ge-btn {
            background: ${ACCENT};
            color: #ffffff;
            font-weight: 700;
            font-size: 15px;
            padding: 13px;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.15s;
          }
          .ge-btn:hover { opacity: 0.88; }
          .ge-btn:active { opacity: 0.75; }
        `}</style>
      </head>
      <body>
        <div className="ge-card">
          {/* Logo */}
          <div>
            <span style={{ fontWeight: 800, fontSize: '18px', color: ACCENT, letterSpacing: '-0.03em' }}>
              TAJCAR
            </span>
            <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--ge-muted)' }}>
              .TJ
            </span>
          </div>

          {/* Warning icon */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke={WARNING}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>

          <h1 className="ge-title">
            Произошла ошибка / Хато рӯй дод
          </h1>

          <p className="ge-body">
            Что-то пошло не так. / Чизе нодуруст шуд.
          </p>

          {error.digest && (
            <p className="ge-digest">{error.digest}</p>
          )}

          <button className="ge-btn" onClick={reset}>
            Попробовать снова / Дубора кӯшиш кунед
          </button>
        </div>
      </body>
    </html>
  )
}
