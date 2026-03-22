'use client'
import { useState } from 'react'
import { IconCheck, IconX, IconSkip } from './icons'
import { t } from '@/lib/i18n'
import type { Lang } from '@/types'

interface SessionStats {
  approved: number
  rejected: number
  skipped: number
}

interface ActionPanelProps {
  lang: Lang
  hasListing: boolean
  isLoading: boolean
  sessionStats: SessionStats
  onApprove: () => void
  onReject: (reasons: string[]) => void
  onSkip: () => void
  onEndSession: () => void
}

// These are the canonical rejection reason labels used in both languages.
// We store the raw strings (translated at render time) as keys.
const REJECTION_REASON_KEYS = [
  'mod.reasonBadPhotos',
  'mod.reasonLowPrice',
  'mod.reasonDuplicate',
  'mod.reasonReseller',
  'mod.reasonWrongInfo',
  'mod.reasonProhibited',
] as const

// Displayed in both languages for clarity (moderators may speak either).
function getReasonLabels(lang: Lang): { key: string; label: string }[] {
  const labels: Record<string, { ru: string; tj: string }> = {
    'mod.reasonBadPhotos':  { ru: 'Плохие фото',           tj: 'Аксҳои бад' },
    'mod.reasonLowPrice':   { ru: 'Цена занижена',          tj: 'Нарх паст аст' },
    'mod.reasonDuplicate':  { ru: 'Дубликат',               tj: 'Дубликат' },
    'mod.reasonReseller':   { ru: 'Перекуп',                tj: 'Дилол' },
    'mod.reasonWrongInfo':  { ru: 'Неверная информация',    tj: 'Маълумоти нодуруст' },
    'mod.reasonProhibited': { ru: 'Запрещённый контент',    tj: 'Мундариҷаи манъшуда' },
  }
  return REJECTION_REASON_KEYS.map((key) => ({
    key,
    label: labels[key]?.[lang] ?? key,
  }))
}

export default function ActionPanel({
  lang,
  hasListing,
  isLoading,
  sessionStats,
  onApprove,
  onReject,
  onSkip,
  onEndSession,
}: ActionPanelProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [skipOpen, setSkipOpen] = useState(false)

  const reasons = getReasonLabels(lang)

  function toggleReason(key: string) {
    setSelectedReasons((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    )
  }

  function handleApprove() {
    setSelectedReasons([])
    setSkipOpen(false)
    onApprove()
  }

  function handleReject() {
    if (selectedReasons.length === 0) return
    const reasonLabels = reasons
      .filter((r) => selectedReasons.includes(r.key))
      .map((r) => r.label)
    onReject(reasonLabels)
    setSelectedReasons([])
    setSkipOpen(false)
  }

  function handleSkip() {
    setSelectedReasons([])
    setSkipOpen(false)
    onSkip()
  }

  const canApprove = hasListing && !isLoading
  const canReject = hasListing && !isLoading && selectedReasons.length > 0

  return (
    <div
      className="mod-left"
      style={{
        width: '280px',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable upper area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* APPROVE */}
        <button
          onClick={handleApprove}
          disabled={!canApprove}
          aria-label={t('moderator.approve', lang)}
          style={{
            width: '100%',
            height: '52px',
            background: canApprove ? 'var(--color-success)' : 'var(--border)',
            color: canApprove ? 'var(--color-white)' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: canApprove ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '20px',
            letterSpacing: '0.02em',
          }}
        >
          <IconCheck size={18} />
          {t('moderator.approve', lang)}
          <kbd style={{ fontSize: '10px', opacity: 0.7, fontWeight: 400, fontFamily: 'monospace', marginLeft: '4px' }}>A</kbd>
        </button>

        {/* REJECTION REASONS */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
          }}>
            {t('moderator.rejectionReasons', lang)}
          </div>
          <div role="group" aria-label={t('moderator.rejectionReasons', lang)} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {reasons.map(({ key, label }) => {
              const selected = selectedReasons.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleReason(key)}
                  aria-pressed={selected}
                  style={{
                    textAlign: 'left',
                    background: selected ? 'var(--accent-dim)' : 'var(--surface)',
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: selected ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: selected ? 600 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {selected && <IconCheck size={11} />}
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Session mini stats */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px',
          marginTop: '16px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
          }}>
            {t('moderator.sessionTimer', lang)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-success)' }}>
              {t('moderator.approved', lang)}: <strong>{sessionStats.approved}</strong>
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-error)' }}>
              {t('moderator.rejected', lang)}: <strong>{sessionStats.rejected}</strong>
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {t('moderator.skipped', lang)}: <strong>{sessionStats.skipped}</strong>
          </span>
        </div>

        {/* Keyboard shortcut reference */}
        <div style={{
          marginTop: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('moderator.shortcuts', lang)}
          </div>
          <div><kbd style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>A</kbd> — {t('moderator.approve', lang)}</div>
          <div><kbd style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>R</kbd> — {t('moderator.reject', lang)}</div>
          <div><kbd style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>S</kbd> — {t('moderator.skip', lang)}</div>
          <div><kbd style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>← →</kbd> — {t('moderator.shortcutNav', lang)}</div>
          <div><kbd style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>Esc</kbd> — {t('moderator.endSession', lang)}</div>
        </div>
      </div>

      {/* Fixed bottom action area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* REJECT */}
        <button
          onClick={handleReject}
          disabled={!canReject}
          aria-label={t('moderator.reject', lang)}
          style={{
            height: '44px',
            background: canReject ? 'var(--color-error)' : 'var(--surface)',
            color: canReject ? 'var(--color-white)' : 'var(--text-muted)',
            border: `1px solid ${canReject ? 'var(--color-error)' : 'var(--border)'}`,
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: canReject ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <IconX size={14} />
          {t('moderator.reject', lang)}
          {selectedReasons.length > 0 && (
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              ({selectedReasons.length})
            </span>
          )}
          <kbd style={{ fontSize: '10px', opacity: 0.7, fontWeight: 400, fontFamily: 'monospace', marginLeft: '4px' }}>R</kbd>
        </button>

        {/* SKIP + toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSkipOpen((v) => !v)}
            disabled={!canApprove}
            style={{
              flex: 1,
              height: '36px',
              background: skipOpen ? 'var(--accent-dim)' : 'var(--surface)',
              color: skipOpen ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${skipOpen ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '8px',
              fontSize: '12px',
              cursor: canApprove ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <IconSkip size={14} />
            {t('moderator.skip', lang)}
            <kbd style={{ fontSize: '10px', opacity: 0.7, fontFamily: 'monospace', marginLeft: '2px' }}>S</kbd>
          </button>
        </div>

        {/* Skip confirmation inline panel */}
        {skipOpen && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '10px',
          }}>
            <button
              onClick={handleSkip}
              disabled={!canApprove}
              style={{
                width: '100%',
                height: '34px',
                background: 'var(--color-warning-alt)',
                color: 'var(--color-white)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('moderator.confirmSkip', lang)}
            </button>
          </div>
        )}

        {/* END SESSION */}
        <button
          onClick={onEndSession}
          style={{
            height: '34px',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {t('moderator.endSession', lang)}
        </button>
      </div>
    </div>
  )
}
