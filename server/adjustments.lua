-- ============================================================================
-- server/adjustments.lua
-- One-time adjustments that are consumed by the next payroll run.
--   kinds: bonus | deduction | disciplinary
--   deductions & disciplinary are stored as POSITIVE amounts; payroll
--   subtracts them. Audit log retains the kind so intent is preserved.
-- ============================================================================

Adjustments = {}

local KINDS = { bonus = true, deduction = true, disciplinary = true }

---@param kind string
---@return boolean
function Adjustments.IsValidKind(kind) return KINDS[kind] == true end

---Create a pending adjustment.
---@param citizenid string
---@param department string
---@param kind 'bonus'|'deduction'|'disciplinary'
---@param amount number   -- always positive
---@param reason string
---@param actorSrc number
---@return number|false newId, string? err
function Adjustments.Apply(citizenid, department, kind, amount, reason, actorSrc)
    if not KINDS[kind] then return false, "invalid kind" end
    if not amount or amount <= 0 then return false, "amount must be > 0" end
    if not reason or reason:gsub("%s", "") == "" then return false, "reason required" end

    local actorCid
    if actorSrc then
        local p = exports.qbx_core:GetPlayer(actorSrc)
        actorCid = p and p.PlayerData.citizenid or nil
    end

    local id = MySQL.insert.await([[
        INSERT INTO sable_adjustments
            (citizenid, department, kind, amount, reason, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ]], { citizenid, department, kind, math.floor(amount), reason, actorCid or "system" })

    Audit.Write(actorSrc, department, "adjustment_apply", citizenid, {
        id = id, kind = kind, amount = math.floor(amount), reason = reason,
    })
    return id
end

---Remove an adjustment that has not been consumed yet.
---@param id number
---@param department string   -- used as a safety filter
---@param actorSrc number
---@return boolean ok, string? err
function Adjustments.Remove(id, department, actorSrc)
    local row = MySQL.single.await([[
        SELECT id, citizenid, kind, amount, consumed
          FROM sable_adjustments
         WHERE id = ? AND department = ?
    ]], { id, department })
    if not row then return false, "not found" end
    if row.consumed == 1 then return false, "already consumed" end

    MySQL.query.await("DELETE FROM sable_adjustments WHERE id = ?", { id })

    Audit.Write(actorSrc, department, "adjustment_remove", row.citizenid, {
        id = id, kind = row.kind, amount = row.amount,
    })
    return true
end

---Pending (un-consumed) adjustments for an officer.
---@param citizenid string
function Adjustments.Pending(citizenid)
    return MySQL.query.await([[
        SELECT * FROM sable_adjustments
         WHERE citizenid = ? AND consumed = 0
         ORDER BY created_at DESC
    ]], { citizenid }) or {}
end

---Pending adjustments grouped per officer across a department.
---@param department string
---@return table<string, table[]>
function Adjustments.PendingByDept(department)
    local rows = MySQL.query.await([[
        SELECT * FROM sable_adjustments
         WHERE department = ? AND consumed = 0
         ORDER BY created_at ASC
    ]], { department }) or {}
    local out = {}
    for _, r in ipairs(rows) do
        out[r.citizenid] = out[r.citizenid] or {}
        table.insert(out[r.citizenid], r)
    end
    return out
end

---Mark the given adjustment ids as consumed by the given period.
---@param ids number[]
---@param periodId number
function Adjustments.Consume(ids, periodId)
    if not ids or #ids == 0 then return end
    -- period_id is a server-side integer we already computed, safe to inline.
    -- ids list is bound individually per statement.
    for _, id in ipairs(ids) do
        MySQL.update.await([[
            UPDATE sable_adjustments
               SET consumed = 1, consumed_at = NOW(), period_id = ?
             WHERE id = ?
        ]], { periodId, id })
    end
end
