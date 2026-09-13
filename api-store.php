<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error'=>'Not logged in']); exit; }

$KEYS = ['badges', 'roster', 'prospects', 'finance'];
$key = isset($_GET['key']) ? $_GET['key'] : '';
if (!in_array($key, $KEYS, true)) { http_response_code(400); echo json_encode(['error'=>'Unknown key']); exit; }

try {
    $pdo = db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS site_data (" .
        "k VARCHAR(64) NOT NULL PRIMARY KEY, " .
        "data JSON NOT NULL, " .
        "updated BIGINT NOT NULL DEFAULT 0" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
} catch (PDOException $e) {
    error_log('site_data db unavailable: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

$m = $_SERVER['REQUEST_METHOD'];

if ($m === 'GET') {
    $stmt = $pdo->prepare('SELECT data, updated FROM site_data WHERE k = :k');
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch();
    if (!$row) jout(['empty' => true]);
    $data = json_decode($row['data'], true);
    jout(['updated' => (int)$row['updated'], 'data' => $data]);
}

if ($m === 'POST') {
    requireRole('officer');
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 12*1024*1024) { http_response_code(413); echo json_encode(['error'=>'Too large']); exit; }
    $body = json_decode($raw, true);
    if (!is_array($body) || !isset($body['data']) || !is_array($body['data'])) jerr('Invalid data');
    $updated = (isset($body['updated']) && is_numeric($body['updated'])) ? (int)$body['updated'] : time();
    if ($updated < 0) $updated = time();
    $stmt = $pdo->prepare(
        'INSERT INTO site_data (k, data, updated) VALUES (:k, :data, :u) ' .
        'ON DUPLICATE KEY UPDATE data = VALUES(data), updated = VALUES(updated)'
    );
    $stmt->execute([':k' => $key, ':data' => json_encode($body['data'], JSON_UNESCAPED_SLASHES), ':u' => $updated]);
    // Log the change
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_logs (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ts BIGINT NOT NULL DEFAULT 0, username VARCHAR(64) NOT NULL DEFAULT '', role VARCHAR(16) NOT NULL DEFAULT '', action VARCHAR(64) NOT NULL DEFAULT '', store_key VARCHAR(64) NOT NULL DEFAULT '', detail TEXT, ip VARCHAR(45) NOT NULL DEFAULT '') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $logStmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
        $logStmt->execute([
            ':ts' => (int)(time() * 1000),
            ':u' => $_SESSION['rh_username'] ?? '',
            ':r' => $_SESSION['rh_role'] ?? '',
            ':a' => 'store_update',
            ':k' => $key,
            ':d' => 'Updated ' . $key . ' (' . number_format(strlen($body['data'])) . ' bytes)',
            ':i' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception $e) { /* logging failure is non-fatal */ }
    jout(['success' => true]);
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
