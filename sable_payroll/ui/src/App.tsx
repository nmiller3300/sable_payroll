// ============================================================================
// src/App.tsx
// Application shell — runs both in the real standalone tablet NUI environment and in the
// browser dev frame. Drives snapshot fetch/refresh, theme, toasts, and
// routes between Officer and Command views.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react'
import type { Snapshot, ToastPayload } from './types/api'
import { apiCloseApp, apiRefresh } from './lib/api'
import { Button, Chip, I, Loading, Empty } from './components/ui'
import OfficerView from './screens/OfficerView'
import CommandView, { CommandTab } from './screens/CommandView'
import Frame from './components/Frame'

import './colors.css'
import './index.css'
import './App.css'
import './ui.css'

const devMode = typeof window !== 'undefined' && !(window as any).invokeNative

// --------------------------------------------------------------------------
// Toast plumbing
// --------------------------------------------------------------------------
type Toast = ToastPayload & { id: number }
type ToastFn = (kind: Toast['kind'], title: string, message?: string) => void

function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([])
    const push: ToastFn = useCallback((kind, title, message) => {
        const id = Date.now() + Math.random()
        setToasts(t => [...t, { id, kind, title, message }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200)
    }, [])
    return { toasts, push }
}

// --------------------------------------------------------------------------
// Theme
// --------------------------------------------------------------------------
function useTheme() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    useEffect(() => {
        if (devMode) { document.documentElement.style.visibility = 'visible' ; document.body.style.visibility = 'visible'; return }
        const apply = (t?: string) => setTheme(t === 'light' ? 'light' : 'dark')
        apply((globalThis as any).settings?.display?.theme)
        const off = (globalThis as any).onSettingsChange?.((s: any) =>
            apply(s?.display?.theme))
        if (!(globalThis as any).GetParentResourceName) {
            document.body.style.visibility = 'visible'
        }
        return () => { if (typeof off === 'function') off() }
    }, [])
    return theme
}

// ==========================================================================
export default function App() {
    const theme = useTheme()
    const { toasts, push } = useToasts()
    const [snap, setSnap] = useState<Snapshot | null>(null)
    const [err, setErr]   = useState<string | null>(null)
    const [tab, setTab]   = useState<'home' | CommandTab>('home')

    const reload = useCallback(async () => {
        const r = await apiRefresh()
        if (r.ok) { setSnap(r); setErr(null) }
        else      { setErr(r.error) }
    }, [])

    // initial + periodic snapshot refresh
    useEffect(() => {
        reload()
        const id = setInterval(reload, 30_000)
        return () => clearInterval(id)
    }, [reload])

    // listen for messages from Lua (toasts, force refresh)
    useEffect(() => {
        const off1 = (globalThis as any).onNuiEvent?.('sable:toast', (data: ToastPayload) => {
            push(data?.kind ?? 'info', data?.title ?? 'Notice', data?.message)
        })
        const off2 = (globalThis as any).onNuiEvent?.('sable:forceRefresh', () => reload())
        return () => { off1?.(); off2?.() }
    }, [push, reload])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !devMode) {
                apiCloseApp().catch(() => {})
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    return (
        <AppFrame theme={theme}>
            <div className="app" data-theme={theme}>
                <div className="app-backdrop"><div className="noise" /></div>
                <div className="app-wrapper">
                    {!snap && !err && <Loading msg="Contacting S.A.B.L.E. systems…" />}
                    {err && <ErrorScreen msg={err} retry={reload} />}
                    {snap && (
                        <div className="shell">
                            <Sidebar snap={snap} tab={tab} setTab={setTab} />
                            <div className="main">
                                <Topbar snap={snap} tab={tab} setTab={setTab} reload={reload} />
                                {tab === 'home' && (
                                    <OfficerView snap={snap} reload={reload} toast={push} />
                                )}
                                {tab !== 'home' && snap.isCommand && (
                                    <CommandView snap={snap} toast={push} tab={tab as CommandTab} />
                                )}
                                {tab !== 'home' && !snap.isCommand && (
                                    <Empty title="Access Denied"
                                           sub="Only command-grade personnel may view this page." />
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <ToastHost toasts={toasts} />
            </div>
        </AppFrame>
    )
}

// --------------------------------------------------------------------------
function AppFrame({ theme, children }: { theme: string; children: React.ReactNode }) {
    if (!devMode) return <>{children}</>
    return (
        <div className="dev-wrapper" data-theme={theme}>
            <Frame>{children}</Frame>
        </div>
    )
}

// --------------------------------------------------------------------------
function Sidebar({ snap, tab, setTab }: {
    snap: Snapshot; tab: 'home' | CommandTab; setTab: (t: 'home' | CommandTab) => void;
}) {
    const pendingCorrections = snap.corrections.filter(c => c.status === 'pending').length
    const navItems: { id: 'home' | CommandTab; label: string; ico: React.ReactNode; badge?: number; cmd?: boolean }[] = [
        { id: 'home',        label: 'My Dashboard',     ico: <I.home size={16} />  },
        { id: 'dash',        label: 'Command Overview', ico: <I.shield size={16} />, cmd: true },
        { id: 'roster',      label: 'Roster',           ico: <I.users size={16} />,  cmd: true },
        { id: 'payroll',     label: 'Payroll',          ico: <I.money size={16} />,  cmd: true },
        { id: 'corrections', label: 'Corrections',      ico: <I.fix size={16} />,    cmd: true,
          badge: pendingCorrections },
        { id: 'audit',       label: 'Audit Log',        ico: <I.log size={16} />,    cmd: true },
    ]
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <img src={devMode ? '/sable-logo.png'
                                   : `https://cfx-nui-${(globalThis as any).resourceName || 'sable_payroll'}/ui/dist/sable-logo.png`}
                     alt="S.A.B.L.E." />
                <div>
                    <div className="sidebar-brand-title">S.A.B.L.E.</div>
                    <div className="sidebar-brand-sub">{snap.department.id} Payroll</div>
                </div>
            </div>

            <div className="sidebar-section">Officer</div>
            {navItems.filter(i => !i.cmd).map(i => (
                <NavItem key={i.id} {...i} active={tab === i.id} onClick={() => setTab(i.id)} />
            ))}

            {snap.isCommand && (
                <>
                    <div className="sidebar-section">Command</div>
                    {navItems.filter(i => i.cmd).map(i => (
                        <NavItem key={i.id} {...i} active={tab === i.id} onClick={() => setTab(i.id)} />
                    ))}
                </>
            )}

            <div className="sidebar-foot">
                <span className="who">{snap.profile.firstName} {snap.profile.lastName}</span>
                <span>{snap.profile.rankName}</span>
                <span style={{ color: snap.onDuty ? 'var(--status-ok)' : 'var(--text-2)' }}>
                    {snap.onDuty ? '● On Duty' : '○ Off Duty'}
                </span>
            </div>
        </aside>
    )
}

function NavItem({ ico, label, active, onClick, badge }: {
    ico: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
    return (
        <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
            <span className="nav-ico">{ico}</span>
            <span>{label}</span>
            {!!badge && badge > 0 && <span className="nav-badge">{badge}</span>}
        </div>
    )
}

// --------------------------------------------------------------------------
function Topbar({ snap, tab, setTab, reload }: {
    snap: Snapshot; tab: string;
    setTab: (t: 'home' | CommandTab) => void;
    reload: () => Promise<void>;
}) {
    const titles: Record<string, { t: string; s: string }> = {
        home:        { t: 'My Dashboard',     s: 'Your shift, pay, and records.' },
        dash:        { t: 'Command Overview', s: 'Department pulse and recent activity.' },
        roster:      { t: 'Roster',           s: 'All active personnel.' },
        payroll:     { t: 'Payroll',          s: 'Preview and process the current pay period.' },
        corrections: { t: 'Corrections',      s: 'Review missed-punch requests.' },
        audit:       { t: 'Audit Log',        s: 'Every command action on record.' },
    }
    const meta = titles[tab] ?? titles.home
    return (
        <div className="page-head">
            <div>
                <h1>{meta.t}</h1>
                <div className="page-sub">{meta.s}</div>
            </div>
            <div className="row" style={{ gap: '.4rem' }}>
                {snap.onDuty ? <Chip tone="ok" dot>On Duty</Chip> : <Chip dot>Off Duty</Chip>}
                <Button variant="ghost" size="sm" onClick={() => reload()} title="Refresh data">
                    <I.refresh size={14} />
                </Button>
            </div>
        </div>
    )
}

// --------------------------------------------------------------------------
function ToastHost({ toasts }: { toasts: Toast[] }) {
    return (
        <div className="toast-host">
            {toasts.map(t => {
                const ico = t.kind === 'ok' ? <I.check size={18} /> :
                            t.kind === 'warning' ? <I.warn size={18} /> :
                            t.kind === 'error' ? <I.warn size={18} /> :
                            <I.info size={18} />
                return (
                    <div key={t.id} className={`toast ${t.kind}`}>
                        <div className="toast-ico">{ico}</div>
                        <div>
                            <div className="toast-title">{t.title}</div>
                            {t.message && <div className="toast-msg">{t.message}</div>}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// --------------------------------------------------------------------------
function ErrorScreen({ msg, retry }: { msg: string; retry: () => Promise<void> }) {
    const notInDept = msg === 'not_in_department' || msg === 'no_employee'
    return (
        <div className="shell" style={{ gridTemplateColumns: '1fr' }}>
            <div className="main" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                    icon={<I.shield size={22} />}
                    title={notInDept ? 'No Access' : 'Connection Problem'}
                    sub={notInDept
                        ? 'You must be employed by a S.A.B.L.E. department to use this app.'
                        : `Try again. (${msg})`} />
                {!notInDept && <Button onClick={retry}><I.refresh size={14} /> Retry</Button>}
            </div>
        </div>
    )
}
