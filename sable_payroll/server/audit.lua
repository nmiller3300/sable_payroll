-- ============================================================================
-- server/audit.lua
-- Single audit log. Every command action writes one row.
-- ============================================================================

Audit = {}

local function jsonify(v)
    if v == nil then return nil end
    if type(v) == "string" then return v end
    local ok, s = pcall(json.encode, v)
    return ok and s or tostring(v)
end

---Write an audit entry.
---@param actorSrc number|nil   -- player source triggering the action (may be nil for system)
---@param department string|nil
---@param action string
---@param targetCid string|nil
---@param details table|string|nil
function Audit.Write(actorSrc, department, action, targetCid, details)
    local actorCid, actorName
    if actorSrc and actorSrc > 0 then
        local p = exports.qbx_core:GetPlayer(actorSrc)
        if p then
            actorCid  = p.PlayerData.citizenid
            actorName = (p.PlayerData.charinfo and
                (p.PlayerData.charinfo.firstname .. " " .. p.PlayerData.charinfo.lastname))
                or p.PlayerData.name
        end
    end

    MySQL.insert([[
        INSERT INTO sable_audit_log
            (actor_cid, actor_name, department, action, target_cid, details)
        VALUES (?, ?, ?, ?, ?, ?)
    ]], {
        actorCid, actorName, department, action, targetCid, jsonify(details)
    })

    if Config.Debug then
        print(("[sable_payroll audit] %s by %s (%s) -> %s"):format(
            action, actorName or "system", department or "-", targetCid or "-"))
    end
end

---Read the most recent N audit rows for a department.
---@param department string
---@param limit number
---@return table[]
function Audit.Read(department, limit)
    limit = math.min(limit or 100, 500)
    local rows = MySQL.query.await([[
        SELECT id, actor_cid, actor_name, action, target_cid, details, created_at
        FROM sable_audit_log
        WHERE department = ?
        ORDER BY id DESC
        LIMIT ?
    ]], { department, limit }) or {}

    for _, r in ipairs(rows) do
        if r.details and r.details ~= "" then
            local ok, parsed = pcall(json.decode, r.details)
            if ok then r.details = parsed end
        end
    end
    return rows
end
