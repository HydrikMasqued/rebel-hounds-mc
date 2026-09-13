<?php
/**
 * Rebel Hounds MC — Visitor tracking endpoint
 * POST /api-visitors.php { page }  → logs a page view
 * GET  /api-visitors.php?period=24h → returns analytics (owner only)
 */
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error'=>'Not logged in']); exit; }

try {
    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS visitors (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ts BIGINT NOT NULL DEFAULT 0,
        page VARCHAR(128) NOT NULL DEFAULT '',
        session_id VARCHAR(64) NOT NULL DEFAULT '',
        username VARCHAR(64) NOT NULL DEFAULT '',
        role VARCHAR(16) NOT NULL DEFAULT '',
        ip VARCHAR(45) NOT NULL DEFAULT '',
        user_agent VARCHAR(255) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_init_failed']);
    exit;
}

$m = $_SERVER['REQUEST_METHOD'];

if ($m === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { http_response_code(400); echo json_encode(['error'=>'Invalid body']); exit; }

    $ts = (int)(time() * 1000);
    $page = isset($body['page']) ? mb_substr($body['page'], 0, 128) : '/';
    $sessionId = isset($body['session_id']) ? mb_substr($body['session_id'], 0, 64) : '';
    $username = isset($body['username']) ? mb_substr($body['username'], 0, 64) : '';
    $role = isset($body['role']) ? mb_substr($body['role'], 0, 16) : '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

    $stmt = $pdo->prepare('INSERT INTO visitors (ts, page, session_id, username, role, ip, user_agent) VALUES (:ts, :p, :sid, :u, :r, :i, :ua)');
    $stmt->execute([':ts' => $ts, ':p' => $page, ':sid' => $sessionId, ':u' => $username, ':r' => $role, ':i' => $ip, ':ua' => $ua]);
    echo json_encode(['success' => true]);
    exit;
}

if ($m === 'GET') {
    requireRole('owner');
    $period = isset($_GET['period']) ? $_GET['period'] : '24h';
    $now = time();

    switch ($period) {
        case '1h':  $since = ($now - 3600) * 1000; break;
        case '7d':  $since = ($now - 604800) * 1000; break;
        case '30d': $since = ($now - 2592000) * 1000; break;
        default:    $since = ($now - 86400) * 1000; break; // 24h
    }

    // Total views
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM visitors WHERE ts >= :since');
    $stmt->execute([':since' => $since]);
    $totalViews = (int)$stmt->fetchColumn();

    // Unique sessions
    $stmt = $pdo->prepare('SELECT COUNT(DISTINCT session_id) FROM visitors WHERE ts >= :since AND session_id != ""');
    $stmt->execute([':since' => $since]);
    $uniqueSessions = (int)$stmt->fetchColumn();

    // Currently online (last 5 minutes)
    $fiveMinAgo = ($now - 300) * 1000;
    $stmt = $pdo->prepare('SELECT COUNT(DISTINCT session_id) FROM visitors WHERE ts >= :since AND session_id != ""');
    $stmt->execute([':since' => $fiveMinAgo]);
    $onlineNow = (int)$stmt->fetchColumn();

    // Per-page breakdown
    $stmt = $pdo->prepare('SELECT page, COUNT(*) as views, COUNT(DISTINCT session_id) as unique_visitors FROM visitors WHERE ts >= :since GROUP BY page ORDER BY views DESC');
    $stmt->execute([':since' => $since]);
    $pages = $stmt->fetchAll();

    // Per-role breakdown
    $stmt = $pdo->prepare('SELECT role, COUNT(*) as views FROM visitors WHERE ts >= :since AND role != "" GROUP BY role ORDER BY views DESC');
    $stmt->execute([':since' => $since]);
    $roles = $stmt->fetchAll();

    // Recent visitors (last 50)
    $stmt = $pdo->prepare('SELECT ts, page, username, role, ip FROM visitors WHERE ts >= :since ORDER BY ts DESC LIMIT 50');
    $stmt->execute([':since' => $since]);
    $recent = $stmt->fetchAll();

    echo json_encode([
        'period' => $period,
        'total_views' => $totalViews,
        'unique_sessions' => $uniqueSessions,
        'online_now' => $onlineNow,
        'pages' => $pages,
        'roles' => $roles,
        'recent' => $recent
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
