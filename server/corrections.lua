-- ============================================================================
-- server/corrections.lua
-- Missed-punch correction workflow:
--   1. Officer submits a request (requested_in, requested_out, reason).
--   2. Command approves or denies with an optional note.
--   3. On approval, a synthetic sable_timeclock row is inserted closed,
--      bound to the currently open period.
-- ============================================================================

Corrections = {}

---Validate a submitted correction.
---@return boolean ok, string? err
local function validateTimes(inStr, outStr)
    if type(inStr) ~= "string" or type(outStr) ~= "string" then
        return false, "times required"
    end
    -- Accept 'YYYY-MM-DD HH:MM[:SS]' or ISO 'YYYY-MM-DDTHH:MM'
    local function parse(s)
        s = s:gsub("T", " ")
        local y, mo, d, h, mi, se =
            s:match("^(%d%d%d%d)-(%d%d)-(%d%d) (%d%d):(%d%d):?(%d?%d?)$")
        if not y then return nil end
        return os.time({
            year = tonumber(y), month = tonumber(mo), day = tonumber(d),
            hour = tonumber(h), min = tonumber(mi), sec = tonumber(se) or 0,
        })
    end
    local ti, to = parse(inStr), parse(outStr)
    if not ti or not to then return false, "malformed timestamp" end
    if to <= ti then return false, "clock-out must be after clock-in" end
    if to - ti > 24 * 3600 then return false, "span > 24h not allowed" end
    if to > os.time() + 3600 then return false, "cannot request a future time" end
    return true
end

---@param src number
---@param requestedIn string
---@param requestedOut string
---@param reason string
---@return number|false id, string? err
function Corrections.Submit(src, requestedIn, requestedOut, reason)
    local p = exports.qbx_core:GetPlayer(src)
    if not p then return false, "no player" end

    local jobName = p.PlayerData.job and p.PlayerData.job.name
    local dept    = Config.GetDepartment(jobName)
    if not dept then return false, "not in a department" end

    if not reason or reason:gsub("%s", "") == "" then return false, "reason required" end
    local ok, err = validateTimes(requestedIn, requestedOut)
    if not ok then return false, err end

    local id = MySQL.insert.await([[
        INSERT INTO sable_corrections
            (citizenid, department, requested_in, requested_out, reason)
        VALUES (?, ?, ?, ?, ?)
    ]], { p.PlayerData.citizenid, dept.id, requestedIn, requestedOut, reason })

    Audit.Write(src, dept.id, "correction_submit", p.PlayerData.citizenid, {
        id = id, in_ = requestedIn, out = requestedOut, reason = reason,
    })
    return id
end

---Pending corrections for a department's review queue.
---@param department string
function Corrections.Pending(department)
    return MySQL.query.await([[
        SELECT c.*, e.first_name, e.last_name, e.grade, e.job_name
          FROM sable_corrections c
          LEFT JOIN sable_employees e ON e.citizenid = c.citizenid
         WHERE c.department = ? AND c.status = 'pending'
         ORDER BY c.created_at ASC
    ]], { department }) or {}
end

---Recent resolved corrections (approved/denied) for context.
---@param department string
---@param limit number
function Corrections.Resolved(department, limit)
    limit = math.min(limit or 25, 100)
    return MySQL.query.await([[
        SELECT c.*, e.first_name, e.last_name, e.grade
          FROM sable_corrections c
          LEFT JOIN sable_employees e ON e.citizenid = c.citizenid
         WHERE c.department = ? AND c.status != 'pending'
         ORDER BY c.reviewed_at DESC
         LIMIT ?
    ]], { department, limit }) or {}
end

---Approve a pending correction. Inserts a closed timeclock row.
---@param id number
---@param department string
---@param note string|nil
---@param actorSrc number
---@return boolean ok, string? err
function Corrections.Approve(id, department, note, actorSrc)
    local row = MySQL.single.await(
        "SELECT * FROM sable_corrections WHERE id = ? AND department = ?",
        { id, department })
    if not row then return false, "not found" end
    if row.status ~= "pending" then return false, "already resolved" end

    local actorCid
    if actorSrc then
        local p = exports.qbx_core:GetPlayer(actorSrc)
        actorCid = p and p.PlayerData.citizenid or nil
    end

    local periodId = Timeclock.GetOrOpenPeriod(row.department)

    -- Insert a synthetic closed session.
    MySQL.insert.await([[
        INSERT INTO sable_timeclock
            (citizenid, department, clock_in, clock_out, minutes, reason, period_id)
        VALUES (?, ?, ?, ?, TIMESTAMPDIFF(MINUTE, ?, ?), 'correction', ?)
    ]], {
        row.citizenid, row.department,
        row.requested_in, row.requested_out,
        row.requested_in, row.requested_out,
        periodId,
    })

    MySQL.update.await([[
        UPDATE sable_corrections
           SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_note = ?
         WHERE id = ?
    ]], { actorCid or "system", note, id })

    Audit.Write(actorSrc, department, "correction_approve", row.citizenid, {
        id = id, in_ = row.requested_in, out = row.requested_out, note = note,
    })
    return true
end

---Deny a pending correction.
---@param id number
---@param department string
---@param note string|nil
---@param actorSrc number
---@return boolean ok, string? err
function Corrections.Deny(id, department, note, actorSrc)
    local row = MySQL.single.await(
        "SELECT * FROM sable_corrections WHERE id = ? AND department = ?",
        { id, department })
    if not row then return false, "not found" end
    if row.status ~= "pending" then return false, "already resolved" end

    local actorCid
    if actorSrc then
        local p = exports.qbx_core:GetPlayer(actorSrc)
        actorCid = p and p.PlayerData.citizenid or nil
    end

    MySQL.update.await([[
        UPDATE sable_corrections
           SET status = 'denied', reviewed_by = ?, reviewed_at = NOW(), review_note = ?
         WHERE id = ?
    ]], { actorCid or "system", note, id })

    Audit.Write(actorSrc, department, "correction_deny", row.citizenid, {
        id = id, note = note,
    })
    return true
end

---Officer's own correction history.
---@param citizenid string
---@param limit number|nil
function Corrections.MyHistory(citizenid, limit)
    limit = math.min(limit or 10, 50)
    return MySQL.query.await([[
        SELECT * FROM sable_corrections
         WHERE citizenid = ?
         ORDER BY created_at DESC
         LIMIT ?
    ]], { citizenid, limit }) or {}
end
