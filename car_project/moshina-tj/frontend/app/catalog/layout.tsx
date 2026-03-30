import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'

export const metadata: Metadata = {
  title: 'Каталог автомобилей Таджикистана — Купить авто | TAJCAR.TJ',
  description:
    'Каталог автомобилей в Таджикистане — тысячи объявлений с фильтрами по марке, модели, году, цене и городу. Toyota, Chevrolet, BMW, Mercedes, Lexus в Душанбе, Худжанде и по всей стране. Мошинхои фуруши дар Тоҷикистон.',
  keywords: [
    'каталог авто таджикистан',
    'купить машину душанбе',
    'автомобили таджикистан',
    'поиск авто таджикистан',
    'фильтр автомобилей таджикистан',
    'toyota таджикистан',
    'chevrolet таджикистан',
    'bmw таджикистан',
    'mercedes душанбе',
    'lexus таджикистан',
    'hyundai таджикистан',
    'подержанные авто таджикистан',
    'новые авто таджикистан',
    'авто до 5000 долларов таджикистан',
    'авто в рассрочку таджикистан',
    'электромобиль таджикистан',
    'внедорожник таджикистан',
    'авто душанбе худжанд',
    'мошинхои фуруши точикистон',
    'харид мошин точикистон',
  ],
  openGraph: {
    title: 'Каталог автомобилей Таджикистана — Купить авто | TAJCAR.TJ',
    description:
      'Тысячи объявлений с фильтрами по марке, цене и городу. Найдите свой автомобиль в Таджикистане на TAJCAR.TJ.',
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
