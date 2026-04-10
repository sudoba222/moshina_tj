import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tajcar.tj'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface Dealer {
  id: string
  business_name: string
  city: string
  description: string
  logo_url?: string
  verified: boolean
}

interface ApiResponse {
  success: boolean
  data: Dealer
}

async function getDealer(id: string): Promise<Dealer | null> {
  try {
    const res = await fetch(`${API_URL}/dealers/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json: ApiResponse = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const dealer = await getDealer(id)

  if (!dealer) {
    return {
      title: 'Автосалон не найден',
      robots: { index: false, follow: false },
    }
  }

  const title = `${dealer.business_name} — автосалон в ${dealer.city}`
  const description =
    dealer.description ||
    `${dealer.business_name} — ${dealer.verified ? 'верифицированный ' : ''}автодилер в ${dealer.city}, Таджикистан. Смотрите объявления на TAJCAR.TJ.`

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | TAJCAR.TJ`,
      description,
      type: 'website',
      url: `${SITE_URL}/dealers/${id}`,
      ...(dealer.logo_url && {
        images: [{ url: dealer.logo_url, width: 400, height: 400, alt: dealer.business_name }],
      }),
    },
    twitter: {
      card: 'summary',
      title: `${title} | TAJCAR.TJ`,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/dealers/${id}`,
    },
  }
}

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
