-- ============================================================================
-- server/timeclock.lua
-- Clock in/out, open-session accounting, AFK auto clock-out, and period totals.
-- ============================================================================

Timeclock = {}

-- In-memory heartbeat state keyed by src.
--   { cid, lastPos { x,y,z }, lastMoveAt, clockInId }
local SrcState = {}

-- ----------------------------------------------------------------------------
-- Period helpers
-- ----------------------------------------------------------------------------

---Get (creating if needed) the currently open pay period for a department.
---@param department string
---@return number period id
function Timeclock.GetOrOpenPeriod(department)
    local row = MySQL.single.await([[
        SELECT id FROM sable_pay_periods
        WHERE department = ? AND status = 'open'
        ORDER BY id DESC LIMIT 1
    ]], { department })
    if row and row.id then return row.id end

    return MySQL.insert.await(
        "INSERT INTO sable_pay_periods (department, status) VALUES (?, 'open')",
        { department })
end

---Is this officer already clocked in?
---@param citizenid string
---@return table|nil   { id, department, clock_in, period_id } of the open session
function Timeclock.OpenSession(citizenid)
    return MySQL.single.await([[
        SELECT id, department, clock_in, period_id
        FROM sable_timeclock
        WHERE citizenid = ? AND clock_out IS NULL
        ORDER BY id DESC LIMIT 1
    ]], { citizenid })
end

-- ----------------------------------------------------------------------------
-- Clock-in / clock-out
-- ----------------------------------------------------------------------------

---@param src number
---@return boolean ok, string? err
function Timeclock.ClockIn(src)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return false, "no player" end

    local pd       = p.PlayerData
    local jobName  = pd.job and pd.job.name
    if not Config.IsAllowedJob(jobName) then
        return false, "not an allowed job"
    end
    local dept     = Config.GetDepartment(jobName)
    if not dept then return false, "department not configured" end

    if not pd.job.onduty then
        exports.qbx_core:SetPlayerDuty(src, true)
    end

    local existing = Timeclock.OpenSession(pd.citizenid)
    if existing then
        -- Already clocked in — refresh state and return true idempotently.
        SrcState[src] = {
            cid        = pd.citizenid,
            clockInId  = existing.id,
            lastPos    = nil,
            lastMoveAt = os.time(),
        }
        return true
    end

    local periodId = Timeclock.GetOrOpenPeriod(dept.id)

    local id = MySQL.insert.await([[
        INSERT INTO sable_timeclock
            (citizenid, department, clock_in, period_id)
        VALUES (?, ?, NOW(), ?)
    ]], { pd.citizenid, dept.id, periodId })

    SrcState[src] = {
        cid        = pd.citizenid,
        clockInId  = id,
        lastPos    = nil,
        lastMoveAt = os.time(),
    }

    Audit.Write(src, dept.id, "clock_in", pd.citizenid, { sessionId = id })
    return true
end

---Reason constants used on clock-out.
Timeclock.Reasons = {
    Manual     = "manual",
    AFK        = "afk",
    Disconnect = "disconnect",
    Death      = "death",
    JobChange  = "jobchange",
}

---Internal clock-out by citizenid (works even if the player disconnected).
local function closeSessionByCid(cid, reason, actorSrc, department)
    local open = MySQL.single.await([[
        SELECT id, department, clock_in
        FROM sable_timeclock
        WHERE citizenid = ? AND clock_out IS NULL
        ORDER BY id DESC LIMIT 1
    ]], { cid })
    if not open then return false end

    MySQL.update.await([[
        UPDATE sable_timeclock
        SET clock_out = NOW(),
            minutes   = TIMESTAMPDIFF(MINUTE, clock_in, NOW()),
            reason    = ?
        WHERE id = ?
    ]], { reason, open.id })

    Audit.Write(actorSrc, department or open.department, "clock_out", cid, {
        sessionId = open.id, reason = reason,
    })
    return true
end

---@param src number
---@param reason string|nil  -- defaults to 'manual'
---@return boolean ok, string? err
function Timeclock.ClockOut(src, reason)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return false, "no player" end
    reason = reason or Timeclock.Reasons.Manual

    local cid = p.PlayerData.citizenid
    local jobName = p.PlayerData.job and p.PlayerData.job.name
    local dept    = Config.GetDepartment(jobName)
    local deptId  = dept and dept.id

    local ok = closeSessionByCid(cid, reason, src, deptId)

    if p.PlayerData.job.onduty then
        exports.qbx_core:SetPlayerDuty(src, false)
    end

    SrcState[src] = nil
    return ok, ok and nil or "no open session"
end

---Force-close a session for an offline / bad-state player.
---@param citizenid string
---@param reason string
function Timeclock.ForceClockOut(citizenid, reason)
    local emp = Employees.Get(citizenid)
    closeSessionByCid(citizenid, reason, nil, emp and emp.department)
end

-- ----------------------------------------------------------------------------
-- AFK heartbeat
-- ----------------------------------------------------------------------------

---Called from the client heartbeat with the current position.
---@param src number
---@param pos {x:number, y:number, z:number}
function Timeclock.Heartbeat(src, pos)
    local s = SrcState[src]
    if not s then return end

    local now = os.time()
    if s.lastPos then
        local dx = (pos.x or 0) - s.lastPos.x
        local dy = (pos.y or 0) - s.lastPos.y
        local dz = (pos.z or 0) - s.lastPos.z
        local distSq = dx*dx + dy*dy + dz*dz
        local thresh = Config.AFK.movementUnits * Config.AFK.movementUnits
        if distSq >= thresh then
            s.lastMoveAt = now
        end
    else
        s.lastMoveAt = now
    end
    s.lastPos = { x = pos.x or 0, y = pos.y or 0, z = pos.z or 0 }

    if Config.AFK.enabled then
        local idleMin = (now - (s.lastMoveAt or now)) / 60
        if idleMin >= Config.AFK.timeoutMinutes then
            Timeclock.ClockOut(src, Timeclock.Reasons.AFK)
            TriggerClientEvent("sable_payroll:client:afkNotice", src)
        end
    end
end

---Wipe state for a source that's going away.
function Timeclock.ClearSrc(src)
    SrcState[src] = nil
end

-- ----------------------------------------------------------------------------
-- Period totals (for player view + payroll preview)
-- ----------------------------------------------------------------------------

---Return (hours, minutes) the officer has accrued in the current open period.
---@param citizenid string
---@param department string
---@return number hours
function Timeclock.PeriodHours(citizenid, department)
    local periodId = Timeclock.GetOrOpenPeriod(department)

    -- Closed sessions.
    local closed = MySQL.single.await([[
        SELECT COALESCE(SUM(minutes), 0) AS m
        FROM sable_timeclock
        WHERE citizenid = ? AND period_id = ? AND clock_out IS NOT NULL
    ]], { citizenid, periodId })
    local closedMin = tonumber(closed and closed.m or 0) or 0

    -- Any open session contributes from clock_in -> now.
    local openRow = MySQL.single.await([[
        SELECT TIMESTAMPDIFF(MINUTE, clock_in, NOW()) AS m
        FROM sable_timeclock
        WHERE citizenid = ? AND period_id = ? AND clock_out IS NULL
        ORDER BY id DESC LIMIT 1
    ]], { citizenid, periodId })
    local openMin = tonumber(openRow and openRow.m or 0) or 0

    return (closedMin + openMin) / 60
end

---Aggregate period hours for the whole roster of a department.
---@param department string
---@return table<string, number>  citizenid -> hours
function Timeclock.PeriodHoursByDept(department)
    local periodId = Timeclock.GetOrOpenPeriod(department)
    local rows = MySQL.query.await([[
        SELECT citizenid,
               COALESCE(SUM(
                 CASE WHEN clock_out IS NOT NULL THEN minutes
                      ELSE TIMESTAMPDIFF(MINUTE, clock_in, NOW()) END
               ), 0) AS m
        FROM sable_timeclock
        WHERE period_id = ?
        GROUP BY citizenid
    ]], { periodId }) or {}
    local out = {}
    for _, r in ipairs(rows) do
        out[r.citizenid] = (tonumber(r.m) or 0) / 60
    end
    return out
end

---@param department string
---@return { citizenid: string }[]
function Timeclock.CurrentlyOnDuty(department)
    return MySQL.query.await([[
        SELECT citizenid
        FROM sable_timeclock
        WHERE department = ? AND clock_out IS NULL
    ]], { department }) or {}
end

---Did this officer have an open session at the moment this function is called?
function Timeclock.IsOnDuty(citizenid)
    return Timeclock.OpenSession(citizenid) ~= nil
end
