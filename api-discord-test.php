<?php
// Officer-only Discord test ping.
// Open https://rebelhoundsmcfivem.com/api-discord-test.php while logged in
// as officer/owner to verify the blog announcement webhook works.
require __DIR__ . '/db.php';
require __DIR__ . '/auth-require.php';
require __DIR__ . '/discord-notify.php';

requireRole('officer');

$result = discord_blog_ping(
    'Discord link test',
    'If you can read this in Discord, blog announcements are working.',
    discord_site_url() . '/blog',
    'Rebel Hounds MC'
);

jout(['success' => !empty($result['sent']), 'detail' => $result]);
