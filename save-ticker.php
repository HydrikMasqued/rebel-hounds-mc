<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Method not allowed']); exit; }

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
    http_response_code(400); echo json_encode(['error'=>'Invalid data']); exit;
}

$items = [];
foreach ($data['items'] as $w) {
    if (!is_string($w)) continue;
    $w = trim(strip_tags($w));
    $w = mb_substr($w, 0, 40);
    if ($w !== '') $items[] = $w;
    if (count($items) >= 12) break;
}
if (!count($items)) { http_response_code(400); echo json_encode(['error'=>'Add at least one word']); exit; }

$sep = (isset($data['sep']) && is_string($data['sep'])) ? trim(strip_tags($data['sep'])) : '';
if ($sep === '') $sep = "\u{2022}";
$sep = mb_substr($sep, 0, 4);

$updated = (isset($data['updated']) && is_numeric($data['updated'])) ? (int)$data['updated'] : time();
if ($updated < 0) $updated = time();

$file = __DIR__ . '/ticker.json';
$out = ['sep'=>$sep, 'items'=>$items, 'updated'=>$updated];
if (@file_put_contents($file, json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
    http_response_code(500); echo json_encode(['error'=>'Server write failed (permissions)']); exit;
}
@chmod($file, 0666);
echo json_encode(['success'=>true]);
