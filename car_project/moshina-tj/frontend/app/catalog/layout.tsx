import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Каталог автомобилей',
  description: 'Поиск и фильтрация автомобилей в Таджикистане. Toyota, Chevrolet, BMW, Mercedes и другие марки в Душанбе, Худжанде и по всей стране.',
  keywords: 'каталог авто Таджикистан, купить машину Душанбе, автомобили Таджикистан, Toyota Таджикистан, Chevrolet Таджикистан',
  openGraph: {
    title: 'Каталог автомобилей — TajCar.tj',
    description: 'Поиск и фильтрация автомобилей в Таджикистане.',
    type: 'website',
  },
  alternates: {
    canonical: '/catalog',
  },
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
