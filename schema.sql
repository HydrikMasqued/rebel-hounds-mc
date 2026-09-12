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
