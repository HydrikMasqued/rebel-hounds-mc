<?php
/**
 * One-time migration: gallery.json + localStorage fallback → MySQL media table.
 * Run once: php migrate-media.php
 */
require __DIR__ . '/db.php';

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

$galleryFile = __DIR__ . '/gallery.json';
$count = 0;

if (file_exists($galleryFile)) {
    $raw = file_get_contents($galleryFile);
    $items = json_decode($raw, true);
    if (is_array($items)) {
        $stmt = $pdo->prepare('INSERT INTO media (type, url, caption, added_by, ts) VALUES (?, ?, ?, ?, ?)');
        foreach ($items as $item) {
            $url = $item['url'] ?? '';
            $caption = $item['caption'] ?? '';
            $type = ($item['type'] ?? '') === 'video' ? 'video' : 'image';
            $addedBy = $item['addedBy'] ?? 'Club';
            $ts = $item['ts'] ?? time();
            $stmt->execute([$type, $url, $caption, $addedBy, $ts]);
            $count++;
        }
    }
}

echo "Migrated $count items from gallery.json to media table.\n";
echo "You can safely delete gallery.json after verifying the data.\n";
