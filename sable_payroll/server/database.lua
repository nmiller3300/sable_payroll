-- ============================================================================
-- server/database.lua
-- Bootstraps the schema from sql/install.sql on resource start.
-- Splits on semicolons that terminate a complete statement (the schema uses
-- no stored procs / triggers, so this is safe).
-- ============================================================================

local function loadSql()
    local raw = LoadResourceFile(GetCurrentResourceName(), "sql/install.sql")
    if not raw then
        error("[sable_payroll] could not load sql/install.sql")
    end
    return raw
end

local function splitStatements(sql)
    local out, buf = {}, {}
    for line in sql:gmatch("([^\n]*)\n?") do
        local stripped = line:gsub("%-%-.*", "")        -- strip -- comments
        buf[#buf + 1] = stripped
        if stripped:match(";%s*$") then
            local stmt = table.concat(buf, "\n"):gsub("%s+$", "")
            if stmt ~= "" and not stmt:match("^%s*;?%s*$") then
                out[#out + 1] = stmt
            end
            buf = {}
        end
    end
    return out
end

local function installSchema()
    local sql = loadSql()
    local statements = splitStatements(sql)
    for i, stmt in ipairs(statements) do
        local ok, err = pcall(function()
            MySQL.query.await(stmt)
        end)
        if not ok then
            print(("^1[sable_payroll] schema statement #%d failed: %s^0"):format(i, err))
        end
    end
    print(("^2[sable_payroll] schema installed (%d statements)^0"):format(#statements))
end

AddEventHandler("onResourceStart", function(res)
    if res ~= GetCurrentResourceName() then return end
    -- Give oxmysql a tick to come up.
    SetTimeout(500, installSchema)
end)
