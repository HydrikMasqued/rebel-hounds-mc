<?php
// Shared MySQL helper. All queries in api-*.php must use prepared
// statements via db() - never interpolate input into SQL.
function db() {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/db-config.php';
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    // Prefer unix socket via localhost, fall back to TCP.
    try {
        $pdo = new PDO(
            'mysql:host=' . $cfg['host'] . ';port=' . $cfg['port'] . ';dbname=' . $cfg['db'] . ';charset=utf8mb4',
            $cfg['user'], $cfg['pass'], $opts
        );
    } catch (PDOException $e) {
        $pdo = new PDO(
            'mysql:host=127.0.0.1;port=' . $cfg['port'] . ';dbname=' . $cfg['db'] . ';charset=utf8mb4',
            $cfg['user'], $cfg['pass'], $opts
        );
    }
    return $pdo;
}

function jout($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function jerr($msg, $code = 400) {
    jout(['error' => $msg], $code);
}
