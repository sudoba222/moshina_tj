'use client'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

const FOOTER_NAV: { href: string; key: string }[] = [
  { href: '/catalog',     key: 'footer.catalog' },
  { href: '/rent',        key: 'footer.rent' },
  { href: '/dealers',     key: 'footer.dealers' },
  { href: '/installment', key: 'footer.installment' },
]

const FOOTER_LEGAL: { href: string; key: string }[] = [
  { href: '/about',       key: 'footer.about' },
  { href: '/terms',       key: 'footer.terms' },
  { href: '/privacy',     key: 'footer.privacy' },
]

export default function Footer() {
  const { lang } = useLang()

  return (
    <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 footer-inner" style={{ paddingTop: '32px' }}>

        {/* Main row */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between" style={{ gap: '28px' }}>

          {/* Brand + tagline */}
          <div style={{ flexShrink: 0 }}>
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'baseline', gap: '1px', textDecoration: 'none' }}
              aria-label="MOSHINA.TJ — home"
            >
              <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)', letterSpacing: '-0.03em' }}>MOSHINA</span>
              <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text)' }}>.TJ</span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '200px', lineHeight: 1.55 }}>
              {t('footer.tagline', lang)}
            </p>
          </div>

          {/* Navigation groups */}
          <div className="flex flex-col sm:flex-row" style={{ gap: '20px 40px' }}>
            {/* Main nav links */}
            <nav aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              {FOOTER_NAV.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {t(link.key, lang)}
                </Link>
              ))}
            </nav>

            {/* Legal links */}
            <nav aria-label="Legal navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              {FOOTER_LEGAL.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  {t(link.key, lang)}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            marginTop: '24px',
            paddingTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('footer.rights', lang)}
          </p>
          {/* Post ad CTA */}
          <Link
            href="/post"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--accent)',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            + {t('nav.addListing', lang)}
          </Link>
        </div>

      </div>
    </footer>
  )
}
