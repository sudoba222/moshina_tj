'use client'

/**
 * Decorative animated car scene for the homepage hero.
 * Pure inline SVG — theme-aware via CSS variables, animated via the
 * keyframes in globals.css (car-float / wheel-spin / road-move / speed-dash).
 * Purely presentational: aria-hidden, no text content.
 */
export default function HeroCarArt() {
  return (
    <div className="hero-car-art" aria-hidden="true">
      <svg viewBox="0 0 520 300" fill="none" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Soft accent glow behind the car */}
        <ellipse cx="270" cy="170" rx="220" ry="110" fill="var(--accent-dim)" className="hero-blob" />

        {/* Speed lines */}
        <g stroke="var(--border-strong)" strokeWidth="4" strokeLinecap="round" className="hero-speed-lines">
          <line x1="30" y1="120" x2="95" y2="120" strokeDasharray="40 260" className="speed-dash speed-dash-1" />
          <line x1="10" y1="160" x2="85" y2="160" strokeDasharray="55 245" className="speed-dash speed-dash-2" />
          <line x1="40" y1="200" x2="100" y2="200" strokeDasharray="35 265" className="speed-dash speed-dash-3" />
        </g>

        {/* Car body group — gentle floating bob */}
        <g className="hero-car-body">
          {/* Main body */}
          <path
            d="M112 196
               c 0 -10 4 -18 14 -22
               l 30 -12
               c 26 -30 60 -44 102 -44
               c 46 0 82 14 106 40
               l 46 10
               c 16 4 24 12 24 26
               l 0 16
               c 0 8 -6 14 -14 14
               l -294 0
               c -9 0 -14 -6 -14 -14
               z"
            fill="var(--accent)"
          />
          {/* Windshield + windows */}
          <path
            d="M175 160 c 20 -24 48 -34 82 -34 c 36 0 64 10 84 32 l -60 2 z"
            fill="var(--surface)"
            stroke="var(--border-strong)"
            strokeWidth="2"
          />
          <path d="M263 126 l 0 34 l -6 0 l 0 -34 z" fill="var(--accent)" />
          {/* Door line + handle */}
          <path d="M262 160 l 0 50" stroke="var(--accent-deep)" strokeWidth="2.5" opacity="0.55" />
          <rect x="272" y="176" width="20" height="4" rx="2" fill="var(--accent-deep)" opacity="0.7" />
          <rect x="230" y="176" width="20" height="4" rx="2" fill="var(--accent-deep)" opacity="0.7" />
          {/* Headlight + taillight */}
          <rect x="416" y="182" width="16" height="8" rx="4" fill="var(--color-warning-alt)" />
          <rect x="108" y="184" width="12" height="7" rx="3.5" fill="var(--color-error)" />
        </g>

        {/* Wheels — spin around their own centers */}
        <g className="hero-car-body">
          <g className="hero-wheel" style={{ transformOrigin: '182px 224px' }}>
            <circle cx="182" cy="224" r="26" fill="var(--text)" />
            <circle cx="182" cy="224" r="12" fill="var(--surface)" />
            <path d="M182 212 v24 M170 224 h24" stroke="var(--text)" strokeWidth="3" />
          </g>
          <g className="hero-wheel" style={{ transformOrigin: '366px 224px' }}>
            <circle cx="366" cy="224" r="26" fill="var(--text)" />
            <circle cx="366" cy="224" r="12" fill="var(--surface)" />
            <path d="M366 212 v24 M354 224 h24" stroke="var(--text)" strokeWidth="3" />
          </g>
        </g>

        {/* Road — dashes slide left to imply motion */}
        <line x1="40" y1="258" x2="490" y2="258" stroke="var(--border-strong)" strokeWidth="4" strokeLinecap="round" strokeDasharray="28 22" className="hero-road" />
      </svg>
    </div>
  )
}
