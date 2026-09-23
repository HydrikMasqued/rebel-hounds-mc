<?php
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error'=>'Not logged in']); exit; }

try {
    $pdo = db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS map_blips (" .
        "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
        "name VARCHAR(200) NOT NULL DEFAULT '', " .
        "description TEXT, " .
        "notes TEXT, " .
        "meta JSON, " .
        "latitude DOUBLE NOT NULL DEFAULT 0, " .
        "longitude DOUBLE NOT NULL DEFAULT 0, " .
        "category_id INT UNSIGNED DEFAULT NULL, " .
        "icon VARCHAR(50) NOT NULL DEFAULT 'marker', " .
        "color VARCHAR(20) NOT NULL DEFAULT '#d4af37', " .
        "angle INT UNSIGNED NOT NULL DEFAULT 0, " .
        "map_context VARCHAR(40) NOT NULL DEFAULT 'los_santos', " .
        "created_at VARCHAR(30) NOT NULL, " .
        "updated_at VARCHAR(30) NOT NULL" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    foreach ([
        "ALTER TABLE map_blips ADD COLUMN notes TEXT",
        "ALTER TABLE map_blips ADD COLUMN meta JSON",
        "ALTER TABLE map_blips ADD COLUMN map_context VARCHAR(40) NOT NULL DEFAULT 'los_santos'"
    ] as $alterSql) {
        try { $pdo->exec($alterSql); } catch (PDOException $e) {}
    }
    // Older MySQL/MariaDB may reject JSON; keep meta as text if needed.
    try {
        $hasMeta = false;
        foreach ($pdo->query('SHOW COLUMNS FROM map_blips') as $col) {
            if (($col['Field'] ?? '') === 'meta') { $hasMeta = true; break; }
        }
        if (!$hasMeta) {
            try { $pdo->exec('ALTER TABLE map_blips ADD COLUMN meta JSON'); }
            catch (PDOException $e) { $pdo->exec('ALTER TABLE map_blips ADD COLUMN meta TEXT'); }
        }
    } catch (PDOException $e) {}
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS map_categories (" .
        "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
        "name VARCHAR(100) NOT NULL DEFAULT '', " .
        "color VARCHAR(20) NOT NULL DEFAULT '#d4af37', " .
        "icon VARCHAR(50) NOT NULL DEFAULT 'marker'" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS map_drawings (" .
        "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
        "type VARCHAR(20) NOT NULL DEFAULT 'stroke', " .
        "color VARCHAR(20) NOT NULL DEFAULT '#ff4d6d', " .
        "width INT UNSIGNED NOT NULL DEFAULT 3, " .
        "points JSON NOT NULL, " .
        "created_at VARCHAR(30) NOT NULL" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS map_territories (" .
        "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, " .
        "gang_name VARCHAR(120) NOT NULL DEFAULT '', " .
        "color VARCHAR(20) NOT NULL DEFAULT '#c0392b', " .
        "logo_url VARCHAR(500) NOT NULL DEFAULT '', " .
        "hq_lat DOUBLE DEFAULT NULL, " .
        "hq_lng DOUBLE DEFAULT NULL, " .
        "zone JSON NOT NULL, " .
        "notes TEXT, " .
        "created_at VARCHAR(30) NOT NULL, " .
        "updated_at VARCHAR(30) NOT NULL" .
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
} catch (PDOException $e) {
    error_log('map db unavailable: ' . $e->getMessage());
    jerr('Database unavailable', 500);
}

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = preg_replace('#^.*/api-map\.php#', '', $path);
$parts = array_values(array_filter(explode('/', $path)));
$resource = $parts[0] ?? '';
$id = isset($parts[1]) ? (int)$parts[1] : null;

$m = $_SERVER['REQUEST_METHOD'];

// GET - read
if ($m === 'GET') {
    if ($resource === 'blips') {
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM map_blips WHERE id = :id');
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            if (!$row) jerr('Not found', 404);
            $row['latitude'] = (float)$row['latitude'];
            $row['longitude'] = (float)$row['longitude'];
            $row['category_id'] = $row['category_id'] !== null ? (int)$row['category_id'] : null;
            $row['angle'] = (int)$row['angle'];
            jout($row);
        }
        $cat = isset($_GET['category']) ? (int)$_GET['category'] : null;
        if ($cat) {
            $stmt = $pdo->prepare('SELECT * FROM map_blips WHERE category_id = :cat ORDER BY id');
            $stmt->execute([':cat' => $cat]);
        } else {
            $stmt = $pdo->query('SELECT * FROM map_blips ORDER BY id');
        }
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['latitude'] = (float)$r['latitude'];
            $r['longitude'] = (float)$r['longitude'];
            $r['category_id'] = $r['category_id'] !== null ? (int)$r['category_id'] : null;
            $r['angle'] = (int)$r['angle'];
        }
        jout($rows);
    }
    if ($resource === 'categories') {
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM map_categories WHERE id = :id');
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            if (!$row) jerr('Not found', 404);
            $row['id'] = (int)$row['id'];
            jout($row);
        }
        $stmt = $pdo->query('SELECT * FROM map_categories ORDER BY id');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) { $r['id'] = (int)$r['id']; }
        jout($rows);
    }
    if ($resource === 'drawings') {
        $stmt = $pdo->query('SELECT * FROM map_drawings ORDER BY id');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['width'] = (int)$r['width'];
            $r['points'] = json_decode($r['points'], true);
        }
        jout($rows);
    }
    if ($resource === 'territories') {
        $normTerr = function($r) {
            $r['id'] = (int)$r['id'];
            $r['zone'] = json_decode($r['zone'], true) ?: [];
            $r['hq_lat'] = $r['hq_lat'] !== null ? (float)$r['hq_lat'] : null;
            $r['hq_lng'] = $r['hq_lng'] !== null ? (float)$r['hq_lng'] : null;
            return $r;
        };
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM map_territories WHERE id = :id');
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            if (!$row) jerr('Not found', 404);
            jout($normTerr($row));
        }
        $rows = $pdo->query('SELECT * FROM map_territories ORDER BY id')->fetchAll();
        jout(array_map($normTerr, $rows));
    }
    if ($resource === 'export') {
        $blips = $pdo->query('SELECT * FROM map_blips ORDER BY id')->fetchAll();
        $cats = $pdo->query('SELECT * FROM map_categories ORDER BY id')->fetchAll();
        $terrs = $pdo->query('SELECT * FROM map_territories ORDER BY id')->fetchAll();
        foreach ($blips as &$b) { $b['latitude']=(float)$b['latitude']; $b['longitude']=(float)$b['longitude']; $b['category_id']=$b['category_id']!==null?(int)$b['category_id']:null; $b['angle']=(int)$b['angle']; }
        foreach ($cats as &$c) { $c['id']=(int)$c['id']; }
        foreach ($terrs as &$t) { $t['id']=(int)$t['id']; $t['zone']=json_decode($t['zone'], true) ?: []; $t['hq_lat']=$t['hq_lat']!==null?(float)$t['hq_lat']:null; $t['hq_lng']=$t['hq_lng']!==null?(float)$t['hq_lng']:null; }
        jout(['blips'=>$blips, 'categories'=>$cats, 'territories'=>$terrs, 'exportedAt'=>date('c')]);
    }
    if ($resource === 'search' && isset($parts[1])) {
        $q = '%' . $parts[1] . '%';
        $stmt = $pdo->prepare('SELECT * FROM map_blips WHERE name LIKE :q OR description LIKE :q OR notes LIKE :q ORDER BY id');
        $stmt->execute([':q' => $q]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) { $r['latitude']=(float)$r['latitude']; $r['longitude']=(float)$r['longitude']; $r['category_id']=$r['category_id']!==null?(int)$r['category_id']:null; $r['angle']=(int)$r['angle']; }
        jout($rows);
    }
    jerr('Not found', 404);
}

// POST - create
if ($m === 'POST') {
    requireRole('officer');
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) jerr('Invalid data');

    if ($resource === 'blips') {
        $name = trim($body['name'] ?? '');
        if (!$name) jerr('Name required');
        $meta = $body['meta'] ?? null;
        if (is_array($meta)) {
            $filtered = array_filter($meta, function($v) { return $v !== null && $v !== ''; });
            $meta = $filtered ? json_encode($filtered, JSON_UNESCAPED_UNICODE) : null;
        } elseif ($meta === '' || $meta === false) {
            $meta = null;
        } elseif ($meta !== null && !is_string($meta)) {
            $meta = json_encode($meta, JSON_UNESCAPED_UNICODE);
        }
        $now = date('c');
        try {
            $stmt = $pdo->prepare('INSERT INTO map_blips (name, description, notes, meta, latitude, longitude, category_id, icon, color, angle, map_context, created_at, updated_at) VALUES (:n, :d, :notes, :meta, :lat, :lng, :cat, :icon, :col, :ang, :ctx, :created, :updated)');
            $ok = $stmt->execute([
                ':n' => $name,
                ':d' => (string)($body['description'] ?? ''),
                ':notes' => (string)($body['notes'] ?? ''),
                ':meta' => $meta,
                ':lat' => (float)($body['latitude'] ?? 0),
                ':lng' => (float)($body['longitude'] ?? 0),
                ':cat' => ($body['category_id'] === '' || $body['category_id'] === null) ? null : $body['category_id'],
                ':icon' => $body['icon'] !== null && $body['icon'] !== '' ? $body['icon'] : 'marker',
                ':col' => $body['color'] ?: '#d4af37',
                ':ang' => (int)(isset($body['angle']) ? $body['angle'] : ($body['rotation'] ?? 0)),
                ':ctx' => $body['map_context'] ?: 'los_santos',
                ':created' => $now,
                ':updated' => $now
            ]);
            if (!$ok) jerr('Insert failed', 500);
        } catch (PDOException $e) {
            error_log('blip insert failed: ' . $e->getMessage());
            jerr('Blip insert failed: ' . $e->getMessage(), 500);
        }
        $newId = $pdo->lastInsertId();
        jout(['id' => (int)$newId]);
    }
    if ($resource === 'categories') {
        $name = trim($body['name'] ?? '');
        if (!$name) jerr('Name required');
        $stmt = $pdo->prepare('INSERT INTO map_categories (name, color, icon) VALUES (:n, :c, :i)');
        $stmt->execute([':n' => $name, ':c' => $body['color'] ?? '#d4af37', ':i' => $body['icon'] ?? 'marker']);
        $newId = $pdo->lastInsertId();
        jout(['id' => (int)$newId]);
    }
    if ($resource === 'drawings') {
        $stmt = $pdo->prepare('INSERT INTO map_drawings (type, color, width, points, created_at) VALUES (:t, :c, :w, :p, :created)');
        $stmt->execute([
            ':t' => $body['type'] ?? 'stroke',
            ':c' => $body['color'] ?? '#ff4d6d',
            ':w' => (int)($body['width'] ?? 3),
            ':p' => json_encode($body['points'] ?? []),
            ':created' => date('c')
        ]);
        $newId = $pdo->lastInsertId();
        jout(['id' => (int)$newId]);
    }
    if ($resource === 'territories') {
        $name = trim($body['gang_name'] ?? '');
        if (!$name) jerr('Gang name required');
        $zone = $body['zone'] ?? [];
        if (!is_array($zone) || count($zone) < 3) jerr('Zone needs at least 3 points');
        $now = date('c');
        $stmt = $pdo->prepare('INSERT INTO map_territories (gang_name, color, logo_url, hq_lat, hq_lng, zone, notes, created_at, updated_at) VALUES (:n, :c, :logo, :hlat, :hlng, :zone, :notes, :created, :updated)');
        $stmt->execute([
            ':n' => $name,
            ':c' => $body['color'] ?? '#c0392b',
            ':logo' => $body['logo_url'] ?? '',
            ':hlat' => (isset($body['hq_lat']) && $body['hq_lat'] !== null && $body['hq_lat'] !== '') ? (float)$body['hq_lat'] : null,
            ':hlng' => (isset($body['hq_lng']) && $body['hq_lng'] !== null && $body['hq_lng'] !== '') ? (float)$body['hq_lng'] : null,
            ':zone' => json_encode(array_values($zone)),
            ':notes' => $body['notes'] ?? '',
            ':created' => $now,
            ':updated' => $now
        ]);
        jout(['id' => (int)$pdo->lastInsertId()]);
    }
    if ($resource === 'import') {
        $cats = $body['categories'] ?? [];
        $blips = $body['blips'] ?? [];
        $imported = 0;
        foreach ($cats as $c) {
            if (empty($c['name'])) continue;
            $stmt = $pdo->prepare('INSERT IGNORE INTO map_categories (name, color, icon) VALUES (:n, :c, :i)');
            $stmt->execute([':n'=>$c['name'], ':c'=>$c['color']??'#d4af37', ':i'=>$c['icon']??'marker']);
        }
        foreach ($blips as $b) {
            if (empty($b['name']) || !is_numeric($b['latitude'] ?? null) || !is_numeric($b['longitude'] ?? null)) continue;
            $metaImp = $b['meta'] ?? null;
            if (is_array($metaImp)) $metaImp = json_encode($metaImp);
            $stmt = $pdo->prepare('INSERT INTO map_blips (name, description, notes, meta, latitude, longitude, category_id, icon, color, angle, map_context, created_at, updated_at) VALUES (:n,:d,:notes,:meta,:lat,:lng,:cat,:icon,:col,:ang,:ctx,:c,:u)');
            $stmt->execute([
                ':n'=>$b['name'], ':d'=>$b['description']??'', ':notes'=>$b['notes']??'', ':meta'=>$metaImp ?: null,
                ':lat'=>(float)$b['latitude'], ':lng'=>(float)$b['longitude'],
                ':cat'=>$b['category_id']??null, ':icon'=>$b['icon']??'marker', ':col'=>$b['color']??'#d4af37',
                ':ang'=>(int)($b['angle']??$b['rotation']??0), ':ctx'=>$b['map_context']??'los_santos', ':c'=>date('c'), ':u'=>date('c')
            ]);
            $imported++;
        }
        jout(['success'=>true, 'imported'=>$imported]);
    }
    jerr('Not found', 404);
}

// PUT - update
if ($m === 'PUT') {
    requireRole('officer');
    if ($resource === 'blips' && $id) {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) jerr('Invalid data');
        $sets = [];
        $params = [':id' => $id];
        foreach (['name','description','notes','icon','color'] as $f) {
            if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        foreach (['latitude','longitude'] as $f) {
            if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = (float)$body[$f]; }
        }
        if (isset($body['category_id'])) { $sets[]='category_id=:cat'; $params[':cat']=$body['category_id']; }
        if (array_key_exists('angle', $body) || array_key_exists('rotation', $body)) {
            $rot = array_key_exists('angle', $body) ? $body['angle'] : $body['rotation'];
            $sets[]='angle=:ang'; $params[':ang']=(int)($rot ?? 0);
        }
        if (isset($body['map_context'])) { $sets[]='map_context=:ctx'; $params[':ctx']=$body['map_context']; }
        if (array_key_exists('meta', $body)) {
            $meta = $body['meta'];
            if (is_array($meta)) {
                $filtered = array_filter($meta, function($v) { return $v !== null && $v !== ''; });
                $meta = $filtered ? json_encode($filtered, JSON_UNESCAPED_UNICODE) : null;
            } elseif ($meta === '' || $meta === false) {
                $meta = null;
            } elseif ($meta !== null && !is_string($meta)) {
                $meta = json_encode($meta, JSON_UNESCAPED_UNICODE);
            }
            $sets[] = 'meta = :meta';
            $params[':meta'] = $meta;
        }
        $sets[] = 'updated_at = :updated';
        $params[':updated'] = date('c');
        if ($sets) {
            try {
                $stmt = $pdo->prepare('UPDATE map_blips SET ' . implode(',', $sets) . ' WHERE id = :id');
                $stmt->execute($params);
            } catch (PDOException $e) {
                error_log('blip update failed: ' . $e->getMessage());
                jerr('Blip update failed: ' . $e->getMessage(), 500);
            }
        }
        jout(['success'=>true]);
    }
    if ($resource === 'categories' && $id) {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        $sets = [];
        $params = [':id' => $id];
        foreach (['name','color','icon'] as $f) {
            if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if ($sets) {
            $stmt = $pdo->prepare('UPDATE map_categories SET ' . implode(',', $sets) . ' WHERE id = :id');
            $stmt->execute($params);
        }
        jout(['success'=>true]);
    }
    if ($resource === 'territories' && $id) {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) jerr('Invalid data');
        $sets = [];
        $params = [':id' => $id];
        foreach (['gang_name','color','logo_url','notes'] as $f) {
            if (isset($body[$f])) { $sets[] = "$f = :$f"; $params[":$f"] = $body[$f]; }
        }
        if (array_key_exists('zone', $body) && is_array($body['zone'])) { $sets[] = 'zone = :zone'; $params[':zone'] = json_encode(array_values($body['zone'])); }
        foreach (['hq_lat','hq_lng'] as $f) {
            if (array_key_exists($f, $body)) {
                $v = $body[$f];
                $sets[] = "$f = :$f";
                $params[":$f"] = ($v === null || $v === '') ? null : (float)$v;
            }
        }
        $sets[] = 'updated_at = :updated';
        $params[':updated'] = date('c');
        if ($sets) {
            $stmt = $pdo->prepare('UPDATE map_territories SET ' . implode(',', $sets) . ' WHERE id = :id');
            $stmt->execute($params);
        }
        jout(['success'=>true]);
    }
    jerr('Not found', 404);
}

// DELETE
if ($m === 'DELETE') {
    requireRole('officer');
    if ($resource === 'blips') {
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM map_blips WHERE id = :id');
            $stmt->execute([':id' => $id]);
        } else {
            $pdo->exec('DELETE FROM map_blips');
        }
        jout(['success'=>true]);
    }
    if ($resource === 'categories') {
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM map_categories WHERE id = :id');
            $stmt->execute([':id' => $id]);
        }
        jout(['success'=>true]);
    }
    if ($resource === 'drawings') {
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM map_drawings WHERE id = :id');
            $stmt->execute([':id' => $id]);
        } else {
            $pdo->exec('DELETE FROM map_drawings');
        }
        jout(['success'=>true]);
    }
    if ($resource === 'territories') {
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM map_territories WHERE id = :id');
            $stmt->execute([':id' => $id]);
        } else {
            $pdo->exec('DELETE FROM map_territories');
        }
        jout(['success'=>true]);
    }
    jerr('Not found', 404);
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
