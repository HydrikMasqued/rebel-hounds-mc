<?php
/**
 * Rebel Hounds MC - Owner control panel API.
 *
 * GET  /api-admin.php?action=health    - database + storage health report
 * GET  /api-admin.php?action=backup    - full JSON backup of every store
 * POST /api-admin.php?action=restore   - restore stores from a backup JSON
 * GET  /api-admin.php?action=settings  - site settings (announcement banner)
 * POST /api-admin.php?action=settings  - save site settings
 *
 * All actions are owner only and logged to site_logs.
 */
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$action = $_GET['action'] ?? '';
$m = $_SERVER['REQUEST_METHOD'];

// Settings GET is public (site announcement banner); all else is owner-only.
if (!($action === 'settings' && $m === 'GET')) {
    requireRole('owner');
}

try {
    $pdo = db();
} catch (PDOException $e) {
    error_log('admin api db unavailable: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

$STORE_KEYS = ['badges', 'roster', 'prospects', 'finance', 'settings'];

function ensureTables($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_data (k VARCHAR(64) NOT NULL PRIMARY KEY, data JSON NOT NULL, updated BIGINT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (k VARCHAR(64) NOT NULL PRIMARY KEY, v JSON NOT NULL, updated BIGINT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS ticker (id TINYINT UNSIGNED NOT NULL PRIMARY KEY, sep VARCHAR(8) NOT NULL, items JSON NOT NULL, updated BIGINT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_logs (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ts BIGINT NOT NULL DEFAULT 0, username VARCHAR(64) NOT NULL DEFAULT '', role VARCHAR(16) NOT NULL DEFAULT '', action VARCHAR(64) NOT NULL DEFAULT '', store_key VARCHAR(64) NOT NULL DEFAULT '', detail TEXT, ip VARCHAR(45) NOT NULL DEFAULT '') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function logAdminAction($pdo, $action, $detail) {
    try {
        $stmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
        $stmt->execute([
            ':ts' => (int)(time() * 1000),
            ':u' => $_SESSION['rh_username'] ?? '',
            ':r' => $_SESSION['rh_role'] ?? '',
            ':a' => $action,
            ':k' => 'admin',
            ':d' => $detail,
            ':i' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception $e) { /* logging failure is non-fatal */ }
}

function getSetting($pdo, $key, $default) {
    $stmt = $pdo->prepare('SELECT v FROM site_settings WHERE k = :k');
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch();
    if (!$row) return $default;
    $v = json_decode($row['v'], true);
    return is_array($v) ? $v : $default;
}

function putSetting($pdo, $key, $value) {
    $stmt = $pdo->prepare(
        'INSERT INTO site_settings (k, v, updated) VALUES (:k, :v, :u) ' .
        'ON DUPLICATE KEY UPDATE v = VALUES(v), updated = VALUES(updated)'
    );
    $stmt->execute([':k' => $key, ':v' => json_encode($value, JSON_UNESCAPED_SLASHES), ':u' => time()]);
}

try { ensureTables($pdo); } catch (PDOException $e) {
    error_log('admin api table init failed: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

/* ---- health report ---- */
if ($action === 'health' && $m === 'GET') {
    $out = ['db' => 'ok', 'php' => PHP_VERSION, 'time' => time()];

    $tables = [];
    try {
        $stmt = $pdo->query("SELECT table_name, table_rows, data_length, index_length FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name");
        foreach ($stmt->fetchAll() as $t) {
            $tables[] = [
                'name'  => $t['table_name'],
                'rows'  => (int)$t['table_rows'],
                'bytes' => (int)$t['data_length'] + (int)$t['index_length'],
            ];
        }
    } catch (Exception $e) { /* older MySQL: skip sizes */ }
    $out['tables'] = $tables;

    $counts = [];
    foreach (['users', 'site_logs', 'site_data', 'site_settings', 'ticker'] as $t) {
        try { $counts[$t] = (int)$pdo->query('SELECT COUNT(*) FROM `' . $t . '`')->fetchColumn(); }
        catch (Exception $e) { $counts[$t] = -1; }
    }
    $out['counts'] = $counts;

    $stores = [];
    try {
        foreach ($pdo->query('SELECT k, updated, LENGTH(data) AS bytes FROM site_data')->fetchAll() as $r) {
            $stores[] = ['key' => $r['k'], 'updated' => (int)$r['updated'], 'bytes' => (int)$r['bytes']];
        }
    } catch (Exception $e) {}
    $out['stores'] = $stores;

    $media = ['files' => 0, 'bytes' => 0];
    $dir = __DIR__ . '/media-uploads';
    if (is_dir($dir)) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)) as $f) {
            if ($f->isFile()) { $media['files']++; $media['bytes'] += $f->getSize(); }
        }
    }
    $out['media'] = $media;

    $out['last_log'] = null;
    try {
        $row = $pdo->query('SELECT ts, username, action, detail FROM site_logs ORDER BY id DESC LIMIT 1')->fetch();
        if ($row) $out['last_log'] = $row;
    } catch (Exception $e) {}

    jout($out);
}

/* ---- full backup ---- */
if ($action === 'backup' && $m === 'GET') {
    $out = [
        'format'   => 'rhmc-backup',
        'version'  => 1,
        'exported' => gmdate('c'),
        'stores'   => [],
        'ticker'   => null,
        'settings' => null,
    ];
    try {
        foreach ($pdo->query('SELECT k, data, updated FROM site_data')->fetchAll() as $r) {
            $out['stores'][$r['k']] = ['updated' => (int)$r['updated'], 'data' => json_decode($r['data'], true)];
        }
        $t = $pdo->query('SELECT sep, items, updated FROM ticker WHERE id = 1')->fetch();
        if ($t) {
            $out['ticker'] = ['sep' => $t['sep'], 'items' => json_decode($t['items'], true), 'updated' => (int)$t['updated']];
        }
        $out['settings'] = getSetting($pdo, 'announcement', ['enabled' => false, 'text' => '']);
    } catch (PDOException $e) {
        error_log('backup failed: ' . $e->getMessage());
        jerr('Backup failed', 500);
    }
    logAdminAction($pdo, 'backup_export', 'Exported full backup (' . count($out['stores']) . ' stores)');
    jout($out);
}

/* ---- restore ---- */
if ($action === 'restore' && $m === 'POST') {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 64 * 1024 * 1024) { http_response_code(413); echo json_encode(['error' => 'Backup too large']); exit; }
    $body = json_decode($raw, true);
    if (!is_array($body)) jerr('Invalid JSON');

    $restored = ['stores' => [], 'ticker' => false, 'settings' => false];

    if (isset($body['stores']) && is_array($body['stores'])) {
        $stmt = $pdo->prepare(
            'INSERT INTO site_data (k, data, updated) VALUES (:k, :d, :u) ' .
            'ON DUPLICATE KEY UPDATE data = VALUES(data), updated = VALUES(updated)'
        );
        foreach ($body['stores'] as $key => $val) {
            if (!is_string($key) || !in_array($key, $STORE_KEYS, true)) continue;
            $payload = (is_array($val) && array_key_exists('data', $val)) ? $val['data'] : $val;
            if (!is_array($payload)) continue;
            $upd = (is_array($val) && isset($val['updated'])) ? (int)$val['updated'] : time();
            if ($upd <= 0) $upd = time();
            $stmt->execute([':k' => $key, ':d' => json_encode($payload, JSON_UNESCAPED_SLASHES), ':u' => $upd]);
            $restored['stores'][] = $key;
        }
    }

    if (isset($body['ticker']) && is_array($body['ticker']) && isset($body['ticker']['items']) && is_array($body['ticker']['items'])) {
        $items = [];
        foreach ($body['ticker']['items'] as $w) {
            if (!is_string($w)) continue;
            $w = trim(strip_tags($w));
            if (function_exists('mb_substr')) $w = mb_substr($w, 0, 40); else $w = substr($w, 0, 40);
            if ($w !== '') $items[] = $w;
            if (count($items) >= 12) break;
        }
        if (count($items)) {
            $sep = (isset($body['ticker']['sep']) && is_string($body['ticker']['sep'])) ? trim(strip_tags($body['ticker']['sep'])) : '';
            if ($sep === '') $sep = ' * ';
            if (function_exists('mb_substr')) $sep = mb_substr($sep, 0, 4); else $sep = substr($sep, 0, 4);
            $stmt = $pdo->prepare(
                'INSERT INTO ticker (id, sep, items, updated) VALUES (1, :sep, :items, :u) ' .
                'ON DUPLICATE KEY UPDATE sep = VALUES(sep), items = VALUES(items), updated = VALUES(updated)'
            );
            $stmt->execute([':sep' => $sep, ':items' => json_encode(array_values($items), JSON_UNESCAPED_SLASHES), ':u' => time()]);
            $restored['ticker'] = true;
        }
    }

    if (isset($body['settings']) && is_array($body['settings'])) {
        $a = (isset($body['settings']['announcement']) && is_array($body['settings']['announcement'])) ? $body['settings']['announcement'] : $body['settings'];
        $text = isset($a['text']) ? trim((string)$a['text']) : '';
        if (function_exists('mb_substr')) $text = mb_substr($text, 0, 500); else $text = substr($text, 0, 500);
        putSetting($pdo, 'announcement', ['enabled' => !empty($a['enabled']), 'text' => $text]);
        $restored['settings'] = true;
    }

    logAdminAction($pdo, 'backup_restore', 'Restored backup: ' . implode(', ', $restored['stores']) . ($restored['ticker'] ? ', ticker' : '') . ($restored['settings'] ? ', settings' : ''));
    jout(['success' => true, 'restored' => $restored]);
}

/* ---- site settings (announcement banner) ---- */
if ($action === 'settings') {
    if ($m === 'GET') {
        jout(['announcement' => getSetting($pdo, 'announcement', ['enabled' => false, 'text' => ''])]);
    }
    if ($m === 'POST') {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body) || !isset($body['announcement']) || !is_array($body['announcement'])) jerr('Invalid data');
        $a = $body['announcement'];
        $text = isset($a['text']) ? trim((string)$a['text']) : '';
        if (function_exists('mb_substr')) $text = mb_substr($text, 0, 500); else $text = substr($text, 0, 500);
        putSetting($pdo, 'announcement', ['enabled' => !empty($a['enabled']), 'text' => $text]);
        logAdminAction($pdo, 'settings_update', 'Announcement ' . (empty($a['enabled']) ? 'disabled' : 'enabled') . ' (' . strlen($text) . ' chars)');
        jout(['success' => true]);
    }
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
