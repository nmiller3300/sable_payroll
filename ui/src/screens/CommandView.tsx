// ============================================================================
// src/screens/CommandView.tsx
// Command staff view — multi-screen with left-rail navigation.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react'
import type {
    Snapshot, RosterRow, PayrollPreview, PayrollLine, CorrectionRow,
    AuditRow, Adjustment, AdjustmentKind, DivisionDef, PayrollHistoryRow,
} from '../types/api'
import {
    apiGetRoster, apiPayrollPreview, apiProcessPayroll,
    apiApplyAdjustment, apiRemoveAdjustment, apiGetOfficerAdjustments,
    apiSetPayOverride, apiRemovePayOverride, apiSetDivision,
    apiGetCorrections, apiApproveCorrection, apiDenyCorrection,
    apiGetAuditLog, apiGetPayrollHistory,
} from '../lib/api'
import {
    formatCurrency, formatHours, formatDateTime, formatRelative, titleCase,
} from '../lib/format'
import {
    Panel, Stat, Button, Chip, Avatar, Progress, Modal, I, Empty, Banner,
    Segmented, Loading,
} from '../components/ui'

type Toast = (k: 'ok' | 'warning' | 'error' | 'info', t: string, m?: string) => void
type Props = { snap: Snapshot; toast: Toast }

export type CommandTab = 'dash' | 'roster' | 'payroll' | 'corrections' | 'audit'

// ============================================================================
// Root command view with internal tab state (nav handled in App shell)
// ============================================================================
export default function CommandView({ snap, toast, tab }: Props & { tab: CommandTab }) {
    const [roster, setRoster] = useState<{
        rows: RosterRow[]; society: number; divisions: DivisionDef[]; onDuty: number;
    } | null>(null)
    const [rosterBusy, setRosterBusy] = useState(false)

    const loadRoster = async () => {
        setRosterBusy(true)
        try {
            const r = await apiGetRoster()
            if (r.ok) setRoster({
                rows: r.roster, society: r.society,
                divisions: r.divisions, onDuty: r.onDutyCount,
            })
            else toast('error', 'Roster failed', r.error)
        } finally { setRosterBusy(false) }
    }

    useEffect(() => { loadRoster() }, [tab])

    if (tab === 'dash')
        return <Dashboard snap={snap} roster={roster} loadRoster={loadRoster} />

    if (tab === 'roster')
        return <Roster roster={roster} busy={rosterBusy} toast={toast}
                       reload={loadRoster} department={snap.department} />

    if (tab === 'payroll')
        return <PayrollTab toast={toast} reload={loadRoster} />

    if (tab === 'corrections')
        return <CorrectionsTab toast={toast} />

    if (tab === 'audit')
        return <AuditTab />

    return null
}

// ============================================================================
// DASHBOARD — overview & quick stats
// ============================================================================
function Dashboard({ snap, roster, loadRoster }: {
    snap: Snapshot; roster: any; loadRoster: () => Promise<void>;
}) {
    const [history, setHistory] = useState<PayrollHistoryRow[]>([])
    useEffect(() => {
        apiGetPayrollHistory(5).then(r => r.ok && setHistory(r.history))
    }, [])

    const on = roster?.onDuty ?? 0
    const total = roster?.rows.length ?? 0
    const society = roster?.society ?? 0
    const pendingAdjTotal = roster?.rows.reduce((s: number, r: RosterRow) =>
        s + r.pendingBonus - r.pendingDed, 0) ?? 0

    return (
        <div className="col gap-lg">
            <Panel raised>
                <div className="officer-hero">
                    <Avatar first={snap.department.id[0]} last={snap.department.id[1]} lg />
                    <div>
                        <div className="hero-name">{snap.department.name}</div>
                        <div className="hero-rank">Command Dashboard</div>
                        <div className="hero-meta">
                            <span>Viewing as {snap.profile.rankName}</span>
                            <span>•</span>
                            <span>{snap.profile.firstName} {snap.profile.lastName}</span>
                        </div>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end' }}>
                        <Chip tone="accent" dot>Command</Chip>
                        <span className="subtle" style={{ fontSize: '.72rem', marginTop: '.3rem' }}>
                            Grades {/* shown as configured */}12 / 13 / 14
                        </span>
                    </div>
                </div>
            </Panel>

            <div className="stat-grid">
                <Stat label="On Duty" value={`${on} / ${total}`} icon={<I.users size={12} />}
                      sub="officers currently clocked in" accent />
                <Stat label="Society Balance" value={formatCurrency(society)}
                      icon={<I.money size={12} />} sub="available for payroll" />
                <Stat label="Pending Adjustments" value={formatCurrency(Math.abs(pendingAdjTotal))}
                      icon={<I.bolt size={12} />}
                      sub={pendingAdjTotal >= 0 ? 'net bonus' : 'net deduction'} />
                <Stat label="Active Corrections" value={snap.corrections.filter(c => c.status === 'pending').length}
                      icon={<I.fix size={12} />} sub="awaiting review" />
            </div>

            <div className="two-col">
                <Panel title={<><I.users size={16} /> Currently On Duty</>}
                       right={<Button variant="ghost" size="sm" onClick={loadRoster}>
                           <I.refresh size={14} /> Refresh
                       </Button>}>
                    {!roster ? <Loading /> :
                     roster.rows.filter((r: RosterRow) => r.onDuty).length === 0 ? (
                        <Empty title="No one on duty" sub="The badge rack is empty." />
                    ) : (
                        <div className="col" style={{ gap: '.4rem' }}>
                            {roster.rows.filter((r: RosterRow) => r.onDuty).map((r: RosterRow) => (
                                <div key={r.citizenid} className="adjustment-row">
                                    <Avatar first={r.firstName} last={r.lastName} />
                                    <div className="grow">
                                        <div className="strong" style={{ fontSize: '.88rem' }}>
                                            {r.firstName} {r.lastName}
                                        </div>
                                        <div className="subtle" style={{ fontSize: '.74rem' }}>
                                            {r.rankName}{r.badge ? ` • #${r.badge}` : ''}
                                        </div>
                                    </div>
                                    <Chip tone="ok" dot>Active</Chip>
                                    <span className="mono tabular subtle" style={{ fontSize: '.8rem' }}>
                                        {formatHours(r.periodHours)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel title={<><I.history size={16} /> Recent Payroll Runs</>}>
                    {history.length === 0 ? (
                        <Empty title="No history yet" sub="Your first payroll run will appear here." />
                    ) : (
                        <div className="col" style={{ gap: '.4rem' }}>
                            {history.map(h => (
                                <div key={h.period_id} className="adjustment-row">
                                    <div className="avatar">#{h.period_id}</div>
                                    <div className="grow">
                                        <div className="strong" style={{ fontSize: '.88rem' }}>
                                            {h.line_count} officers paid
                                        </div>
                                        <div className="subtle" style={{ fontSize: '.74rem' }}>
                                            {formatDateTime(h.closed_at)} • {formatHours(h.total_hours, 0)}
                                        </div>
                                    </div>
                                    <span className="mono strong tabular">
                                        {formatCurrency(h.total_paid)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    )
}

// ============================================================================
// ROSTER — list, search, open officer drawer
// ============================================================================
function Roster({ roster, busy, toast, reload, department }: {
    roster: any; busy: boolean; toast: Toast; reload: () => Promise<void>;
    department: Snapshot['department'];
}) {
    const [q, setQ] = useState('')
    const [filter, setFilter] = useState<'all' | 'onduty' | 'override'>('all')
    const [selected, setSelected] = useState<RosterRow | null>(null)

    if (busy && !roster) return <Loading msg="Loading roster…" />

    const filtered: RosterRow[] = useMemo(() => {
        const rows: RosterRow[] = roster?.rows ?? []
        const qq = q.toLowerCase()
        return rows.filter(r => {
            if (filter === 'onduty' && !r.onDuty) return false
            if (filter === 'override' && !r.hasOverride) return false
            if (!qq) return true
            return (`${r.firstName} ${r.lastName} ${r.rankName} ${r.badge ?? ''}`)
                .toLowerCase().includes(qq)
        })
    }, [roster, q, filter])

    return (
        <div className="col gap-lg">
            <Panel flat>
                <div style={{ padding: '1rem 1.1rem' }}>
                    <div className="panel-title">
                        <I.users size={16} /> Roster
                        <span className="spacer" />
                        <Chip>{filtered.length} of {roster?.rows.length ?? 0}</Chip>
                    </div>
                    <div className="roster-toolbar">
                        <div className="field search">
                            <input className="input" placeholder="Search name, rank, badge…"
                                   value={q} onChange={e => setQ(e.target.value)} />
                        </div>
                        <Segmented<'all' | 'onduty' | 'override'> value={filter} onChange={setFilter}
                            options={[
                                { value: 'all',      label: 'All' },
                                { value: 'onduty',   label: 'On Duty' },
                                { value: 'override', label: 'Override' },
                            ]} />
                        <span className="spacer" />
                        <Button variant="ghost" size="sm" onClick={reload}>
                            <I.refresh size={14} /> Refresh
                        </Button>
                    </div>
                </div>
                <div className="table-wrap" style={{ maxHeight: '62vh' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Officer</th>
                                <th>Rank</th>
                                <th>Divisions</th>
                                <th style={{ textAlign: 'right' }}>Period</th>
                                <th style={{ textAlign: 'right' }}>Annual</th>
                                <th style={{ textAlign: 'right' }}>Next Pay</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.citizenid} className="clickable"
                                    onClick={() => setSelected(r)}>
                                    <td>
                                        <div className="name">
                                            <Avatar first={r.firstName} last={r.lastName} />
                                            <div>
                                                <div className="strong">
                                                    {r.firstName} {r.lastName}
                                                </div>
                                                <div className="subtle" style={{ fontSize: '.72rem' }}>
                                                    {r.badge ? '#' + r.badge : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{r.rankName}</td>
                                    <td>
                                        {r.divisions.length === 0 ? (
                                            <span className="subtle">—</span>
                                        ) : (
                                            <div className="div-tags">
                                                {r.divisions.slice(0, 3).map(id => (
                                                    <Chip key={id} tone="accent">
                                                        {department.divisions.find(d => d.id === id)?.name ?? id}
                                                    </Chip>
                                                ))}
                                                {r.divisions.length > 3 && <Chip>+{r.divisions.length - 3}</Chip>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="num" style={{ textAlign: 'right' }}>
                                        {formatHours(r.periodHours)}
                                    </td>
                                    <td className="num" style={{ textAlign: 'right' }}>
                                        {formatCurrency(r.annual)}
                                        {r.hasOverride && (
                                            <div><Chip tone="warn">override</Chip></div>
                                        )}
                                    </td>
                                    <td className="num strong" style={{ textAlign: 'right' }}>
                                        {formatCurrency(r.perRunMax)}
                                    </td>
                                    <td>
                                        {r.onDuty
                                            ? <Chip tone="ok" dot>On</Chip>
                                            : <Chip>Off</Chip>}
                                    </td>
                                    <td><I.chevR size={14} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <Empty title="No matches" sub="Adjust your search or filter." />
                    )}
                </div>
            </Panel>

            {selected && (
                <OfficerDrawer
                    officer={selected}
                    department={department}
                    onClose={() => setSelected(null)}
                    toast={toast}
                    reload={async () => { await reload(); setSelected(null) }}
                />
            )}
        </div>
    )
}

// ============================================================================
// OFFICER DRAWER — adjustments, overrides, divisions
// ============================================================================
function OfficerDrawer({ officer, department, onClose, toast, reload }: {
    officer: RosterRow; department: Snapshot['department'];
    onClose: () => void; toast: Toast; reload: () => Promise<void>;
}) {
    const [tab, setTab] = useState<'adj' | 'override' | 'divs'>('adj')
    const [adj, setAdj] = useState<Adjustment[]>([])
    const [busy, setBusy] = useState(false)

    // adjustment form
    const [kind, setKind] = useState<AdjustmentKind>('bonus')
    const [amt, setAmt] = useState('')
    const [reason, setReason] = useState('')

    // override form
    const [overrideAnnual, setOverrideAnnual] = useState(String(officer.annual))
    const [overrideReason, setOverrideReason] = useState(officer.overrideReason ?? '')

    // divisions
    const [divs, setDivs] = useState<string[]>(officer.divisions)

    const loadAdj = async () => {
        const r = await apiGetOfficerAdjustments(officer.citizenid)
        if (r.ok) setAdj(r.adjustments)
    }
    useEffect(() => { loadAdj() }, [])

    const applyAdj = async () => {
        const n = Number(amt)
        if (!n || n <= 0) { toast('warning', 'Enter a positive amount'); return }
        if (!reason.trim()) { toast('warning', 'Reason required'); return }
        setBusy(true)
        try {
            const r = await apiApplyAdjustment({ targetCid: officer.citizenid, kind, amount: n, reason })
            if (r.ok) { toast('ok', 'Adjustment applied'); setAmt(''); setReason(''); await loadAdj(); await reload() }
            else      { toast('error', 'Failed', r.error) }
        } finally { setBusy(false) }
    }

    const removeAdj = async (id: number) => {
        const r = await apiRemoveAdjustment(id)
        if (r.ok) { toast('ok', 'Removed'); await loadAdj(); await reload() }
        else      { toast('error', 'Failed', r.error) }
    }

    const saveOverride = async () => {
        const n = Number(overrideAnnual)
        if (!n || n <= 0) { toast('warning', 'Enter a positive annual'); return }
        if (!overrideReason.trim()) { toast('warning', 'Reason required'); return }
        setBusy(true)
        try {
            const r = await apiSetPayOverride({
                targetCid: officer.citizenid, annual: n, reason: overrideReason,
            })
            if (r.ok) { toast('ok', 'Override saved'); await reload() }
            else      { toast('error', 'Failed', r.error) }
        } finally { setBusy(false) }
    }

    const removeOverride = async () => {
        const r = await apiRemovePayOverride(officer.citizenid)
        if (r.ok) { toast('ok', 'Override removed'); await reload() }
        else      { toast('error', 'Failed', r.error) }
    }

    const toggleDiv = (id: string) =>
        setDivs(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id])

    const saveDivs = async () => {
        setBusy(true)
        try {
            const r = await apiSetDivision({ targetCid: officer.citizenid, divisions: divs })
            if (r.ok) { toast('ok', 'Divisions updated'); await reload() }
            else      { toast('error', 'Failed', r.error) }
        } finally { setBusy(false) }
    }

    return (
        <Modal open onClose={onClose} wide
               title={`${officer.firstName} ${officer.lastName}`}
               subtitle={`${officer.rankName}${officer.badge ? ' • Badge #' + officer.badge : ''}`}
               footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
            <div className="stat-grid">
                <Stat label="Annual" value={formatCurrency(officer.annual)}
                      sub={officer.hasOverride ? 'override active' : 'rank default'} />
                <Stat label="Next Pay Max" value={formatCurrency(officer.perRunMax)} />
                <Stat label="Period Hours" value={formatHours(officer.periodHours)} />
                <Stat label="Lifetime Pay" value={formatCurrency(officer.lifetimePay)} />
            </div>

            <Segmented<'adj' | 'override' | 'divs'> value={tab} onChange={setTab} options={[
                { value: 'adj',      label: 'Adjustments' },
                { value: 'override', label: 'Pay Override' },
                { value: 'divs',     label: 'Divisions' },
            ]} />

            {tab === 'adj' && (
                <>
                    <Panel raised title="Apply New Adjustment">
                        <div className="form-row cols-3">
                            <div className="field">
                                <label className="field-label">Type</label>
                                <select className="select" value={kind}
                                        onChange={e => setKind(e.target.value as AdjustmentKind)}>
                                    <option value="bonus">Bonus</option>
                                    <option value="deduction">Deduction</option>
                                    <option value="disciplinary">Disciplinary</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="field-label">Amount ($)</label>
                                <input className="input" type="number" min="0"
                                       value={amt} onChange={e => setAmt(e.target.value)} />
                            </div>
                            <div className="field">
                                <label className="field-label">&nbsp;</label>
                                <Button variant="primary" onClick={applyAdj} disabled={busy}>
                                    <I.plus size={14} /> Apply
                                </Button>
                            </div>
                        </div>
                        <div className="field" style={{ marginTop: '.5rem' }}>
                            <label className="field-label">Reason</label>
                            <input className="input" value={reason}
                                   onChange={e => setReason(e.target.value)}
                                   placeholder="Describe the reason — this goes in the audit log." />
                        </div>
                    </Panel>

                    <Panel title="Pending Adjustments">
                        {adj.length === 0 ? (
                            <Empty title="None pending" />
                        ) : (
                            <div className="col">
                                {adj.map(a => (
                                    <div key={a.id} className="adjustment-row">
                                        <Chip tone={a.kind === 'bonus' ? 'ok' : a.kind === 'deduction' ? 'danger' : 'warn'}>
                                            {a.kind}
                                        </Chip>
                                        <div className="grow">
                                            <div className="strong" style={{ fontSize: '.85rem' }}>{a.reason}</div>
                                            <div className="subtle" style={{ fontSize: '.72rem' }}>
                                                {formatDateTime(a.created_at)}
                                            </div>
                                        </div>
                                        <span className={`adj-amt ${a.kind === 'bonus' ? 'bonus' : a.kind === 'deduction' ? 'deduct' : 'discip'}`}>
                                            {a.kind === 'bonus' ? '+' : '-'}{formatCurrency(a.amount)}
                                        </span>
                                        <Button variant="ghost" size="sm" onClick={() => removeAdj(a.id)}
                                                title="Remove">
                                            <I.trash size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </>
            )}

            {tab === 'override' && (
                <>
                    <Banner tone="warn">
                        Pay overrides <b>persist across pay periods</b> and replace the rank's annual salary.
                        Use for long-term disciplinary or special-arrangement cases. Always explain why.
                    </Banner>
                    <div className="form-row">
                        <div className="field">
                            <label className="field-label">Override Annual ($)</label>
                            <input className="input" type="number" value={overrideAnnual}
                                   onChange={e => setOverrideAnnual(e.target.value)} />
                        </div>
                        <div className="field">
                            <label className="field-label">New Per-Run Max</label>
                            <input className="input" disabled
                                   value={formatCurrency(Math.floor(Number(overrideAnnual || 0) / 104))} />
                        </div>
                    </div>
                    <div className="field">
                        <label className="field-label">Reason (required)</label>
                        <textarea className="textarea" rows={3} value={overrideReason}
                                  onChange={e => setOverrideReason(e.target.value)} />
                    </div>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: '.5rem' }}>
                        {officer.hasOverride && (
                            <Button variant="danger" onClick={removeOverride} disabled={busy}>
                                <I.trash size={14} /> Remove Override
                            </Button>
                        )}
                        <Button variant="primary" onClick={saveOverride} disabled={busy}>
                            <I.check size={14} /> Save Override
                        </Button>
                    </div>
                </>
            )}

            {tab === 'divs' && (
                <>
                    <Banner tone="info">
                        Each division assignment adds a bonus scaled with ratio.
                        Select all that apply, then save.
                    </Banner>
                    <div className="div-tags">
                        {department.divisions.map(d => {
                            const on = divs.includes(d.id)
                            return (
                                <button key={d.id}
                                        className={`chip ${on ? 'chip-accent' : ''}`}
                                        style={{ cursor: 'pointer', border: on ? undefined : '1px solid var(--stroke-2)' }}
                                        onClick={() => toggleDiv(d.id)}>
                                    {on && <I.check size={12} />}
                                    {d.name}
                                </button>
                            )
                        })}
                    </div>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <Button variant="primary" onClick={saveDivs} disabled={busy}>
                            <I.check size={14} /> Save Divisions
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    )
}

// ============================================================================
// PAYROLL TAB — preview + confirm + run
// ============================================================================
function PayrollTab({ toast, reload }: { toast: Toast; reload: () => Promise<void> }) {
    const [preview, setPreview] = useState<PayrollPreview | null>(null)
    const [busy, setBusy] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const load = async () => {
        setBusy(true)
        try {
            const r = await apiPayrollPreview()
            if (r.ok) setPreview(r.preview)
            else toast('error', 'Preview failed', r.error)
        } finally { setBusy(false) }
    }
    useEffect(() => { load() }, [])

    const runPayroll = async () => {
        setConfirmOpen(false)
        setBusy(true)
        try {
            const r = await apiProcessPayroll('CONFIRM')
            if (r.ok) {
                toast('ok', 'Payroll processed',
                      `Paid ${formatCurrency(r.summary?.totalPaid ?? 0)} to ${r.summary?.payableCount ?? 0} officers.`)
                await load()
                await reload()
            } else {
                toast('error', 'Failed', r.error)
            }
        } finally { setBusy(false) }
    }

    if (busy && !preview) return <Loading msg="Calculating payroll…" />
    if (!preview) return <Empty title="No preview" sub="Try refreshing." />

    const { totals } = preview
    return (
        <div className="col gap-lg">
            <Panel raised>
                <div className="summary-row">
                    <div className="summary-item">
                        <span className="summary-label">Period</span>
                        <span className="summary-value">{preview.department}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Officers</span>
                        <span className="summary-value">
                            {preview.payableCount} / {preview.officerCount}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Hours Logged</span>
                        <span className="summary-value">{formatHours(totals.hours)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Society Before</span>
                        <span className="summary-value">{formatCurrency(preview.societyBalance)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Society After</span>
                        <span className="summary-value" style={{
                            color: preview.societyAfter < 50000 ? 'var(--status-danger)' : 'var(--status-ok)'
                        }}>
                            {formatCurrency(preview.societyAfter)}
                        </span>
                    </div>
                    <span className="spacer" />
                    <Button variant="ghost" onClick={load}>
                        <I.refresh size={14} /> Refresh
                    </Button>
                    <Button variant="primary" disabled={!preview.canProcess}
                            onClick={() => setConfirmOpen(true)}>
                        <I.play size={14} /> Run Payroll
                    </Button>
                </div>
            </Panel>

            {preview.blockers.length > 0 && (
                <Banner tone="danger">
                    <b>Cannot process:</b>
                    <ul style={{ margin: '.25rem 0 0 1rem', padding: 0 }}>
                        {preview.blockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                </Banner>
            )}

            <div className="stat-grid">
                <Stat label="Base Pay"     value={formatCurrency(totals.base)}  icon={<I.money size={12} />} />
                <Stat label="Division Bonus" value={formatCurrency(totals.div)} icon={<I.shield size={12} />} />
                <Stat label="Bonuses"      value={formatCurrency(totals.bonus)} icon={<I.plus size={12} />} />
                <Stat label="Deductions"   value={formatCurrency(totals.ded)}   icon={<I.minus size={12} />} />
                <Stat label="Total Payout" value={formatCurrency(totals.final)} accent
                      icon={<I.wallet size={12} />} />
            </div>

            <Panel flat>
                <div className="table-wrap" style={{ maxHeight: '60vh' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Officer</th>
                                <th>Rank</th>
                                <th style={{ textAlign: 'right' }}>Hours</th>
                                <th style={{ textAlign: 'right' }}>Ratio</th>
                                <th style={{ textAlign: 'right' }}>Base</th>
                                <th style={{ textAlign: 'right' }}>Div</th>
                                <th style={{ textAlign: 'right' }}>± Adj</th>
                                <th style={{ textAlign: 'right' }}>Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.lines.map((l: PayrollLine) => (
                                <tr key={l.citizenid}>
                                    <td>
                                        <div className="name">
                                            <Avatar first={l.firstName} last={l.lastName} />
                                            <span className="strong">{l.firstName} {l.lastName}</span>
                                        </div>
                                    </td>
                                    <td>{l.rankName}</td>
                                    <td className="num" style={{ textAlign: 'right' }}>{formatHours(l.hours)}</td>
                                    <td className="num" style={{ textAlign: 'right' }}>
                                        {(l.ratio * 100).toFixed(0)}%
                                    </td>
                                    <td className="num" style={{ textAlign: 'right' }}>{formatCurrency(l.basePay)}</td>
                                    <td className="num" style={{ textAlign: 'right' }}>{formatCurrency(l.divisionBonus)}</td>
                                    <td className="num" style={{ textAlign: 'right' }}>
                                        {l.bonuses > 0 && <span style={{ color: 'var(--status-ok)' }}>+{formatCurrency(l.bonuses)} </span>}
                                        {l.deductions > 0 && <span style={{ color: 'var(--status-danger)' }}>-{formatCurrency(l.deductions)}</span>}
                                        {l.bonuses === 0 && l.deductions === 0 && <span className="subtle">—</span>}
                                    </td>
                                    <td className="num strong" style={{ textAlign: 'right' }}>
                                        <b>{formatCurrency(l.finalPay)}</b>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}
                   title="Run Payroll" subtitle="This is a one-shot, audited operation."
                   footer={<>
                       <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                       <Button variant="primary" onClick={runPayroll}>
                           <I.play size={14} /> Yes, Process Payroll
                       </Button>
                   </>}>
                <Banner tone="warn">
                    You are about to withdraw <b>{formatCurrency(totals.final)}</b> from the society
                    account and pay <b>{preview.payableCount}</b> officers.
                    All pending adjustments will be consumed and the current period will close.
                </Banner>
                <div className="summary-row">
                    <div className="summary-item">
                        <span className="summary-label">Payout</span>
                        <span className="summary-value accent">{formatCurrency(totals.final)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Society After</span>
                        <span className="summary-value">{formatCurrency(preview.societyAfter)}</span>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

// ============================================================================
// CORRECTIONS TAB
// ============================================================================
function CorrectionsTab({ toast }: { toast: Toast }) {
    const [data, setData] = useState<{ pending: CorrectionRow[]; resolved: CorrectionRow[] } | null>(null)
    const [busy, setBusy] = useState(false)
    const [noteFor, setNoteFor] = useState<CorrectionRow | null>(null)
    const [noteText, setNoteText] = useState('')
    const [noteKind, setNoteKind] = useState<'approve' | 'deny'>('approve')

    const load = async () => {
        setBusy(true)
        try {
            const r = await apiGetCorrections()
            if (r.ok) setData({ pending: r.pending, resolved: r.resolved })
            else toast('error', 'Failed', r.error)
        } finally { setBusy(false) }
    }
    useEffect(() => { load() }, [])

    const handle = async () => {
        if (!noteFor) return
        const fn = noteKind === 'approve' ? apiApproveCorrection : apiDenyCorrection
        const r = await fn({ id: noteFor.id, note: noteText })
        if (r.ok) {
            toast('ok', noteKind === 'approve' ? 'Approved' : 'Denied')
            setNoteFor(null); setNoteText(''); await load()
        } else { toast('error', 'Failed', r.error) }
    }

    if (busy && !data) return <Loading msg="Loading corrections…" />

    return (
        <div className="col gap-lg">
            <Panel title={<><I.fix size={16} /> Pending Review</>}
                   right={<Chip tone="warn">{data?.pending.length ?? 0}</Chip>}>
                {(!data || data.pending.length === 0) ? (
                    <Empty icon={<I.check size={20} />} title="All caught up"
                           sub="No correction requests waiting for review." />
                ) : (
                    <div className="col" style={{ gap: '.5rem' }}>
                        {data.pending.map(c => (
                            <div key={c.id} className="panel" style={{ padding: '.9rem 1.1rem' }}>
                                <div className="row" style={{ alignItems: 'flex-start', gap: '.75rem' }}>
                                    <Avatar first={c.first_name} last={c.last_name} lg />
                                    <div className="grow">
                                        <div className="strong">
                                            {c.first_name} {c.last_name}
                                            <span className="subtle" style={{ marginLeft: '.5rem' }}>
                                                • grade {c.grade}
                                            </span>
                                        </div>
                                        <div className="subtle" style={{ fontSize: '.78rem', marginTop: '.2rem' }}>
                                            Requesting: {formatDateTime(c.requested_in)} → {formatDateTime(c.requested_out)}
                                        </div>
                                        <div style={{ marginTop: '.5rem', fontSize: '.88rem' }}>
                                            "{c.reason}"
                                        </div>
                                        <div className="subtle" style={{ fontSize: '.72rem', marginTop: '.3rem' }}>
                                            Submitted {formatRelative(c.created_at)}
                                        </div>
                                    </div>
                                    <div className="col" style={{ gap: '.35rem' }}>
                                        <Button variant="primary" size="sm"
                                                onClick={() => { setNoteFor(c); setNoteKind('approve'); setNoteText('') }}>
                                            <I.check size={14} /> Approve
                                        </Button>
                                        <Button variant="danger" size="sm"
                                                onClick={() => { setNoteFor(c); setNoteKind('deny'); setNoteText('') }}>
                                            <I.x size={14} /> Deny
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel title={<><I.history size={16} /> Resolved</>}>
                {(!data || data.resolved.length === 0) ? (
                    <Empty title="No history yet" />
                ) : (
                    <div className="col">
                        {data.resolved.map(c => (
                            <div key={c.id} className="adjustment-row">
                                <Chip tone={c.status === 'approved' ? 'ok' : 'danger'}>{c.status}</Chip>
                                <div className="grow">
                                    <div className="strong" style={{ fontSize: '.86rem' }}>
                                        {c.first_name} {c.last_name}
                                    </div>
                                    <div className="subtle" style={{ fontSize: '.74rem' }}>
                                        {formatDateTime(c.requested_in)} → {formatDateTime(c.requested_out)}
                                        {c.review_note ? ` · "${c.review_note}"` : ''}
                                    </div>
                                </div>
                                <span className="subtle" style={{ fontSize: '.72rem' }}>
                                    {formatRelative(c.reviewed_at ?? c.created_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Modal open={!!noteFor} onClose={() => setNoteFor(null)}
                   title={noteKind === 'approve' ? 'Approve Correction' : 'Deny Correction'}
                   subtitle={noteFor ? `${noteFor.first_name} ${noteFor.last_name}` : undefined}
                   footer={<>
                       <Button variant="ghost" onClick={() => setNoteFor(null)}>Cancel</Button>
                       <Button variant={noteKind === 'approve' ? 'primary' : 'danger'} onClick={handle}>
                           {noteKind === 'approve' ? 'Approve' : 'Deny'}
                       </Button>
                   </>}>
                {noteFor && (
                    <>
                        <Banner tone={noteKind === 'approve' ? 'ok' : 'danger'}>
                            {noteKind === 'approve'
                                ? 'Approving adds a synthetic session to the officer\'s timecard for this period.'
                                : 'Denying rejects the request. The officer will see your note.'}
                        </Banner>
                        <div className="field">
                            <label className="field-label">Reviewer Note (optional)</label>
                            <textarea className="textarea" rows={3}
                                      value={noteText} onChange={e => setNoteText(e.target.value)} />
                        </div>
                    </>
                )}
            </Modal>
        </div>
    )
}

// ============================================================================
// AUDIT LOG
// ============================================================================
function AuditTab() {
    const [entries, setEntries] = useState<AuditRow[] | null>(null)

    useEffect(() => {
        apiGetAuditLog(200).then(r => r.ok && setEntries(r.entries))
    }, [])

    if (!entries) return <Loading msg="Loading audit log…" />

    return (
        <div className="col gap-lg">
            <Panel title={<><I.log size={16} /> Audit Log</>}
                   right={<Chip>{entries.length}</Chip>}>
                {entries.length === 0 ? (
                    <Empty title="No entries yet" />
                ) : (
                    <div className="audit-list">
                        {entries.map(e => <AuditEntry key={e.id} e={e} />)}
                    </div>
                )}
            </Panel>
        </div>
    )
}

function AuditEntry({ e }: { e: AuditRow }) {
    const ico =
        e.action.startsWith('clock_')        ? <I.clock size={14} /> :
        e.action.startsWith('payroll')       ? <I.money size={14} /> :
        e.action.startsWith('adjustment')    ? <I.bolt size={14} /> :
        e.action.startsWith('correction')    ? <I.fix size={14} /> :
        e.action.startsWith('override')      ? <I.wallet size={14} /> :
        e.action.startsWith('divisions')     ? <I.shield size={14} /> :
        <I.info size={14} />
    const details = typeof e.details === 'object' && e.details !== null
        ? Object.entries(e.details as Record<string, unknown>)
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' · ')
        : (typeof e.details === 'string' ? e.details : '')
    return (
        <div className="audit-entry">
            <div className="audit-ico">{ico}</div>
            <div>
                <div style={{ fontSize: '.86rem' }}>
                    <b>{e.actor_name ?? 'System'}</b>
                    <span className="subtle"> · </span>
                    <span>{titleCase(e.action)}</span>
                    {e.target_cid && (
                        <>
                            <span className="subtle"> · target </span>
                            <span className="mono">{e.target_cid}</span>
                        </>
                    )}
                </div>
                {details && (
                    <div className="subtle" style={{ fontSize: '.74rem', marginTop: '.15rem' }}>
                        {details}
                    </div>
                )}
            </div>
            <span className="audit-when">{formatRelative(e.created_at)}</span>
        </div>
    )
}
