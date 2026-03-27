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
    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'clamp(28px,4vw,48px)' }}>

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
            <ColTitle>{lang === 'ru' ? 'Каталог' : 'Каталог'}</ColTitle>
            <FootLink href="/catalog">{t('footer.catalog', lang)}</FootLink>
            <FootLink href="/rent">{t('footer.rent', lang)}</FootLink>
            <FootLink href="/dealers">{t('footer.dealers', lang)}</FootLink>
            <FootLink href="/installment">{t('footer.installment', lang)}</FootLink>
          </div>

          {/* Company */}
          <div>
            <ColTitle>{lang === 'ru' ? 'Компания' : 'Ширкат'}</ColTitle>
            <FootLink href="/about">{t('footer.about', lang)}</FootLink>
            <FootLink href="/terms">{t('footer.terms', lang)}</FootLink>
            <FootLink href="/privacy">{t('footer.privacy', lang)}</FootLink>
          </div>

          {/* Post CTA */}
          <div>
            <ColTitle>{lang === 'ru' ? 'Продавцам' : 'Фурӯшандагон'}</ColTitle>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '16px' }}>
              {lang === 'ru'
                ? 'Разместите объявление и найдите покупателя быстро.'
                : 'Эълон гузоред ва харидорро зуд пайдо кунед.'}
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
            © {year} TAJCAR.TJ — {lang === 'ru' ? 'Все права защищены' : 'Ҳамаи ҳуқуқҳо муҳофизат шудаанд'}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            {lang === 'ru' ? 'Сделано в Таджикистане' : 'Дар Тоҷикистон сохта шудааст'}
          </p>
        </div>
      </div>

    </footer>
  )
}
