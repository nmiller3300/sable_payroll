// ============================================================================
// src/lib/mockApi.ts
// Rich dev fixtures so the UI is fully explorable in a browser without FiveM.
// Mutations update the fixtures in-memory so you can actually test workflows
// end-to-end against the mocks.
// ============================================================================

import type {
    Adjustment,
    AuditRow,
    CorrectionRow,
    RosterRow,
    Snapshot,
    DivisionDef,
    PayrollHistoryRow,
    OfficerPayrollRow,
    DepartmentBrand,
} from '../types/api'

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const BRAND: DepartmentBrand = {
    id: 'SASP',
    name: 'San Andreas State Police',
    color: '#0A2540',
    accent: '#C9A227',
    divisions: [
        { id: 'K9',    name: 'K-9 Unit' },
        { id: 'SWAT',  name: 'Special Response Team' },
        { id: 'AIR',   name: 'Air Support' },
        { id: 'MOTOR', name: 'Motorcycle Division' },
        { id: 'TRAIN', name: 'Training Cadre' },
        { id: 'IA',    name: 'Internal Affairs' },
    ],
}

let adjustmentIdSeq = 100
let auditIdSeq = 500
let correctionIdSeq = 50

const roster: RosterRow[] = [
    {
        citizenid: 'CID-001', firstName: 'Marcus', lastName: 'Harlow', badge: '1042',
        grade: 14, jobName: 'police', rankName: 'Colonel', divisions: ['IA'],
        annual: 195000, perRunMax: 1875, hasOverride: false,
        onDuty: true, periodHours: 18.3, pendingBonus: 0, pendingDed: 0,
        lifetimeHours: 842.5, lifetimePay: 1425300, lastSeenAt: '2026-04-15 18:41:00',
    },
    {
        citizenid: 'CID-002', firstName: 'Dana', lastName: 'Reyes', badge: '2117',
        grade: 12, jobName: 'police', rankName: 'Commander', divisions: ['SWAT', 'TRAIN'],
        annual: 158000, perRunMax: 1519, hasOverride: false,
        onDuty: true, periodHours: 21.0, pendingBonus: 500, pendingDed: 0,
        lifetimeHours: 610.0, lifetimePay: 921800, lastSeenAt: '2026-04-16 03:12:00',
    },
    {
        citizenid: 'CID-003', firstName: 'Kai', lastName: 'Okafor', badge: '3201',
        grade: 10, jobName: 'police', rankName: 'Captain', divisions: ['K9'],
        annual: 128000, perRunMax: 1231, hasOverride: false,
        onDuty: false, periodHours: 14.8, pendingBonus: 0, pendingDed: 0,
        lifetimeHours: 412.2, lifetimePay: 511400, lastSeenAt: '2026-04-15 22:55:00',
    },
    {
        citizenid: 'CID-004', firstName: 'Elena', lastName: 'Vossen', badge: '4588',
        grade: 9, jobName: 'police', rankName: 'Lieutenant', divisions: ['AIR'],
        annual: 115000, perRunMax: 1106, hasOverride: true, overrideReason: 'Disciplinary cut — conduct review Mar 2026',
        onDuty: false, periodHours: 11.5, pendingBonus: 0, pendingDed: 300,
        lifetimeHours: 288.1, lifetimePay: 302450, lastSeenAt: '2026-04-14 14:01:00',
    },
    {
        citizenid: 'CID-005', firstName: 'Tomas', lastName: 'Bright', badge: '5103',
        grade: 7, jobName: 'police', rankName: 'Sergeant', divisions: ['MOTOR'],
        annual: 93000, perRunMax: 894, hasOverride: false,
        onDuty: true, periodHours: 20.5, pendingBonus: 0, pendingDed: 0,
        lifetimeHours: 201.0, lifetimePay: 178900, lastSeenAt: '2026-04-16 04:02:00',
    },
    {
        citizenid: 'CID-006', firstName: 'Priya', lastName: 'Nandi', badge: '6270',
        grade: 6, jobName: 'police', rankName: 'Corporal', divisions: [],
        annual: 86000, perRunMax: 827, hasOverride: false,
        onDuty: true, periodHours: 17.2, pendingBonus: 250, pendingDed: 0,
        lifetimeHours: 142.3, lifetimePay: 116500, lastSeenAt: '2026-04-16 02:30:00',
    },
    {
        citizenid: 'CID-007', firstName: 'Jude', lastName: 'Ashworth', badge: '7044',
        grade: 4, jobName: 'police', rankName: 'Senior Trooper', divisions: ['TRAIN'],
        annual: 75000, perRunMax: 721, hasOverride: false,
        onDuty: false, periodHours: 9.0, pendingBonus: 0, pendingDed: 0,
        lifetimeHours: 88.4, lifetimePay: 62300, lastSeenAt: '2026-04-15 12:18:00',
    },
    {
        citizenid: 'CID-008', firstName: 'Noa', lastName: 'Halvers', badge: '8022',
        grade: 2, jobName: 'police', rankName: 'Trooper II', divisions: [],
        annual: 65000, perRunMax: 625, hasOverride: false,
        onDuty: false, periodHours: 5.5, pendingBonus: 0, pendingDed: 0,
        lifetimeHours: 21.0, lifetimePay: 12400, lastSeenAt: '2026-04-13 20:01:00',
    },
    {
        citizenid: 'CID-009', firstName: 'Rafi', lastName: 'Chen', badge: '9155',
        grade: 1, jobName: 'police', rankName: 'Trooper I', divisions: [],
        annual: 60000, perRunMax: 577, hasOverride: false,
        onDuty: true, periodHours: 16.0, pendingBonus: 0, pendingDed: 150,
        lifetimeHours: 14.0, lifetimePay: 6200, lastSeenAt: '2026-04-16 03:48:00',
    },
    {
        citizenid: 'CID-010', firstName: 'Sana', lastName: 'Pereira', badge: null,
        grade: 0, jobName: 'police', rankName: 'Recruit', divisions: [],
        annual: 55000, perRunMax: 529, hasOverride: false,
        onDuty: false, periodHours: 2.0, pendingBonus: 0, pendingDed: 0,
        lifetimeHours: 2.0, lifetimePay: 0, lastSeenAt: '2026-04-14 09:03:00',
    },
]

const adjustments: Adjustment[] = [
    {
        id: 1, citizenid: 'CID-002', department: 'SASP', kind: 'bonus',
        amount: 500, reason: 'Closed the warehouse case — excellent leadership',
        created_by: 'CID-001', created_at: '2026-04-15 22:01:00', consumed: 0,
    },
    {
        id: 2, citizenid: 'CID-004', department: 'SASP', kind: 'disciplinary',
        amount: 300, reason: 'Improper use of force — secondary review pending',
        created_by: 'CID-001', created_at: '2026-04-14 10:15:00', consumed: 0,
    },
    {
        id: 3, citizenid: 'CID-006', department: 'SASP', kind: 'bonus',
        amount: 250, reason: 'Took over training duties while FTO was out',
        created_by: 'CID-002', created_at: '2026-04-15 19:44:00', consumed: 0,
    },
    {
        id: 4, citizenid: 'CID-009', department: 'SASP', kind: 'deduction',
        amount: 150, reason: 'Vehicle damage — impact at intersection (see incident #221)',
        created_by: 'CID-002', created_at: '2026-04-15 14:02:00', consumed: 0,
    },
]

const corrections: CorrectionRow[] = [
    {
        id: 1, citizenid: 'CID-005', department: 'SASP', status: 'pending',
        requested_in: '2026-04-14 18:00:00', requested_out: '2026-04-14 22:30:00',
        reason: 'Tablet froze during shift — punched in verbally on radio',
        created_at: '2026-04-15 09:00:00',
        first_name: 'Tomas', last_name: 'Bright', grade: 7, job_name: 'police',
    },
    {
        id: 2, citizenid: 'CID-007', department: 'SASP', status: 'pending',
        requested_in: '2026-04-13 14:00:00', requested_out: '2026-04-13 18:15:00',
        reason: 'Forgot to clock out after shift handoff',
        created_at: '2026-04-14 08:45:00',
        first_name: 'Jude', last_name: 'Ashworth', grade: 4, job_name: 'police',
    },
    {
        id: 3, citizenid: 'CID-003', department: 'SASP', status: 'approved',
        requested_in: '2026-04-10 20:00:00', requested_out: '2026-04-11 00:00:00',
        reason: 'Server crash during K9 callout',
        created_at: '2026-04-11 09:12:00',
        reviewed_by: 'CID-001', reviewed_at: '2026-04-11 15:30:00',
        review_note: 'Verified with dispatch log.',
        first_name: 'Kai', last_name: 'Okafor', grade: 10, job_name: 'police',
    },
]

const audit: AuditRow[] = [
    {
        id: 1, actor_cid: 'CID-001', actor_name: 'Marcus Harlow',
        action: 'payroll_process', target_cid: null,
        details: { period: 14, payable: 9, total: 9247, lineCount: 10 },
        created_at: '2026-04-13 23:00:00',
    },
    {
        id: 2, actor_cid: 'CID-002', actor_name: 'Dana Reyes',
        action: 'adjustment_apply', target_cid: 'CID-006',
        details: { kind: 'bonus', amount: 250, reason: 'Took over training duties while FTO was out' },
        created_at: '2026-04-15 19:44:00',
    },
    {
        id: 3, actor_cid: 'CID-001', actor_name: 'Marcus Harlow',
        action: 'override_set', target_cid: 'CID-004',
        details: { annual: 115000, reason: 'Disciplinary cut — conduct review Mar 2026' },
        created_at: '2026-03-18 11:00:00',
    },
    {
        id: 4, actor_cid: 'CID-001', actor_name: 'Marcus Harlow',
        action: 'correction_approve', target_cid: 'CID-003',
        details: { id: 3, in_: '2026-04-10 20:00:00', out: '2026-04-11 00:00:00', note: 'Verified with dispatch log.' },
        created_at: '2026-04-11 15:30:00',
    },
    {
        id: 5, actor_cid: 'CID-001', actor_name: 'Marcus Harlow',
        action: 'divisions_set', target_cid: 'CID-002',
        details: { divisions: ['SWAT', 'TRAIN'] },
        created_at: '2026-04-05 16:22:00',
    },
]

const history: PayrollHistoryRow[] = [
    { period_id: 14, opened_at: '2026-04-07 00:00:00', closed_at: '2026-04-13 23:00:00',
      processed_by: 'CID-001', line_count: 10, total_paid: 9247, total_hours: 142.3 },
    { period_id: 13, opened_at: '2026-03-31 00:00:00', closed_at: '2026-04-06 22:40:00',
      processed_by: 'CID-001', line_count: 9,  total_paid: 8612, total_hours: 128.0 },
    { period_id: 12, opened_at: '2026-03-24 00:00:00', closed_at: '2026-03-30 23:15:00',
      processed_by: 'CID-002', line_count: 10, total_paid: 10120, total_hours: 155.5 },
]

const myPayrollHistory: OfficerPayrollRow[] = [
    { id: 101, period_id: 14, citizenid: 'CID-002', department: 'SASP',
      hours: 19.5, ratio: 0.975, annual: 158000, per_run_max: 1519,
      base_pay: 1481, division_bonus: 296, bonuses: 0, deductions: 0, final_pay: 1777,
      processed_at: '2026-04-13 23:00:00', processed_by: 'CID-001', closed_at: '2026-04-13 23:00:00' },
    { id: 92,  period_id: 13, citizenid: 'CID-002', department: 'SASP',
      hours: 22.0, ratio: 1.0, annual: 158000, per_run_max: 1519,
      base_pay: 1519, division_bonus: 303, bonuses: 500, deductions: 0, final_pay: 2322,
      processed_at: '2026-04-06 22:40:00', processed_by: 'CID-001', closed_at: '2026-04-06 22:40:00' },
    { id: 80,  period_id: 12, citizenid: 'CID-002', department: 'SASP',
      hours: 17.0, ratio: 0.85, annual: 158000, per_run_max: 1519,
      base_pay: 1291, division_bonus: 258, bonuses: 0, deductions: 0, final_pay: 1549,
      processed_at: '2026-03-30 23:15:00', processed_by: 'CID-002', closed_at: '2026-03-30 23:15:00' },
]

const myCorrections: CorrectionRow[] = [
    {
        id: 40, citizenid: 'CID-002', department: 'SASP', status: 'approved',
        requested_in: '2026-03-28 14:00:00', requested_out: '2026-03-28 18:30:00',
        reason: 'Crashed to desktop mid-shift',
        created_at: '2026-03-29 09:00:00',
        reviewed_by: 'CID-001', reviewed_at: '2026-03-29 14:00:00',
        review_note: 'Confirmed.',
    },
]

let societyBalance = 48500

// Current-user identity (who "you" are in dev mode). Swap this to explore
// player vs command views without changing code.
export const DEV_USER_CID = 'CID-002' // Dana Reyes, Commander (command view)
// Swap to 'CID-005' or similar to see the player view.

function byCid(cid: string) {
    return roster.find((r) => r.citizenid === cid)
}

function buildSnapshotFor(cid: string): Snapshot | null {
    const me = byCid(cid)
    if (!me) return null

    const myAdj = adjustments.filter((a) => a.citizenid === cid && a.consumed === 0)
    const bonuses = myAdj.filter((a) => a.kind === 'bonus').reduce((s, a) => s + a.amount, 0)
    const ded     = myAdj.filter((a) => a.kind !== 'bonus').reduce((s, a) => s + a.amount, 0)

    const threshold = 20
    const ratio = Math.min(me.periodHours / threshold, 1)
    const base = Math.floor(me.perRunMax * ratio)
    const div  = Math.floor(me.perRunMax * 0.10 * me.divisions.length * ratio)
    const pendingPay = Math.max(0, base + div + bonuses - ded)

    const isCommand = me.grade >= 12

    return {
        isCommand,
        department: BRAND,
        profile: {
            citizenid: me.citizenid, department: 'SASP',
            jobName: 'police', grade: me.grade, rankName: me.rankName,
            firstName: me.firstName, lastName: me.lastName, badge: me.badge,
            hiredAt: '2025-01-12 10:00:00', lastSeenAt: me.lastSeenAt,
            lifetimeHours: me.lifetimeHours, lifetimePay: me.lifetimePay,
            active: true, annual: me.annual, perRunMax: me.perRunMax,
            hasOverride: me.hasOverride, overrideReason: me.overrideReason,
            divisions: me.divisions,
        },
        onDuty: me.onDuty,
        clockInAt: me.onDuty ? '2026-04-16 00:30:00' : null,
        periodHours: me.periodHours,
        threshold,
        ratio,
        pendingPay,
        pendingAdj: myAdj,
        history: cid === 'CID-002' ? myPayrollHistory : [],
        corrections: cid === 'CID-002' ? myCorrections : [],
        config: { runsPerYear: 104, divBonusPct: 0.10, afkMinutes: 15 },
    }
}

// ---------------------------------------------------------------------------
// Preview builder (mirrors the server math so devs see realistic numbers)
// ---------------------------------------------------------------------------

function buildPreview() {
    const threshold = 20
    const lines = roster.map((r) => {
        const myAdj = adjustments.filter((a) => a.citizenid === r.citizenid && a.consumed === 0)
        const bonuses = myAdj.filter((a) => a.kind === 'bonus').reduce((s, a) => s + a.amount, 0)
        const ded     = myAdj.filter((a) => a.kind !== 'bonus').reduce((s, a) => s + a.amount, 0)
        const ratio   = Math.min(r.periodHours / threshold, 1)
        const base    = Math.floor(r.perRunMax * ratio)
        const div     = Math.floor(r.perRunMax * 0.10 * r.divisions.length * ratio)
        const final   = Math.max(0, base + div + bonuses - ded)
        return {
            citizenid: r.citizenid, firstName: r.firstName, lastName: r.lastName,
            rankName: r.rankName, grade: r.grade, jobName: r.jobName,
            divisions: r.divisions, hours: r.periodHours, annual: r.annual,
            hasOverride: r.hasOverride, perRunMax: r.perRunMax, ratio: +ratio.toFixed(4),
            basePay: base, divisionBonus: div, bonuses, deductions: ded,
            finalPay: final, adjustments: myAdj,
        }
    }).sort((a, b) => b.finalPay - a.finalPay)

    const totals = lines.reduce(
        (acc, l) => ({
            base: acc.base + l.basePay, div: acc.div + l.divisionBonus,
            bonus: acc.bonus + l.bonuses, ded: acc.ded + l.deductions,
            final: acc.final + l.finalPay, hours: acc.hours + l.hours,
        }),
        { base: 0, div: 0, bonus: 0, ded: 0, final: 0, hours: 0 },
    )

    const afterSociety = societyBalance - totals.final
    const maxPayout    = Math.floor(societyBalance * 0.80)
    const blockers: string[] = []
    if (afterSociety < 50000) {
        blockers.push(`Society would drop below reserve (${afterSociety} < 50000)`)
    }
    if (totals.final > maxPayout) {
        blockers.push(`Payout exceeds 80% of society (${totals.final} > ${maxPayout})`)
    }

    return {
        preview: {
            department: 'SASP' as const,
            lines,
            totals,
            officerCount: roster.length,
            payableCount: lines.filter((l) => l.finalPay > 0).length,
            societyBalance,
            societyAfter: afterSociety,
            maxPayout,
            canProcess: blockers.length === 0 && totals.final > 0,
            blockers,
        },
    }
}

// ---------------------------------------------------------------------------
// Handler dispatch table — keyed by the callback event name used in api.ts
// ---------------------------------------------------------------------------

export const mockApi: Record<string, (data?: any) => unknown> = {

    // ---- player ----
    refresh: () => {
        const snap = buildSnapshotFor(DEV_USER_CID)
        return snap ? { ok: true, ...snap } : { ok: false, error: 'no_employee' }
    },

    clockIn: () => {
        const me = byCid(DEV_USER_CID)
        if (me) { me.onDuty = true }
        return { ok: true }
    },

    clockOut: () => {
        const me = byCid(DEV_USER_CID)
        if (me) { me.onDuty = false }
        return { ok: true }
    },

    submitCorrection: (p: { requestedIn: string; requestedOut: string; reason: string }) => {
        const id = ++correctionIdSeq
        corrections.push({
            id, citizenid: DEV_USER_CID, department: 'SASP',
            status: 'pending',
            requested_in: p.requestedIn, requested_out: p.requestedOut,
            reason: p.reason, created_at: new Date().toISOString(),
        })
        return { ok: true, id }
    },

    // ---- command ----
    getRoster: () => ({
        ok: true,
        roster,
        onDutyCount: roster.filter((r) => r.onDuty).length,
        society: societyBalance,
        divisions: BRAND.divisions,
    }),

    getPayrollPreview: () => ({ ok: true, ...buildPreview() }),

    processPayroll: (p: { confirm: string }) => {
        if (p?.confirm !== 'CONFIRM') {
            return { ok: false, error: 'confirmation_required' }
        }
        const pv = buildPreview().preview
        if (!pv.canProcess) {
            return { ok: false, error: pv.blockers.join('; ') }
        }
        // "pay" the society
        societyBalance -= pv.totals.final
        // consume adjustments
        adjustments.forEach((a) => {
            if (a.consumed === 0) { a.consumed = 1; a.consumed_at = new Date().toISOString() }
        })
        // reset hours (close period)
        roster.forEach((r) => { r.periodHours = 0; r.pendingBonus = 0; r.pendingDed = 0 })
        history.unshift({
            period_id: (history[0]?.period_id ?? 0) + 1,
            opened_at: new Date().toISOString(),
            closed_at: new Date().toISOString(),
            processed_by: DEV_USER_CID,
            line_count: pv.officerCount,
            total_paid: pv.totals.final,
            total_hours: pv.totals.hours,
        })
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'payroll_process', target_cid: null,
            details: { period: history[0].period_id, total: pv.totals.final },
            created_at: new Date().toISOString(),
        })
        return {
            ok: true,
            summary: {
                periodId: history[0].period_id,
                totalPaid: pv.totals.final,
                officerCount: pv.officerCount,
                payableCount: pv.payableCount,
                societyAfter: societyBalance,
            },
        }
    },

    applyAdjustment: (p: { targetCid: string; kind: Adjustment['kind']; amount: number; reason: string }) => {
        const id = ++adjustmentIdSeq
        adjustments.push({
            id, citizenid: p.targetCid, department: 'SASP',
            kind: p.kind, amount: Math.floor(p.amount), reason: p.reason,
            created_by: DEV_USER_CID, created_at: new Date().toISOString(), consumed: 0,
        })
        // update roster pending totals
        const r = byCid(p.targetCid)
        if (r) {
            if (p.kind === 'bonus') r.pendingBonus += p.amount
            else r.pendingDed += p.amount
        }
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'adjustment_apply', target_cid: p.targetCid,
            details: { kind: p.kind, amount: p.amount, reason: p.reason },
            created_at: new Date().toISOString(),
        })
        return { ok: true, id }
    },

    removeAdjustment: (p: { id: number }) => {
        const idx = adjustments.findIndex((a) => a.id === p.id)
        if (idx < 0) return { ok: false, error: 'not_found' }
        const a = adjustments[idx]
        if (a.consumed) return { ok: false, error: 'already_consumed' }
        adjustments.splice(idx, 1)
        const r = byCid(a.citizenid)
        if (r) {
            if (a.kind === 'bonus') r.pendingBonus -= a.amount
            else r.pendingDed -= a.amount
        }
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'adjustment_remove', target_cid: a.citizenid,
            details: { kind: a.kind, amount: a.amount },
            created_at: new Date().toISOString(),
        })
        return { ok: true }
    },

    setPayOverride: (p: { targetCid: string; annual: number; reason: string }) => {
        const r = byCid(p.targetCid)
        if (!r) return { ok: false, error: 'not_found' }
        r.hasOverride = true
        r.overrideReason = p.reason
        r.annual = Math.floor(p.annual)
        r.perRunMax = Math.floor(p.annual / 104)
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'override_set', target_cid: p.targetCid,
            details: { annual: p.annual, reason: p.reason },
            created_at: new Date().toISOString(),
        })
        return { ok: true }
    },

    removePayOverride: (p: { targetCid: string }) => {
        const r = byCid(p.targetCid)
        if (!r) return { ok: false, error: 'not_found' }
        r.hasOverride = false
        r.overrideReason = null
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'override_remove', target_cid: p.targetCid, details: {},
            created_at: new Date().toISOString(),
        })
        return { ok: true }
    },

    setDivision: (p: { targetCid: string; divisions: string[] }) => {
        const r = byCid(p.targetCid)
        if (!r) return { ok: false, error: 'not_found' }
        const valid = new Set(BRAND.divisions.map((d) => d.id))
        r.divisions = p.divisions.filter((d) => valid.has(d))
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'divisions_set', target_cid: p.targetCid,
            details: { divisions: r.divisions },
            created_at: new Date().toISOString(),
        })
        return { ok: true, divisions: r.divisions }
    },

    getOfficerAdjustments: (p: { targetCid: string }) => ({
        ok: true, adjustments: adjustments.filter((a) => a.citizenid === p.targetCid && a.consumed === 0),
    }),

    getCorrections: () => ({
        ok: true,
        pending:  corrections.filter((c) => c.status === 'pending'),
        resolved: corrections.filter((c) => c.status !== 'pending').slice(0, 25),
    }),

    approveCorrection: (p: { id: number; note?: string }) => {
        const c = corrections.find((x) => x.id === p.id)
        if (!c) return { ok: false, error: 'not_found' }
        if (c.status !== 'pending') return { ok: false, error: 'already_resolved' }
        c.status = 'approved'
        c.reviewed_by = DEV_USER_CID
        c.reviewed_at = new Date().toISOString()
        c.review_note = p.note || null
        // Add hours to the officer's period
        const reqIn = new Date(c.requested_in).getTime()
        const reqOut = new Date(c.requested_out).getTime()
        const hours = Math.max(0, (reqOut - reqIn) / 3_600_000)
        const r = byCid(c.citizenid)
        if (r) r.periodHours = +(r.periodHours + hours).toFixed(2)
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'correction_approve', target_cid: c.citizenid,
            details: { id: c.id, note: p.note },
            created_at: new Date().toISOString(),
        })
        return { ok: true }
    },

    denyCorrection: (p: { id: number; note?: string }) => {
        const c = corrections.find((x) => x.id === p.id)
        if (!c) return { ok: false, error: 'not_found' }
        if (c.status !== 'pending') return { ok: false, error: 'already_resolved' }
        c.status = 'denied'
        c.reviewed_by = DEV_USER_CID
        c.reviewed_at = new Date().toISOString()
        c.review_note = p.note || null
        audit.unshift({
            id: ++auditIdSeq, actor_cid: DEV_USER_CID, actor_name: 'Dev User',
            action: 'correction_deny', target_cid: c.citizenid,
            details: { id: c.id, note: p.note },
            created_at: new Date().toISOString(),
        })
        return { ok: true }
    },

    getAuditLog: (p: { limit?: number }) => ({
        ok: true, entries: audit.slice(0, p?.limit ?? 100),
    }),

    getPayrollHistory: (p: { limit?: number }) => ({
        ok: true, history: history.slice(0, p?.limit ?? 20),
    }),
}
