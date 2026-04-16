-- ============================================================================
-- client/main.lua
-- Standalone NUI integration:
--   * Opens a tablet-style payroll UI via command/keybind.
--   * Access is job-gated to Config.AllowedJobs.
--   * Bridges all NUI callbacks from the React UI to ox_lib server callbacks.
-- ============================================================================

-- lib is exported globally by @ox_lib/init.lua

local resourceName = GetCurrentResourceName()
local appOpen       = false

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

local function currentJob()
    local pd = exports.qbx_core:GetPlayerData()
    return pd and pd.job and pd.job.name or nil
end

local function isAllowed()
    local job = currentJob()
    return job ~= nil and Config.IsAllowedJob(job)
end

---Forward a message to the NUI app.
---@param event string
---@param data any
local function sendAppMessage(event, data)
    SendNUIMessage({ action = event, data = data })
end

local function closeApp()
    if not appOpen then return end
    appOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = "sable:close" })
end

local function openApp()
    if appOpen then return end
    if not isAllowed() then
        lib.notify({
            title = "S.A.B.L.E.",
            description = "You are not in an allowed department.",
            type = "error"
        })
        return
    end

    appOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = "sable:open",
        data = {
            resourceName = resourceName,
            appName = Config.AppName,
            theme = Config.DefaultTheme or "dark",
        }
    })
end

RegisterCommand("sablepayroll", function()
    if appOpen then closeApp() else openApp() end
end, false)

RegisterKeyMapping("sablepayroll", "Open S.A.B.L.E. Payroll Tablet", "keyboard", "F6")

-- ----------------------------------------------------------------------------
-- Job change: refresh app visibility + notify UI if it's open.
-- ----------------------------------------------------------------------------

local function onJobChanged()
    if appOpen and not isAllowed() then
        closeApp()
        return
    end

    if appOpen then
        -- Force the UI to re-pull the snapshot so it re-checks command access.
        sendAppMessage("sable:forceRefresh", {})
    end
end

RegisterNetEvent("QBCore:Client:OnJobUpdate", onJobChanged)
RegisterNetEvent("qbx_core:client:onJobUpdate", onJobChanged)
RegisterNetEvent("QBCore:Client:OnPlayerLoaded", onJobChanged)
RegisterNetEvent("qbx_core:client:playerLoaded", onJobChanged)

-- ============================================================================
-- NUI callback bridge
-- ----------------------------------------------------------------------------
-- The React UI POSTs to `https://<resource>/<name>`.
-- Each request arrives as a standard RegisterNUICallback on this resource.
-- Each one forwards into a typed ox_lib server callback.
-- ============================================================================

local function callServer(event, cb, ...)
    local result = lib.callback.await("sable_payroll:" .. event, false, ...)
    cb(result)
end

-- ---- player ----------------------------------------------------------------

RegisterNUICallback("refresh", function(_, cb)
    callServer("refresh", cb)
end)

RegisterNUICallback("clockIn", function(_, cb)
    callServer("clockIn", cb)
end)

RegisterNUICallback("clockOut", function(_, cb)
    callServer("clockOut", cb)
end)

RegisterNUICallback("submitCorrection", function(data, cb)
    callServer("submitCorrection", cb,
        data.requestedIn, data.requestedOut, data.reason)
end)

-- ---- command ---------------------------------------------------------------

RegisterNUICallback("getRoster", function(_, cb)
    callServer("getRoster", cb)
end)

RegisterNUICallback("getPayrollPreview", function(_, cb)
    callServer("getPayrollPreview", cb)
end)

RegisterNUICallback("processPayroll", function(data, cb)
    callServer("processPayroll", cb, data and data.confirm or nil)
end)

RegisterNUICallback("applyAdjustment", function(data, cb)
    callServer("applyAdjustment", cb,
        data.targetCid, data.kind, data.amount, data.reason)
end)

RegisterNUICallback("removeAdjustment", function(data, cb)
    callServer("removeAdjustment", cb, data.id)
end)

RegisterNUICallback("setPayOverride", function(data, cb)
    callServer("setPayOverride", cb, data.targetCid, data.annual, data.reason)
end)

RegisterNUICallback("removePayOverride", function(data, cb)
    callServer("removePayOverride", cb, data.targetCid)
end)

RegisterNUICallback("setDivision", function(data, cb)
    callServer("setDivision", cb, data.targetCid, data.divisions)
end)

RegisterNUICallback("getOfficerAdjustments", function(data, cb)
    callServer("getOfficerAdjustments", cb, data.targetCid)
end)

RegisterNUICallback("getCorrections", function(_, cb)
    callServer("getCorrections", cb)
end)

RegisterNUICallback("approveCorrection", function(data, cb)
    callServer("approveCorrection", cb, data.id, data.note)
end)

RegisterNUICallback("denyCorrection", function(data, cb)
    callServer("denyCorrection", cb, data.id, data.note)
end)

RegisterNUICallback("getAuditLog", function(data, cb)
    callServer("getAuditLog", cb, data and data.limit or 100)
end)

RegisterNUICallback("getPayrollHistory", function(data, cb)
    callServer("getPayrollHistory", cb, data and data.limit or 20)
end)

RegisterNUICallback("close", function(_, cb)
    closeApp()
    cb({ ok = true })
end)

-- ============================================================================
-- Server->client notifications (surface them to the UI as toasts)
-- ============================================================================

RegisterNetEvent("sable_payroll:client:afkNotice", function()
    sendAppMessage("sable:toast", {
        kind    = "warning",
        title   = "Auto clock-out",
        message = ("You were clocked out for inactivity (%d min)."):format(
            Config.AFK.timeoutMinutes),
    })
end)

RegisterNetEvent("sable_payroll:client:deathClockedOut", function()
    sendAppMessage("sable:toast", {
        kind    = "warning",
        title   = "Clocked out",
        message = "You were clocked out because you went down.",
    })
end)
