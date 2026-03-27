import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Автодилеры Таджикистана',
  description:
    'Официальные автодилеры Таджикистана. Проверенные дилерские центры в Душанбе, Худжанде и других городах. Новые и подержанные автомобили на TAJCAR.TJ.',
  keywords: [
    'автодилеры Таджикистан',
    'дилерские центры Душанбе',
    'официальный дилер Таджикистан',
    'автосалон Душанбе',
  ],
  openGraph: {
    title: 'Автодилеры Таджикистана | TAJCAR.TJ',
    description: 'Официальные автодилеры Таджикистана. Проверенные дилерские центры.',
    type: 'website',
    locale: 'ru_TJ',
    siteName: 'TAJCAR.TJ',
  },
  alternates: {
    canonical: `${SITE_URL}/dealers`,
  },
}

export default function DealersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
