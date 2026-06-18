<?php
// ============================================================
//  mobile_server/auth/stu/authLogin.php
//  Mobile student login — index number only, no password
//
//  POST /mobile_server/auth/stu/authLogin.php
//  Body: { "index_number": "UEW/ICT/0001/22" }
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

requireMethod('POST');

$body        = getRequestBody();
$indexNumber =  sanitize($body['index_number'] ?? '');

// ── Validate ──────────────────────────────────────────────────
if (empty($indexNumber) || strlen($indexNumber) < 5) {
    sendResponse(false, 'A valid index number is required.', [], 422);
}

$db = getDB();

// ── Query active academic period ──────────────────────────────
$periodStmt = $db->query("SELECT period_id, label AS current_period, academic_year, semester_number FROM academic_period WHERE is_active = 1 LIMIT 1");
$activePeriod = $periodStmt->fetch_assoc();

if (!$activePeriod) {
    sendResponse(false, 'No active academic period found.', [], 500);
}

// ── Query student with programme, group ────────
$stmt = $db->prepare("
    SELECT
        s.student_id, s.index_number, s.first_name, s.last_name,
        s.email, s.phone, s.level,
        p.programme_id, p.name AS programme_name, p.code AS programme_code,
        sg.group_id, sg.group_number
    FROM student s
    JOIN programme       p  ON p.programme_id = s.programme_id
    JOIN student_group   sg ON sg.group_id    = s.group_id
    WHERE s.index_number = ?
    LIMIT 1
");

if (!$stmt) {
    sendResponse(false, 'Server error. Please try again.', [], 500);
}

$stmt->bind_param('s', $indexNumber);
$stmt->execute();
$student = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$student) {
    sendResponse(false, 'Index number not found. Please check and try again.', [], 404);
}

// Merge period into student array for session building
$student['period_id']       = $activePeriod['period_id'];
$student['current_period']  = $activePeriod['current_period'];
$student['academic_year']   = $activePeriod['academic_year'];
$student['semester_number'] = $activePeriod['semester_number'];

// ── Build user and store in session ──────────────────────────
startSession();

$user = [
    'student_id'      => (int) $student['student_id'],
    'index_number'    => $student['index_number'],
    'full_name'       => $student['first_name'] . ' ' . $student['last_name'],
    'first_name'      => $student['first_name'],
    'last_name'       => $student['last_name'],
    'initials'        => strtoupper(substr($student['first_name'], 0, 1) . substr($student['last_name'], 0, 1)),
    'email'           => $student['email'],
    'phone'           => $student['phone'],
    'level'           => (int) $student['level'],
    'programme_id'    => (int) $student['programme_id'],
    'programme_name'  => $student['programme_name'],
    'programme_code'  => $student['programme_code'],
    'group_id'        => (int) $student['group_id'],
    'group_number'    => (int) $student['group_number'],
    'period_id'       => (int) $student['period_id'],
    'current_period'  => $student['current_period'],
    'academic_year'   => $student['academic_year'],
    'semester_number' => (int) $student['semester_number'],
    'role'            => 'student',
    'login_time'      => date('Y-m-d H:i:s'),
];

$_SESSION['user'] = $user;

sendResponse(true, 'Login successful. Welcome, ' . $student['first_name'] . '.', [
    'user' => $user,
]);
