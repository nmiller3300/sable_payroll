-- ============================================================================
-- client/main.lua
-- LB Tablet integration:
--   * Waits for lb-tablet to start, then registers the S.A.B.L.E. app.
--   * App visibility is job-gated: only shown while the player's QBox job is
--     in Config.AllowedJobs. Visibility refreshes on job change.
--   * Bridges all NUI callbacks from the React UI to ox_lib server callbacks.
-- ============================================================================

-- lib is exported globally by @ox_lib/init.lua

local resourceName = GetCurrentResourceName()
local appRegistered = false
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

---Forward a message to the LB Tablet app UI.
---@param event string
---@param data any
local function sendAppMessage(event, data)
    exports["lb-tablet"]:SendCustomAppMessage(Config.AppIdentifier, event, data)
end

-- ----------------------------------------------------------------------------
-- App registration
-- ----------------------------------------------------------------------------

local function buildUrl()
    return GetResourceMetadata(resourceName, "ui_page", 0)
end

local function registerApp()
    if appRegistered then return end

    local url = buildUrl()
    -- When ui_page points at localhost (dev), icon comes from public/;
    -- otherwise it's inside the built dist/.
    local icon = url:find("http") and (url .. "/icon.png")
                                   or ("/ui/dist/icon.png")

    local success, reason = exports["lb-tablet"]:AddCustomApp({
        identifier   = Config.AppIdentifier,
        name         = Config.AppName,
        description  = Config.AppDescription,
        developer    = Config.AppDeveloper,
        defaultApp   = Config.DefaultApp,
        landscape    = true,

        ui   = url,
        icon = icon,

        onOpen = function()
            appOpen = true
        end,
        onClose = function()
            appOpen = false
        end,
    })

    if not success then
        print(("^1[sable_payroll] failed to register app: %s^0"):format(tostring(reason)))
        return
    end

    appRegistered = true
    print("^2[sable_payroll] tablet app registered^0")
end

local function unregisterApp()
    if not appRegistered then return end
    -- LB Tablet's API exposes RemoveCustomApp (see docs). Guarded in pcall in
    -- case the function signature differs across LB Tablet versions.
    pcall(function()
        exports["lb-tablet"]:RemoveCustomApp(Config.AppIdentifier)
    end)
    appRegistered = false
end

local function refreshVisibility()
    if isAllowed() then
        registerApp()
    else
        unregisterApp()
    end
end

-- Wait for lb-tablet, then do the first visibility check.
CreateThread(function()
    while GetResourceState("lb-tablet") ~= "started" do Wait(250) end
    Wait(500)
    refreshVisibility()
end)

-- Re-register if lb-tablet restarts.
AddEventHandler("onResourceStart", function(res)
    if res == "lb-tablet" then
        appRegistered = false
        SetTimeout(500, refreshVisibility)
    end
end)

-- ----------------------------------------------------------------------------
-- Job change: refresh app visibility + notify UI if it's open.
-- ----------------------------------------------------------------------------

local function onJobChanged()
    refreshVisibility()
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
-- The React UI calls `globalThis.fetchNui('<name>', data)` (LB Tablet helper);
-- that becomes a standard RegisterNUICallback on the owning resource.
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
