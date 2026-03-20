'use client'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

const FOOTER_LINKS = [
  { href: '/catalog',     key: 'footer.catalog' },
  { href: '/rent',        key: 'footer.rent' },
  { href: '/dealers',     key: 'footer.dealers' },
  { href: '/installment', key: 'footer.installment' },
] as const

export default function Footer() {
  const { lang } = useLang()

  return (
    <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 footer-inner" style={{ padding: '28px 16px' }}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">

          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '1px' }}>
              <span style={{ fontWeight: 800, fontSize: '17px', color: 'var(--accent)', letterSpacing: '-0.03em' }}>TajCar</span>
              <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-muted)' }}>.tj</span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '200px', lineHeight: 1.5 }}>
              {t('footer.tagline', lang)}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}
              >
                {t(link.key, lang)}
              </Link>
            ))}
          </nav>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('footer.rights', lang)}
          </p>
        </div>
      </div>
    </footer>
  )
}
