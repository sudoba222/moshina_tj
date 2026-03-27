import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Каталог автомобилей Таджикистана',
  description:
    'Поиск и фильтрация автомобилей в Таджикистане. Toyota, Chevrolet, BMW, Mercedes и другие марки в Душанбе, Худжанде и по всей стране.',
  keywords: [
    'каталог авто Таджикистан',
    'купить машину Душанбе',
    'автомобили Таджикистан',
    'Toyota Таджикистан',
    'Chevrolet Таджикистан',
  ],
  openGraph: {
    title: 'Каталог автомобилей Таджикистана | TAJCAR.TJ',
    description: 'Поиск и фильтрация автомобилей в Таджикистане.',
    type: 'website',
    locale: 'ru_TJ',
    siteName: 'TAJCAR.TJ',
  },
  alternates: {
    canonical: `${SITE_URL}/catalog`,
  },
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'TAJCAR.TJ',
      item: SITE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Каталог',
      item: `${SITE_URL}/catalog`,
    },
  ],
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      {children}
    </>
  )
}
