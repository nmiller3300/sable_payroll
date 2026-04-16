// ============================================================================
// src/types/api.ts
// Shape definitions for every payload returned from server/main.lua.
// Keep in lockstep with the Lua callbacks — if you add a field server-side,
// add it here too.
// ============================================================================

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------

export type DepartmentId = 'SASP' | 'BCSO' | 'RCSO' | 'LSPD'

export type AdjustmentKind = 'bonus' | 'deduction' | 'disciplinary'

export interface DivisionDef {
    id: string
    name: string
}

export interface DepartmentBrand {
    id: DepartmentId
    name: string
    color: string
    accent: string
    divisions: DivisionDef[]
}

// ---------------------------------------------------------------------------
// Adjustments & corrections
// ---------------------------------------------------------------------------

export interface Adjustment {
    id: number
    citizenid: string
    department: DepartmentId
    kind: AdjustmentKind
    amount: number
    reason: string
    created_by: string
    created_at: string
    consumed: 0 | 1
    consumed_at?: string | null
    period_id?: number | null
}

export type CorrectionStatus = 'pending' | 'approved' | 'denied'

export interface CorrectionRow {
    id: number
    citizenid: string
    department: DepartmentId
    requested_in: string
    requested_out: string
    reason: string
    status: CorrectionStatus
    reviewed_by?: string | null
    reviewed_at?: string | null
    review_note?: string | null
    created_at: string
    // Join columns (only present on command-view queries)
    first_name?: string
    last_name?: string
    grade?: number
    job_name?: string
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export interface EmployeeProfile {
    citizenid: string
    department: DepartmentId
    jobName: string
    grade: number
    rankName: string
    firstName: string
    lastName: string
    badge?: string | null
    hiredAt?: string | null
    lastSeenAt?: string | null
    lifetimeHours: number
    lifetimePay: number
    active: boolean
    annual: number
    perRunMax: number
    hasOverride: boolean
    overrideReason?: string | null
    divisions: string[]
}

export interface RosterRow {
    citizenid: string
    firstName: string
    lastName: string
    badge?: string | null
    grade: number
    jobName: string
    rankName: string
    divisions: string[]
    annual: number
    perRunMax: number
    hasOverride: boolean
    overrideReason?: string | null
    onDuty: boolean
    periodHours: number
    pendingBonus: number
    pendingDed: number
    lifetimeHours: number
    lifetimePay: number
    lastSeenAt?: string | null
}

// ---------------------------------------------------------------------------
// Payroll preview / process
// ---------------------------------------------------------------------------

export interface PayrollLine {
    citizenid: string
    firstName: string
    lastName: string
    rankName: string
    grade: number
    jobName: string
    divisions: string[]
    hours: number
    annual: number
    hasOverride: boolean
    perRunMax: number
    ratio: number
    basePay: number
    divisionBonus: number
    bonuses: number
    deductions: number
    finalPay: number
    adjustments: Adjustment[]
}

export interface PayrollTotals {
    base: number
    div: number
    bonus: number
    ded: number
    final: number
    hours: number
}

export interface PayrollPreview {
    department: DepartmentId
    lines: PayrollLine[]
    totals: PayrollTotals
    officerCount: number
    payableCount: number
    societyBalance: number
    societyAfter: number
    maxPayout: number
    canProcess: boolean
    blockers: string[]
}

export interface ProcessSummary {
    periodId: number
    totalPaid: number
    officerCount: number
    payableCount: number
    societyAfter: number
}

export interface PayrollHistoryRow {
    period_id: number
    opened_at: string
    closed_at: string
    processed_by: string
    line_count: number
    total_paid: number
    total_hours: number
}

export interface OfficerPayrollRow {
    id: number
    period_id: number
    citizenid: string
    department: DepartmentId
    hours: number
    ratio: number
    annual: number
    per_run_max: number
    base_pay: number
    division_bonus: number
    bonuses: number
    deductions: number
    final_pay: number
    processed_at: string
    processed_by: string
    closed_at: string
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditRow {
    id: number
    actor_cid?: string | null
    actor_name?: string | null
    action: string
    target_cid?: string | null
    details?: unknown
    created_at: string
}

// ---------------------------------------------------------------------------
// Full snapshot returned by `refresh`
// ---------------------------------------------------------------------------

export interface SnapshotConfig {
    runsPerYear: number
    divBonusPct: number
    afkMinutes: number
}

export interface Snapshot {
    isCommand: boolean
    department: DepartmentBrand
    profile: EmployeeProfile
    onDuty: boolean
    clockInAt?: string | null
    periodHours: number
    threshold: number
    ratio: number
    pendingPay: number
    pendingAdj: Adjustment[]
    history: OfficerPayrollRow[]
    corrections: CorrectionRow[]
    config: SnapshotConfig
}

// Every server callback returns either { ok: true, ...data } or { ok: false, error }.
export type ApiResult<T> = ({ ok: true; error?: undefined } & T) | { ok: false; error: string }

// Convenience aliases for the specific callback return shapes.
export type RefreshResult            = ApiResult<Snapshot>
export type RosterResult             = ApiResult<{
    roster: RosterRow[]
    onDutyCount: number
    society: number
    divisions: DivisionDef[]
}>
export type PayrollPreviewResult     = ApiResult<{ preview: PayrollPreview }>
export type ProcessResult            = ApiResult<{ summary: ProcessSummary | null }>
export type GenericResult            = ApiResult<Record<string, unknown>>
export type OfficerAdjustmentsResult = ApiResult<{ adjustments: Adjustment[] }>
export type CorrectionsResult        = ApiResult<{
    pending: CorrectionRow[]
    resolved: CorrectionRow[]
}>
export type AuditResult              = ApiResult<{ entries: AuditRow[] }>
export type HistoryResult            = ApiResult<{ history: PayrollHistoryRow[] }>

// ---------------------------------------------------------------------------
// Toast (client push)
// ---------------------------------------------------------------------------

export interface ToastPayload {
    kind: 'info' | 'ok' | 'success' | 'warning' | 'error'
    title: string
    message?: string
}
