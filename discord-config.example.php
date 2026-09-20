<?php
// Discord integration settings - EXAMPLE TEMPLATE.
// Copy this file to discord-config.php and fill in your values.
// discord-config.php is git-ignored so the webhook URL never lands in git.
//
// HOW TO CONNECT A CHANNEL:
// 1. In Discord, right-click the channel for blog announcements
//    -> Edit Channel -> Integrations -> Webhooks -> New Webhook.
// 2. Copy the Webhook URL and paste it below as blog_webhook.
// 3. Upload discord-config.php to the live server (Plesk File Manager,
//    same folder as api-blog.php). It survives git pulls.
// 4. Log in as officer/owner and open
//    https://rebelhoundsmcfivem.com/api-discord-test.php
//    to send a test ping.
return [
    // Paste your Discord channel webhook URL here. Leave empty to disable.
    'blog_webhook' => '',
    // Ping text placed above the announcement. Use '@everyone', '@here',
    // a role mention like '<@&ROLE_ID>', or '' for no ping.
    'blog_ping' => '@everyone',
    // Set to false to pause announcements without deleting the URL.
    'blog_enabled' => true,
    // Public base URL of the website, used to build "Read more" links.
    'site_url' => 'https://rebelhoundsmcfivem.com',
];
