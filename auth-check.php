<?php
/**
 * Rebel Hounds MC — Auth endpoint
 * POST /auth-check.php  { username, password } → { role, display_name }
 * GET  /auth-check.php  (session)              → { role, display_name }
 *
 * Roles: owner, officer, patched, prospect
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

session_start();

require_once __DIR__ . '/db.php';

/* ---- auto-create + seed users table ---- */
function seedUsers($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username     VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role         ENUM('owner','officer','patched','prospect') NOT NULL DEFAULT 'patched',
            display_name VARCHAR(128) NOT NULL DEFAULT '',
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($count == 0) {
        $accounts = [
            ['HFFH',            'HoundsForever', 'owner',    'Club Owner'],
            ['Officer',         'Officer2026',   'officer',  'Officer Account'],
            ['Patched',         'Patched2026',   'patched',  'Patched Member'],
            ['Prospect',        'Prospect2026',  'prospect', 'Prospect'],
        ];
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)");
        foreach ($accounts as $a) {
            $stmt->execute([$a[0], password_hash($a[1], PASSWORD_DEFAULT), $a[2], $a[3]]);
        }
    }
}

try {
    seedUsers($pdo);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_init_failed', 'detail' => $e->getMessage()]);
    exit;
}

/* ---- role hierarchy (higher = more access) ---- */
$ROLE_LEVEL = ['prospect' => 1, 'patched' => 2, 'officer' => 3, 'owner' => 4];

/* ---- GET: check existing session ---- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_SESSION['rh_role'])) {
        echo json_encode([
            'logged_in'   => true,
            'role'        => $_SESSION['rh_role'],
            'display_name'=> $_SESSION['rh_display'] ?? $_SESSION['rh_role'],
            'username'    => $_SESSION['rh_username'] ?? ''
        ]);
    } else {
        echo json_encode(['logged_in' => false]);
    }
    exit;
}

/* ---- POST: login ---- */
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing_credentials']);
    exit;
}

$stmt = $pdo->prepare("SELECT id, username, password_hash, role, display_name FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid_credentials']);
    exit;
}

$_SESSION['rh_role']      = $user['role'];
$_SESSION['rh_username']  = $user['username'];
$_SESSION['rh_display']   = $user['display_name'];
$_SESSION['rh_user_id']   = $user['id'];

echo json_encode([
    'logged_in'    => true,
    'role'         => $user['role'],
    'display_name' => $user['display_name'],
    'username'     => $user['username']
]);
