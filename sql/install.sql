-- ============================================================================
-- S.A.B.L.E. Payroll — Schema Install
-- Idempotent: safe to run on every resource start.
-- ============================================================================

-- 1. Employees --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_employees` (
    `citizenid`       VARCHAR(50)  NOT NULL,
    `department`      VARCHAR(16)  NOT NULL,
    `job_name`        VARCHAR(32)  NOT NULL,
    `grade`           TINYINT      NOT NULL DEFAULT 0,
    `first_name`      VARCHAR(64)  NOT NULL DEFAULT '',
    `last_name`       VARCHAR(64)  NOT NULL DEFAULT '',
    `badge_number`    VARCHAR(32)  NULL,
    `division`        VARCHAR(32)  NULL,
    `hired_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_seen_at`    DATETIME     NULL,
    `lifetime_hours`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `lifetime_pay`    BIGINT       NOT NULL DEFAULT 0,
    `active`          TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (`citizenid`),
    INDEX `idx_department` (`department`),
    INDEX `idx_job_grade`  (`job_name`, `grade`),
    INDEX `idx_active`     (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Time-clock sessions ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_timeclock` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`      VARCHAR(50)  NOT NULL,
    `department`     VARCHAR(16)  NOT NULL,
    `clock_in`       DATETIME     NOT NULL,
    `clock_out`      DATETIME     NULL,
    `minutes`        INT          NULL,
    `reason`         VARCHAR(64)  NULL,   -- 'manual' | 'afk' | 'disconnect' | 'death' | 'jobchange'
    `period_id`      INT          NULL,
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_cid_period` (`citizenid`, `period_id`),
    INDEX `idx_department` (`department`),
    INDEX `idx_open`       (`clock_out`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Pay periods ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_pay_periods` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `department`     VARCHAR(16)  NOT NULL,
    `opened_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `closed_at`      DATETIME     NULL,
    `processed_by`   VARCHAR(50)  NULL,
    `status`         VARCHAR(16)  NOT NULL DEFAULT 'open',  -- open | processed | cancelled
    INDEX `idx_dept_status` (`department`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Payroll records (per officer, per period) ------------------------------
CREATE TABLE IF NOT EXISTS `sable_payroll_records` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `period_id`      INT          NOT NULL,
    `citizenid`      VARCHAR(50)  NOT NULL,
    `department`     VARCHAR(16)  NOT NULL,
    `hours`          DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `ratio`          DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    `annual`         INT          NOT NULL DEFAULT 0,
    `per_run_max`    INT          NOT NULL DEFAULT 0,
    `base_pay`       INT          NOT NULL DEFAULT 0,
    `division_bonus` INT          NOT NULL DEFAULT 0,
    `bonuses`        INT          NOT NULL DEFAULT 0,
    `deductions`     INT          NOT NULL DEFAULT 0,
    `final_pay`      INT          NOT NULL DEFAULT 0,
    `processed_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `processed_by`   VARCHAR(50)  NULL,
    INDEX `idx_period`  (`period_id`),
    INDEX `idx_cid`     (`citizenid`),
    INDEX `idx_dept`    (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. One-time adjustments ---------------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_adjustments` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`      VARCHAR(50)  NOT NULL,
    `department`     VARCHAR(16)  NOT NULL,
    `kind`           VARCHAR(16)  NOT NULL,   -- bonus | deduction | disciplinary
    `amount`         INT          NOT NULL,
    `reason`         TEXT         NOT NULL,
    `created_by`     VARCHAR(50)  NOT NULL,
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `consumed`       TINYINT(1)   NOT NULL DEFAULT 0,
    `consumed_at`    DATETIME     NULL,
    `period_id`      INT          NULL,
    INDEX `idx_cid_consumed` (`citizenid`, `consumed`),
    INDEX `idx_dept`         (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Correction requests ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_corrections` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid`      VARCHAR(50)  NOT NULL,
    `department`     VARCHAR(16)  NOT NULL,
    `requested_in`   DATETIME     NOT NULL,
    `requested_out`  DATETIME     NOT NULL,
    `reason`         TEXT         NOT NULL,
    `status`         VARCHAR(16)  NOT NULL DEFAULT 'pending', -- pending | approved | denied
    `reviewed_by`    VARCHAR(50)  NULL,
    `reviewed_at`    DATETIME     NULL,
    `review_note`    TEXT         NULL,
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_status`   (`status`),
    INDEX `idx_dept`     (`department`),
    INDEX `idx_cid`      (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Pay overrides (long-term) ----------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_pay_overrides` (
    `citizenid`      VARCHAR(50)  NOT NULL,
    `department`     VARCHAR(16)  NOT NULL,
    `annual`         INT          NOT NULL,
    `reason`         TEXT         NOT NULL,
    `set_by`         VARCHAR(50)  NOT NULL,
    `set_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`citizenid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Audit log --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sable_audit_log` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `actor_cid`      VARCHAR(50)  NULL,
    `actor_name`     VARCHAR(128) NULL,
    `department`     VARCHAR(16)  NULL,
    `action`         VARCHAR(64)  NOT NULL,
    `target_cid`     VARCHAR(50)  NULL,
    `details`        TEXT         NULL,
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_dept_created` (`department`, `created_at`),
    INDEX `idx_action`       (`action`),
    INDEX `idx_target`       (`target_cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Division assignments ---------------------------------------------------
-- Officers can belong to 0..N divisions. One bonus per division membership.
CREATE TABLE IF NOT EXISTS `sable_division_members` (
    `citizenid`      VARCHAR(50)  NOT NULL,
    `department`     VARCHAR(16)  NOT NULL,
    `division_id`    VARCHAR(32)  NOT NULL,
    `assigned_by`    VARCHAR(50)  NOT NULL,
    `assigned_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`citizenid`, `division_id`),
    INDEX `idx_dept_div` (`department`, `division_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
