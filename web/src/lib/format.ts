const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

interface FormatBytesOptions {
  /** Base unit: 1024 (binary) or 1000 (decimal). Default 1024. */
  base?: 1024 | 1000
  /** Decimal places. Defaults to 1 for KB+, 0 for bytes. */
  precision?: number
}

/**
 * Format bytes to human-readable size string.
 *
 * @example formatBytes(0)                    → "0 B"
 * @example formatBytes(1536)                 → "1.5 KB"
 * @example formatBytes(1073741824)           → "1.0 GB"
 * @example formatBytes(1500, { base: 1000 }) → "1.5 KB"
 */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const { base = 1024, precision } = options

  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'

  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), SIZE_UNITS.length - 1)
  const value = bytes / Math.pow(base, exp)
  const decimals = precision ?? (exp === 0 ? 0 : 1)

  return `${value.toFixed(decimals)} ${SIZE_UNITS[exp]}`
}

// ── Timestamp ───────────────────────────────

interface FormatTimestampOptions {
  /** Include time portion (HH:mm:ss) */
  time?: boolean
  /** Locale string, e.g. "zh-CN". Defaults to browser locale. */
  locale?: string
}

/**
 * Format a Unix timestamp (seconds) to human-readable date string.
 *
 * @example formatTimestamp(1700000000)                    → "2023/11/14"
 * @example formatTimestamp(1700000000, { time: true })     → "2023/11/14 22:13:20"
 * @example formatTimestamp(1700000000, { locale: "zh-CN" }) → "2023/11/14"
 */
export function formatTimestamp(ts: number, options: FormatTimestampOptions = {}): string {
  if (!Number.isFinite(ts) || ts <= 0) return '—'

  const { time = false, locale } = options
  const date = new Date(ts * 1000)

  const dateStr = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  if (!time) return dateStr

  const timeStr = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return `${dateStr} ${timeStr}`
}

// ── Compact number ──────────────────────────

/**
 * Format a number in compact notation.
 *
 * @example formatCompact(1234)   → "1.2K"
 * @example formatCompact(1500000) → "1.5M"
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

// ── Duration ────────────────────────────────

/**
 * Format seconds into a human-readable duration.
 *
 * @example formatDuration(3661) → "1h 1m 1s"
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '—'
  if (totalSeconds === 0) return '0s'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (seconds || parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(' ')
}

// ── Relative time ───────────────────────────

function getRelativeTimeParts(msDiff: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const abs = Math.abs(msDiff)
  const seconds = Math.round(abs / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)

  if (seconds < 60) return { value: -Math.sign(msDiff) * seconds, unit: 'second' }
  if (minutes < 60) return { value: -Math.sign(msDiff) * minutes, unit: 'minute' }
  if (hours < 24) return { value: -Math.sign(msDiff) * hours, unit: 'hour' }
  return { value: -Math.sign(msDiff) * days, unit: 'day' }
}

/**
 * Format a timestamp as relative time (e.g. "3 hours ago", "in 5 minutes").
 *
 * @example formatRelativeTime(Date.now() - 3600000) → "1 hour ago"
 */
export function formatRelativeTime(timestampMs: number, locale = 'en'): string {
  if (!Number.isFinite(timestampMs)) return '—'

  const diff = timestampMs - Date.now()
  const { value, unit } = getRelativeTimeParts(diff)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'long' })
  return rtf.format(value, unit)
}