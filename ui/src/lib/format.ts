// ============================================================================
// src/lib/format.ts
// Currency / hours / time helpers.
// ============================================================================

export function formatCurrency(cents: number | null | undefined): string {
    const n = Math.floor(cents ?? 0)
    return '$' + n.toLocaleString('en-US')
}

export function formatHours(h: number | null | undefined, digits = 1): string {
    const v = h ?? 0
    return v.toFixed(digits) + ' h'
}

export function formatPct(r: number | null | undefined, digits = 0): string {
    return ((r ?? 0) * 100).toFixed(digits) + '%'
}

/** Format a MySQL `YYYY-MM-DD HH:MM:SS` or ISO string as a short local time. */
export function formatDateTime(raw: string | null | undefined): string {
    if (!raw) return '—'
    const d = new Date(raw.replace(' ', 'T'))
    if (isNaN(d.getTime())) return raw
    return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

export function formatRelative(raw: string | null | undefined): string {
    if (!raw) return '—'
    const d = new Date(raw.replace(' ', 'T'))
    if (isNaN(d.getTime())) return raw
    const secs = Math.max(0, (Date.now() - d.getTime()) / 1000)
    if (secs < 60) return 'just now'
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago'
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago'
    const days = Math.floor(secs / 86400)
    if (days < 30) return days + 'd ago'
    return d.toLocaleDateString()
}

/** "01:47:22" from a clock-in timestamp. */
export function formatShiftTimer(clockInAt: string | null | undefined, nowMs: number): string {
    if (!clockInAt) return '—'
    const start = new Date(clockInAt.replace(' ', 'T')).getTime()
    if (isNaN(start)) return '—'
    const diff = Math.max(0, (nowMs - start) / 1000)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = Math.floor(diff % 60)
    return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':')
}

/** Return an HTML datetime-local input value from a Date. */
export function toInputDT(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Take a datetime-local string and return 'YYYY-MM-DD HH:MM' suitable for MySQL. */
export function fromInputDT(v: string): string {
    return v.replace('T', ' ') + (v.length === 16 ? ':00' : '')
}

export function initials(first?: string, last?: string): string {
    const f = (first ?? '').trim()[0] ?? ''
    const l = (last ?? '').trim()[0] ?? ''
    const combo = (f + l).toUpperCase()
    return combo || '•'
}

/** Capitalize enum-ish strings. */
export function titleCase(s: string): string {
    if (!s) return s
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
