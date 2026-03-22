import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Аренда авто в Таджикистане',
  description:
    'Аренда автомобилей в Таджикистане. Широкий выбор авто для аренды в Душанбе и других городах. Выгодные условия на MOSHINA.TJ.',
  keywords: [
    'аренда авто Таджикистан',
    'аренда машины Душанбе',
    'прокат авто Таджикистан',
    'аренда автомобиля Душанбе',
  ],
  openGraph: {
    title: 'Аренда авто в Таджикистане | MOSHINA.TJ',
    description: 'Аренда автомобилей в Таджикистане. Широкий выбор авто для аренды.',
    type: 'website',
    locale: 'ru_TJ',
    siteName: 'MOSHINA.TJ',
  },
  alternates: {
    canonical: `${SITE_URL}/rent`,
  },
}

export default function RentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
