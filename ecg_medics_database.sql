-- =============================================
--   ECG Medical Portal - Full Database Setup
--   Database: ecg-medics
--   Import this file in phpMyAdmin:
--   Database > Import > Choose File > Go
-- =============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- =============================================
--   TABLE: users
--   Stores all staff profiles
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                INT(11)       NOT NULL AUTO_INCREMENT,
  `staff_id`          VARCHAR(50)   NOT NULL,
  `full_name`         VARCHAR(255)  NOT NULL,
  `email`             VARCHAR(255)  NOT NULL,
  `password_hash`     VARCHAR(255)  NOT NULL,
  `dept`              VARCHAR(100)  DEFAULT NULL,
  `phone`             VARCHAR(20)   DEFAULT NULL,
  `dob`               DATE          DEFAULT NULL,
  `designation`       VARCHAR(100)  DEFAULT NULL,
  `region`            VARCHAR(100)  DEFAULT NULL,
  `district`          VARCHAR(100)  DEFAULT NULL,
  `role`              TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '0=Staff, 1=Manager, 2=Super Admin',
  `profile_completed` TINYINT(1)   NOT NULL DEFAULT 0,
  `profile_pic`       VARCHAR(255)  DEFAULT NULL,
  `spouse`            JSON          DEFAULT NULL COMMENT 'JSON: {name, dob, phone, idType, idNumber}',
  `spouse_pic`        VARCHAR(255)  DEFAULT NULL,
  `spouse_id_url`     VARCHAR(255)  DEFAULT NULL,
  `children`          JSON          DEFAULT NULL COMMENT 'JSON Array: [{name, dob}]',
  `created_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_id` (`staff_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =============================================
--   TABLE: medical_requests
--   Stores all submitted medical requests
-- =============================================
CREATE TABLE IF NOT EXISTS `medical_requests` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`          INT(11)      NOT NULL,
  `purpose`          TEXT         DEFAULT NULL,
  `hospital`         VARCHAR(255) DEFAULT NULL,
  `request_date`     DATE         DEFAULT NULL,
  `patient_type`     VARCHAR(50)  DEFAULT NULL COMMENT 'Self, Spouse, Child',
  `patient_name`     VARCHAR(255) DEFAULT NULL,
  `status`           VARCHAR(50)  NOT NULL DEFAULT 'Pending' COMMENT 'Pending, Approved, Rejected',
  `rejection_reason` TEXT         DEFAULT NULL,
  `timestamp`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =============================================
--   TABLE: audit_logs
--   Tracks all admin actions in the system
-- =============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `action`      VARCHAR(255) DEFAULT NULL,
  `target_type` VARCHAR(100) DEFAULT NULL,
  `details`     TEXT         DEFAULT NULL,
  `admin_name`  VARCHAR(255) DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- =============================================
--   DEFAULT SUPER ADMIN ACCOUNT
--   Staff ID : ADMIN001
--   Password : Admin@1234
--   (Change this password after first login)
-- =============================================
INSERT INTO `users` (`staff_id`, `full_name`, `email`, `password_hash`, `dept`, `role`, `profile_completed`)
VALUES (
  'ADMIN001',
  'System Administrator',
  'admin@ecg.com.gh',
  '$2y$10$e0MYzXyjpJS7Zp0m2aBDgu3OL2V7PVL3i7ZwKqYH0fN4gY9KFUMFi', -- Admin@1234
  'IT',
  2,
  1
);
