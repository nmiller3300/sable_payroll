// ============================================================================
// src/lib/useToasts.ts
// Lightweight toast system. Receives pushes from the client via LB Tablet's
// onNuiEvent('sable:toast', payload) and exposes a simple push() helper too.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import type { ToastPayload } from '../types/api'

export interface Toast extends ToastPayload {
    id: number
}

let idSeq = 0
const DURATION_MS = 5000

export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([])

    const push = useCallback((t: ToastPayload) => {
        const id = ++idSeq
        setToasts((cur) => [...cur, { ...t, id }])
        setTimeout(() => {
            setToasts((cur) => cur.filter((x) => x.id !== id))
        }, DURATION_MS)
    }, [])

    const dismiss = useCallback((id: number) => {
        setToasts((cur) => cur.filter((x) => x.id !== id))
    }, [])

    useEffect(() => {
        if (typeof globalThis.onNuiEvent !== 'function') return
        globalThis.onNuiEvent<ToastPayload>('sable:toast', (p) => push(p))
    }, [push])

    return { toasts, push, dismiss }
}
