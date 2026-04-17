fx_version "cerulean"
game "gta5"

name "sable_payroll"
author "S.A.B.L.E."
description "Wrapper manifest so this repository can be dropped in resources as-is."
version "1.0.0"

lua54 "yes"

shared_scripts {
    "@ox_lib/init.lua",
    "sable_payroll/config/config.lua",
    "sable_payroll/config/departments.lua"
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "sable_payroll/server/database.lua",
    "sable_payroll/server/audit.lua",
    "sable_payroll/server/banking.lua",
    "sable_payroll/server/employees.lua",
    "sable_payroll/server/timeclock.lua",
    "sable_payroll/server/adjustments.lua",
    "sable_payroll/server/corrections.lua",
    "sable_payroll/server/payroll.lua",
    "sable_payroll/server/main.lua"
}

client_scripts {
    "sable_payroll/client/main.lua",
    "sable_payroll/client/heartbeat.lua",
    "sable_payroll/client/events.lua"
}

files {
    "sable_payroll/ui/dist/**/*",
    "sable_payroll/ui/icon.png"
}

-- During development, uncomment the dev line and comment the production line.
-- ui_page "http://localhost:3000"
ui_page "sable_payroll/ui/dist/index.html"

dependencies {
    "qbx_core",
    "oxmysql",
    "ox_lib"
}
