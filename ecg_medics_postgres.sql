-- =============================================
--   ECG Medical Portal - PostgreSQL Setup
--   Database: ecg-medics
-- =============================================

-- =============================================
--   TABLE: users
--   Stores all staff profiles
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  staff_id          VARCHAR(50)   NOT NULL UNIQUE,
  full_name         VARCHAR(255)  NOT NULL,
  email             VARCHAR(255)  NOT NULL UNIQUE,
  password_hash     VARCHAR(255)  NOT NULL,
  dept              VARCHAR(100)  DEFAULT NULL,
  phone             VARCHAR(20)   DEFAULT NULL,
  dob               DATE          DEFAULT NULL,
  designation       VARCHAR(100)  DEFAULT NULL,
  region            VARCHAR(100)  DEFAULT NULL,
  district          VARCHAR(100)  DEFAULT NULL,
  role              SMALLINT      NOT NULL DEFAULT 0, -- 0=Staff, 1=Manager, 2=Super Admin
  profile_completed SMALLINT      NOT NULL DEFAULT 0,
  profile_pic       VARCHAR(255)  DEFAULT NULL,
  spouse            JSONB         DEFAULT NULL, -- JSONB: {name, dob, phone, idType, idNumber}
  spouse_pic        VARCHAR(255)  DEFAULT NULL,
  spouse_id_url     VARCHAR(255)  DEFAULT NULL,
  children          JSONB         DEFAULT NULL, -- JSONB Array: [{name, dob}]
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================
--   TABLE: medical_requests
--   Stores all submitted medical requests
-- =============================================
CREATE TABLE IF NOT EXISTS medical_requests (
  id               SERIAL PRIMARY KEY,
  user_id          INT          NOT NULL,
  purpose          TEXT         DEFAULT NULL,
  hospital         VARCHAR(255) DEFAULT NULL,
  request_date     DATE         DEFAULT NULL,
  patient_type     VARCHAR(50)  DEFAULT NULL, -- Self, Spouse, Child
  patient_name     VARCHAR(255) DEFAULT NULL,
  status           VARCHAR(50)  NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
  rejection_reason TEXT         DEFAULT NULL,
  timestamp        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_requests_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);


-- =============================================
--   TABLE: audit_logs
--   Tracks all admin actions in the system
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  action      VARCHAR(255) DEFAULT NULL,
  target_type VARCHAR(100) DEFAULT NULL,
  details     TEXT         DEFAULT NULL,
  admin_name  VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================
--   DEFAULT SUPER ADMIN ACCOUNT
--   Staff ID : ADMIN001
--   Password : Admin@1234
--   (Change this password after first login)
-- =============================================
INSERT INTO users (staff_id, full_name, email, password_hash, dept, role, profile_completed)
VALUES (
  'ADMIN001',
  'System Administrator',
  'admin@ecggh.com',
  '$2y$10$e0MYzXyjpJS7Zp0m2aBDgu3OL2V7PVL3i7ZwKqYH0fN4gY9KFUMFi', -- Admin@1234
  'IT',
  2,
  1
) ON CONFLICT (staff_id) DO NOTHING;
