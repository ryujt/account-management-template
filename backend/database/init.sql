-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS account_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE account_management;

-- Create app user with proper permissions
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_password';
GRANT ALL PRIVILEGES ON account_management.* TO 'app_user'@'%';
FLUSH PRIVILEGES;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    roles JSON NOT NULL DEFAULT ('["member"]'),
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'inactive',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255) NULL,
    email_verification_expires DATETIME NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires DATETIME NULL,
    last_login DATETIME NULL,
    login_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_email_verification_token (email_verification_token),
    INDEX idx_password_reset_token (password_reset_token),
    INDEX idx_created_at (created_at)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_refresh_token (refresh_token(255)),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    invite_id CHAR(36) PRIMARY KEY,
    invite_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_by CHAR(36) NOT NULL,
    status ENUM('pending', 'accepted', 'expired') NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,
    accepted_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_invite_code (invite_code),
    INDEX idx_email (email),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (accepted_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id CHAR(36) PRIMARY KEY,
    actor_id CHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255) NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_actor_id (actor_id),
    INDEX idx_action (action),
    INDEX idx_resource_type (resource_type),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create default admin user
INSERT IGNORE INTO users (
    user_id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    roles, 
    status, 
    email_verified
) VALUES (
    UUID(), 
    'admin@example.com', 
    '$2a$12$K5Kx7r8g8qF9Z2vL4mN1U.c7QKd3.gF9Z8r3K5Kx7r8g8qF9Z2vL4m', -- password: admin123
    'Admin', 
    'User', 
    JSON_ARRAY('admin', 'member'), 
    'active', 
    TRUE
);

-- Create sample member user
INSERT IGNORE INTO users (
    user_id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    roles, 
    status, 
    email_verified
) VALUES (
    UUID(), 
    'user@example.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfC6JRs.kF5.Cu.', -- password: admin123
    'John', 
    'Doe', 
    JSON_ARRAY('member'), 
    'active', 
    TRUE
);