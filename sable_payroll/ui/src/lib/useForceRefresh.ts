// ============================================================================
// src/lib/useForceRefresh.ts
// Subscribes to 'sable:forceRefresh' app messages the client may push when
// the player's job changes. Calls the provided handler whenever it fires.
// ============================================================================

import { useEffect } from 'react'

export function useForceRefresh(handler: () => void) {
    useEffect(() => {
        if (typeof globalThis.onNuiEvent !== 'function') return
        globalThis.onNuiEvent('sable:forceRefresh', handler)
    }, [handler])
}
