<?php
require __DIR__ . '/db.php';
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$BULLET = json_decode('"\u2022"');
$DEFAULT_ITEMS = ['LOYALTY', 'RESPECT', 'BROTHERHOOD', 'DISCIPLINE', 'REBEL HOUNDS MC'];

try {
    $pdo = db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS ticker (" .
        "id TINYINT UNSIGNED NOT NULL PRIMARY KEY, " .
        "sep VARCHAR(8) NOT NULL, " .
        "items JSON NOT NULL, " .
        "updated BIGINT NOT NULL DEFAULT 0" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
} catch (PDOException $e) {
    error_log('ticker db unavailable: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT sep, items, updated FROM ticker WHERE id = 1');
    $stmt->execute();
    $row = $stmt->fetch();
    if (!$row) {
        jout(['sep' => $BULLET, 'items' => $DEFAULT_ITEMS, 'updated' => 0]);
    }
    $items = json_decode($row['items'], true);
    if (!is_array($items)) $items = $DEFAULT_ITEMS;
    jout(['sep' => $row['sep'], 'items' => $items, 'updated' => (int)$row['updated']]);
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
        jerr('Invalid data');
    }
    $items = [];
    foreach ($data['items'] as $w) {
        if (!is_string($w)) continue;
        $w = trim(strip_tags($w));
        if (function_exists('mb_substr')) $w = mb_substr($w, 0, 40);
        else $w = substr($w, 0, 40);
        if ($w !== '') $items[] = $w;
        if (count($items) >= 12) break;
    }
    if (!count($items)) jerr('Add at least one word');
    $sep = (isset($data['sep']) && is_string($data['sep'])) ? trim(strip_tags($data['sep'])) : '';
    if ($sep === '') $sep = $BULLET;
    if (function_exists('mb_substr')) $sep = mb_substr($sep, 0, 4);
    else $sep = substr($sep, 0, 4);
    $updated = (isset($data['updated']) && is_numeric($data['updated'])) ? (int)$data['updated'] : time();
    if ($updated < 0) $updated = time();

    $stmt = $pdo->prepare(
        'INSERT INTO ticker (id, sep, items, updated) VALUES (1, :sep, :items, :updated) ' .
        'ON DUPLICATE KEY UPDATE sep = VALUES(sep), items = VALUES(items), updated = VALUES(updated)'
    );
    $stmt->execute([
        ':sep' => $sep,
        ':items' => json_encode(array_values($items), JSON_UNESCAPED_SLASHES),
        ':updated' => $updated,
    ]);
    jout(['success' => true]);
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
