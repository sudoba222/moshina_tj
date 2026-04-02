import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Авто в рассрочку в Таджикистане',
  description:
    'Купите автомобиль в рассрочку в Таджикистане. Выгодные условия рассрочки на новые и подержанные авто в Душанбе и других городах на TAJCAR.TJ.',
  keywords: [
    'авто в рассрочку Таджикистан',
    'рассрочка на машину Душанбе',
    'купить авто в кредит Таджикистан',
    'автокредит Таджикистан',
  ],
  openGraph: {
    title: 'Авто в рассрочку в Таджикистане | TAJCAR.TJ',
    description: 'Купите автомобиль в рассрочку в Таджикистане. Выгодные условия.',
    type: 'website',
    locale: 'ru_TJ',
    siteName: 'TAJCAR.TJ',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Авто в рассрочку в Таджикистане — TAJCAR.TJ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Авто в рассрочку в Таджикистане | TAJCAR.TJ',
    description: 'Купите автомобиль в рассрочку в Таджикистане. Выгодные условия.',
    images: ['/opengraph-image'],
  },
  alternates: {
    canonical: `${SITE_URL}/installment`,
  },
}

export default function InstallmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
