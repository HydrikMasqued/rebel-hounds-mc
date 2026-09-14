<?php
/**
 * Rebel Hounds MC — Media management API (database-backed)
 * GET    /api-media.php                       → list all gallery items
 * GET    /api-media.php?type=videos            → list all video items
 * POST   /api-media.php { url, caption }       → add gallery item (officer+)
 * POST   /api-media.php { embedUrl, title }    → add video (officer+)
 * DELETE /api-media.php { url, type }          → remove item (officer+)
 */
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method = $_SERVER['REQUEST_METHOD'];

function ensureMediaTable($pdo) {
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS media (" .
        "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
        "type ENUM('image','video') NOT NULL DEFAULT 'image', " .
        "url VARCHAR(500) NOT NULL DEFAULT '', " .
        "embed_url VARCHAR(500) NOT NULL DEFAULT '', " .
        "caption VARCHAR(300) NOT NULL DEFAULT '', " .
        "title VARCHAR(200) NOT NULL DEFAULT '', " .
        "description VARCHAR(500) NOT NULL DEFAULT '', " .
        "added_by VARCHAR(64) NOT NULL DEFAULT '', " .
        "ts BIGINT NOT NULL DEFAULT 0" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function isOfficer() {
    $r = getRole();
    return $r === 'officer' || $r === 'owner';
}

try {
    $pdo = db();
    ensureMediaTable($pdo);
    // Auto-migrate gallery.json if media table is empty
    $count = $pdo->query('SELECT COUNT(*) FROM media')->fetchColumn();
    if ($count == 0) {
        $galleryFile = __DIR__ . '/gallery.json';
        if (file_exists($galleryFile)) {
            $raw = @file_get_contents($galleryFile);
            $items = json_decode($raw, true);
            if (is_array($items) && count($items) > 0) {
                $stmt = $pdo->prepare('INSERT INTO media (type, url, caption, added_by, ts) VALUES (?, ?, ?, ?, ?)');
                foreach ($items as $item) {
                    $url = $item['url'] ?? '';
                    $caption = $item['caption'] ?? '';
                    $type = ($item['type'] ?? '') === 'video' ? 'video' : 'image';
                    $addedBy = $item['addedBy'] ?? 'Club';
                    $ts = $item['ts'] ?? time();
                    $stmt->execute([$type, $url, $caption, $addedBy, $ts]);
                }
            }
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_init_failed']);
    exit;
}

// GET — list items (public)
if ($method === 'GET') {
    $type = isset($_GET['type']) ? $_GET['type'] : 'gallery';
    if ($type === 'videos') {
        $stmt = $pdo->prepare('SELECT * FROM media WHERE type = ? ORDER BY ts DESC LIMIT 200');
        $stmt->execute(['video']);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM media WHERE type IN (?, ?) ORDER BY ts DESC LIMIT 500');
        $stmt->execute(['image', 'video']);
    }
    $rows = $stmt->fetchAll();
    $items = array_map(function($r) {
        $item = [
            'id' => (int)$r['id'],
            'type' => $r['type'],
            'url' => $r['url'],
            'caption' => $r['caption'],
            'addedBy' => $r['added_by'],
            'ts' => (int)$r['ts']
        ];
        if ($r['type'] === 'video') {
            $item['embedUrl'] = $r['embed_url'];
            $item['title'] = $r['title'];
            $item['description'] = $r['description'];
        }
        return $item;
    }, $rows);
    echo json_encode(['items' => $items]);
    exit;
}

// POST — add item (requires officer+)
if ($method === 'POST') {
    if (!isLoggedIn() || !isOfficer()) {
        http_response_code(403);
        echo json_encode(['error' => 'forbidden', 'message' => 'Only officers and owners can add media.']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    // Video
    if (isset($body['embedUrl']) && !empty($body['embedUrl'])) {
        $embedUrl = trim($body['embedUrl']);
        $title = isset($body['title']) ? mb_substr(trim($body['title']), 0, 200) : '';
        $description = isset($body['description']) ? mb_substr(trim($body['description']), 0, 500) : '';
        $addedBy = $_SESSION['rh_username'] ?? 'Officer';
        $ts = time();

        $stmt = $pdo->prepare('INSERT INTO media (type, url, embed_url, caption, title, description, added_by, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute(['video', '', $embedUrl, '', $title, $description, $addedBy, $ts]);
        $id = $pdo->lastInsertId();

        echo json_encode(['success' => true, 'item' => [
            'id' => (int)$id, 'type' => 'video', 'url' => '', 'embedUrl' => $embedUrl,
            'caption' => '', 'title' => $title, 'description' => $description,
            'addedBy' => $addedBy, 'ts' => $ts
        ]]);
        exit;
    }

    // Gallery item
    $url = isset($body['url']) ? trim($body['url']) : '';
    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['error' => 'URL required']);
        exit;
    }
    $caption = isset($body['caption']) ? mb_substr(trim($body['caption']), 0, 300) : '';
    $isVidUrl = preg_match('/\.(mp4|webm|mov|m4v|avi)(\?|$)/i', $url);
    $mediaType = $isVidUrl ? 'video' : 'image';
    $addedBy = $_SESSION['rh_username'] ?? 'Officer';
    $ts = time();

    $stmt = $pdo->prepare('INSERT INTO media (type, url, embed_url, caption, title, description, added_by, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$mediaType, $url, '', $caption, '', '', $addedBy, $ts]);
    $id = $pdo->lastInsertId();

    echo json_encode(['success' => true, 'item' => [
        'id' => (int)$id, 'type' => $mediaType, 'url' => $url, 'caption' => $caption,
        'addedBy' => $addedBy, 'ts' => $ts
    ]]);
    exit;
}

// DELETE — remove item (requires officer+)
if ($method === 'DELETE') {
    if (!isLoggedIn() || !isOfficer()) {
        http_response_code(403);
        echo json_encode(['error' => 'forbidden', 'message' => 'Only officers and owners can delete media.']);
        exit;
    }

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) $body = [];

    $url = isset($body['url']) ? trim($body['url']) : '';
    $mediaType = isset($body['type']) ? $body['type'] : 'gallery';

    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['error' => 'URL required to delete']);
        exit;
    }

    // Try to find and delete by url (or embed_url for videos)
    if ($mediaType === 'video') {
        $stmt = $pdo->prepare('SELECT id, url FROM media WHERE embed_url = ? AND type = ? LIMIT 1');
        $stmt->execute([$url, 'video']);
    } else {
        $stmt = $pdo->prepare('SELECT id, url FROM media WHERE url = ? LIMIT 1');
        $stmt->execute([$url]);
    }
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Item not found']);
        exit;
    }

    // Delete physical file if it's a local upload
    $filePath = __DIR__ . '/' . $row['url'];
    if (strpos($row['url'], 'media-uploads/') === 0 && file_exists($filePath)) {
        @unlink($filePath);
    }

    $delStmt = $pdo->prepare('DELETE FROM media WHERE id = ?');
    $delStmt->execute([$row['id']]);

    // Log
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_logs (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ts BIGINT NOT NULL DEFAULT 0, username VARCHAR(64) NOT NULL DEFAULT '', role VARCHAR(16) NOT NULL DEFAULT '', action VARCHAR(64) NOT NULL DEFAULT '', store_key VARCHAR(64) NOT NULL DEFAULT '', detail TEXT, ip VARCHAR(45) NOT NULL DEFAULT '') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $logStmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
        $logStmt->execute([
            ':ts' => (int)(time() * 1000),
            ':u' => $_SESSION['rh_username'] ?? '',
            ':r' => $_SESSION['rh_role'] ?? '',
            ':a' => 'media_delete',
            ':k' => 'media',
            ':d' => 'Deleted ' . $mediaType . ': ' . $url,
            ':i' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception $e) {}

    echo json_encode(['success' => true, 'deleted' => $url]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
