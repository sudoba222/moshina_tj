'use client'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { t } from '@/lib/i18n'

function FooterLogo() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0, userSelect: 'none' }}>
      <span style={{ display: 'inline-block', width: '4px', height: '22px', borderRadius: '2px', background: 'var(--accent)', marginRight: '7px', flexShrink: 0 }} />
      <span style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.04em', color: 'var(--color-white)', lineHeight: 1 }}>
        TAJ<span style={{ color: 'var(--accent)' }}>CAR</span>
      </span>
      <span style={{ fontWeight: 600, fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.01em', alignSelf: 'flex-end', marginBottom: '2px', marginLeft: '2px' }}>
        .TJ
      </span>
    </span>
  )
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
      {children}
    </p>
  )
}

function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: '10px', transition: 'color 0.13s' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-white)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}>
      {children}
    </Link>
  )
}

export default function Footer() {
  const { lang } = useLang()
  const year = new Date().getFullYear()

  return (
    <footer style={{ background: 'var(--footer-bg)', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto" style={{ padding: 'clamp(40px,6vw,64px) clamp(16px,4vw,32px) 0' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'clamp(28px,4vw,48px)' }}>

          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
              <FooterLogo />
            </Link>
            <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(255,255,255,0.45)', maxWidth: '220px', marginBottom: '20px' }}>
              {t('footer.tagline', lang)}
            </p>
            {/* Contact */}
            <a href="mailto:support@tajcar.tj"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.13s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-white)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              support@tajcar.tj
            </a>
          </div>

          {/* Catalog */}
          <div>
            <ColTitle>{t('footer.colCatalog', lang)}</ColTitle>
            <FootLink href="/catalog">{t('footer.catalog', lang)}</FootLink>
            <FootLink href="/rent">{t('footer.rent', lang)}</FootLink>
            <FootLink href="/dealers">{t('footer.dealers', lang)}</FootLink>
            <FootLink href="/installment">{t('footer.installment', lang)}</FootLink>
          </div>

          {/* Company */}
          <div>
            <ColTitle>{t('footer.colCompany', lang)}</ColTitle>
            <FootLink href="/about">{t('footer.about', lang)}</FootLink>
            <FootLink href="/terms">{t('footer.terms', lang)}</FootLink>
            <FootLink href="/privacy">{t('footer.privacy', lang)}</FootLink>
          </div>

          {/* Support */}
          <div>
            <ColTitle>{lang === 'ru' ? 'Поддержка' : 'Дастгирӣ'}</ColTitle>
            <a
              href="https://t.me/tajcartj"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: '10px', textDecoration: 'none', transition: 'color 0.13s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-white)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
            >
              {/* Telegram icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.4l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.888.16z"/>
              </svg>
              Telegram
            </a>
            <a
              href="https://wa.me/992918277695"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: '10px', textDecoration: 'none', transition: 'color 0.13s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-white)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
            >
              {/* WhatsApp icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.004 0C5.374 0 .006 5.368.006 11.997c0 2.117.554 4.103 1.522 5.83L.006 24l6.354-1.498a12.03 12.03 0 0 0 5.644 1.414C18.634 23.916 24 18.548 24 11.997 24 5.368 18.634 0 12.004 0zm6.235 16.77c-.26.733-1.522 1.398-2.08 1.448-.558.052-1.09.262-3.668-.764-3.094-1.232-5.07-4.38-5.224-4.583-.152-.203-1.24-1.648-1.24-3.143s.786-2.228 1.065-2.53c.278-.304.608-.38.811-.38l.583.01c.187.01.438-.07.684.523.26.617.882 2.142.96 2.296.078.155.128.336.026.539-.103.203-.155.33-.304.508l-.455.527c-.152.152-.31.317-.134.622.176.304.784 1.292 1.684 2.092 1.156 1.031 2.13 1.35 2.434 1.502.304.152.48.128.658-.077.178-.203.76-.887 1.015-1.19.254-.304.508-.253.857-.152.35.103 2.218 1.046 2.6 1.237.38.19.634.284.727.44.092.16.092.924-.168 1.657z"/>
              </svg>
              WhatsApp
            </a>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              +992 91 827 7695
            </p>
          </div>

          {/* Post CTA */}
          <div>
            <ColTitle>{t('footer.colSellers', lang)}</ColTitle>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '16px' }}>
              {t('footer.sellerPitch', lang)}
            </p>
            <Link href="/post"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 18px', background: 'var(--accent)', color: 'var(--color-white)', fontWeight: 700, fontSize: '13px', borderRadius: '9px', textDecoration: 'none', transition: 'opacity 0.13s' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
              {t('nav.addListing', lang)}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="max-w-7xl mx-auto" style={{ padding: '0 clamp(16px,4vw,32px)' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '40px', padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>
            © {year} TAJCAR.TJ — {t('footer.allRights', lang)}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            {t('footer.madeIn', lang)}
          </p>
        </div>
      </div>

    </footer>
  )
}
