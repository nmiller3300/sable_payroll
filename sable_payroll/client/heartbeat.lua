-- ============================================================================
-- client/heartbeat.lua
-- While the player is on duty, periodically reports position to the server
-- so it can detect AFK (no movement) and auto clock-out.
-- The server-side state tracks the clock-in, so we can heartbeat unconditionally
-- — the server ignores heartbeats for players with no open session.
-- ============================================================================

CreateThread(function()
    while true do
        Wait((Config.AFK and Config.AFK.heartbeatSec or 30) * 1000)

        if Config.AFK and Config.AFK.enabled then
            local ped = PlayerPedId()
            if ped and ped ~= 0 then
                local coords = GetEntityCoords(ped)
                TriggerServerEvent("sable_payroll:server:heartbeat", {
                    x = coords.x, y = coords.y, z = coords.z,
                })
            end
        end
    end
end)
