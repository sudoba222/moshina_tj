import type { Metadata, Viewport } from 'next'
import { Syne } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import { SocketProvider } from '@/lib/SocketContext'
import MobileBottomNav from '@/components/MobileBottomNav'
import ChatWidget from '@/components/ChatWidget'
import ChatDrawer from '@/components/ChatDrawer'
import { ChatDrawerProvider } from '@/lib/ChatDrawerContext'
import { JsonLd } from '@/components/JsonLd'
import CookieBanner from '@/components/CookieBanner'
import YandexMetrika from '@/components/YandexMetrika'

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
    default: 'MOSHINA.TJ — Авто рынок Таджикистана | Автомобили в Таджикистане',
    template: '%s | MOSHINA.TJ',
  },
  description:
    'Купите или продайте автомобиль в Таджикистане. Тысячи объявлений — новые и подержанные авто, аренда, рассрочка. MOSHINA.TJ — главный авторынок Таджикистана.',
  keywords: [
    'авто таджикистан',
    'купить машину душанбе',
    'продать авто таджикистан',
    'moshina tj',
    'автомобили душанбе',
    'аренда авто таджикистан',
    'mashina tj',
  ],
  authors: [{ name: 'MOSHINA.TJ' }],
  creator: 'MOSHINA.TJ',
  publisher: 'MOSHINA.TJ',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_TJ',
    alternateLocale: 'tg_TJ',
    url: SITE_URL,
    siteName: 'MOSHINA.TJ',
    title: 'MOSHINA.TJ — Авто рынок Таджикистана',
    description: 'Купите или продайте автомобиль в Таджикистане. Тысячи объявлений.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MOSHINA.TJ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOSHINA.TJ — Авто рынок Таджикистана',
    description: 'Купите или продайте автомобиль в Таджикистане.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      ru: SITE_URL,
      tg: SITE_URL,
    },
  },
  verification: {
    google: 'GOOGLE_VERIFICATION_PLACEHOLDER',
    yandex: 'YANDEX_VERIFICATION_PLACEHOLDER',
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MOSHINA.TJ',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/catalog?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'AutoDealer',
  name: 'MOSHINA.TJ',
  description: 'Главный авторынок Таджикистана',
  url: SITE_URL,
  areaServed: { '@type': 'Country', name: 'Tajikistan' },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'TJ',
    addressLocality: 'Душанбе',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const langCookie = cookieStore.get('lang')?.value
  const lang = langCookie === 'tj' ? 'tj' : 'ru'

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={syne.className}>
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        <ThemeProvider>
          <AuthProvider>
            <ChatDrawerProvider>
              <SocketProvider>
                <LanguageProvider initialLang={lang}>
                  {children}
                  <MobileBottomNav />
                  <ChatWidget />
                  <ChatDrawer />
                  <CookieBanner />
                </LanguageProvider>
              </SocketProvider>
            </ChatDrawerProvider>
          </AuthProvider>
        </ThemeProvider>

        <YandexMetrika />
      </body>
    </html>
  )
}
