<?php
/**
 * Rebel Hounds MC — Media upload handler (database-backed)
 * POST multipart/form-data → uploads file, saves to media table
 */
require __DIR__ . '/db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit; }

$uploadDir = __DIR__ . '/media-uploads';
if (!is_dir($uploadDir)) { @mkdir($uploadDir, 0777, true); }
@chmod($uploadDir, 0777);

// Ensure media table exists
try {
    $pdo = db();
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
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db_init_failed']);
    exit;
}

$caption = isset($_POST['caption']) ? trim($_POST['caption']) : '';
$caption = mb_substr($caption, 0, 300);
$imageUrl = isset($_POST['imageUrl']) ? trim($_POST['imageUrl']) : '';
$addedBy = session_status() === PHP_SESSION_ACTIVE ? ($_SESSION['rh_username'] ?? 'Member') : 'Member';
$ts = time();

// URL upload
if ($imageUrl !== '') {
    if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) { http_response_code(400); echo json_encode(['error'=>'Invalid URL']); exit; }
    $isVidUrl = preg_match('/\.(mp4|webm|mov|m4v|avi)(\?|$)/i', $imageUrl);
    $type = $isVidUrl ? 'video' : 'image';
    $stmt = $pdo->prepare('INSERT INTO media (type, url, caption, added_by, ts) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$type, $imageUrl, $caption, $addedBy, $ts]);
    echo json_encode(['success'=>true, 'url'=>$imageUrl, 'type'=>$type]);
    exit;
}

// File upload
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error'=>'No file received. Try a smaller file or check server limits.']);
    exit;
}
if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['file']['error'];
    $map = [
        UPLOAD_ERR_INI_SIZE => 'File too large for server (php.ini limit). Try a smaller file.',
        UPLOAD_ERR_FORM_SIZE => 'File too large.',
        UPLOAD_ERR_PARTIAL => 'Upload interrupted. Try again.',
        UPLOAD_ERR_NO_FILE => 'No file uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Server temp folder missing.',
        UPLOAD_ERR_CANT_WRITE => 'Server write failed.',
        UPLOAD_ERR_EXTENSION => 'Server blocked this file type.'
    ];
    $msg = isset($map[$code]) ? $map[$code] : 'Upload error code '.$code;
    http_response_code(400);
    echo json_encode(['error'=>$msg]);
    exit;
}

$file = $_FILES['file'];
$origName = $file['name'];
$tmpPath = $file['tmp_name'];
$size = $file['size'];

$allowedExt = ['jpg','jpeg','png','gif','webp','mp4','webm','mov','m4v','avi'];
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
    http_response_code(400);
    echo json_encode(['error'=>'File type not allowed. Images: jpg png gif webp | Videos: mp4 webm mov']);
    exit;
}

$isVideo = in_array($ext, ['mp4','webm','mov','m4v','avi'], true);
$maxSize = $isVideo ? 80*1024*1024 : 12*1024*1024;
if ($size > $maxSize) {
    http_response_code(400);
    echo json_encode(['error'=> ($isVideo ? 'Video too large. Max 80MB' : 'Image too large. Max 12MB') ]);
    exit;
}

$safeBase = preg_replace('/[^a-zA-Z0-9_-]/','_', pathinfo($origName, PATHINFO_FILENAME));
$safeBase = substr($safeBase, 0, 40);
if ($safeBase==='') $safeBase='upload';
try { $rand = bin2hex(random_bytes(4)); } catch(Exception $e) { $rand = substr(md5(uniqid()),0,8); }
$unique = $safeBase . '_' . time() . '_' . $rand . '.' . $ext;
$destPath = $uploadDir . '/' . $unique;

if (!@move_uploaded_file($tmpPath, $destPath)) {
    if (!@copy($tmpPath, $destPath)) {
        http_response_code(500);
        echo json_encode(['error'=>'Failed to save file. Folder may not be writable.']);
        exit;
    }
}
@chmod($destPath, 0644);

$url = 'media-uploads/' . $unique;
$type = $isVideo ? 'video' : 'image';

$stmt = $pdo->prepare('INSERT INTO media (type, url, caption, added_by, ts) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$type, $url, $caption, $addedBy, $ts]);

echo json_encode(['success'=>true, 'url'=>$url, 'type'=>$type]);
