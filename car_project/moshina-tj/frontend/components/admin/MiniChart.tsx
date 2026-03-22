'use client'

// ── Zero-dependency SVG chart components ──────────────────────────────────────
// These provide sparkline/bar visuals without requiring recharts.
// When recharts is added to the project, replace these with Recharts components.

interface DataPoint {
  label: string
  value: number
}

interface MiniBarChartProps {
  data: DataPoint[]
  height?: number
  barColor?: string
  title?: string
}

export function MiniBarChart({ data, height = 120, barColor = 'var(--accent)', title }: MiniBarChartProps) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const barWidth = 100 / data.length
  const labelFontSize = data.length > 12 ? 8 : 10

  return (
    <div>
      {title && (
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
          {title}
        </div>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-label={title ?? 'Bar chart'}
        role="img"
        style={{ overflow: 'visible' }}
      >
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * (height - 20)
          const x = i * barWidth + barWidth * 0.1
          const w = barWidth * 0.8
          const y = height - 16 - barH

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={w}
                height={barH}
                rx={1.5}
                fill={barColor}
                opacity={0.85}
              />
              <text
                x={x + w / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={labelFontSize}
                fill="var(--text-muted)"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface MiniLineChartProps {
  data: DataPoint[]
  height?: number
  lineColor?: string
  fillColor?: string
  title?: string
  showDots?: boolean
}

export function MiniLineChart({
  data,
  height = 120,
  lineColor = 'var(--accent)',
  fillColor,
  title,
  showDots = true,
}: MiniLineChartProps) {
  if (data.length < 2) return null

  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const w = 100
  const padTop = 8
  const padBottom = 20
  const chartH = height - padTop - padBottom
  const step = w / (data.length - 1)

  const points = data.map((d, i) => ({
    x: i * step,
    y: padTop + chartH - (d.value / maxVal) * chartH,
    label: d.label,
    value: d.value,
  }))

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Area fill path
  const areaPath = [
    `M ${points[0].x} ${padTop + chartH}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${padTop + chartH}`,
    'Z',
  ].join(' ')

  const actualFill = fillColor ?? lineColor

  return (
    <div>
      {title && (
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
          {title}
        </div>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        aria-label={title ?? 'Line chart'}
        role="img"
        style={{ overflow: 'visible' }}
      >
        {/* Area fill */}
        <path d={areaPath} fill={actualFill} opacity="0.1" />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots &&
          points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill={lineColor} />
          ))}

        {/* X-axis labels — show first, last, and every nth depending on count */}
        {points
          .filter((_, i) => i === 0 || i === points.length - 1 || (data.length <= 8 && i % 1 === 0) || (data.length > 8 && i % Math.ceil(data.length / 6) === 0))
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 2}
              textAnchor={p.x < 5 ? 'start' : p.x > w - 5 ? 'end' : 'middle'}
              fontSize={9}
              fill="var(--text-muted)"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            >
              {p.label}
            </text>
          ))}
      </svg>
    </div>
  )
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  title?: string
}

export function DonutChart({ data, size = 100, title }: DonutChartProps) {
  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  const cx = size / 2
  const cy = size / 2
  // outerR and innerR define the ring edges
  const outerR = size * 0.44
  const innerR = size * 0.28
  // Arc path sits at the midpoint; strokeWidth spans the ring
  const arcR = (outerR + innerR) / 2
  const strokeWidth = outerR - innerR

  let cumulativeAngle = -90 // start at top

  const arcs = data.map((d) => {
    const angle = (d.value / total) * 360
    const startAngle = cumulativeAngle
    cumulativeAngle += angle

    const toRad = (deg: number) => (deg * Math.PI) / 180
    const x1 = cx + arcR * Math.cos(toRad(startAngle))
    const y1 = cy + arcR * Math.sin(toRad(startAngle))
    const x2 = cx + arcR * Math.cos(toRad(startAngle + angle))
    const y2 = cy + arcR * Math.sin(toRad(startAngle + angle))
    const largeArc = angle > 180 ? 1 : 0

    return { ...d, x1, y1, x2, y2, largeArc, angle, cx, cy, arcR, strokeWidth }
  })

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={title ?? 'Donut chart'}
        role="img"
        style={{ flexShrink: 0 }}
      >
        {arcs.map((arc, i) => {
          if (arc.angle < 0.5) return null
          return (
            <path
              key={i}
              d={`M ${arc.x1} ${arc.y1} A ${arc.arcR} ${arc.arcR} 0 ${arc.largeArc} 1 ${arc.x2} ${arc.y2}`}
              fill="none"
              stroke={arc.color}
              strokeWidth={arc.strokeWidth}
              strokeLinecap="round"
            />
          )
        })}
        {/* Center hole — fills the inner circle of the ring */}
        <circle cx={cx} cy={cy} r={innerR} fill="var(--card)" />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: d.color,
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginLeft: 'auto', paddingLeft: '8px' }}>
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
