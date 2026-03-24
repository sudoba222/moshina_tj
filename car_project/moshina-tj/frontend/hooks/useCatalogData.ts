'use client'
import { useState, useEffect } from 'react'
import { catalogApi, type CarBrand, type CarModelItem } from '@/lib/api'

export function useBrands() {
  const [brands, setBrands] = useState<CarBrand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    catalogApi
      .getBrands()
      .then((r) => setBrands(r.data.data.filter((b) => b.is_active !== false)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { brands, loading }
}

export function useModels(brandId: string | null) {
  const [models, setModels] = useState<CarModelItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!brandId) {
      setModels([])
      return
    }
    setLoading(true)
    catalogApi
      .getModels(brandId)
      .then((r) => setModels(r.data.data))
      .catch(() => setModels([]))
      .finally(() => setLoading(false))
  }, [brandId])

  return { models, loading }
}
