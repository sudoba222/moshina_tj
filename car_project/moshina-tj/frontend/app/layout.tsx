import type { Metadata, Viewport } from 'next'
import { Syne } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import MobileBottomNav from '@/components/MobileBottomNav'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  display: 'swap',
  variable: '--font-syne',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TajCar.tj — Авторынок Таджикистана',
    template: '%s | TajCar.tj',
  },
  description: 'Покупка, аренда и рассрочка автомобилей по всему Таджикистану. Лучшие предложения в Душанбе, Худжанде и других городах.',
  keywords: 'авто, машина, Таджикистан, купить машину, аренда авто, рассрочка, Душанбе, Худжанд, автомобили Таджикистан',
  authors: [{ name: 'TajCar.tj' }],
  creator: 'TajCar.tj',
  publisher: 'TajCar.tj',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'TajCar.tj — Авторынок Таджикистана',
    description: 'Покупка, аренда и рассрочка автомобилей по всему Таджикистану.',
    type: 'website',
    locale: 'ru_TJ',
    url: SITE_URL,
    siteName: 'TajCar.tj',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'TajCar.tj — Авторынок Таджикистана' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TajCar.tj — Авторынок Таджикистана',
    description: 'Покупка, аренда и рассрочка автомобилей по всему Таджикистану.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: SITE_URL,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const langCookie = cookieStore.get('lang')?.value
  const lang = langCookie === 'tj' ? 'tj' : 'ru'

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={syne.className}>
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              {children}
              <MobileBottomNav />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
