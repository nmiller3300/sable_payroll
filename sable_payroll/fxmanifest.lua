fx_version "cerulean"
game "gta5"

name "sable_payroll"
author "S.A.B.L.E."
description "Manual payroll and timekeeping system for QBox departments (SASP/BCSO/RCSO/LSPD), delivered as an LB Tablet custom app."
version "1.0.0"

lua54 "yes"

shared_scripts {
    "@ox_lib/init.lua",
    "config/config.lua",
    "config/departments.lua"
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server/database.lua",
    "server/audit.lua",
    "server/banking.lua",
    "server/employees.lua",
    "server/timeclock.lua",
    "server/adjustments.lua",
    "server/corrections.lua",
    "server/payroll.lua",
    "server/main.lua"
}

client_scripts {
    "client/main.lua",
    "client/heartbeat.lua",
    "client/events.lua"
}

files {
    "ui/dist/**/*",
    "ui/icon.png"
}

-- During development, uncomment the dev line and comment the production line.
-- ui_page "http://localhost:3000"
ui_page "ui/dist/index.html"

dependencies {
    "qbx_core",
    "oxmysql",
    "ox_lib",
    "lb-tablet"
}
