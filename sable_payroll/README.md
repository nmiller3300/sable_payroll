# S.A.B.L.E. Payroll Systems

Manual payroll & timekeeping for QBox law-enforcement departments,
delivered as a standalone tablet-style NUI app.

Departments supported: **SASP · BCSO · RCSO · LSPD** (each a separate QBox
job, fully isolated from one another).

---

## Where to put the resource

Copy the whole `sable_payroll/` folder into your server's resources folder:

```
your-server/
└── resources/
    └── [standalone]/
        └── sable_payroll/       ← here
```

(Path varies by setup; anywhere in `resources/` is fine.)

Then in **`server.cfg`** add:

```
ensure oxmysql
ensure ox_lib
ensure qbx_core
ensure mw-banking
ensure sable_payroll
```

**Order matters** — `sable_payroll` must start AFTER `qbx_core`,
`ox_lib`, and `mw-banking`.

Restart the server. On first start, `sable_payroll` auto-installs its
nine database tables (all `CREATE TABLE IF NOT EXISTS`, safe to re-run).

---


## Do I need to do anything else?

**Probably not, but verify these once:**

1. Confirm your QBox job names match the four keys in `config/config.lua`
   (`police`, `bcso`, `rcso`, `lspd`). If yours differ, edit
   `Config.AllowedJobs` and the matching `Config.Departments[...]` key
   in `config/departments.lua`.
2. If you want different **rank salaries**, edit `config/departments.lua`.
   Ranks are config-only by design — there is NO in-game UI for editing
   them. Restart the resource after editing.
3. Command-staff access is granted to QBox job grades **12, 13, 14**
   (all three are equal authority). Change `Config.CommandGrades` if
   your setup differs.
4. `mw-banking` integration is automatic — deposits go through
   `player.Functions.AddMoney('bank', ...)` which mw-banking mirrors,
   plus an event `mw-banking:client:refresh` for live UI updates, plus
   an entry appended to `mw-banking/server/data/banking.json`.

---

## How officers use it

1. Use `/sablepayroll` (or the default **F6** keybind) to open the S.A.B.L.E. tablet UI.
2. Tap **Clock In** when they come on shift. Clock out when leaving.

**Anti-abuse is built in:**
- AFK auto clock-out after 15 min of no movement (configurable).
- Auto clock-out on disconnect / death / job change.
- Ratio hard-capped at 1.0 — no "overtime stacking."

---

## How command uses it

Anyone with grade 12, 13, or 14 sees a **Command** section in the
sidebar with five screens:

- **Overview** — dashboard, on-duty list, recent runs
- **Roster** — every officer, click to open a drawer with:
  - **Adjustments** tab: bonus / deduction / disciplinary (one-time)
  - **Pay Override** tab: long-term annual salary override (persists)
  - **Divisions** tab: assign specialist units (each one = 10 % bonus)
- **Payroll** — preview table, totals, blockers; confirm modal runs it
- **Corrections** — approve/deny missed-punch requests
- **Audit Log** — every command action, forever

Money only moves when a command member explicitly clicks **Run Payroll**
and confirms the modal. There is no automatic payout.

---

## Exports for other resources

```lua
exports.sable_payroll:IsOnDuty(source)
exports.sable_payroll:GetOnDutyDepartment(source)   -- 'SASP' | 'BCSO' | ...
exports.sable_payroll:CanUsePoliceFunctions(source) -- allowed job + on-duty
```

---

## Developing the UI (optional)

If you want to iterate on the React UI without restarting the server
every change:

```bash
cd ui
npm install
npm run dev                 # opens http://localhost:3000
```

In dev mode the UI runs against rich mock fixtures — no game needed.

To re-build for production:

```bash
npm run build               # outputs to ui/dist/
```

Already pre-built in this zip — you only need to rebuild if you edit
anything under `ui/src/`.

**Dev vs production switch** in `fxmanifest.lua`:

```lua
-- During development, uncomment the dev line and comment the production line.
-- ui_page "http://localhost:3000"
ui_page "ui/dist/index.html"
```

---

## File structure

```
sable_payroll/
├── fxmanifest.lua
├── config/
│   ├── config.lua              allowed jobs, command grades, thresholds
│   └── departments.lua         four departments + rank ladders + divisions
├── server/
│   ├── database.lua            installs the schema on start
│   ├── audit.lua               audit log writer/reader
│   ├── banking.lua             mw-banking + qb-management
│   ├── employees.lua           roster, pay overrides, divisions
│   ├── timeclock.lua           clock in/out, AFK, period hours
│   ├── adjustments.lua         bonus/deduction/disciplinary
│   ├── corrections.lua         missed-punch workflow
│   ├── payroll.lua             preview + process engine
│   └── main.lua                all callbacks + event hooks + exports
├── client/
│   ├── main.lua                NUI open/close + callback bridge
│   ├── heartbeat.lua           AFK position heartbeat
│   └── events.lua              death / medical hooks
├── ui/
│   ├── dist/                   pre-built React UI (production)
│   ├── src/                    React sources (edit + rebuild to change)
│   ├── public/                 dev-mode static assets
│   ├── icon.png                tablet app tile icon
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── sql/
    └── install.sql             9 tables, idempotent
```

---

## Troubleshooting

- **UI won't open** — You're not on an allowed job, or another resource is consuming the keybind. Try `/sablepayroll` directly.
- **"Schema installation failed"** on first start — usually oxmysql not
  ready yet. Restart the resource once.
- **Pay didn't move** — check the payroll preview's "blockers" section.
  Society balance too low or payout exceeds the 80 % cap are the common
  ones; both are configurable in `config/config.lua` under
  `Config.Society`.
