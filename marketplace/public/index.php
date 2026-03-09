<?php
/**
 * Standalone marketplace API (no Laravel). Use for local development.
 * Run: php -S localhost:8000 -t marketplace/public
 *
 * For production, use the Laravel app (see README and marketplace-skeleton).
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$baseDir = dirname(__DIR__);
$storageDir = $baseDir . '/storage';
$extensionsFile = $storageDir . '/extensions.json';

if (!is_file($extensionsFile)) {
    echo json_encode(['data' => []]);
    exit;
}

$extensions = json_decode(file_get_contents($extensionsFile), true) ?: [];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

// GET /api/extensions
if (($segments[0] ?? '') === 'api' && ($segments[1] ?? '') === 'extensions' && count($segments) === 2) {
    echo json_encode(['data' => $extensions]);
    exit;
}

// GET /api/extensions/{id}
if (($segments[0] ?? '') === 'api' && ($segments[1] ?? '') === 'extensions' && count($segments) === 3) {
    $id = $segments[2];
    foreach ($extensions as $ext) {
        if (($ext['id'] ?? '') === $id || ($ext['slug'] ?? '') === $id) {
            echo json_encode(['data' => $ext]);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Extension not found']);
    exit;
}

// GET /api/extensions/{id}/download
if (($segments[0] ?? '') === 'api' && ($segments[1] ?? '') === 'extensions' && count($segments) === 4 && ($segments[3] ?? '') === 'download') {
    $id = $segments[2];
    foreach ($extensions as $ext) {
        if (($ext['id'] ?? '') === $id || ($ext['slug'] ?? '') === $id) {
            $url = $ext['download_url'] ?? null;
            if ($url) {
                echo json_encode(['download_url' => $url, 'message' => 'Download from external URL']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Package file not available']);
            }
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Extension not found']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not found']);
