<?php
/**
 * Rebel Hounds MC — Change log endpoint
 * GET /api-logs.php?limit=100&action=xxx  → returns recent log entries
 * POST /api-logs.php                      → writes a log entry (internal use)
 */
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error'=>'Not logged in']); exit; }

try {
    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ts BIGINT NOT NULL DEFAULT 0,
        username VARCHAR(64) NOT NULL DEFAULT '',
        role VARCHAR(16) NOT NULL DEFAULT '',
        action VARCHAR(64) NOT NULL DEFAULT '',
        store_key VARCHAR(64) NOT NULL DEFAULT '',
        detail TEXT,
        ip VARCHAR(45) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_init_failed']);
    exit;
}

$m = $_SERVER['REQUEST_METHOD'];

if ($m === 'GET') {
    requireRole('owner');
    $limit = isset($_GET['limit']) ? min(max((int)$_GET['limit'], 1), 500) : 100;
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    $key = isset($_GET['key']) ? $_GET['key'] : '';

    $sql = 'SELECT id, ts, username, role, action, store_key, detail, ip FROM site_logs';
    $conds = [];
    $params = [];
    if ($action) { $conds[] = 'action = :action'; $params[':action'] = $action; }
    if ($key) { $conds[] = 'store_key = :key'; $params[':key'] = $key; }
    if ($conds) $sql .= ' WHERE ' . implode(' AND ', $conds);
    $sql .= ' ORDER BY id DESC LIMIT ' . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Total count
    $countSql = 'SELECT COUNT(*) FROM site_logs';
    if ($conds) $countSql .= ' WHERE ' . implode(' AND ', $conds);
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    echo json_encode(['total' => $total, 'logs' => $rows]);
    exit;
}

if ($m === 'POST') {
    requireRole('owner');
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { http_response_code(400); echo json_encode(['error'=>'Invalid body']); exit; }

    $ts = isset($body['ts']) ? (int)$body['ts'] : time() * 1000;
    $username = isset($body['username']) ? mb_substr($body['username'], 0, 64) : '';
    $role = isset($body['role']) ? mb_substr($body['role'], 0, 16) : '';
    $action = isset($body['action']) ? mb_substr($body['action'], 0, 64) : '';
    $storeKey = isset($body['store_key']) ? mb_substr($body['store_key'], 0, 64) : '';
    $detail = isset($body['detail']) ? mb_substr($body['detail'], 0, 2000) : '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';

    $stmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
    $stmt->execute([':ts' => $ts, ':u' => $username, ':r' => $role, ':a' => $action, ':k' => $storeKey, ':d' => $detail, ':i' => $ip]);
    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
