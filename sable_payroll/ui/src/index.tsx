// ============================================================================
// src/index.tsx
// React entry for standalone NUI.
// ============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const devMode = typeof window !== 'undefined' && !(window as any).invokeNative
const rootEl = document.getElementById('root')!
const root = ReactDOM.createRoot(rootEl)

type NuiListener = (data: unknown) => void
const listeners = new Map<string, Set<NuiListener>>()

(window as any).onNuiEvent = (eventName: string, cb: NuiListener) => {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set())
    listeners.get(eventName)!.add(cb)
    return () => listeners.get(eventName)?.delete(cb)
}

window.addEventListener('message', (e) => {
    const eventName = e.data?.action
    const payload = e.data?.data
    if (!eventName) return
    listeners.get(eventName)?.forEach((cb) => cb(payload))
})

let didRender = false
const render = () => {
    if (didRender) return
    didRender = true
    document.documentElement.style.visibility = 'visible'
    document.body.style.visibility = 'visible'
    root.render(<React.StrictMode><App /></React.StrictMode>)
}

render()

if (!devMode) {
    document.documentElement.style.visibility = 'hidden'
    document.body.style.visibility = 'hidden'

    ;(window as any).onNuiEvent?.('sable:open', (payload: any) => {
        if (payload?.resourceName) (window as any).resourceName = payload.resourceName
        if (payload?.appName) (window as any).appName = payload.appName
        document.documentElement.style.visibility = 'visible'
        document.body.style.visibility = 'visible'
    })

    ;(window as any).onNuiEvent?.('sable:close', () => {
        document.documentElement.style.visibility = 'hidden'
        document.body.style.visibility = 'hidden'
    })
}
