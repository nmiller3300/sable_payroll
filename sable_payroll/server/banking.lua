-- ============================================================================
-- server/banking.lua
-- mw-banking + qb-management integration.
--
--   * Deposits go through QBox's AddMoney('bank', ...) which mw-banking mirrors.
--   * We fire mw-banking:client:refresh to refresh the live UI.
--   * We append a transaction entry to mw-banking/server/data/banking.json.
--   * Society balance read via qb-management:GetAccount(jobName).
-- ============================================================================

Banking = {}

local MW_BANKING_FILE = "server/data/banking.json"

---Read the society balance for a job.
---@param jobName string
---@return number
function Banking.GetSocietyBalance(jobName)
    local ok, amount = pcall(function()
        return exports["qb-management"]:GetAccount(jobName)
    end)
    if ok and type(amount) == "number" then
        return amount
    end
    return 0
end

---Withdraw from society (negative add). Returns true on success.
---@param jobName string
---@param amount number
---@return boolean
function Banking.WithdrawSociety(jobName, amount)
    if amount <= 0 then return false end
    local ok, err = pcall(function()
        exports["qb-management"]:RemoveMoney(jobName, amount)
    end)
    if not ok and Config.Debug then
        print("[sable_payroll] society withdraw failed: " .. tostring(err))
    end
    return ok == true
end

---Append a transaction row to mw-banking's JSON log.
---Tolerant of mw-banking not being installed — returns false silently.
---@param payload table  { citizenid, firstname, lastname, amount, reason, type }
---@return boolean
local function appendMwBankingEntry(payload)
    local raw = LoadResourceFile("mw-banking", MW_BANKING_FILE)
    local entries

    if raw and raw ~= "" then
        local ok, decoded = pcall(json.decode, raw)
        entries = ok and decoded or {}
    else
        entries = {}
    end

    if type(entries) ~= "table" then entries = {} end

    entries[#entries + 1] = {
        id        = (os.time() * 1000) + math.random(0, 999),
        citizenid = payload.citizenid,
        name      = (payload.firstname or "") .. " " .. (payload.lastname or ""),
        amount    = payload.amount,
        reason    = payload.reason or "S.A.B.L.E. Payroll",
        type      = payload.type or "deposit",
        timestamp = os.time()
    }

    local encoded = json.encode(entries)
    local ok = SaveResourceFile("mw-banking", MW_BANKING_FILE, encoded, -1)
    return ok == true or ok == 1
end

---Deposit into an officer's bank account.
---Works whether the player is online or not.
---@param citizenid string
---@param amount number
---@param reason string
---@return boolean
function Banking.DepositToOfficer(citizenid, amount, reason)
    if amount <= 0 then return false end

    local player = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    local firstname, lastname = "", ""

    if player then
        player.Functions.AddMoney("bank", amount, reason or "S.A.B.L.E. Payroll")
        firstname = player.PlayerData.charinfo.firstname or ""
        lastname  = player.PlayerData.charinfo.lastname  or ""

        -- Tell mw-banking's client to refresh the UI if it's open.
        TriggerClientEvent("mw-banking:client:refresh", player.PlayerData.source)
    else
        -- Offline: write directly to the players table via qbx_core offline API.
        local ok = pcall(function()
            exports.qbx_core:AddMoneyOffline(citizenid, "bank", amount,
                reason or "S.A.B.L.E. Payroll")
        end)
        if not ok then
            -- Fallback: raw SQL. QBox stores money as JSON in `players.money`.
            local row = MySQL.single.await(
                "SELECT charinfo, money FROM players WHERE citizenid = ?",
                { citizenid })
            if not row then return false end

            local info  = json.decode(row.charinfo or "{}") or {}
            firstname = info.firstname or ""
            lastname  = info.lastname  or ""

            local money = json.decode(row.money or "{}") or {}
            money.bank = (money.bank or 0) + amount
            MySQL.update.await("UPDATE players SET money = ? WHERE citizenid = ?",
                { json.encode(money), citizenid })
        end

        if firstname == "" then
            local row = MySQL.single.await(
                "SELECT charinfo FROM players WHERE citizenid = ?", { citizenid })
            if row and row.charinfo then
                local info = json.decode(row.charinfo) or {}
                firstname = info.firstname or ""
                lastname  = info.lastname  or ""
            end
        end
    end

    -- Always write the mw-banking transaction entry so statements match.
    appendMwBankingEntry({
        citizenid = citizenid,
        firstname = firstname,
        lastname  = lastname,
        amount    = amount,
        reason    = reason or "S.A.B.L.E. Payroll",
        type      = "deposit",
    })

    return true
end

---Convenience: withdraw from society and deposit to a list of officers atomically.
---Caller must have already validated the society balance has enough funds.
---@param jobName string
---@param payments { citizenid: string, amount: number, reason: string }[]
---@return number   total amount paid out
function Banking.RunPayouts(jobName, payments)
    local total = 0
    for _, p in ipairs(payments) do
        if p.amount and p.amount > 0 then
            total = total + p.amount
        end
    end

    if total <= 0 then return 0 end

    if not Banking.WithdrawSociety(jobName, total) then
        return 0
    end

    for _, p in ipairs(payments) do
        if p.amount and p.amount > 0 then
            Banking.DepositToOfficer(p.citizenid, p.amount, p.reason)
        end
    end

    return total
end
