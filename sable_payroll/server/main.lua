-- ============================================================================
-- server/main.lua
-- Central wiring:
--   * lib.callback.register for every player/command action
--   * QBox event hooks (player loaded, job change, disconnect, death)
--   * Exports for other resources
-- ============================================================================

-- lib is exported globally by @ox_lib/init.lua

-- ----------------------------------------------------------------------------
-- Guard helpers
-- ----------------------------------------------------------------------------

local function getPlayerCtx(src)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return nil end
    local pd      = p.PlayerData
    local jobName = pd.job and pd.job.name
    local dept    = Config.GetDepartment(jobName)
    return {
        player = p,
        pd     = pd,
        cid    = pd.citizenid,
        job    = jobName,
        grade  = pd.job and pd.job.grade and pd.job.grade.level or 0,
        dept   = dept,
        deptId = dept and dept.id,
    }
end

local function assertCommand(ctx)
    return ctx and ctx.deptId and Config.IsCommandGrade(ctx.grade)
end

local function sameDept(ctx, targetCid)
    if not ctx or not ctx.deptId then return false end
    local emp = Employees.Get(targetCid)
    return emp and emp.department == ctx.deptId
end

-- ============================================================================
-- PLAYER CALLBACKS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- refresh  — full snapshot the player's tablet view needs
-- ----------------------------------------------------------------------------
lib.callback.register("sable_payroll:refresh", function(src)
    local ctx = getPlayerCtx(src)
    if not ctx or not ctx.deptId then return { ok = false, error = "not_in_department" } end

    local profile = Employees.BuildProfile(ctx.cid)
    if not profile then return { ok = false, error = "no_employee" } end

    local openSession = Timeclock.OpenSession(ctx.cid)
    local periodHours = Timeclock.PeriodHours(ctx.cid, ctx.deptId)
    local ratio = math.min(periodHours / Config.HoursThreshold, Config.MaxRatio)
    local pendingAdj = Adjustments.Pending(ctx.cid)

    -- Projected pay if payroll ran now.
    local bonuses, deductions = 0, 0
    for _, a in ipairs(pendingAdj) do
        if a.kind == "bonus" then bonuses = bonuses + a.amount
        else deductions = deductions + a.amount end
    end
    local basePay  = math.floor(profile.perRunMax * ratio)
    local divBonus = math.floor(profile.perRunMax * Config.DivisionBonusPct
                                * #profile.divisions * ratio)
    local pending  = math.max(0, basePay + divBonus + bonuses - deductions)

    local dept = Config.Departments[ctx.job]
    local deptDivs = {}
    for _, d in ipairs(dept.divisions or {}) do
        deptDivs[#deptDivs + 1] = d
    end

    return {
        ok = true,
        isCommand   = Config.IsCommandGrade(ctx.grade),
        department  = {
            id        = ctx.deptId,
            name      = dept.name,
            color     = dept.color,
            accent    = dept.accent,
            divisions = deptDivs,
        },
        profile     = profile,
        onDuty      = openSession ~= nil,
        clockInAt   = openSession and openSession.clock_in or nil,
        periodHours = tonumber(string.format("%.2f", periodHours)) or 0,
        threshold   = Config.HoursThreshold,
        ratio       = tonumber(string.format("%.4f", ratio)) or 0,
        pendingPay  = pending,
        pendingAdj  = pendingAdj,
        history     = Payroll.OfficerHistory(ctx.cid, 10),
        corrections = Corrections.MyHistory(ctx.cid, 10),
        config      = {
            runsPerYear = Config.PayrollRunsPerYear,
            divBonusPct = Config.DivisionBonusPct,
            afkMinutes  = Config.AFK.timeoutMinutes,
        },
    }
end)

lib.callback.register("sable_payroll:clockIn", function(src)
    local ctx = getPlayerCtx(src)
    if not ctx or not ctx.deptId then return { ok = false, error = "not_in_department" } end
    local ok, err = Timeclock.ClockIn(src)
    return { ok = ok, error = err }
end)

lib.callback.register("sable_payroll:clockOut", function(src)
    local ctx = getPlayerCtx(src)
    if not ctx then return { ok = false, error = "no_player" } end
    local ok, err = Timeclock.ClockOut(src, Timeclock.Reasons.Manual)
    return { ok = ok, error = err }
end)

lib.callback.register("sable_payroll:submitCorrection",
function(src, requestedIn, requestedOut, reason)
    local id, err = Corrections.Submit(src, requestedIn, requestedOut, reason)
    if not id then return { ok = false, error = err } end
    return { ok = true, id = id }
end)

-- Called by the client heartbeat.
RegisterNetEvent("sable_payroll:server:heartbeat", function(pos)
    local src = source
    if type(pos) ~= "table" then return end
    Timeclock.Heartbeat(src, pos)
end)

-- ============================================================================
-- COMMAND CALLBACKS
-- ============================================================================

lib.callback.register("sable_payroll:getRoster", function(src)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end

    local roster     = Employees.Roster(ctx.deptId)
    local hoursByCid = Timeclock.PeriodHoursByDept(ctx.deptId)
    local adjByCid   = Adjustments.PendingByDept(ctx.deptId)
    local divsAll    = Employees.GetAllDivisions(ctx.deptId)
    local onDuty     = {}
    for _, r in ipairs(Timeclock.CurrentlyOnDuty(ctx.deptId)) do onDuty[r.citizenid] = true end

    local divsByCid = {}
    for divId, cids in pairs(divsAll) do
        for _, cid in ipairs(cids) do
            divsByCid[cid] = divsByCid[cid] or {}
            table.insert(divsByCid[cid], divId)
        end
    end

    local out = {}
    for _, emp in ipairs(roster) do
        local rank = Config.GetRank(emp.job_name, emp.grade)
        local annual, hasOverride = Employees.ResolveAnnual(emp)
        local pending = adjByCid[emp.citizenid] or {}
        local bonusTotal, dedTotal = 0, 0
        for _, a in ipairs(pending) do
            if a.kind == "bonus" then bonusTotal = bonusTotal + a.amount
            else dedTotal = dedTotal + a.amount end
        end
        out[#out + 1] = {
            citizenid      = emp.citizenid,
            firstName      = emp.first_name,
            lastName       = emp.last_name,
            badge          = emp.badge_number,
            grade          = emp.grade,
            jobName        = emp.job_name,
            rankName       = rank and rank.name or ("Grade " .. emp.grade),
            divisions      = divsByCid[emp.citizenid] or {},
            annual         = annual,
            perRunMax      = math.floor(annual / Config.PayrollRunsPerYear),
            hasOverride    = hasOverride,
            overrideReason = emp.override_reason,
            onDuty         = onDuty[emp.citizenid] == true,
            periodHours    = tonumber(string.format("%.2f",
                                hoursByCid[emp.citizenid] or 0)) or 0,
            pendingBonus   = bonusTotal,
            pendingDed     = dedTotal,
            lifetimeHours  = tonumber(emp.lifetime_hours) or 0,
            lifetimePay    = tonumber(emp.lifetime_pay) or 0,
            lastSeenAt     = emp.last_seen_at,
        }
    end

    local dept = Config.Departments[ctx.job]
    return {
        ok        = true,
        roster    = out,
        onDutyCount = #Timeclock.CurrentlyOnDuty(ctx.deptId),
        society   = Banking.GetSocietyBalance(ctx.job),
        divisions = dept.divisions,
    }
end)

lib.callback.register("sable_payroll:getPayrollPreview", function(src)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    return { ok = true, preview = Payroll.Preview(ctx.deptId) }
end)

lib.callback.register("sable_payroll:processPayroll", function(src, confirmToken)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    if confirmToken ~= "CONFIRM" then
        return { ok = false, error = "confirmation_required" }
    end
    local ok, err, summary = Payroll.Process(ctx.deptId, src)
    return { ok = ok, error = err, summary = summary }
end)

lib.callback.register("sable_payroll:applyAdjustment",
function(src, targetCid, kind, amount, reason)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    if not sameDept(ctx, targetCid) then return { ok = false, error = "cross_dept" } end

    amount = tonumber(amount) or 0
    local id, err = Adjustments.Apply(targetCid, ctx.deptId, kind, amount, reason, src)
    if not id then return { ok = false, error = err } end
    return { ok = true, id = id }
end)

lib.callback.register("sable_payroll:removeAdjustment", function(src, adjId)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    adjId = tonumber(adjId)
    if not adjId then return { ok = false, error = "bad_id" } end
    local ok, err = Adjustments.Remove(adjId, ctx.deptId, src)
    return { ok = ok, error = err }
end)

lib.callback.register("sable_payroll:setPayOverride",
function(src, targetCid, annual, reason)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    if not sameDept(ctx, targetCid) then return { ok = false, error = "cross_dept" } end

    annual = tonumber(annual)
    if not annual or annual <= 0 then return { ok = false, error = "bad_annual" } end
    if not reason or reason:gsub("%s", "") == "" then
        return { ok = false, error = "reason_required" }
    end

    Employees.SetOverride(targetCid, ctx.deptId, math.floor(annual), reason, ctx.cid)
    Audit.Write(src, ctx.deptId, "override_set", targetCid, {
        annual = math.floor(annual), reason = reason,
    })
    return { ok = true }
end)

lib.callback.register("sable_payroll:removePayOverride", function(src, targetCid)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    if not sameDept(ctx, targetCid) then return { ok = false, error = "cross_dept" } end

    Employees.RemoveOverride(targetCid)
    Audit.Write(src, ctx.deptId, "override_remove", targetCid, {})
    return { ok = true }
end)

lib.callback.register("sable_payroll:setDivision",
function(src, targetCid, divisionIds)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    if not sameDept(ctx, targetCid) then return { ok = false, error = "cross_dept" } end

    -- Validate division ids against the department's definition.
    local validIds = {}
    for _, d in ipairs(ctx.dept.divisions or {}) do validIds[d.id] = true end
    local clean = {}
    for _, id in ipairs(divisionIds or {}) do
        if validIds[id] then clean[#clean + 1] = id end
    end

    Employees.SetDivisions(targetCid, ctx.deptId, clean, ctx.cid)
    Audit.Write(src, ctx.deptId, "divisions_set", targetCid, { divisions = clean })
    return { ok = true, divisions = clean }
end)

lib.callback.register("sable_payroll:getOfficerAdjustments",
function(src, targetCid)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    if not sameDept(ctx, targetCid) then return { ok = false, error = "cross_dept" } end
    return { ok = true, adjustments = Adjustments.Pending(targetCid) }
end)

lib.callback.register("sable_payroll:getCorrections", function(src)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    return {
        ok       = true,
        pending  = Corrections.Pending(ctx.deptId),
        resolved = Corrections.Resolved(ctx.deptId, 25),
    }
end)

lib.callback.register("sable_payroll:approveCorrection", function(src, id, note)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    id = tonumber(id)
    local ok, err = Corrections.Approve(id, ctx.deptId, note, src)
    return { ok = ok, error = err }
end)

lib.callback.register("sable_payroll:denyCorrection", function(src, id, note)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    id = tonumber(id)
    local ok, err = Corrections.Deny(id, ctx.deptId, note, src)
    return { ok = ok, error = err }
end)

lib.callback.register("sable_payroll:getAuditLog", function(src, limit)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    return { ok = true, entries = Audit.Read(ctx.deptId, limit) }
end)

lib.callback.register("sable_payroll:getPayrollHistory", function(src, limit)
    local ctx = getPlayerCtx(src)
    if not assertCommand(ctx) then return { ok = false, error = "not_command" } end
    return { ok = true, history = Payroll.DepartmentHistory(ctx.deptId, limit) }
end)

-- ============================================================================
-- Event hooks
-- ============================================================================

-- QBox fires this when a player finishes loading into the server.
RegisterNetEvent("QBCore:Server:PlayerLoaded", function()
    local src = source
    local p = exports.qbx_core:GetPlayer(src)
    if p then Employees.Sync(p) end
end)

-- Also handle the ox_core-style event QBox emits.
RegisterNetEvent("qbx_core:server:playerLoaded", function()
    local src = source
    local p = exports.qbx_core:GetPlayer(src)
    if p then Employees.Sync(p) end
end)

-- Job change: always auto clock-out, then resync (or mark inactive).
RegisterNetEvent("QBCore:Server:OnJobUpdate", function(src, newJob)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return end

    if Config.AutoClockOutOn.jobChange and Timeclock.IsOnDuty(p.PlayerData.citizenid) then
        Timeclock.ClockOut(src, Timeclock.Reasons.JobChange)
    end

    if newJob and Config.IsAllowedJob(newJob.name or "") then
        Employees.Sync(p)
    else
        Employees.MarkInactive(p.PlayerData.citizenid)
    end
end)

RegisterNetEvent("qbx_core:server:onJobUpdate", function(source_, jobName, grade)
    -- QBx variant — same handling.
    local src = source_ or source
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return end
    if Config.AutoClockOutOn.jobChange and Timeclock.IsOnDuty(p.PlayerData.citizenid) then
        Timeclock.ClockOut(src, Timeclock.Reasons.JobChange)
    end
    if jobName and Config.IsAllowedJob(jobName) then
        Employees.Sync(p)
    else
        Employees.MarkInactive(p.PlayerData.citizenid)
    end
end)

-- Player dropped / disconnected.
AddEventHandler("playerDropped", function()
    local src = source
    local p   = exports.qbx_core:GetPlayer(src)
    if p and Config.AutoClockOutOn.disconnect then
        if Timeclock.IsOnDuty(p.PlayerData.citizenid) then
            Timeclock.ForceClockOut(p.PlayerData.citizenid, Timeclock.Reasons.Disconnect)
        end
    end
    Timeclock.ClearSrc(src)
end)

-- Death: client detects, fires this.
RegisterNetEvent("sable_payroll:server:playerDied", function()
    local src = source
    if not Config.AutoClockOutOn.death then return end
    local p = exports.qbx_core:GetPlayer(src)
    if p and Timeclock.IsOnDuty(p.PlayerData.citizenid) then
        Timeclock.ClockOut(src, Timeclock.Reasons.Death)
        TriggerClientEvent("sable_payroll:client:deathClockedOut", src)
    end
end)

-- ============================================================================
-- Exports — for other resources
-- ============================================================================

---Is this src currently clocked in for their department?
local function isOnDutyExport(src)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return false end
    return Timeclock.IsOnDuty(p.PlayerData.citizenid)
end
exports("IsOnDuty", isOnDutyExport)

---Return the department id the src is currently on-duty for (or nil).
local function getOnDutyDepartmentExport(src)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return nil end
    local open = Timeclock.OpenSession(p.PlayerData.citizenid)
    return open and open.department or nil
end
exports("GetOnDutyDepartment", getOnDutyDepartmentExport)

---True if src can currently use police functions (allowed job + on-duty).
local function canUsePoliceFunctionsExport(src)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return false end
    local jobName = p.PlayerData.job and p.PlayerData.job.name
    if not Config.IsAllowedJob(jobName) then return false end
    return Timeclock.IsOnDuty(p.PlayerData.citizenid)
end
exports("CanUsePoliceFunctions", canUsePoliceFunctionsExport)
