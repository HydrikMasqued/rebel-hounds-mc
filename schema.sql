-- Rebel Hounds MC website database schema (MySQL / MariaDB, utf8mb4).
-- Tables are also self-created by their api-*.php on first use;
-- this file documents the intended shape.

CREATE TABLE IF NOT EXISTS ticker (
    id      TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    sep     VARCHAR(8) NOT NULL,
    items   JSON NOT NULL,
    updated BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Generic document store for page datasets (keys: badges, roster, prospects).
-- Each row holds one whole JSON document plus a unix-ms updated stamp
-- used for last-write-wins conflict resolution across browsers.
CREATE TABLE IF NOT EXISTS site_data (
    k       VARCHAR(64) NOT NULL PRIMARY KEY,
    data    JSON NOT NULL,
    updated BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User accounts with role-based access control.
-- Roles: owner (full), officer (see+edit all), patched (see all, no edit), prospect (see limited pages).
-- Passwords are bcrypt-hashed via PHP password_hash().
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('owner','officer','patched','prospect') NOT NULL DEFAULT 'patched',
    display_name  VARCHAR(128) NOT NULL DEFAULT '',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit log for all data changes across the site.
CREATE TABLE IF NOT EXISTS site_logs (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ts         BIGINT NOT NULL DEFAULT 0,
    username   VARCHAR(64) NOT NULL DEFAULT '',
    role       VARCHAR(16) NOT NULL DEFAULT '',
    action     VARCHAR(64) NOT NULL DEFAULT '',
    store_key  VARCHAR(64) NOT NULL DEFAULT '',
    detail     TEXT,
    ip         VARCHAR(45) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Page view tracking for analytics.
CREATE TABLE IF NOT EXISTS visitors (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ts         BIGINT NOT NULL DEFAULT 0,
    page       VARCHAR(128) NOT NULL DEFAULT '',
    session_id VARCHAR(64) NOT NULL DEFAULT '',
    username   VARCHAR(64) NOT NULL DEFAULT '',
    role       VARCHAR(16) NOT NULL DEFAULT '',
    ip         VARCHAR(45) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Media gallery and videos (images, videos, uploaded files).
CREATE TABLE IF NOT EXISTS media (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type        ENUM('image','video') NOT NULL DEFAULT 'image',
    url         VARCHAR(500) NOT NULL DEFAULT '',
    embed_url   VARCHAR(500) NOT NULL DEFAULT '',
    caption     VARCHAR(300) NOT NULL DEFAULT '',
    title       VARCHAR(200) NOT NULL DEFAULT '',
    description VARCHAR(500) NOT NULL DEFAULT '',
    added_by    VARCHAR(64) NOT NULL DEFAULT '',
    ts          BIGINT NOT NULL DEFAULT 0,
    INDEX idx_type (type),
    INDEX idx_ts (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
