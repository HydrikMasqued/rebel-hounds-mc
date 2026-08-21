<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, max-age=30');

$serverId = isset($_GET['server']) ? preg_replace('/[^a-zA-Z0-9]/', '', $_GET['server']) : 'ogpvmv';
$url = 'https://frontend.cfx-services.net/api/servers/single/' . $serverId;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch server data', 'httpCode' => $httpCode]);
    exit;
}

header('X-Proxy-Cache: hit-' . date('c'));
echo $response;
