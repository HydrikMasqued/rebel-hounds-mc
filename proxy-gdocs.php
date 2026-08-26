<?php
header('Content-Type: text/html; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=300');

$docId = isset($_GET['id']) ? $_GET['id'] : '';
if (empty($docId)) {
    http_response_code(400);
    echo 'Missing document ID';
    exit;
}

$safeId = preg_replace('/[^a-zA-Z0-9_-]/', '', $docId);
$url = 'https://docs.google.com/document/d/' . $safeId . '/export?format=html';

$ctx = stream_context_create([
    'http' => [
        'timeout' => 15,
        'follow_location' => true,
        'ignore_errors' => true
    ]
]);

$html = @file_get_contents($url, false, $ctx);
if ($html === false) {
    http_response_code(502);
    echo 'Failed to fetch document';
    exit;
}

$html = str_replace(
    ['<head>', '<body'],
    ['<head><base href="https://docs.google.com/" target="_blank">', '<body'],
    $html
);

echo $html;
