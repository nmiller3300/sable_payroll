-- ============================================================================
-- client/events.lua
-- Hooks that may force an auto clock-out:
--   * death          — QBox / qbx_medical fires a client event when a player
--                      goes down; we mirror it to the server. We also poll
--                      IsEntityDead as a defensive fallback.
-- Job change and disconnect are handled purely server-side.
-- ============================================================================

local wasDead = false

-- Preferred: qbx medical / QBCore death events.
RegisterNetEvent("hospital:client:SetDeathStatus", function(isDead)
    if isDead then
        TriggerServerEvent("sable_payroll:server:playerDied")
    end
end)

RegisterNetEvent("qbx_medical:client:playerDied", function()
    TriggerServerEvent("sable_payroll:server:playerDied")
end)

-- Fallback poll so we don't miss death events on exotic medical scripts.
CreateThread(function()
    while true do
        Wait(2000)
        local ped = PlayerPedId()
        local dead = ped and ped ~= 0 and IsEntityDead(ped)
        if dead and not wasDead then
            wasDead = true
            TriggerServerEvent("sable_payroll:server:playerDied")
        elseif not dead and wasDead then
            wasDead = false
        end
    end
end)
