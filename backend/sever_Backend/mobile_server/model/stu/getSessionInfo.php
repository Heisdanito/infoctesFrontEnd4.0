<?php
// ============================================================
//  mobile_server/model/stu/getSessionInfo.php
//  GET - Validate session code and return session info
//  Query: ?session_code=xxx&method=qr|code
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed. Use GET.', [], 405);
}

$sessionCode = trim($_GET['session_code'] ?? '');
$method = trim($_GET['method'] ?? '');

if (empty($sessionCode)) {
    sendResponse(false, 'session_code is required.', [], 400);
}

if (!in_array($method, ['qr', 'code'])) {
    sendResponse(false, 'Invalid method.', [], 400);
}

$db = getDB();

// Find session
if ($method === 'qr') {
    $sql = "SELECT * FROM attendance_session WHERE qr_code = ? AND status = 'active' LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('s', $sessionCode);
} else {
    $sql = "SELECT * FROM attendance_session WHERE numeric_code = ? AND status = 'active' LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('s', $sessionCode);
}

if (!$stmt) {
    sendResponse(false, 'Server error.', [], 500);
}

$stmt->execute();
$session = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$session) {
    sendResponse(false, 'Invalid or expired session code.', [], 404);
}

// Check expiration
$expiresAt = new DateTime($session['expires_at']);
$now = new DateTime();
if ($now > $expiresAt) {
    sendResponse(false, 'This attendance session has expired.', [], 400);
}

// Get course info
$courseSql = "
    SELECT c.code AS course_code, c.title AS course_name, cr.group_id
    FROM course_rep cr
    JOIN course c ON c.course_id = cr.course_id
    WHERE cr.id = ?
    LIMIT 1
";

$courseStmt = $db->prepare($courseSql);
$courseStmt->bind_param('i', $session['course_rep_id']);
$courseStmt->execute();
$courseInfo = $courseStmt->get_result()->fetch_assoc();
$courseStmt->close();

sendResponse(true, 'Session is valid.', [
    'session_id' => (int) $session['session_id'],
    'course_code' => $courseInfo['course_code'] ?? 'N/A',
    'course_name' => $courseInfo['course_name'] ?? 'N/A',
    'expires_at' => $session['expires_at'],
    'started_at' => $session['started_at'],
]);