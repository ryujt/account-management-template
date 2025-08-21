-- Account Management Template Database Schema
-- MySQL Database Initialization Script

-- Create database if it doesn't exist
-- CREATE DATABASE IF NOT EXISTS account_management;
-- USE account_management;

-- Users table
CREATE TABLE users (
  user_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254) NOT NULL,
  email_verified TINYINT(1)  NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NULL,
  display_name  VARCHAR(255) NOT NULL,
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Roles table
CREATE TABLE roles (
  role_name   VARCHAR(32) PRIMARY KEY,
  description VARCHAR(255),
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User roles junction table
CREATE TABLE user_roles (
  user_id     BIGINT UNSIGNED NOT NULL,
  role_name   VARCHAR(32) NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, role_name),
  CONSTRAINT fk_user_roles_user        FOREIGN KEY (user_id)   REFERENCES users(user_id)   ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role        FOREIGN KEY (role_name) REFERENCES roles(role_name) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessions table for refresh token management
CREATE TABLE sessions (
  session_id         VARCHAR(128) PRIMARY KEY,
  user_id            BIGINT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  ip                 VARCHAR(64),
  ua                 VARCHAR(255),
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at         DATETIME(3) NOT NULL,
  revoked_at         DATETIME(3) NULL,
  UNIQUE KEY uq_sessions_token_hash (refresh_token_hash),
  KEY idx_sessions_user_expires (user_id, expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email verification tokens
CREATE TABLE email_verifications (
  token_id    VARCHAR(128) PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  UNIQUE KEY uq_email_verifications_token_hash (token_hash),
  KEY idx_email_verifications_user (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Password reset tokens
CREATE TABLE password_resets (
  token_id    VARCHAR(128) PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  UNIQUE KEY uq_password_resets_token_hash (token_hash),
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
('member', 'Regular user with basic permissions'),
('admin', 'Administrator with full permissions');

-- Create indexes for better performance
CREATE INDEX idx_users_email_status ON users(email, status);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);