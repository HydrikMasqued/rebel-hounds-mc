<?php
/**
 * Rebel Hounds MC — Auth helper for API endpoints.
 * Include this at the top of any API file that needs role-based access control.
 *
 * Usage:
 *   require_once __DIR__ . '/auth-require.php';
 *   requireRole('officer');   // exits with 403 if below this role
 *   $role = getRole();        // just get the role, no enforcement
 */

session_start();

$ROLE_LEVEL = ['prospect' => 1, 'patched' => 2, 'officer' => 3, 'owner' => 4];

function getRole() {
    return $_SESSION['rh_role'] ?? null;
}

function getRoleLevel() {
    global $ROLE_LEVEL;
    $r = getRole();
    return $ROLE_LEVEL[$r] ?? 0;
}

function isLoggedIn() {
    return getRole() !== null;
}

function requireRole($minRole) {
    global $ROLE_LEVEL;
    $min = $ROLE_LEVEL[$minRole] ?? 99;
    $cur = getRoleLevel();
    if ($cur < $min) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'forbidden', 'required' => $minRole, 'your_role' => getRole() ?? 'none']);
        exit;
    }
}
