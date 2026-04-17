-- ============================================================================
-- server/employees.lua
-- Employee sync (player <-> sable_employees row), pay overrides, division
-- assignment, profile builder consumed by payroll / UI.
-- ============================================================================

Employees = {}

-- ----------------------------------------------------------------------------
-- Core lookups
-- ----------------------------------------------------------------------------

---Ensure the employee row exists and reflects current job/grade.
---@param player table   QBox player object
function Employees.Sync(player)
    if not player then return end
    local pd       = player.PlayerData
    local jobName  = pd.job and pd.job.name
    if not Config.IsAllowedJob(jobName) then return end

    local grade   = pd.job.grade and pd.job.grade.level or 0
    local dept    = Config.GetDepartment(jobName)
    if not dept then return end

    MySQL.insert.await([[
        INSERT INTO sable_employees
            (citizenid, department, job_name, grade, first_name, last_name, badge_number, last_seen_at, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)
        ON DUPLICATE KEY UPDATE
            department   = VALUES(department),
            job_name     = VALUES(job_name),
            grade        = VALUES(grade),
            first_name   = VALUES(first_name),
            last_name    = VALUES(last_name),
            badge_number = COALESCE(VALUES(badge_number), badge_number),
            last_seen_at = NOW(),
            active       = 1
    ]], {
        pd.citizenid,
        dept.id,
        jobName,
        grade,
        pd.charinfo.firstname or "",
        pd.charinfo.lastname  or "",
        tostring(pd.metadata.callsign or ""),
    })
end

---Flag employee inactive when they leave the department (job change away).
---@param citizenid string
function Employees.MarkInactive(citizenid)
    MySQL.update("UPDATE sable_employees SET active = 0 WHERE citizenid = ?",
        { citizenid })
end

---Load one employee row.
---@param citizenid string
---@return table|nil
function Employees.Get(citizenid)
    return MySQL.single.await(
        "SELECT * FROM sable_employees WHERE citizenid = ?", { citizenid })
end

---Load the roster for a department.
---@param department string
---@return table[]
function Employees.Roster(department)
    return MySQL.query.await([[
        SELECT e.*, po.annual AS override_annual, po.reason AS override_reason
        FROM sable_employees e
        LEFT JOIN sable_pay_overrides po ON po.citizenid = e.citizenid
        WHERE e.department = ? AND e.active = 1
        ORDER BY e.grade DESC, e.last_name ASC
    ]], { department }) or {}
end

-- ----------------------------------------------------------------------------
-- Pay overrides
-- ----------------------------------------------------------------------------

---@param citizenid string
---@return table|nil
function Employees.GetOverride(citizenid)
    return MySQL.single.await(
        "SELECT * FROM sable_pay_overrides WHERE citizenid = ?", { citizenid })
end

---@param citizenid string
---@param department string
---@param annual number
---@param reason string
---@param setBy string
function Employees.SetOverride(citizenid, department, annual, reason, setBy)
    MySQL.insert.await([[
        INSERT INTO sable_pay_overrides (citizenid, department, annual, reason, set_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            department = VALUES(department),
            annual     = VALUES(annual),
            reason     = VALUES(reason),
            set_by     = VALUES(set_by),
            set_at     = CURRENT_TIMESTAMP
    ]], { citizenid, department, annual, reason, setBy })
end

---@param citizenid string
function Employees.RemoveOverride(citizenid)
    MySQL.query.await(
        "DELETE FROM sable_pay_overrides WHERE citizenid = ?", { citizenid })
end

-- ----------------------------------------------------------------------------
-- Divisions
-- ----------------------------------------------------------------------------

---@param citizenid string
---@return string[]
function Employees.GetDivisions(citizenid)
    local rows = MySQL.query.await(
        "SELECT division_id FROM sable_division_members WHERE citizenid = ?",
        { citizenid }) or {}
    local out = {}
    for _, r in ipairs(rows) do out[#out + 1] = r.division_id end
    return out
end

---@param department string
---@return table<string, string[]>   { [divisionId] = { citizenid, ... } }
function Employees.GetAllDivisions(department)
    local rows = MySQL.query.await([[
        SELECT citizenid, division_id FROM sable_division_members
        WHERE department = ?
    ]], { department }) or {}
    local out = {}
    for _, r in ipairs(rows) do
        out[r.division_id] = out[r.division_id] or {}
        table.insert(out[r.division_id], r.citizenid)
    end
    return out
end

---Replace an officer's division memberships with the given set.
---@param citizenid string
---@param department string
---@param divisionIds string[]
---@param assignedBy string
function Employees.SetDivisions(citizenid, department, divisionIds, assignedBy)
    MySQL.query.await(
        "DELETE FROM sable_division_members WHERE citizenid = ?", { citizenid })
    for _, id in ipairs(divisionIds or {}) do
        MySQL.insert.await([[
            INSERT INTO sable_division_members
                (citizenid, department, division_id, assigned_by)
            VALUES (?, ?, ?, ?)
        ]], { citizenid, department, id, assignedBy })
    end
end

-- ----------------------------------------------------------------------------
-- Lifetime counters (called by payroll after a period processes)
-- ----------------------------------------------------------------------------

function Employees.IncrementLifetime(citizenid, hours, pay)
    MySQL.update.await([[
        UPDATE sable_employees
           SET lifetime_hours = lifetime_hours + ?,
               lifetime_pay   = lifetime_pay   + ?
         WHERE citizenid = ?
    ]], { hours or 0, pay or 0, citizenid })
end

-- ----------------------------------------------------------------------------
-- Profile builder — consumed by payroll + UI
-- ----------------------------------------------------------------------------

---Resolve the effective annual salary for an officer:
---  override > rank-book value.
---@param row table   sable_employees row (may carry override_* columns from JOIN)
---@return number annual, boolean hasOverride
function Employees.ResolveAnnual(row)
    if row.override_annual and row.override_annual > 0 then
        return row.override_annual, true
    end
    local rank = Config.GetRank(row.job_name, row.grade)
    return rank and rank.annual or 0, false
end

---Return a UI-safe profile row for an employee.
---@param citizenid string
---@return table|nil
function Employees.BuildProfile(citizenid)
    local row = MySQL.single.await([[
        SELECT e.*, po.annual AS override_annual, po.reason AS override_reason
          FROM sable_employees e
     LEFT JOIN sable_pay_overrides po ON po.citizenid = e.citizenid
         WHERE e.citizenid = ?
    ]], { citizenid })
    if not row then return nil end

    local rank = Config.GetRank(row.job_name, row.grade)
    local annual, hasOverride = Employees.ResolveAnnual(row)

    return {
        citizenid      = row.citizenid,
        department     = row.department,
        jobName        = row.job_name,
        grade          = row.grade,
        rankName       = rank and rank.name or ("Grade " .. row.grade),
        firstName      = row.first_name,
        lastName       = row.last_name,
        badge          = row.badge_number,
        hiredAt        = row.hired_at,
        lastSeenAt     = row.last_seen_at,
        lifetimeHours  = tonumber(row.lifetime_hours) or 0,
        lifetimePay    = tonumber(row.lifetime_pay) or 0,
        active         = row.active == 1,
        annual         = annual,
        perRunMax      = math.floor(annual / Config.PayrollRunsPerYear),
        hasOverride    = hasOverride,
        overrideReason = row.override_reason,
        divisions      = Employees.GetDivisions(citizenid),
    }
end
