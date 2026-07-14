// Shared utility functions for moderation components.

export function formatPrice(price: number, currency: string): string {
  return currency === 'USD'
    ? `$${price.toLocaleString('en-US')}`
    : `${price.toLocaleString()} с.`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Stop-word patterns used in description highlighting
export const STOP_WORD_PATTERNS = [
  /https?:\/\/[^\s]+/g,
  /@[^\s]+/g,
  /\+7[0-9]{10}/g,
  /\+992[0-9]{9}/g,
  /turbo\.az/gi,
  /avtomobili\.tj/gi,
]

/**
 * Returns an array of segments with `{ text, highlight }` flags.
 * Used by ContentPanel to render stop-word highlights.
 */
export function highlightStopWords(
  text: string
): { text: string; highlight: boolean }[] {
  if (!text) return [{ text: '', highlight: false }]

  // Collect all match ranges
  const ranges: { start: number; end: number }[] = []
  for (const pattern of STOP_WORD_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
  }

  if (ranges.length === 0) return [{ text, highlight: false }]

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end)
    } else {
      merged.push({ ...r })
    }
  }

  const segments: { text: string; highlight: boolean }[] = []
  let cursor = 0
  for (const { start, end } of merged) {
    if (cursor < start) {
      segments.push({ text: text.slice(cursor, start), highlight: false })
    }
    segments.push({ text: text.slice(start, end), highlight: true })
    cursor = end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false })
  }
  return segments
}

// Shared input style object — used across editable field components
export const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
  width: '100%',
}

export const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '4px',
  display: 'block',
}

export const SECTION_HEADING_STYLE: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

// Need React type for CSSProperties
import type React from 'react'
