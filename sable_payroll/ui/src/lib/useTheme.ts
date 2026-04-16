// ============================================================================
// src/lib/useTheme.ts
// Syncs to standalone tablet NUI's settings.display.theme; falls back to 'dark' in dev.
// ============================================================================

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme(): Theme {
    const [theme, setTheme] = useState<Theme>(() => {
        const t = globalThis.settings?.display?.theme
        return (t as Theme) || 'dark'
    })

    useEffect(() => {
        if (typeof globalThis.onSettingsChange === 'function') {
            globalThis.onSettingsChange((s) => {
                const t = s?.display?.theme as Theme | undefined
                if (t && t !== theme) setTheme(t)
            })
        }
        // Mirror the theme onto <body> so CSS variables switch.
        document.body.setAttribute('data-theme', theme)
    }, [theme])

    return theme
}
