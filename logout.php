<?php
// logout.php — akhiri sesi.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

$u = current_user();
if ($u) audit('logout', (int)$u['id']);

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '',
              (bool)($p['secure'] ?? false), (bool)($p['httponly'] ?? true));
}
session_destroy();

header('Location: index.php');
exit;
