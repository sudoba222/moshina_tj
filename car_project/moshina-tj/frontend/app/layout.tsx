import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { LanguageProvider } from '@/lib/LanguageContext'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import MobileBottomNav from '@/components/MobileBottomNav'
import { JsonLd } from '@/components/JsonLd'
import CookieBanner from '@/components/CookieBanner'
import YandexMetrika from '@/components/YandexMetrika'
import SplashScreen from '@/components/SplashScreen'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-outfit',
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
    default: 'TAJCAR.TJ — Мошинҳои фурушӣ дар Тоҷикистон | Авторынок Таджикистана',
    template: '%s | TAJCAR.TJ',
  },
  description:
    'Харид ва фуруши мошин дар Тоҷикистон. Купите или продайте автомобиль в Таджикистане. Тысячи объявлений — Toyota, Mercedes, BMW. TajCar.tj — главный авторынок Таджикистана.',
  keywords: [
    // Russian
    'авто таджикистан',
    'купить машину душанбе',
    'продать авто таджикистан',
    'авторынок таджикистана',
    'автомобили душанбе',
    'аренда авто таджикистан',
    'купить авто душанбе',
    'продажа авто таджикистан',
    'подержанные авто таджикистан',
    'машина худжанд',
    'автомобиль бохтар',
    'автосалон душанбе',
    // Tajik
    'мошинхои фуруши',
    'харид мошин точикистон',
    'мошин дар душанбе',
    'мошинхои дастдавум',
    'бозори мошин точикистон',
    'мошинхои барки',
    // Brand-specific (high search volume)
    'купить toyota душанбе',
    'chevrolet таджикистан',
    'lexus душанбе',
    'bmw таджикистан',
    'mercedes душанбе',
    'hyundai таджикистан',
    // Technical
    'tajcar',
    'tajcar.tj',
    'mashina tj',
    'avto tj',
  ],
  authors: [{ name: 'TAJCAR.TJ' }],
  creator: 'TAJCAR.TJ',
  publisher: 'TAJCAR.TJ',
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
    siteName: 'TAJCAR.TJ',
    title: 'TAJCAR.TJ — Мошинҳои фурушӣ | Авторынок Таджикистана',
    description: 'Харид ва фуруши мошин дар Тоҷикистон. Тысячи объявлений на TajCar.tj.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'TAJCAR.TJ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TAJCAR.TJ — Авто рынок Таджикистана',
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
    google: 'row6KBizdW8jJmvkL5Ec-f_miqcHf6RAl7HgZFX4USU',
    ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION
      ? { yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION }
      : {}),
  },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TAJCAR.TJ',
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
  name: 'TAJCAR.TJ',
  alternateName: ['ТаджКар', 'Bозори мошин Тоҷикистон'],
  description: 'Главный авторынок Таджикистана | Бозори мошини Тоҷикистон',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  sameAs: ['https://t.me/tajcar_tj'],
  areaServed: [
    { '@type': 'Country', name: 'Tajikistan', '@id': 'https://www.wikidata.org/wiki/Q863' },
  ],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'TJ',
    addressLocality: 'Душанбе',
    addressRegion: 'Dushanbe',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Russian', 'Tajik'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Как купить машину в Таджикистане?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'На TajCar.tj вы найдёте тысячи объявлений о продаже автомобилей в Таджикистане. Выберите марку, модель и город, свяжитесь с продавцом напрямую.',
      },
    },
    {
      '@type': 'Question',
      name: 'Чи тавр мошин харидан мумкин аст?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Дар TajCar.tj шумо метавонед ҳазорҳо эълони фурӯши мошинро дар Тоҷикистон пайдо кунед.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как продать машину в Душанбе?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Разместите бесплатное объявление на TajCar.tj. Заполните форму, добавьте фото и ваше объявление увидят тысячи покупателей в Таджикистане.',
      },
    },
    {
      '@type': 'Question',
      name: 'Электромобили в Таджикистане — где купить BYD?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'TajCar.tj имеет большой выбор электромобилей в Таджикистане: BYD, Tesla, Zeekr и другие. Используйте фильтр "Электро" в каталоге.',
      },
    },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const langCookie = cookieStore.get('lang')?.value
  const lang = langCookie === 'tj' ? 'tj' : 'ru'

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={outfit.className}>
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        <JsonLd data={faqSchema} />
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider initialLang={lang}>
            <SplashScreen />
            {children}
            <MobileBottomNav />
            <CookieBanner />
          </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>

        <YandexMetrika />
      </body>
    </html>
  )
}
