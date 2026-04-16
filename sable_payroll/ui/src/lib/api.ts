// ============================================================================
// src/lib/api.ts
// Typed wrapper around LB Tablet's globalThis.fetchNui.
// In browser dev mode (no invokeNative), returns rich mock fixtures so the
// UI is fully explorable without the game running.
// ============================================================================

import type {
    AuditResult,
    CorrectionsResult,
    GenericResult,
    HistoryResult,
    OfficerAdjustmentsResult,
    PayrollPreviewResult,
    ProcessResult,
    RefreshResult,
    RosterResult,
} from '../types/api'

import { mockApi } from './mockApi'

const isDev = typeof window !== 'undefined' && !(window as any).invokeNative

async function call<T>(event: string, data?: unknown): Promise<T> {
    if (isDev) {
        const handler = mockApi[event]
        if (!handler) {
            throw new Error(`[sable mock] no handler for '${event}'`)
        }
        await new Promise((r) => setTimeout(r, 120))
        return handler(data) as T
    }

    if (typeof globalThis.fetchNui !== 'function') {
        throw new Error('fetchNui is not available on globalThis')
    }
    return globalThis.fetchNui<T>(event, data)
}

// --- Player ----------------------------------------------------------------

export const apiRefresh          = () => call<RefreshResult>('refresh')
export const apiClockIn          = () => call<GenericResult>('clockIn')
export const apiClockOut         = () => call<GenericResult>('clockOut')
export const apiSubmitCorrection = (p: {
    requestedIn: string
    requestedOut: string
    reason: string
}) => call<GenericResult>('submitCorrection', p)

// --- Command ---------------------------------------------------------------

export const apiGetRoster      = () => call<RosterResult>('getRoster')
export const apiPayrollPreview = () => call<PayrollPreviewResult>('getPayrollPreview')
export const apiProcessPayroll = (confirm: 'CONFIRM') =>
    call<ProcessResult>('processPayroll', { confirm })

export const apiApplyAdjustment = (p: {
    targetCid: string
    kind: 'bonus' | 'deduction' | 'disciplinary'
    amount: number
    reason: string
}) => call<GenericResult>('applyAdjustment', p)

export const apiRemoveAdjustment = (id: number) =>
    call<GenericResult>('removeAdjustment', { id })

export const apiSetPayOverride = (p: {
    targetCid: string
    annual: number
    reason: string
}) => call<GenericResult>('setPayOverride', p)

export const apiRemovePayOverride = (targetCid: string) =>
    call<GenericResult>('removePayOverride', { targetCid })

export const apiSetDivision = (p: { targetCid: string; divisions: string[] }) =>
    call<GenericResult>('setDivision', p)

export const apiGetOfficerAdjustments = (targetCid: string) =>
    call<OfficerAdjustmentsResult>('getOfficerAdjustments', { targetCid })

export const apiGetCorrections    = () => call<CorrectionsResult>('getCorrections')
export const apiApproveCorrection = (p: { id: number; note?: string }) =>
    call<GenericResult>('approveCorrection', p)
export const apiDenyCorrection    = (p: { id: number; note?: string }) =>
    call<GenericResult>('denyCorrection', p)

export const apiGetAuditLog       = (limit = 100) =>
    call<AuditResult>('getAuditLog', { limit })
export const apiGetPayrollHistory = (limit = 20) =>
    call<HistoryResult>('getPayrollHistory', { limit })
