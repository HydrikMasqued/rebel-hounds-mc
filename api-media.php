<?php
/**
 * Rebel Hounds MC — Media management API
 * GET    /api-media.php                    → list all gallery items
 * POST   /api-media.php { url, caption }   → add gallery item (officer+)
 * DELETE /api-media.php { url }            → remove gallery item (officer+)
 * GET    /api-media.php?type=videos        → list all video items
 * POST   /api-media.php { embedUrl, title, description }  → add video (officer+)
 * DELETE /api-media.php { url, type:video, embedUrl }     → remove video (officer+)
 */
require __DIR__ . '/auth-require.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method = $_SERVER['REQUEST_METHOD'];
$galleryFile = __DIR__ . '/gallery.json';
$videosFile = __DIR__ . '/videos.json';

function readJson($path) {
    if (!file_exists($path)) return [];
    $raw = @file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function writeJson($path, $data) {
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    @chmod($path, 0666);
}

function isOfficer() {
    $r = getRole();
    return $r === 'officer' || $r === 'owner';
}

// GET — list items (public)
if ($method === 'GET') {
    $type = isset($_GET['type']) ? $_GET['type'] : 'gallery';
    if ($type === 'videos') {
        echo json_encode(['items' => readJson($videosFile)]);
    } else {
        echo json_encode(['items' => readJson($galleryFile)]);
    }
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
        $videos = readJson($videosFile);
        $entry = [
            'embedUrl' => $embedUrl,
            'title' => $title,
            'description' => $description,
            'addedBy' => $_SESSION['rh_username'] ?? 'Officer',
            'ts' => time()
        ];
        array_unshift($videos, $entry);
        $videos = array_slice($videos, 0, 200);
        writeJson($videosFile, $videos);
        echo json_encode(['success' => true, 'item' => $entry]);
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
    $type = $isVidUrl ? 'video' : 'image';
    $gallery = readJson($galleryFile);
    $entry = [
        'url' => $url,
        'caption' => $caption,
        'type' => $type,
        'addedBy' => $_SESSION['rh_username'] ?? 'Officer',
        'ts' => time()
    ];
    array_unshift($gallery, $entry);
    $gallery = array_slice($gallery, 0, 500);
    writeJson($galleryFile, $gallery);
    echo json_encode(['success' => true, 'item' => $entry]);
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

    if ($mediaType === 'video') {
        $videos = readJson($videosFile);
        $found = false;
        foreach ($videos as $i => $v) {
            if (($v['embedUrl'] ?? '') === $url) {
                array_splice($videos, $i, 1);
                $found = true;
                break;
            }
        }
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Video not found']);
            exit;
        }
        writeJson($videosFile, $videos);
        echo json_encode(['success' => true, 'deleted' => $url]);
        exit;
    }

    // Gallery delete
    $gallery = readJson($galleryFile);
    $found = false;
    foreach ($gallery as $i => $g) {
        if (($g['url'] ?? '') === $url) {
            $deleted = array_splice($gallery, $i, 1)[0];
            $found = true;
            // Also try to delete the physical file if it's a local upload
            $filePath = __DIR__ . '/' . $url;
            if (strpos($url, 'media-uploads/') === 0 && file_exists($filePath)) {
                @unlink($filePath);
            }
            break;
        }
    }
    if (!$found) {
        http_response_code(404);
        echo json_encode(['error' => 'Gallery item not found']);
        exit;
    }
    writeJson($galleryFile, $gallery);

    // Log deletion
    try {
        require __DIR__ . '/db.php';
        $pdo = db();
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_logs (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ts BIGINT NOT NULL DEFAULT 0, username VARCHAR(64) NOT NULL DEFAULT '', role VARCHAR(16) NOT NULL DEFAULT '', action VARCHAR(64) NOT NULL DEFAULT '', store_key VARCHAR(64) NOT NULL DEFAULT '', detail TEXT, ip VARCHAR(45) NOT NULL DEFAULT '') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $logStmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
        $logStmt->execute([
            ':ts' => (int)(time() * 1000),
            ':u' => $_SESSION['rh_username'] ?? '',
            ':r' => $_SESSION['rh_role'] ?? '',
            ':a' => 'media_delete',
            ':k' => 'gallery',
            ':d' => 'Deleted ' . ($deleted['type'] ?? 'item') . ': ' . $url,
            ':i' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception $e) {}

    echo json_encode(['success' => true, 'deleted' => $url]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
