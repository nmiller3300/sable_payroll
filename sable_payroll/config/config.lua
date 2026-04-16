Config = {}

-- ============================================================================
-- Standalone tablet app identity
-- ============================================================================
Config.AppIdentifier = "sable_payroll"
Config.AppName       = "S.A.B.L.E."
Config.AppDescription = "Payroll & Timekeeping"
Config.AppDeveloper  = "S.A.B.L.E. Systems"
Config.DefaultApp    = false

-- ============================================================================
-- Who can see the app
-- Keys must match Config.Departments keys in config/departments.lua
-- ============================================================================
Config.AllowedJobs = {
    police = true,  -- SASP
    bcso   = true,  -- BCSO
    rcso   = true,  -- RCSO
    lspd   = true,  -- LSPD
}

-- Grades (inclusive) that may access the Command view.
-- Grades 12, 13, 14 = equal-authority command staff.
Config.CommandGrades = { 12, 13, 14 }

-- ============================================================================
-- Payroll cadence
-- perRunMax = floor(annual / PayrollRunsPerYear)
-- ============================================================================
Config.PayrollRunsPerYear = 104   -- bi-weekly @ 2 / week
Config.HoursThreshold     = 20    -- hours/period to earn full base pay
Config.MaxRatio           = 1.0   -- hard cap, no overtime stacking

-- Division bonus percentage of per-run base (per division assignment).
-- Scales with the same ratio as base pay.
Config.DivisionBonusPct = 0.10    -- 10 %

-- ============================================================================
-- Anti-abuse
-- ============================================================================
Config.AFK = {
    enabled        = true,
    timeoutMinutes = 15,           -- idle minutes before auto clock-out
    heartbeatSec   = 30,           -- client -> server heartbeat interval
    movementUnits  = 2.0,          -- distance threshold to count as "active"
}

Config.AutoClockOutOn = {
    disconnect = true,
    death      = true,
    jobChange  = true,
}

-- ============================================================================
-- Society safeguards
-- Payroll cannot process if doing so would drop the society account below
-- MinReserve, OR if total payout exceeds MaxPercentOfSociety of the balance.
-- ============================================================================
Config.Society = {
    MinReserve           = 50000,  -- floor the society balance must stay above
    MaxPercentOfSociety  = 0.80,   -- payout cannot exceed 80 % of balance
}

-- ============================================================================
-- Locale / formatting
-- ============================================================================
Config.Locale = {
    currencySymbol = "$",
    currencyAfter  = false,
    thousands      = ",",
    decimal        = ".",
}

-- ============================================================================
-- Debug
-- ============================================================================
Config.Debug = false
