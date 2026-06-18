<?php
// ============================================================
//  mobile_server/model/stu/getSessionInfo.php
//  GET ?session_code=xxx&method=qr|code&student_id=xxx
//
//  Validates a session code and confirms the student
//  belongs to the correct group before returning session info.
//  Called by ScanAttendanceFlow BEFORE submitting attendance.
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

requireMethod('GET');

$sessionCode = trim($_GET['session_code'] ?? '');
$method      = trim($_GET['method']       ?? '');
$studentId   = (int) ($_GET['student_id'] ?? 0);

// ── Validate inputs ───────────────────────────────────────────
if (empty($sessionCode)) {
    sendResponse(false, 'session_code is required.', [], 400);
}
if (!in_array($method, ['qr', 'code'], true)) {
    sendResponse(false, 'method must be qr or code.', [], 400);
}
if ($studentId <= 0) {
    sendResponse(false, 'student_id is required.', [], 400);
}

$db = getDB();

// ── Get student's group ───────────────────────────────────────
$stuStmt = $db->prepare("SELECT group_id FROM student WHERE student_id = ? LIMIT 1");
$stuStmt->bind_param('i', $studentId);
$stuStmt->execute();
$student = $stuStmt->get_result()->fetch_assoc();
$stuStmt->close();

if (!$student) {
    sendResponse(false, 'Student not found.', [], 404);
}

$studentGroupId = (int) $student['group_id'];

// ── Find active session by code ───────────────────────────────
$field = $method === 'qr' ? 'qr_code' : 'numeric_code';

$sessStmt = $db->prepare("
    SELECT
        ases.session_id,
        ases.expires_at,
        ases.started_at,
        ases.rep_lat,
        ases.rep_lng,
        ases.radius_meters,
        ases.course_rep_id,
        cr.group_id   AS rep_group_id,
        c.course_id,
        c.code        AS course_code,
        c.title       AS course_name,
        c.level       AS course_level
    FROM attendance_session ases
    JOIN course_rep cr ON cr.id         = ases.course_rep_id
    JOIN timetable  t  ON t.timetable_id = ases.timetable_id
    JOIN course     c  ON c.course_id   = t.course_id
    WHERE ases.{$field} = ? AND ases.status = 'active'
    LIMIT 1
");
$sessStmt->bind_param('s', $sessionCode);
$sessStmt->execute();
$session = $sessStmt->get_result()->fetch_assoc();
$sessStmt->close();

if (!$session) {
    sendResponse(false, 'Invalid or expired session code. No active session found.', [], 404);
}

// ── Check expiry ──────────────────────────────────────────────
if (new DateTime() > new DateTime($session['expires_at'])) {
    sendResponse(false, 'This attendance session has expired.', [], 400);
}

// ── Check student belongs to correct group ────────────────────
$repGroupId = (int) $session['rep_group_id'];
if ($studentGroupId !== $repGroupId) {
    sendResponse(false, 'This session belongs to a different group. You cannot join this session.', [], 403);
}

// ── Check not already submitted ──────────────────────────────5.336779, -0.624978
$dupStmt = $db->prepare("
    SELECT record_id FROM attendance_record
    WHERE session_id = ? AND student_id = ? LIMIT 1
");
$dupStmt->bind_param('ii', $session['session_id'], $studentId);
$dupStmt->execute();
$duplicate = $dupStmt->get_result()->fetch_assoc();
$dupStmt->close();

if ($duplicate) {
    sendResponse(false, 'You have already marked attendance for this session.', [], 409);
}

sendResponse(true, 'Session is valid.', [
    'session_id'       => (int) $session['session_id'],
    'course_code'      => $session['course_code'],
    'course_name'      => $session['course_name'],
    'course_level'     => (int) $session['course_level'],
    'expires_at'       => $session['expires_at'],
    'started_at'       => $session['started_at'],
    'radius_meters'    => (int) $session['radius_meters'],
    'requires_location'=> $session['radius_meters'] > 0,
    'rep_lat'          => (float) $session['rep_lat'],
    'rep_lng'          => (float) $session['rep_lng'],
]);