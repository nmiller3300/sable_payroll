// ============================================================================
// src/components/ui.tsx
// Shared visual primitives used across Officer + Command views.
// Icons are inline SVG to keep the bundle lean (no lucide dependency).
// ============================================================================

import React, { ReactNode, useEffect } from 'react'

// ---------- Icons ----------------------------------------------------------
type IcoProps = { size?: number; className?: string }
const ico = (d: ReactNode) => ({ size = 16, className }: IcoProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
         strokeLinejoin="round" className={className}>{d}</svg>
)

export const I = {
    clock:     ico(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
    home:      ico(<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>),
    users:     ico(<><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c.8-3.4 3.3-5 6-5s5.2 1.6 6 5"/><path d="M15 20c.4-2 1.8-3.2 3.8-3.2 1.3 0 2.4.5 3.2 1.4"/></>),
    money:     ico(<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></>),
    fix:       ico(<><path d="M14.7 6.3a4 4 0 1 1-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 1 2.4-2.4Z"/></>),
    shield:    ico(<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6Z"/>),
    log:       ico(<><path d="M5 4h12a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 13h8M8 17h5"/></>),
    logo:      ico(<path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6Z"/>),
    chevR:     ico(<path d="m9 6 6 6-6 6"/>),
    chevL:     ico(<path d="m15 6-6 6 6 6"/>),
    plus:      ico(<><path d="M12 5v14"/><path d="M5 12h14"/></>),
    minus:     ico(<path d="M5 12h14"/>),
    x:         ico(<><path d="M6 6 18 18"/><path d="M18 6 6 18"/></>),
    check:     ico(<path d="m5 12 4 4L19 7"/>),
    warn:      ico(<><path d="M12 3 2 21h20Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".8" fill="currentColor"/></>),
    info:      ico(<><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></>),
    refresh:   ico(<><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></>),
    search:    ico(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
    play:      ico(<path d="M6 4v16l13-8Z"/>),
    stop:      ico(<rect x="6" y="6" width="12" height="12" rx="1.5"/>),
    dot:       ico(<circle cx="12" cy="12" r="4" fill="currentColor"/>),
    history:   ico(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>),
    edit:      ico(<><path d="M4 20h4l10-10-4-4L4 16Z"/><path d="m14 6 4 4"/></>),
    trash:     ico(<><path d="M4 7h16"/><path d="M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/></>),
    calendar:  ico(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>),
    bolt:      ico(<path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>),
    badge:     ico(<><path d="M12 3 4 6v5c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6Z"/><path d="m9 12 2 2 4-4"/></>),
    wallet:    ico(<><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.3" fill="currentColor"/></>),
}

// ---------- Panel ----------------------------------------------------------
export function Panel({ title, right, children, raised, className, flat, style }: {
    title?: ReactNode; right?: ReactNode; children?: ReactNode;
    raised?: boolean; flat?: boolean; className?: string; style?: React.CSSProperties;
}) {
    return (
        <div className={`panel ${raised ? 'panel-raised' : ''} ${flat ? 'panel-flat' : ''} ${className || ''}`} style={style}>
            {title && (
                <div className="panel-title">
                    <span>{title}</span>
                    {right && <span className="spacer" />}
                    {right}
                </div>
            )}
            {children}
        </div>
    )
}

// ---------- Stat -----------------------------------------------------------
export function Stat({ label, value, sub, accent, icon }: {
    label: ReactNode; value: ReactNode; sub?: ReactNode; accent?: boolean; icon?: ReactNode;
}) {
    return (
        <div className={`stat ${accent ? 'accent' : ''}`}>
            <div className="stat-label">
                {icon}
                {label}
            </div>
            <div className="stat-value">{value}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    )
}

// ---------- Button ---------------------------------------------------------
type BtnVariant = 'default' | 'primary' | 'danger' | 'ghost'
type BtnSize = 'sm' | 'md' | 'lg'
export function Button({ variant = 'default', size = 'md', onClick, disabled, children, title, type = 'button' }: {
    variant?: BtnVariant; size?: BtnSize; onClick?: () => void; disabled?: boolean;
    children: ReactNode; title?: string; type?: 'button' | 'submit';
}) {
    const cls = ['btn',
        variant === 'primary' ? 'btn-primary' : '',
        variant === 'danger'  ? 'btn-danger'  : '',
        variant === 'ghost'   ? 'btn-ghost'   : '',
        size === 'sm' ? 'btn-sm' : '',
        size === 'lg' ? 'btn-lg' : ''
    ].filter(Boolean).join(' ')
    return (
        <button type={type} className={cls} onClick={onClick} disabled={disabled}
                aria-disabled={disabled} title={title}>
            {children}
        </button>
    )
}

// ---------- Chip / Badge ---------------------------------------------------
export function Chip({ tone = 'default', children, dot }: {
    tone?: 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'; children: ReactNode; dot?: boolean;
}) {
    return (
        <span className={`chip ${tone !== 'default' ? 'chip-' + tone : ''}`}>
            {dot && <span className="chip-dot" />}
            {children}
        </span>
    )
}

// ---------- Avatar (initials) ---------------------------------------------
export function Avatar({ first, last, lg }: { first?: string; last?: string; lg?: boolean }) {
    const letters = ((first?.[0] || '') + (last?.[0] || '')) || '??'
    return <div className={`avatar ${lg ? 'lg' : ''}`}>{letters.toUpperCase()}</div>
}

// ---------- Progress -------------------------------------------------------
export function Progress({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(1, value)) * 100
    return (
        <div className="progress" role="progressbar" aria-valuenow={pct}>
            <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
    )
}

// ---------- Modal ----------------------------------------------------------
export function Modal({ open, onClose, title, subtitle, children, footer, wide }: {
    open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode;
    children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null
    return (
        <div className="modal-scrim" onClick={onClose}>
            <div className={`modal ${wide ? 'drawer' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <div style={{ flex: 1 }}>
                        {title && <h2>{title}</h2>}
                        {subtitle && <div className="modal-sub">{subtitle}</div>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} title="Close">
                        <I.x size={16} />
                    </Button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    )
}

// ---------- Segmented control ---------------------------------------------
export function Segmented<T extends string>({ value, onChange, options }: {
    value: T; onChange: (v: T) => void;
    options: { value: T; label: ReactNode }[];
}) {
    return (
        <div className="segmented">
            {options.map(o => (
                <button key={o.value} className={value === o.value ? 'active' : ''}
                        onClick={() => onChange(o.value)}>
                    {o.label}
                </button>
            ))}
        </div>
    )
}

// ---------- Empty state ---------------------------------------------------
export function Empty({ icon, title, sub }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode }) {
    return (
        <div className="empty">
            <div className="empty-ico">{icon || <I.info size={20} />}</div>
            <b>{title}</b>
            {sub && <span>{sub}</span>}
        </div>
    )
}

// ---------- Loading -------------------------------------------------------
export function Loading({ msg }: { msg?: string }) {
    return (
        <div className="loading-shell">
            <div className="spinner" />
            <span>{msg || 'Loading…'}</span>
        </div>
    )
}

// ---------- Banner --------------------------------------------------------
export function Banner({ tone = 'info', children }: {
    tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode;
}) {
    const ToneIcon = { info: I.info, warn: I.warn, danger: I.warn, ok: I.check }[tone]
    return (
        <div className={`banner banner-${tone}`}>
            <ToneIcon size={18} />
            <div>{children}</div>
        </div>
    )
}
