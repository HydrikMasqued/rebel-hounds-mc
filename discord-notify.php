<?php
// Shared Discord webhook helper for Rebel Hounds MC.
// Sends blog announcements to a Discord channel via webhook.
// Never throws - all failures return arrays so publishing flows
// are never broken by Discord outages or missing config.

function discord_config() {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $cfg = [
        'blog_webhook' => '',
        'blog_ping' => '@everyone',
        'blog_enabled' => true,
        'site_url' => 'https://rebelhoundsmcfivem.com',
    ];
    $file = __DIR__ . '/discord-config.php';
    if (is_readable($file)) {
        $custom = require $file;
        if (is_array($custom)) {
            foreach ($custom as $k => $v) $cfg[$k] = $v;
        }
    }
    return $cfg;
}

function discord_site_url() {
    $cfg = discord_config();
    return rtrim($cfg['site_url'], '/');
}

function discord_send_webhook($webhookUrl, array $payload) {
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($json === false) return ['sent' => false, 'reason' => 'encode_failed'];

    // Prefer cURL with short timeouts so publishing never hangs.
    if (function_exists('curl_init')) {
        $ch = curl_init($webhookUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($resp === false) return ['sent' => false, 'reason' => 'curl_error: ' . $err];
        if ($code < 200 || $code >= 300) return ['sent' => false, 'reason' => 'http_' . $code . ': ' . substr((string)$resp, 0, 200)];
        return ['sent' => true];
    }

    // Fallback: PHP streams.
    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $json,
            'timeout' => 6,
            'ignore_errors' => true,
        ],
    ]);
    $resp = @file_get_contents($webhookUrl, false, $ctx);
    if ($resp === false) return ['sent' => false, 'reason' => 'stream_failed'];
    return ['sent' => true];
}

function discord_plain_text($html, $max = 300) {
    $t = trim(preg_replace('/\s+/', ' ', strip_tags((string)$html)));
    if (strlen($t) > $max) $t = substr($t, 0, $max - 3) . '...';
    return $t;
}

// Posts a "new blog" announcement embed. Returns ['sent' => bool, ...].
function discord_blog_ping($title, $excerpt, $postUrl, $author) {
    $cfg = discord_config();
    if (empty($cfg['blog_enabled'])) return ['sent' => false, 'reason' => 'disabled'];
    if (empty($cfg['blog_webhook'])) return ['sent' => false, 'reason' => 'no_webhook_configured'];

    $title = discord_plain_text($title, 250);
    if ($title === '') $title = 'New blog post';
    $desc = discord_plain_text($excerpt, 300);
    $author = discord_plain_text($author, 100);
    if ($author === '') $author = 'Rebel Hounds MC';

    $ping = trim((string)$cfg['blog_ping']);
    $content = $ping !== '' ? $ping . ' - a new club blog post is live.' : 'A new club blog post is live.';

    $payload = [
        'content' => $content,
        'allowed_mentions' => ['parse' => ['everyone', 'roles']],
        'embeds' => [[
            'title' => $title,
            'description' => $desc,
            'url' => $postUrl,
            'color' => hexdec('c0392b'),
            'author' => ['name' => $author],
            'footer' => ['text' => 'Rebel Hounds MC'],
            'timestamp' => gmdate('c'),
        ]],
    ];

    return discord_send_webhook($cfg['blog_webhook'], $payload);
}
