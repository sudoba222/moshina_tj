import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Аренда авто в Таджикистане',
  description:
    'Аренда автомобилей в Таджикистане. Широкий выбор авто для аренды в Душанбе и других городах. Выгодные условия на TAJCAR.TJ.',
  keywords: [
    'аренда авто Таджикистан',
    'аренда машины Душанбе',
    'прокат авто Таджикистан',
    'аренда автомобиля Душанбе',
  ],
  openGraph: {
    title: 'Аренда авто в Таджикистане | TAJCAR.TJ',
    description: 'Аренда автомобилей в Таджикистане. Широкий выбор авто для аренды.',
    type: 'website',
    locale: 'ru_TJ',
    siteName: 'TAJCAR.TJ',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Аренда авто в Таджикистане — TAJCAR.TJ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Аренда авто в Таджикистане | TAJCAR.TJ',
    description: 'Аренда автомобилей в Таджикистане. Широкий выбор авто для аренды.',
    images: ['/opengraph-image'],
  },
  alternates: {
    canonical: `${SITE_URL}/rent`,
  },
}

export default function RentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
