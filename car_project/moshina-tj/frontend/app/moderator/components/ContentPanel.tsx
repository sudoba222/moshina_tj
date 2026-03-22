'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import MediaGallery from './MediaGallery'
import { IconCheck, IconExternalLink } from './icons'
import { highlightStopWords, INPUT_STYLE, LABEL_STYLE, formatDate, formatPrice } from './utils'
import { adminApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Lang, Listing } from '@/types'

type FuelOption = { value: string; labelKey: string }
type TransmissionOption = { value: string; labelKey: string }

const FUEL_OPTIONS: FuelOption[] = [
  { value: '', labelKey: '' },
  { value: 'Бензин',  labelKey: 'options.fuelBenzin' },
  { value: 'Дизель',  labelKey: 'options.fuelDiesel' },
  { value: 'Газ',     labelKey: 'options.fuelGas' },
  { value: 'Электро', labelKey: 'options.fuelElectric' },
  { value: 'Гибрид',  labelKey: 'options.fuelHybrid' },
]

const TRANSMISSION_OPTIONS: TransmissionOption[] = [
  { value: '', labelKey: '' },
  { value: 'Автомат',  labelKey: 'options.transAutomatic' },
  { value: 'Механика', labelKey: 'options.transMechanical' },
  { value: 'Вариатор', labelKey: 'options.transCvt' },
]

const CURRENCY_OPTIONS = ['USD', 'TJS']

interface SimilarListing {
  id: string
  brand: string
  model: string
  year: number
  price: number
  currency: string
  status: string
}

interface ContentPanelProps {
  lang: Lang
  listing: Listing
  photoIndex: number
  onPhotoNavigate: (index: number) => void
  savedFlash: boolean
}

export default function ContentPanel({
  lang,
  listing,
  photoIndex,
  onPhotoNavigate,
  savedFlash,
}: ContentPanelProps) {
  // Editable field state — initialized from listing, synced when listing id changes
  const [editBrand, setEditBrand]               = useState(listing.brand)
  const [editModel, setEditModel]               = useState(listing.model)
  const [editYear, setEditYear]                 = useState(listing.year)
  const [editPrice, setEditPrice]               = useState(Number(listing.price))
  const [editCurrency, setEditCurrency]         = useState<string>(listing.currency)
  const [editCity, setEditCity]                 = useState(listing.city)
  const [editMileage, setEditMileage]           = useState<number | ''>(listing.mileage ?? '')
  const [editFuel, setEditFuel]                 = useState(listing.fuel ?? '')
  const [editTransmission, setEditTransmission] = useState(listing.transmission ?? '')
  const [editColor, setEditColor]               = useState(listing.color ?? '')
  const [editDescription, setEditDescription]   = useState(listing.description ?? '')

  // Moderator note
  const [noteText, setNoteText]   = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved]   = useState(false)

  // Similar listings (duplicate detection)
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset all editable fields when the listing id changes
  useEffect(() => {
    setEditBrand(listing.brand)
    setEditModel(listing.model)
    setEditYear(listing.year)
    setEditPrice(Number(listing.price))
    setEditCurrency(listing.currency)
    setEditCity(listing.city)
    setEditMileage(listing.mileage ?? '')
    setEditFuel(listing.fuel ?? '')
    setEditTransmission(listing.transmission ?? '')
    setEditColor(listing.color ?? '')
    setEditDescription(listing.description ?? '')
    setNoteText('')
    setNoteSaved(false)
    setSimilarListings([])
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // Fetch potential duplicates
    adminApi
      .getListings('active', 1, `${listing.brand} ${listing.model}`)
      .then((res) => {
        const items = res.data.data.items
          .filter((i) => i.id !== listing.id)
          .slice(0, 5)
        setSimilarListings(
          items.map((i) => ({
            id: i.id,
            brand: i.brand,
            model: i.model,
            year: i.year,
            price: i.price,
            currency: i.currency,
            status: i.status,
          }))
        )
      })
      .catch(() => setSimilarListings([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id])

  function triggerSave(patch: Parameters<typeof adminApi.moderatorEditListing>[1]) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await adminApi.moderatorEditListing(listing.id, patch)
      } catch {
        // silent — savedFlash only fires on success from parent
      }
    }, 800)
  }

  async function handleSaveNote() {
    if (!noteText.trim()) return
    setNoteSaving(true)
    try {
      await adminApi.addModeratorNote(listing.id, noteText.trim())
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 3000)
    } catch {
      // silent
    }
    setNoteSaving(false)
  }

  const descriptionSegments = highlightStopWords(editDescription)
  const hasStopWords = descriptionSegments.some((s) => s.highlight)

  return (
    <div style={{ padding: '16px', maxWidth: '740px', margin: '0 auto' }}>
      {/* Listing meta header */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '10px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('moderator.adId', lang)}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text)' }}>{listing.id}</span>
        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(listing.created_at)}</span>
        {listing.city && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{listing.city}</span>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedFlash && (
            <span style={{ fontSize: '12px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconCheck size={12} />
              {t('moderator.saved', lang)}
            </span>
          )}
          <Link
            href={`/car/${listing.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--accent)',
            }}
            aria-label="View listing on site"
          >
            <IconExternalLink size={12} />
            View
          </Link>
        </div>
      </div>

      {/* Inline-editable title row (Brand / Model / Year) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={editBrand}
          onChange={(e) => {
            setEditBrand(e.target.value)
            triggerSave({ brand: e.target.value })
          }}
          aria-label="Brand"
          placeholder={t('admin.brand', lang)}
          style={{ ...INPUT_STYLE, flex: 1, fontSize: '16px', fontWeight: 700 }}
        />
        <input
          value={editModel}
          onChange={(e) => {
            setEditModel(e.target.value)
            triggerSave({ model: e.target.value })
          }}
          aria-label="Model"
          placeholder={t('admin.model', lang)}
          style={{ ...INPUT_STYLE, flex: 1, fontSize: '16px', fontWeight: 700 }}
        />
        <input
          type="number"
          value={editYear}
          onChange={(e) => {
            setEditYear(Number(e.target.value))
            triggerSave({ year: Number(e.target.value) })
          }}
          aria-label="Year"
          style={{ ...INPUT_STYLE, width: '88px', flex: 'none', fontSize: '16px', fontWeight: 700 }}
        />
      </div>

      {/* Media + Specs row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {/* Gallery */}
        <div style={{ width: '260px', flexShrink: 0 }}>
          <MediaGallery
            images={listing.images ?? []}
            activeIndex={photoIndex}
            onNavigate={onPhotoNavigate}
          />
        </div>

        {/* Specs form */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={LABEL_STYLE}>{t('options.price', lang)}</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => {
                  setEditPrice(Number(e.target.value))
                  triggerSave({ price: Number(e.target.value) })
                }}
                style={INPUT_STYLE}
                aria-label="Price"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>{t('post.currency', lang)}</label>
              <select
                value={editCurrency}
                onChange={(e) => {
                  setEditCurrency(e.target.value)
                  triggerSave({ currency: e.target.value })
                }}
                style={INPUT_STYLE}
                aria-label="Currency"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>{t('catalog.mileage', lang)}</label>
              <input
                type="number"
                value={editMileage}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : ''
                  setEditMileage(v)
                  triggerSave({ mileage: v === '' ? undefined : Number(v) })
                }}
                style={INPUT_STYLE}
                aria-label="Mileage"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>{t('catalog.fuel', lang)}</label>
              <select
                value={editFuel}
                onChange={(e) => {
                  setEditFuel(e.target.value)
                  triggerSave({ fuel: e.target.value || undefined })
                }}
                style={INPUT_STYLE}
                aria-label="Fuel type"
              >
                {FUEL_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.value ? t(f.labelKey, lang) : '—'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>{t('catalog.transmission', lang)}</label>
              <select
                value={editTransmission}
                onChange={(e) => {
                  setEditTransmission(e.target.value)
                  triggerSave({ transmission: e.target.value || undefined })
                }}
                style={INPUT_STYLE}
                aria-label="Transmission"
              >
                {TRANSMISSION_OPTIONS.map((tx) => (
                  <option key={tx.value} value={tx.value}>
                    {tx.value ? t(tx.labelKey, lang) : '—'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>{t('catalog.color', lang)}</label>
              <input
                value={editColor}
                onChange={(e) => {
                  setEditColor(e.target.value)
                  triggerSave({ color: e.target.value })
                }}
                style={INPUT_STYLE}
                aria-label="Color"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>{t('admin.city', lang)}</label>
              <input
                value={editCity}
                onChange={(e) => {
                  setEditCity(e.target.value)
                  triggerSave({ city: e.target.value })
                }}
                style={INPUT_STYLE}
                aria-label="City"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Description with stop-word highlighting */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <label style={LABEL_STYLE}>{t('moderator.descriptionLabel', lang)}</label>
          {hasStopWords && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--color-error)',
              background: 'var(--color-error-dim)',
              borderRadius: '6px',
              padding: '2px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Stop words
            </span>
          )}
        </div>
        {/* Highlighted preview */}
        {hasStopWords && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--color-error)',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '12px',
            color: 'var(--text)',
            lineHeight: 1.6,
            marginBottom: '6px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {descriptionSegments.map((seg, i) =>
              seg.highlight ? (
                <mark
                  key={i}
                  style={{
                    background: 'var(--color-error-dim)',
                    color: 'var(--color-error)',
                    borderRadius: '3px',
                    padding: '0 2px',
                  }}
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </div>
        )}
        <textarea
          value={editDescription}
          onChange={(e) => {
            setEditDescription(e.target.value)
            triggerSave({ description: e.target.value })
          }}
          rows={5}
          aria-label="Description"
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
      </div>

      {/* Potential duplicates */}
      {similarListings.length > 0 && (
        <div style={{
          marginBottom: '16px',
          background: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: '10px',
          padding: '12px',
        }}
          role="alert"
          aria-label="Potential duplicates found"
        >
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-warning-text)',
            marginBottom: '8px',
          }}>
            {t('moderator.duplicateWarning', lang)} — {similarListings.length} {t('mod.similarFound', lang)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {similarListings.map((sim) => (
              <div
                key={sim.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-warning-text)', flex: 1 }}>
                  {sim.brand} {sim.model} {sim.year} — {formatPrice(sim.price, sim.currency)}
                </span>
                <Link
                  href={`/car/${sim.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '2px' }}
                  aria-label={`View ${sim.brand} ${sim.model} listing`}
                >
                  <IconExternalLink size={11} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderator note */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        padding: '12px',
      }}>
        <label style={LABEL_STYLE}>{t('moderator.moderatorNote', lang)}</label>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={t('moderator.notePlaceholder', lang)}
          rows={3}
          aria-label={t('moderator.moderatorNote', lang)}
          style={{ ...INPUT_STYLE, resize: 'vertical', marginBottom: '8px' }}
        />
        <button
          onClick={handleSaveNote}
          disabled={noteSaving || !noteText.trim()}
          style={{
            padding: '6px 16px',
            background: noteSaved ? 'var(--color-success)' : 'var(--accent)',
            color: 'var(--color-white)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: noteSaving || !noteText.trim() ? 'not-allowed' : 'pointer',
            opacity: noteSaving || !noteText.trim() ? 0.6 : 1,
          }}
        >
          {noteSaved ? t('moderator.noteSaved', lang) : t('moderator.saveNote', lang)}
        </button>
      </div>
    </div>
  )
}
