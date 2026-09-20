<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

try {
    $pdo = db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS blog_posts (" .
        "id VARCHAR(64) NOT NULL PRIMARY KEY, " .
        "slug VARCHAR(200) NOT NULL, " .
        "title VARCHAR(300) NOT NULL DEFAULT '', " .
        "excerpt VARCHAR(500) NOT NULL DEFAULT '', " .
        "content LONGTEXT NOT NULL, " .
        "author VARCHAR(100) NOT NULL DEFAULT 'Rebel Hounds MC', " .
        "pinned TINYINT(1) NOT NULL DEFAULT 0, " .
        "created_at VARCHAR(30) NOT NULL, " .
        "updated_at VARCHAR(30) NOT NULL, " .
        "date_display VARCHAR(60) NOT NULL DEFAULT '', " .
        "INDEX idx_pinned (pinned), " .
        "INDEX idx_created (created_at)" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
} catch (PDOException $e) {
    error_log('blog db unavailable: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

$m = $_SERVER['REQUEST_METHOD'];

if ($m === 'GET') {
    $id = isset($_GET['id']) ? trim($_GET['id']) : '';
    if ($id) {
        $stmt = $pdo->prepare('SELECT * FROM blog_posts WHERE id = :id OR slug = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) jerr('Post not found', 404);
        $row['pinned'] = (int)$row['pinned'];
        jout($row);
    }
    $stmt = $pdo->query('SELECT * FROM blog_posts ORDER BY pinned DESC, created_at DESC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) { $r['pinned'] = (int)$r['pinned']; }
    jout($rows);
}

if ($m === 'POST') {
    requireRole('officer');
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body) || empty($body['title']) || empty($body['content'])) jerr('Title and content required');

    $id = !empty($body['id']) ? trim($body['id']) : bin2hex(random_bytes(8));
    $slug = !empty($body['slug']) ? trim($body['slug']) : preg_replace('/[^a-z0-9]+/', '-', strtolower($body['title']));
    $slug = trim($slug, '-');
    $title = trim($body['title']);
    $excerpt = trim($body['excerpt'] ?? '');
    $content = $body['content'];
    $author = trim($body['author'] ?? 'Rebel Hounds MC');
    $pinned = !empty($body['pinned']) ? 1 : 0;
    $now = date('c');
    $dateDisplay = date('F j, Y', strtotime($now));

    if (!empty($body['createdAt'])) {
        $now = $body['createdAt'];
        $dateDisplay = date('F j, Y', strtotime($now));
    }
    if (!empty($body['dateDisplay'])) $dateDisplay = $body['dateDisplay'];

    $stmt = $pdo->prepare(
        'INSERT INTO blog_posts (id, slug, title, excerpt, content, author, pinned, created_at, updated_at, date_display) ' .
        'VALUES (:id, :slug, :title, :excerpt, :content, :author, :pinned, :created, :updated, :dd) ' .
        'ON DUPLICATE KEY UPDATE slug=VALUES(slug), title=VALUES(title), excerpt=VALUES(excerpt), ' .
        'content=VALUES(content), author=VALUES(author), pinned=VALUES(pinned), updated_at=VALUES(updated_at), date_display=VALUES(date_display)'
    );
    $stmt->execute([
        ':id' => $id, ':slug' => $slug, ':title' => $title, ':excerpt' => $excerpt,
        ':content' => $content, ':author' => $author, ':pinned' => $pinned,
        ':created' => $now, ':updated' => $now, ':dd' => $dateDisplay
    ]);

    // Discord announcement for genuinely new posts only.
    // Seed imports carry createdAt and edits carry id - both are skipped.
    $announced = false;
    if (empty($body['id']) && empty($body['createdAt'])) {
        try {
            require_once __DIR__ . '/discord-notify.php';
            $postUrl = discord_site_url() . '/blog?id=' . urlencode($id);
            $pingBody = $excerpt !== '' ? $excerpt : $content;
            $dr = discord_blog_ping($title, $pingBody, $postUrl, $author);
            $announced = !empty($dr['sent']);
        } catch (Exception $e) {}
    }

    // Log
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_logs (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ts BIGINT NOT NULL DEFAULT 0, username VARCHAR(64) NOT NULL DEFAULT '', role VARCHAR(16) NOT NULL DEFAULT '', action VARCHAR(64) NOT NULL DEFAULT '', store_key VARCHAR(64) NOT NULL DEFAULT '', detail TEXT, ip VARCHAR(45) NOT NULL DEFAULT '') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $logStmt = $pdo->prepare('INSERT INTO site_logs (ts, username, role, action, store_key, detail, ip) VALUES (:ts, :u, :r, :a, :k, :d, :i)');
        $logStmt->execute([
            ':ts' => (int)(time() * 1000),
            ':u' => $_SESSION['rh_username'] ?? '',
            ':r' => $_SESSION['rh_role'] ?? '',
            ':a' => 'blog_' . (isset($body['id']) ? 'update' : 'create'),
            ':k' => 'blog',
            ':d' => $title,
            ':i' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception $e) {}

    jout(['success' => true, 'id' => $id, 'announced' => $announced]);
}

if ($m === 'PUT') {
    requireRole('officer');
    $id = isset($_GET['id']) ? trim($_GET['id']) : '';
    if (!$id) jerr('Post ID required');

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) jerr('Invalid data');

    $sets = [];
    $params = [':id' => $id];
    $fields = ['title', 'excerpt', 'content', 'author'];
    foreach ($fields as $f) {
        if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
    }
    if (isset($body['pinned'])) { $sets[] = 'pinned = :pinned'; $params[':pinned'] = $body['pinned'] ? 1 : 0; }
    if (isset($body['slug'])) { $sets[] = 'slug = :slug'; $params[':slug'] = $body['slug']; }
    if (isset($body['dateDisplay'])) { $sets[] = 'date_display = :dd'; $params[':dd'] = $body['dateDisplay']; }
    $sets[] = 'updated_at = :updated';
    $params[':updated'] = date('c');

    if (empty($sets)) jerr('No fields to update');

    $stmt = $pdo->prepare('UPDATE blog_posts SET ' . implode(', ', $sets) . ' WHERE id = :id');
    $stmt->execute($params);
    jout(['success' => true]);
}

if ($m === 'DELETE') {
    requireRole('officer');
    $id = isset($_GET['id']) ? trim($_GET['id']) : '';
    if (!$id) jerr('Post ID required');
    $stmt = $pdo->prepare('DELETE FROM blog_posts WHERE id = :id');
    $stmt->execute([':id' => $id]);
    jout(['success' => true]);
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
