<?php
/**
 * Rebel Hounds MC - Account management endpoint (owner only).
 *
 * GET    /api-users.php          - list accounts
 * POST   /api-users.php          - create account   { username, password, role, display_name }
 * PUT    /api-users.php          - update account   { id, role?, display_name?, password? }
 * DELETE /api-users.php?id=N     - delete account
 *
 * Every change is written to site_logs.
 */
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

requireRole('owner');

try {
    $pdo = db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS users (" .
        "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
        "username VARCHAR(64) NOT NULL UNIQUE, " .
        "password_hash VARCHAR(255) NOT NULL, " .
        "role ENUM('owner','officer','patched','prospect') NOT NULL DEFAULT 'patched', " .
        "display_name VARCHAR(128) NOT NULL DEFAULT '', " .
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
} catch (PDOException $e) {
    error_log('users api db unavailable: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

$ROLES = ['owner', 'officer', 'patched', 'prospect'];

function logUserAction($pdo, $action, $detail) {
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS site_logs (" .
            "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
            "ts BIGINT NOT NULL DEFAULT 0, " .
            "username VARCHAR(64) NOT NULL DEFAULT '', " .
            "role VARCHAR(16) NOT NULL DEFAULT '', " .
            "action VARCHAR(64) NOT NULL DEFAULT '', " .
            "store_key VARCHAR(64) NOT NULL DEFAULT '', " .
            "detail TEXT, " .
            "ip VARCHAR(45) NOT NULL DEFAULT ''" .
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        $stmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
        $stmt->execute([
            ':ts' => (int)(time() * 1000),
            ':u' => $_SESSION['rh_username'] ?? '',
            ':r' => $_SESSION['rh_role'] ?? '',
            ':a' => $action,
            ':k' => 'users',
            ':d' => $detail,
            ':i' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception $e) { /* logging failure is non-fatal */ }
}

function countOwners($pdo) {
    return (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'owner'")->fetchColumn();
}

$m = $_SERVER['REQUEST_METHOD'];
$raw = file_get_contents('php://input');
if (strlen($raw) > 256 * 1024) { http_response_code(413); echo json_encode(['error' => 'Too large']); exit; }
$body = json_decode($raw, true);
if (!is_array($body)) $body = [];

/* ---- list ---- */
if ($m === 'GET') {
    $rows = $pdo->query('SELECT id, username, role, display_name, created_at FROM users ORDER BY id ASC')->fetchAll();
    jout(['users' => $rows]);
}

/* ---- create ---- */
if ($m === 'POST') {
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $role = (string)($body['role'] ?? 'patched');
    $display = trim((string)($body['display_name'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9_.\-]{3,32}$/', $username)) jerr('Username must be 3-32 chars: letters, numbers, dot, dash, underscore');
    if (strlen($password) < 8) jerr('Password must be at least 8 characters');
    if (!in_array($role, $ROLES, true)) jerr('Invalid role');
    if (strlen($display) > 128) jerr('Display name too long');
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :u');
    $stmt->execute([':u' => $username]);
    if ($stmt->fetch()) jerr('Username already taken', 409);
    $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role, display_name) VALUES (:u, :p, :r, :d)');
    $stmt->execute([':u' => $username, ':p' => password_hash($password, PASSWORD_DEFAULT), ':r' => $role, ':d' => $display]);
    logUserAction($pdo, 'user_create', 'Created account ' . $username . ' (' . $role . ')');
    jout(['success' => true]);
}

/* ---- update ---- */
if ($m === 'PUT') {
    $id = (int)($body['id'] ?? 0);
    $stmt = $pdo->prepare('SELECT id, username, role FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    if (!$user) jerr('User not found', 404);
    $changes = [];
    if (isset($body['role'])) {
        $role = (string)$body['role'];
        if (!in_array($role, $ROLES, true)) jerr('Invalid role');
        if ($user['role'] === 'owner' && $role !== 'owner' && countOwners($pdo) <= 1) jerr('Cannot demote the last owner');
        $stmt = $pdo->prepare('UPDATE users SET role = :r WHERE id = :id');
        $stmt->execute([':r' => $role, ':id' => $id]);
        $changes[] = 'role -> ' . $role;
    }
    if (isset($body['display_name'])) {
        $display = trim((string)$body['display_name']);
        if (strlen($display) > 128) jerr('Display name too long');
        $stmt = $pdo->prepare('UPDATE users SET display_name = :d WHERE id = :id');
        $stmt->execute([':d' => $display, ':id' => $id]);
        $changes[] = 'name updated';
    }
    if (isset($body['password']) && $body['password'] !== '') {
        $password = (string)$body['password'];
        if (strlen($password) < 8) jerr('Password must be at least 8 characters');
        $stmt = $pdo->prepare('UPDATE users SET password_hash = :p WHERE id = :id');
        $stmt->execute([':p' => password_hash($password, PASSWORD_DEFAULT), ':id' => $id]);
        $changes[] = 'password reset';
    }
    if (!count($changes)) jerr('Nothing to update');
    logUserAction($pdo, 'user_update', 'Updated ' . $user['username'] . ': ' . implode(', ', $changes));
    jout(['success' => true]);
}

/* ---- delete ---- */
if ($m === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $pdo->prepare('SELECT id, username, role FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    if (!$user) jerr('User not found', 404);
    if ($user['username'] === ($_SESSION['rh_username'] ?? '')) jerr('You cannot delete your own account');
    if ($user['role'] === 'owner' && countOwners($pdo) <= 1) jerr('Cannot delete the last owner');
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
    $stmt->execute([':id' => $id]);
    logUserAction($pdo, 'user_delete', 'Deleted account ' . $user['username'] . ' (' . $user['role'] . ')');
    jout(['success' => true]);
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
