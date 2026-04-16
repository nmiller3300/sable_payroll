-- ============================================================================
-- server/payroll.lua
-- Payroll calculation + processing engine.
--
-- Math (locked from handoff):
--   perRunMax  = floor(annual / PayrollRunsPerYear)
--   ratio      = min(hoursLogged / threshold, MaxRatio)     -- capped at 1.0
--   basePay    = floor(perRunMax * ratio)
--   divBonus   = floor(perRunMax * DivisionBonusPct * #divisions * ratio)
--   finalPay   = basePay + divBonus + bonuses - deductions
--      (deductions = deduction + disciplinary adjustments, both stored +ve)
--
-- Safeguards:
--   * ratio >= 0 always
--   * finalPay floored at 0  (never deduct into negative)
--   * society balance must stay >= Config.Society.MinReserve after payout
--   * total payout must not exceed Config.Society.MaxPercentOfSociety of balance
-- ============================================================================

Payroll = {}

-- ----------------------------------------------------------------------------
-- Internal helpers
-- ----------------------------------------------------------------------------

local function clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

---Build a single officer line for preview / processing.
---@param empRow table        sable_employees row (possibly with override_* JOIN)
---@param hours number
---@param pendingAdj table[]  list of adjustment rows
---@param divisions string[]  list of division ids
---@return table line
local function buildLine(empRow, hours, pendingAdj, divisions)
    local annual, hasOverride = Employees.ResolveAnnual(empRow)
    local perRunMax = math.floor(annual / Config.PayrollRunsPerYear)
    local ratio     = clamp(hours / Config.HoursThreshold, 0, Config.MaxRatio)

    local basePay  = math.floor(perRunMax * ratio)
    local divCount = #(divisions or {})
    local divBonus = math.floor(perRunMax * Config.DivisionBonusPct * divCount * ratio)

    local bonuses, deductions = 0, 0
    local consumedIds = {}
    for _, a in ipairs(pendingAdj or {}) do
        consumedIds[#consumedIds + 1] = a.id
        if a.kind == "bonus" then
            bonuses = bonuses + a.amount
        else
            -- deduction & disciplinary both subtract
            deductions = deductions + a.amount
        end
    end

    local finalPay = basePay + divBonus + bonuses - deductions
    if finalPay < 0 then finalPay = 0 end

    local rank = Config.GetRank(empRow.job_name, empRow.grade)

    return {
        citizenid      = empRow.citizenid,
        firstName      = empRow.first_name,
        lastName       = empRow.last_name,
        rankName       = rank and rank.name or ("Grade " .. empRow.grade),
        grade          = empRow.grade,
        jobName        = empRow.job_name,
        divisions      = divisions,
        hours          = tonumber(string.format("%.2f", hours)) or 0,
        annual         = annual,
        hasOverride    = hasOverride,
        perRunMax      = perRunMax,
        ratio          = tonumber(string.format("%.4f", ratio)) or 0,
        basePay        = basePay,
        divisionBonus  = divBonus,
        bonuses        = bonuses,
        deductions     = deductions,
        finalPay       = finalPay,
        adjustments    = pendingAdj or {},
        _adjIds        = consumedIds,
    }
end

-- ----------------------------------------------------------------------------
-- Preview
-- ----------------------------------------------------------------------------

---Build a preview of what the next payroll run would look like.
---Does NOT consume adjustments or move money.
---@param department string
---@return table preview
function Payroll.Preview(department)
    local roster       = Employees.Roster(department)
    local hoursByCid   = Timeclock.PeriodHoursByDept(department)
    local adjByCid     = Adjustments.PendingByDept(department)
    local divsAll      = Employees.GetAllDivisions(department)

    -- Invert divsAll (divisionId -> cids[]) into cid -> divisionIds[].
    local divsByCid = {}
    for divId, cids in pairs(divsAll) do
        for _, cid in ipairs(cids) do
            divsByCid[cid] = divsByCid[cid] or {}
            table.insert(divsByCid[cid], divId)
        end
    end

    local lines, totals = {}, { base = 0, div = 0, bonus = 0, ded = 0, final = 0, hours = 0 }
    local payableCount = 0

    for _, emp in ipairs(roster) do
        local hours = hoursByCid[emp.citizenid] or 0
        local adjs  = adjByCid[emp.citizenid] or {}
        local divs  = divsByCid[emp.citizenid] or {}
        local line  = buildLine(emp, hours, adjs, divs)
        lines[#lines + 1] = line

        totals.hours = totals.hours + line.hours
        totals.base  = totals.base  + line.basePay
        totals.div   = totals.div   + line.divisionBonus
        totals.bonus = totals.bonus + line.bonuses
        totals.ded   = totals.ded   + line.deductions
        totals.final = totals.final + line.finalPay
        if line.finalPay > 0 then payableCount = payableCount + 1 end
    end

    -- Sort: highest final pay first.
    table.sort(lines, function(a, b) return a.finalPay > b.finalPay end)

    local dept = nil
    for jobName, d in pairs(Config.Departments) do
        if d.id == department then dept = { jobName = jobName, def = d }; break end
    end
    local society = dept and Banking.GetSocietyBalance(dept.jobName) or 0
    local afterSociety = society - totals.final
    local maxPayout    = math.floor(society * Config.Society.MaxPercentOfSociety)

    local blockers = {}
    if afterSociety < Config.Society.MinReserve then
        blockers[#blockers + 1] = ("Society would drop below reserve (%s < %s)"):format(
            afterSociety, Config.Society.MinReserve)
    end
    if totals.final > maxPayout then
        blockers[#blockers + 1] = ("Payout exceeds %d%% of society (%s > %s)"):format(
            math.floor(Config.Society.MaxPercentOfSociety * 100),
            totals.final, maxPayout)
    end

    return {
        department      = department,
        lines           = lines,
        totals          = totals,
        officerCount    = #roster,
        payableCount    = payableCount,
        societyBalance  = society,
        societyAfter    = afterSociety,
        maxPayout       = maxPayout,
        canProcess      = #blockers == 0 and totals.final > 0,
        blockers        = blockers,
    }
end

-- ----------------------------------------------------------------------------
-- Process
-- ----------------------------------------------------------------------------

---Actually run payroll: close the period, deposit to officers, mark
---adjustments consumed, bump lifetime counters, write audit.
---@param department string
---@param actorSrc number
---@return boolean ok, string? err, table? summary
function Payroll.Process(department, actorSrc)
    local preview = Payroll.Preview(department)
    if not preview.canProcess then
        return false, table.concat(preview.blockers, "; "), nil
    end

    local dept, jobName
    for jn, d in pairs(Config.Departments) do
        if d.id == department then
            dept = d; jobName = jn; break
        end
    end
    if not jobName then return false, "department not configured" end

    local periodId = Timeclock.GetOrOpenPeriod(department)
    local actorCid
    if actorSrc then
        local p = exports.qbx_core:GetPlayer(actorSrc)
        actorCid = p and p.PlayerData.citizenid or nil
    end

    -- Build payment plan.
    local payments, recordRows, adjToConsume = {}, {}, {}
    for _, line in ipairs(preview.lines) do
        if line.finalPay > 0 then
            payments[#payments + 1] = {
                citizenid = line.citizenid,
                amount    = line.finalPay,
                reason    = ("S.A.B.L.E. Payroll - %s Period #%d"):format(department, periodId),
            }
        end
        recordRows[#recordRows + 1] = line
        for _, id in ipairs(line._adjIds or {}) do
            adjToConsume[#adjToConsume + 1] = id
        end
    end

    -- Fire the withdrawals/deposits.
    local paid = Banking.RunPayouts(jobName, payments)
    if paid <= 0 and preview.totals.final > 0 then
        return false, "banking operation failed", nil
    end

    -- Write one sable_payroll_records row per line (even zeros, for history).
    for _, line in ipairs(recordRows) do
        MySQL.insert.await([[
            INSERT INTO sable_payroll_records
                (period_id, citizenid, department, hours, ratio, annual,
                 per_run_max, base_pay, division_bonus, bonuses, deductions,
                 final_pay, processed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ]], {
            periodId, line.citizenid, department, line.hours, line.ratio,
            line.annual, line.perRunMax, line.basePay, line.divisionBonus,
            line.bonuses, line.deductions, line.finalPay, actorCid or "system",
        })
        Employees.IncrementLifetime(line.citizenid, line.hours, line.finalPay)
    end

    -- Consume adjustments.
    Adjustments.Consume(adjToConsume, periodId)

    -- Close the period and open a new one.
    MySQL.update.await([[
        UPDATE sable_pay_periods
           SET status = 'processed', closed_at = NOW(), processed_by = ?
         WHERE id = ?
    ]], { actorCid or "system", periodId })
    Timeclock.GetOrOpenPeriod(department) -- open the next one eagerly

    Audit.Write(actorSrc, department, "payroll_process", nil, {
        period     = periodId,
        payable    = preview.payableCount,
        total      = preview.totals.final,
        lineCount  = #recordRows,
    })

    return true, nil, {
        periodId       = periodId,
        totalPaid      = paid,
        officerCount   = #recordRows,
        payableCount   = preview.payableCount,
        societyAfter   = Banking.GetSocietyBalance(jobName),
    }
end

-- ----------------------------------------------------------------------------
-- History
-- ----------------------------------------------------------------------------

---@param department string
---@param limit number|nil
---@return table[]
function Payroll.DepartmentHistory(department, limit)
    limit = math.min(limit or 20, 100)
    return MySQL.query.await([[
        SELECT pp.id AS period_id,
               pp.opened_at, pp.closed_at, pp.processed_by,
               COUNT(pr.id)                AS line_count,
               COALESCE(SUM(pr.final_pay), 0)  AS total_paid,
               COALESCE(SUM(pr.hours), 0)      AS total_hours
          FROM sable_pay_periods pp
          LEFT JOIN sable_payroll_records pr ON pr.period_id = pp.id
         WHERE pp.department = ? AND pp.status = 'processed'
         GROUP BY pp.id
         ORDER BY pp.closed_at DESC
         LIMIT ?
    ]], { department, limit }) or {}
end

---@param citizenid string
---@param limit number|nil
function Payroll.OfficerHistory(citizenid, limit)
    limit = math.min(limit or 10, 50)
    return MySQL.query.await([[
        SELECT pr.*, pp.closed_at
          FROM sable_payroll_records pr
          JOIN sable_pay_periods pp ON pp.id = pr.period_id
         WHERE pr.citizenid = ?
         ORDER BY pp.closed_at DESC
         LIMIT ?
    ]], { citizenid, limit }) or {}
end
