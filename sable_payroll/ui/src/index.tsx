// ============================================================================
// src/index.tsx
// React entry. In the game, we wait for LB Tablet's `componentsLoaded`
// postMessage before rendering so its injected helpers are ready. In dev
// (no invokeNative) we render immediately.
// ============================================================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const devMode = typeof window !== 'undefined' && !(window as any).invokeNative
const rootEl = document.getElementById('root')!
const root = ReactDOM.createRoot(rootEl)

const render = () =>
    root.render(<React.StrictMode><App /></React.StrictMode>)

if (devMode) {
    render()
} else {
    window.addEventListener('message', (e) => {
        if (e.data === 'componentsLoaded') render()
    })
}
