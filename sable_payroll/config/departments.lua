-- ============================================================================
-- S.A.B.L.E. Department Definitions
-- ----------------------------------------------------------------------------
-- Ranks are CONFIG ONLY. To change them, edit this file and restart the
-- resource. There is no in-game UI for editing ranks.
--
-- Structure:
--   Config.Departments[<jobName>] = {
--     id        = "SASP",              -- short code used in DB / UI
--     name      = "San Andreas State Police",
--     color     = "#0A2540",           -- primary accent (used by UI)
--     accent    = "#C9A227",           -- secondary accent
--     ranks     = {                    -- order = progression; [1] = lowest
--         { grade = 0, name = "Recruit",       annual = 55000 },
--         ...
--     },
--     divisions = {                    -- optional specialist divisions
--         { id = "K9",   name = "K-9 Unit"   },
--         ...
--     },
--   }
--
-- grade MUST match the QBox job grade. perRun is computed at runtime.
-- ============================================================================

Config.Departments = {

    -- -----------------------------------------------------------------------
    -- SASP  (police)
    -- -----------------------------------------------------------------------
    police = {
        id     = "SASP",
        name   = "San Andreas State Police",
        color  = "#0A2540",
        accent = "#C9A227",
        ranks = {
            { grade = 0,  name = "Recruit",          annual = 55000  },
            { grade = 1,  name = "Trooper I",        annual = 60000  },
            { grade = 2,  name = "Trooper II",       annual = 65000  },
            { grade = 3,  name = "Trooper III",      annual = 70000  },
            { grade = 4,  name = "Senior Trooper",   annual = 75000  },
            { grade = 5,  name = "Master Trooper",   annual = 80000  },
            { grade = 6,  name = "Corporal",         annual = 86000  },
            { grade = 7,  name = "Sergeant",         annual = 93000  },
            { grade = 8,  name = "Sergeant FC",      annual = 102000 },
            { grade = 9,  name = "Lieutenant",       annual = 115000 },
            { grade = 10, name = "Captain",          annual = 128000 },
            { grade = 11, name = "Major",            annual = 142000 },
            { grade = 12, name = "Commander",        annual = 158000 },
            { grade = 13, name = "Lt. Colonel",      annual = 172000 },
            { grade = 14, name = "Colonel",          annual = 195000 },
        },
        divisions = {
            { id = "K9",      name = "K-9 Unit"              },
            { id = "SWAT",    name = "Special Response Team" },
            { id = "AIR",     name = "Air Support"           },
            { id = "MOTOR",   name = "Motorcycle Division"   },
            { id = "TRAIN",   name = "Training Cadre"        },
            { id = "IA",      name = "Internal Affairs"      },
        },
    },

    -- -----------------------------------------------------------------------
    -- BCSO  (bcso)
    -- -----------------------------------------------------------------------
    bcso = {
        id     = "BCSO",
        name   = "Blaine County Sheriff's Office",
        color  = "#1E3F29",
        accent = "#C9A227",
        ranks = {
            { grade = 0,  name = "Cadet",            annual = 55000  },
            { grade = 1,  name = "Deputy I",         annual = 60000  },
            { grade = 2,  name = "Deputy II",        annual = 65000  },
            { grade = 3,  name = "Deputy III",       annual = 70000  },
            { grade = 4,  name = "Senior Deputy",    annual = 75000  },
            { grade = 5,  name = "Master Deputy",    annual = 80000  },
            { grade = 6,  name = "Corporal",         annual = 86000  },
            { grade = 7,  name = "Sergeant",         annual = 93000  },
            { grade = 8,  name = "Staff Sergeant",   annual = 102000 },
            { grade = 9,  name = "Lieutenant",       annual = 115000 },
            { grade = 10, name = "Captain",          annual = 128000 },
            { grade = 11, name = "Major",            annual = 142000 },
            { grade = 12, name = "Undersheriff",     annual = 158000 },
            { grade = 13, name = "Chief Deputy",     annual = 172000 },
            { grade = 14, name = "Sheriff",          annual = 195000 },
        },
        divisions = {
            { id = "K9",    name = "K-9 Unit"           },
            { id = "SWAT",  name = "SWAT"               },
            { id = "AIR",   name = "Air Support"        },
            { id = "SAR",   name = "Search & Rescue"    },
            { id = "TRAIN", name = "Field Training"     },
            { id = "IA",    name = "Internal Affairs"   },
        },
    },

    -- -----------------------------------------------------------------------
    -- RCSO  (rcso) — placeholder ladder, mirror SASP curve
    -- -----------------------------------------------------------------------
    rcso = {
        id     = "RCSO",
        name   = "Red County Sheriff's Office",
        color  = "#3F1E1E",
        accent = "#C9A227",
        ranks = {
            { grade = 0,  name = "Cadet",            annual = 55000  },
            { grade = 1,  name = "Deputy I",         annual = 60000  },
            { grade = 2,  name = "Deputy II",        annual = 65000  },
            { grade = 3,  name = "Deputy III",       annual = 70000  },
            { grade = 4,  name = "Senior Deputy",    annual = 75000  },
            { grade = 5,  name = "Master Deputy",    annual = 80000  },
            { grade = 6,  name = "Corporal",         annual = 86000  },
            { grade = 7,  name = "Sergeant",         annual = 93000  },
            { grade = 8,  name = "Staff Sergeant",   annual = 102000 },
            { grade = 9,  name = "Lieutenant",       annual = 115000 },
            { grade = 10, name = "Captain",          annual = 128000 },
            { grade = 11, name = "Major",            annual = 142000 },
            { grade = 12, name = "Undersheriff",     annual = 158000 },
            { grade = 13, name = "Chief Deputy",     annual = 172000 },
            { grade = 14, name = "Sheriff",          annual = 195000 },
        },
        divisions = {
            { id = "K9",    name = "K-9 Unit"         },
            { id = "SWAT",  name = "SWAT"             },
            { id = "SAR",   name = "Search & Rescue"  },
            { id = "TRAIN", name = "Field Training"   },
            { id = "IA",    name = "Internal Affairs" },
        },
    },

    -- -----------------------------------------------------------------------
    -- LSPD  (lspd)
    -- -----------------------------------------------------------------------
    lspd = {
        id     = "LSPD",
        name   = "Los Santos Police Department",
        color  = "#13294B",
        accent = "#C9A227",
        ranks = {
            { grade = 0,  name = "Cadet",               annual = 55000  },
            { grade = 1,  name = "Officer I",           annual = 60000  },
            { grade = 2,  name = "Officer II",          annual = 65000  },
            { grade = 3,  name = "Officer III",         annual = 70000  },
            { grade = 4,  name = "Senior Officer",      annual = 75000  },
            { grade = 5,  name = "Lead Officer",        annual = 80000  },
            { grade = 6,  name = "Corporal",            annual = 86000  },
            { grade = 7,  name = "Sergeant I",          annual = 93000  },
            { grade = 8,  name = "Sergeant II",         annual = 102000 },
            { grade = 9,  name = "Lieutenant",          annual = 115000 },
            { grade = 10, name = "Captain",             annual = 128000 },
            { grade = 11, name = "Commander",           annual = 142000 },
            { grade = 12, name = "Deputy Chief",        annual = 158000 },
            { grade = 13, name = "Assistant Chief",     annual = 172000 },
            { grade = 14, name = "Chief of Police",     annual = 195000 },
        },
        divisions = {
            { id = "K9",    name = "K-9 Unit"             },
            { id = "SWAT",  name = "SWAT / Metro Division" },
            { id = "AIR",   name = "Air Support"          },
            { id = "GANG",  name = "Gang Enforcement"     },
            { id = "TRAIN", name = "Training Division"    },
            { id = "IA",    name = "Internal Affairs"     },
        },
    },
}

-- ============================================================================
-- Helpers — exposed on Config for use in server files
-- ============================================================================

---Return the department definition for a QBox job name (or nil).
---@param jobName string
---@return table|nil
function Config.GetDepartment(jobName)
    return Config.Departments[jobName]
end

---Return the rank row for a job / grade pair.
---@param jobName string
---@param grade number
---@return table|nil
function Config.GetRank(jobName, grade)
    local dept = Config.Departments[jobName]
    if not dept then return nil end
    for _, rank in ipairs(dept.ranks) do
        if rank.grade == grade then
            return rank
        end
    end
    return nil
end

---True if the given grade is a command grade.
---@param grade number
---@return boolean
function Config.IsCommandGrade(grade)
    for _, g in ipairs(Config.CommandGrades) do
        if g == grade then return true end
    end
    return false
end

---True if the job is covered by this resource.
---@param jobName string
---@return boolean
function Config.IsAllowedJob(jobName)
    return Config.AllowedJobs[jobName] == true
end
