-- Rebel Hounds MC website database schema (MySQL / MariaDB, utf8mb4).
-- Tables are also self-created by their api-*.php on first use;
-- this file documents the intended shape.

CREATE TABLE IF NOT EXISTS ticker (
    id      TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    sep     VARCHAR(8) NOT NULL,
    items   JSON NOT NULL,
    updated BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
