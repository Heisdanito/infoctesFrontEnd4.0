<?php
// ============================================================
//  mobile_server/auth/rep/authLogin.php
//  Mobile course rep login — index number + 10-digit PIN
//
//  POST /mobile_server/auth/rep/authLogin.php
//  Body: { "index_number": "UEW/ICT/0001/22", "pin": "1234567890" }
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

requireMethod('POST');

$body        = getRequestBody();
$indexNumber = sanitize($body['index_number'] ?? '');
$pin         = (string) ($body['pin'] ?? '');

// ── Validate ──────────────────────────────────────────────────
if (empty($indexNumber)) {
    sendResponse(false, 'Index number is required.', [], 422);
}
if (strlen($pin) !== 10 || !ctype_digit($pin)) {
    sendResponse(false, 'A valid 10-digit PIN is required.', [], 422);
}

$db = getDB();

// ── Query student ─────────────────────────────────────────────
$stmt = $db->prepare("
    SELECT
        s.student_id, s.index_number, s.first_name, s.last_name,
        s.email, s.phone, s.level, s.pin_hash,
        p.programme_id, p.name AS programme_name, p.code AS programme_code,
        sg.group_id, sg.group_number,
        ap.period_id, ap.label AS current_period,
        ap.academic_year, ap.semester_number
    FROM student s
    JOIN programme       p  ON p.programme_id = s.programme_id
    JOIN student_group   sg ON sg.group_id    = s.group_id
    JOIN academic_period ap ON ap.period_id   = sg.period_id AND ap.is_active = 1
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
    sendResponse(false, 'Index number not found.', [], 404);
}

// ── Verify PIN ────────────────────────────────────────────────
if (empty($student['pin_hash']) || !password_verify($pin, $student['pin_hash'])) {
    sendResponse(false, 'Incorrect PIN. Please try again.', [], 401);
}

// ── Confirm course rep assignment ─────────────────────────────
$repStmt = $db->prepare("
    SELECT id FROM course_rep
    WHERE student_id = ?
    LIMIT 1
");
$repStmt->bind_param('i', $student['student_id']);
$repStmt->execute();
$isRep = $repStmt->get_result()->num_rows > 0;
$repStmt->close();

if (!$isRep) {
    sendResponse(false, 'You are not assigned as a Course Rep.', [], 403);
}

// ── Fetch courses this rep manages ───────────────────────────
$courseStmt = $db->prepare("
    SELECT c.course_id, c.code, c.title, c.level
    FROM course_rep cr
    JOIN course c ON c.course_id = cr.course_id
    WHERE cr.student_id = ?
    ORDER BY c.level ASC, c.code ASC
");
$repCourses = [];
if ($courseStmt) {
    $courseStmt->bind_param('i', $student['student_id']);
    $courseStmt->execute();
    $cRes = $courseStmt->get_result();
    while ($row = $cRes->fetch_assoc()) {
        $repCourses[] = [
            'course_id' => (int) $row['course_id'],
            'code'      => $row['code'],
            'title'     => $row['title'],
            'level'     => (int) $row['level'],
        ];
    }
    $courseStmt->close();
}

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
    'programme_name'  => $student['programme_name'],
    'programme_code'  => $student['programme_code'],
    'group_id'        => (int) $student['group_id'],
    'group_number'    => (int) $student['group_number'],
    'period_id'       => (int) $student['period_id'],
    'current_period'  => $student['current_period'],
    'academic_year'   => $student['academic_year'],
    'semester_number' => (int) $student['semester_number'],
    'role'            => 'rep',
    'is_course_rep'   => true,
    'rep_courses'     => $repCourses,
    'login_time'      => date('Y-m-d H:i:s'),
];

$_SESSION['user'] = $user;

sendResponse(true, 'Login successful. Welcome, ' . $student['first_name'] . '.', [
    'user' => $user,
]);