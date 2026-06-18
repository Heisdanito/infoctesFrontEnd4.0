<?php
ob_start(); // Capture any stray output (warnings, notices) so they never corrupt JSON responses
// ============================================================
//  connections/database.php
//  Shared by mobile_server and web_server.
//  No CORS restrictions — open to all origins.
// ============================================================

// ── CORS — allow everything ───────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle OPTIONS preflight immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Database credentials ──────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_USER', 'root');       // ← change to your DB username
define('DB_PASS', '');           // ← change to your DB password
define('DB_NAME', 'infoctess');   // ← your database name
// define('DB_PORT', 3306);

/**
 * Returns a singleton mysqli connection.
 */
function getDB(): mysqli {
    static $conn = null;
    if ($conn !== null) return $conn;

    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        sendResponse(false, 'Database connection failed: ' . $conn->connect_error, [], 500);
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

/**
 * Send a JSON response and stop execution.
 */
function sendResponse(bool $success, string $message, array $data = [], int $code = 200): void {
    // Discard any buffered output (PHP warnings, notices, stray echoes)
    // so they never prepend garbage to the JSON response.
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json'); // Re-assert after ob_end_clean
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Read and decode the JSON body from the request.
 */
function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Sanitize a string — trim + strip HTML tags.
 */
function sanitize(string $value): string {
    return trim(strip_tags($value));
}

/**
 * Enforce HTTP method — kills with 405 if wrong.
 */
function requireMethod(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        sendResponse(false, 'Method not allowed. Expected: ' . strtoupper($method), [], 405);
    }
}

/**
 * Start PHP session safely.
 */
function startSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'domain'   => '',
            'secure'   => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

/**
 * Protect a route — user must be logged in.
 * Returns the session user array or kills with 401.
 */
function requireSession(?string $role = null): array {
    startSession();

    if (empty($_SESSION['user'])) {
        sendResponse(false, 'Unauthorized. Please log in.', [], 401);
    }

    $user = $_SESSION['user'];

    if ($role !== null && ($user['role'] ?? '') !== $role) {
        sendResponse(false, 'Access denied. Required role: ' . $role, [], 403);
    }

    return $user;
}

/**
 * Backward-compatible alias for requireSession()
 */
function requireAuth(?string $role = null): array {
    return requireSession($role);
}

// NOTE: startSession() is NOT called here automatically.
// Call it explicitly only in files that need PHP sessions (e.g. login, auth pages).
// JSON API endpoints (sessionHandler.php, lecDashboard.php, etc.) are stateless
// and must NOT call session_start() — it triggers a header-already-sent warning
// that corrupts the JSON response body.