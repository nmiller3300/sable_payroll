// ============================================================================
// src/screens/OfficerView.tsx
// The view an officer sees: their own clock, pay, and records.
// ============================================================================

import React, { useEffect, useState } from 'react'
import type { Snapshot, Adjustment, CorrectionRow } from '../types/api'
import {
    apiClockIn, apiClockOut, apiSubmitCorrection, apiRefresh,
} from '../lib/api'
import {
    formatCurrency, formatHours, formatDateTime, formatShiftTimer,
    fromInputDT, toInputDT,
} from '../lib/format'
import {
    Panel, Stat, Button, Chip, Avatar, Progress, Modal, I, Empty, Banner,
} from '../components/ui'

type Props = {
    snap: Snapshot
    reload: () => Promise<void>
    toast: (k: 'ok' | 'warning' | 'error' | 'info', t: string, m?: string) => void
}

// --------------------------------------------------------------------------
export default function OfficerView({ snap, reload, toast }: Props) {
    const [now, setNow] = useState(Date.now())
    const [working, setWorking] = useState(false)
    const [correctionOpen, setCorrectionOpen] = useState(false)

    // Live shift timer
    useEffect(() => {
        if (!snap.onDuty) return
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [snap.onDuty])

    const toggleClock = async () => {
        if (working) return
        setWorking(true)
        try {
            const res = snap.onDuty ? await apiClockOut() : await apiClockIn()
            if (res.ok) {
                toast('ok',
                    snap.onDuty ? 'Clocked out' : 'Clocked in',
                    snap.onDuty ? 'Shift ended.' : 'Shift started.')
                await reload()
            } else {
                toast('error', 'Failed', res.error)
            }
        } finally { setWorking(false) }
    }

    const { profile, department, config } = snap
    const threshold = snap.threshold
    const hoursToGo = Math.max(0, threshold - snap.periodHours)
    const payableCap = profile.perRunMax
    const divCount = profile.divisions.length

    return (
        <div className="col gap-lg">
            {/* HERO — identity + clock timer */}
            <Panel raised>
                <div className="officer-hero">
                    <Avatar first={profile.firstName} last={profile.lastName} lg />
                    <div>
                        <div className="hero-name">
                            {profile.firstName} {profile.lastName}
                        </div>
                        <div className="hero-rank">{profile.rankName}</div>
                        <div className="hero-meta">
                            <span>{department.name}</span>
                            {profile.badge && <><span>•</span><span>Badge #{profile.badge}</span></>}
                            {profile.hasOverride && <><span>•</span>
                                <span style={{ color: 'var(--status-warn)' }}>Pay override active</span>
                            </>}
                        </div>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end' }}>
                        {snap.onDuty ? (
                            <>
                                <Chip tone="ok" dot>On duty</Chip>
                                <div className="shift-timer mono">
                                    {formatShiftTimer(snap.clockInAt, now)}
                                </div>
                                <span className="subtle" style={{ fontSize: '.72rem' }}>
                                    Since {formatDateTime(snap.clockInAt)}
                                </span>
                            </>
                        ) : (
                            <>
                                <Chip tone="danger" dot>Off duty</Chip>
                                <div className="shift-timer mono" style={{ color: 'var(--text-2)' }}>
                                    00:00:00
                                </div>
                                <span className="subtle" style={{ fontSize: '.72rem' }}>
                                    Tap below to start a shift
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </Panel>

            {/* Two-column: left clock+period, right pending pay */}
            <div className="two-col">
                <Panel title={<><I.clock size={16} /> Time Clock</>}>
                    <button
                        className={`clock-btn ${snap.onDuty ? 'off' : ''}`}
                        onClick={toggleClock}
                        disabled={working}
                    >
                        {snap.onDuty ? <I.stop size={28} /> : <I.play size={28} />}
                        {snap.onDuty ? 'Clock Out' : 'Clock In'}
                        <span className="clock-hint">
                            {snap.onDuty ? 'End current shift' : 'Begin a new shift'}
                        </span>
                    </button>

                    <hr className="accent-divider" />

                    <div className="col" style={{ gap: '.75rem' }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                            <span className="muted">Period hours</span>
                            <span className="strong mono tabular">
                                {formatHours(snap.periodHours)} <span className="subtle">/ {threshold} h</span>
                            </span>
                        </div>
                        <Progress value={snap.periodHours / threshold} />
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                            <span className="subtle" style={{ fontSize: '.8rem' }}>
                                {hoursToGo > 0
                                    ? `${formatHours(hoursToGo)} to max payout`
                                    : 'Max payout earned ✓'}
                            </span>
                            <Chip tone="accent">
                                {((snap.ratio ?? 0) * 100).toFixed(0)}% of max
                            </Chip>
                        </div>
                    </div>

                    <hr className="accent-divider" />

                    <div className="row" style={{ justifyContent: 'space-between' }}>
                        <Button variant="ghost" size="sm" onClick={() => setCorrectionOpen(true)}>
                            <I.fix size={14} /> Request Correction
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => reload()} title="Refresh">
                            <I.refresh size={14} /> Refresh
                        </Button>
                    </div>
                </Panel>

                <Panel title={<><I.wallet size={16} /> Next Paycheck</>}>
                    <div className="pending-pay-card">
                        <span className="pay-label">Pending Payout</span>
                        <span className="pay-amount">{formatCurrency(snap.pendingPay)}</span>
                        <div className="pay-breakdown">
                            <span>Max <b>{formatCurrency(payableCap)}</b></span>
                            <span>Annual <b>{formatCurrency(profile.annual)}</b></span>
                            {divCount > 0 && <span>Divisions <b>+{divCount}</b></span>}
                        </div>
                    </div>
                    <div className="stat-grid" style={{ marginTop: '.75rem' }}>
                        <Stat label="Lifetime Pay" value={formatCurrency(profile.lifetimePay)} />
                        <Stat label="Lifetime Hours" value={formatHours(profile.lifetimeHours, 0)} />
                    </div>
                </Panel>
            </div>

            {/* Pending adjustments */}
            <Panel title={<><I.bolt size={16} /> Pending Adjustments</>}
                   right={<Chip>{snap.pendingAdj.length}</Chip>}>
                {snap.pendingAdj.length === 0 ? (
                    <Empty icon={<I.check size={20} />} title="Nothing pending"
                           sub="Bonuses, deductions, and disciplinary actions will appear here." />
                ) : (
                    <div className="col">
                        {snap.pendingAdj.map(a => <AdjRow key={a.id} a={a} />)}
                    </div>
                )}
            </Panel>

            {/* Divisions */}
            {profile.divisions.length > 0 && (
                <Panel title={<><I.shield size={16} /> Divisions</>}>
                    <div className="div-tags">
                        {profile.divisions.map(id => {
                            const def = department.divisions.find(d => d.id === id)
                            return <Chip key={id} tone="accent">{def?.name ?? id}</Chip>
                        })}
                    </div>
                </Panel>
            )}

            {/* Correction history */}
            <Panel title={<><I.calendar size={16} /> Your Correction Requests</>}>
                {snap.corrections.length === 0 ? (
                    <Empty icon={<I.fix size={20} />} title="No requests"
                           sub="Use the Clock panel to submit a missed-punch correction." />
                ) : (
                    <div className="col">
                        {snap.corrections.map(c => <CorrectionItem key={c.id} c={c} />)}
                    </div>
                )}
            </Panel>

            {/* Payroll history */}
            <Panel title={<><I.history size={16} /> Payroll History</>}>
                {snap.history.length === 0 ? (
                    <Empty icon={<I.history size={20} />} title="No records yet"
                           sub={`Payroll runs ${config.runsPerYear} times per year.`} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Hours</th>
                                    <th>Base</th>
                                    <th>Div</th>
                                    <th>Bonus</th>
                                    <th>Ded</th>
                                    <th>Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {snap.history.map(h => (
                                    <tr key={h.id}>
                                        <td>{formatDateTime(h.closed_at || h.processed_at)}</td>
                                        <td className="num">{formatHours(h.hours)}</td>
                                        <td className="num">{formatCurrency(h.base_pay)}</td>
                                        <td className="num">{formatCurrency(h.division_bonus)}</td>
                                        <td className="num" style={{ color: 'var(--status-ok)' }}>
                                            {h.bonuses ? '+' + formatCurrency(h.bonuses) : '—'}
                                        </td>
                                        <td className="num" style={{ color: 'var(--status-danger)' }}>
                                            {h.deductions ? '-' + formatCurrency(h.deductions) : '—'}
                                        </td>
                                        <td className="num strong">
                                            <b>{formatCurrency(h.final_pay)}</b>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <CorrectionModal
                open={correctionOpen}
                onClose={() => setCorrectionOpen(false)}
                onSubmitted={async () => { setCorrectionOpen(false); await reload() }}
                toast={toast}
            />
        </div>
    )
}

// --------------------------------------------------------------------------
function AdjRow({ a }: { a: Adjustment }) {
    const toneClass = a.kind === 'bonus' ? 'bonus' : a.kind === 'deduction' ? 'deduct' : 'discip'
    const chipTone: 'ok' | 'danger' | 'warn' =
        a.kind === 'bonus' ? 'ok' : a.kind === 'deduction' ? 'danger' : 'warn'
    const sign = a.kind === 'bonus' ? '+' : '-'
    return (
        <div className="adjustment-row">
            <Chip tone={chipTone}>{a.kind}</Chip>
            <div className="grow" style={{ minWidth: 0 }}>
                <div className="strong" style={{ fontSize: '.88rem' }}>{a.reason}</div>
                <div className="subtle" style={{ fontSize: '.74rem' }}>
                    {formatDateTime(a.created_at)}
                </div>
            </div>
            <span className={`adj-amt ${toneClass}`}>
                {sign}{formatCurrency(a.amount)}
            </span>
        </div>
    )
}

function CorrectionItem({ c }: { c: CorrectionRow }) {
    const chipTone = c.status === 'approved' ? 'ok' : c.status === 'denied' ? 'danger' : 'warn'
    return (
        <div className="adjustment-row">
            <Chip tone={chipTone}>{c.status}</Chip>
            <div className="grow" style={{ minWidth: 0 }}>
                <div className="strong" style={{ fontSize: '.88rem' }}>{c.reason}</div>
                <div className="subtle" style={{ fontSize: '.74rem' }}>
                    {formatDateTime(c.requested_in)} → {formatDateTime(c.requested_out)}
                </div>
                {c.review_note && (
                    <div className="muted" style={{ fontSize: '.74rem', marginTop: '.2rem' }}>
                        Reviewer: {c.review_note}
                    </div>
                )}
            </div>
        </div>
    )
}

// --------------------------------------------------------------------------
function CorrectionModal({ open, onClose, onSubmitted, toast }: {
    open: boolean; onClose: () => void; onSubmitted: () => void;
    toast: Props['toast'];
}) {
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const [inAt, setIn]     = useState(toInputDT(hourAgo))
    const [outAt, setOut]   = useState(toInputDT(now))
    const [reason, setRsn]  = useState('')
    const [busy, setBusy]   = useState(false)

    useEffect(() => {
        if (open) {
            const n = new Date(), p = new Date(n.getTime() - 60 * 60 * 1000)
            setIn(toInputDT(p)); setOut(toInputDT(n)); setRsn('')
        }
    }, [open])

    const submit = async () => {
        if (!reason.trim()) { toast('warning', 'Reason required'); return }
        setBusy(true)
        try {
            const res = await apiSubmitCorrection({
                requestedIn:  fromInputDT(inAt),
                requestedOut: fromInputDT(outAt),
                reason,
            })
            if (res.ok) { toast('ok', 'Request submitted', 'Command will review it soon.'); onSubmitted() }
            else        { toast('error', 'Failed', res.error) }
        } finally { setBusy(false) }
    }

    return (
        <Modal open={open} onClose={onClose}
               title="Request Correction" subtitle="Fix a missed or incorrect clock punch."
               footer={<>
                   <Button variant="ghost" onClick={onClose}>Cancel</Button>
                   <Button variant="primary" onClick={submit} disabled={busy}>
                       {busy ? 'Submitting…' : 'Submit Request'}
                   </Button>
               </>}>
            <Banner tone="info">
                Correction requests require command approval and should reflect a shift you actually worked.
                Be specific and honest — all requests are audit-logged.
            </Banner>

            <div className="form-row">
                <div className="field">
                    <label className="field-label">Clock-in Time</label>
                    <input className="input" type="datetime-local"
                           value={inAt} onChange={e => setIn(e.target.value)} />
                </div>
                <div className="field">
                    <label className="field-label">Clock-out Time</label>
                    <input className="input" type="datetime-local"
                           value={outAt} onChange={e => setOut(e.target.value)} />
                </div>
            </div>
            <div className="field">
                <label className="field-label">Reason</label>
                <textarea className="textarea" rows={3}
                          placeholder="e.g. Tablet wouldn't load — responded to 10-80 at Vinewood"
                          value={reason} onChange={e => setRsn(e.target.value)} />
            </div>
        </Modal>
    )
}
