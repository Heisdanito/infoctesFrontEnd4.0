<?php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed. Use POST.', [], 405);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    sendResponse(false, 'Invalid JSON body.', [], 400);
}

$studentId   = (int)   ($body['student_id']    ?? 0);
$sessionCode = trim(    $body['session_code']   ?? '');
$method      = trim(    $body['method']         ?? '');
$studentLat  = (float) ($body['lat']            ?? 0);
$studentLng  = (float) ($body['lng']            ?? 0);
$deviceBuild = trim(    $body['device_build']   ?? '');

if ($studentId <= 0) {
    sendResponse(false, 'student_id is required.', [], 400);
}
if (empty($sessionCode)) {
    sendResponse(false, 'session_code is required.', [], 400);
}
if (!in_array($method, ['qr', 'code'], true)) {
    sendResponse(false, 'method must be qr or code.', [], 400);
}
if ($studentLat === 0.0 && $studentLng === 0.0) {
    sendResponse(false, 'GPS coordinates are required.', [], 400);
}

$db = getDB();

$stuStmt = $db->prepare("
    SELECT student_id, group_id, level, programme_id,
           CONCAT(first_name, ' ', last_name) AS full_name
    FROM student
    WHERE student_id = ?
    LIMIT 1
");
$stuStmt->bind_param('i', $studentId);
$stuStmt->execute();
$student = $stuStmt->get_result()->fetch_assoc();
$stuStmt->close();

if (!$student) {
    sendResponse(false, 'Student not found.', [], 404);
}

$studentGroupId = (int) $student['group_id'];

$periodStmt   = $db->query("SELECT period_id FROM academic_period WHERE is_active = 1 LIMIT 1");
$activePeriod = $periodStmt->fetch_assoc();

if (!$activePeriod) {
    sendResponse(false, 'No active academic period.', [], 404);
}

$periodId = (int) $activePeriod['period_id'];

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
    JOIN course_rep cr ON cr.id          = ases.course_rep_id
    JOIN timetable  t  ON t.timetable_id = ases.timetable_id
    JOIN course     c  ON c.course_id    = t.course_id
    WHERE ases.{$field}  = ?
      AND ases.status    = 'active'
      AND ases.period_id = ?
    LIMIT 1
");
$sessStmt->bind_param('si', $sessionCode, $periodId);
$sessStmt->execute();
$session = $sessStmt->get_result()->fetch_assoc();
$sessStmt->close();

if (!$session) {
    sendResponse(false, 'Invalid or inactive session code.', [], 404);
}

if (new DateTime() > new DateTime($session['expires_at'])) {
    sendResponse(false, 'This attendance session has expired.', [], 400);
}

$repGroupId = (int) $session['rep_group_id'];
if ($studentGroupId !== $repGroupId) {
    sendResponse(false, 'This session belongs to a different group. You cannot join this session.', [], 403);
}

$courseId = (int) $session['course_id'];

$regStmt = $db->prepare("
    SELECT id FROM course_registration
    WHERE student_id = ?
      AND course_id  = ?
      AND period_id  = ?
      AND status     = 'registered'
    LIMIT 1
");
$regStmt->bind_param('iii', $studentId, $courseId, $periodId);
$regStmt->execute();
$registration = $regStmt->get_result()->fetch_assoc();
$regStmt->close();

if (!$registration) {
    sendResponse(false, 'You are not registered for this course in the current academic period.', [], 403);
}

$dupStmt = $db->prepare("
    SELECT record_id FROM attendance_record
    WHERE session_id = ? AND student_id = ?
    LIMIT 1
");
$dupStmt->bind_param('ii', $session['session_id'], $studentId);
$dupStmt->execute();
$duplicate = $dupStmt->get_result()->fetch_assoc();
$dupStmt->close();

if ($duplicate) {
    sendResponse(false, 'You have already marked attendance for this session.', [], 409);
}

// ── GPS distance check ────────────────────────────────────────
$repLat       = (float) $session['rep_lat'];
$repLng       = (float) $session['rep_lng'];
$radiusMeters = (int)   $session['radius_meters'];

$distanceMeters = null;

if ($radiusMeters > 0) {
    // Haversine formula
    $earthRadius = 6371000;
    $latDiff     = deg2rad($studentLat - $repLat);
    $lngDiff     = deg2rad($studentLng - $repLng);
    $a = sin($latDiff / 2) * sin($latDiff / 2)
       + cos(deg2rad($repLat)) * cos(deg2rad($studentLat))
       * sin($lngDiff / 2) * sin($lngDiff / 2);
    $distanceMeters = (int) round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)));

    // ── Hard location gate — NO insertion if outside radius ───
    // No buffer. If student is beyond the rep's set radius, reject
    // immediately with a helpful message telling them how far they are.
    if ($distanceMeters > $radiusMeters) {
        $overshootMeters = $distanceMeters - $radiusMeters;
        sendResponse(false,
            "You are {$distanceMeters}m away from the class session. " .
            "Please move {$overshootMeters}m closer. " .
            "The allowed radius is {$radiusMeters}m.",
            [
                'distance_meters' => $distanceMeters,
                'radius_meters'   => $radiusMeters,
                'overshoot_meters'=> $overshootMeters,
            ],
        403);
    }
}

// ── All checks passed — INSERT attendance record ──────────────
$db->begin_transaction();

try {
    $insStmt = $db->prepare("
        INSERT INTO attendance_record
            (session_id, student_id, student_lat, student_lng,
             location_valid, method, device_build_number, status)
        VALUES (?, ?, ?, ?, 1, ?, ?, 'present')
    ");

    $insStmt->bind_param(
        'iiddss',
        $session['session_id'],
        $studentId,
        $studentLat,
        $studentLng,
        $method,
        $deviceBuild
    );
    $insStmt->execute();
    $recordId = $db->insert_id;
    $insStmt->close();

    $countStmt = $db->prepare("
        SELECT
            COUNT(*) AS total_submissions,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count
        FROM attendance_record
        WHERE session_id = ?
    ");
    $countStmt->bind_param('i', $session['session_id']);
    $countStmt->execute();
    $counts = $countStmt->get_result()->fetch_assoc();
    $countStmt->close();

    $db->commit();

    sendResponse(true, 'Attendance marked successfully.', [
        'record_id'       => $recordId,
        'status'          => 'present',
        'location_valid'  => true,
        'distance_meters' => $distanceMeters,
        'course' => [
            'code'  => $session['course_code'],
            'name'  => $session['course_name'],
            'level' => (int) $session['course_level'],
        ],
        'student' => [
            'name'  => $student['full_name'],
            'level' => (int) $student['level'],
            'group' => $studentGroupId,
        ],
        'session' => [
            'expires_at'        => $session['expires_at'],
            'submitted_at'      => date('Y-m-d H:i:s'),
            'total_submissions' => (int) $counts['total_submissions'],
            'present_count'     => (int) $counts['present_count'],
        ],
    ]);

} catch (Exception $e) {
    $db->rollback();
    sendResponse(false, 'Failed to record attendance. Please try again.', [], 500);
}