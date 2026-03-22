'use client'

interface StatCardProps {
  label: string
  value: number | string
  /** CSS color value — use CSS vars like 'var(--accent)' */
  accentColor?: string
  /** Optional SVG icon element */
  icon?: React.ReactNode
  /** Optional trend: positive = green, negative = red */
  trend?: { value: number; label: string }
  /** Optional click handler */
  onClick?: () => void
}

export default function StatCard({ label, value, accentColor, icon, trend, onClick }: StatCardProps) {
  const color = accentColor ?? 'var(--accent)'
  const isClickable = !!onClick

  const formattedValue = typeof value === 'number' ? value.toLocaleString('ru-RU') : value

  const trendPositive = trend && trend.value >= 0
  const trendColor = trendPositive ? 'var(--color-success)' : 'var(--color-error)'
  const trendBg = trendPositive ? 'var(--color-success-dim)' : 'var(--color-error-dim)'
  const trendSign = trend && trend.value > 0 ? '+' : ''

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
      style={{
        background: 'var(--card)',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: isClickable ? 'box-shadow 0.15s' : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={isClickable ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)' } : undefined}
      onMouseLeave={isClickable ? (e) => { e.currentTarget.style.boxShadow = 'none' } : undefined}
    >
      {/* Top: icon + trend */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Icon container */}
        {/* Icon wrapper — uses a relative+absolute approach to tint without color-mix */}
        <div
          style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              background: color,
              opacity: 0.12,
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
            }}
          >
            {icon ?? <DefaultIcon color={color} />}
          </div>
        </div>

        {/* Trend badge */}
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '3px 8px',
              borderRadius: '100px',
              fontSize: '11px',
              fontWeight: 700,
              background: trendBg,
              color: trendColor,
            }}
          >
            <TrendArrow positive={!!trendPositive} />
            {trendSign}{trend.value}%
          </span>
        )}
      </div>

      {/* Value + label */}
      <div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}
        >
          {formattedValue}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {trend && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {trend.label}
          </div>
        )}
      </div>

      {/* Decorative accent bar at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: color,
          opacity: 0.3,
          borderRadius: '0 0 14px 14px',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DefaultIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function TrendArrow({ positive }: { positive: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {positive
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />
      }
    </svg>
  )
}
