<?php
// ============================================================
//  mobile_server/model/stu/dashboard.php
//  Stateless student dashboard endpoint — no cookies, no session
//  GET ?student_id=123&role=student|rep
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed. Use GET.', [], 405);
}

$studentId = isset($_GET['student_id']) ? (int) $_GET['student_id'] : 0;
$role      = trim($_GET['role'] ?? 'student');

if ($studentId <= 0) {
    sendResponse(false, 'student_id is required.', [], 400);
}

if (!in_array($role, ['student', 'rep'], true)) {
    sendResponse(false, 'Access denied. Valid role required.', [], 403);
}

$db = getDB();

// ── 1. Get active academic period ────────────────────────────
$periodSql = "SELECT period_id, label, academic_year, semester_number, start_date, end_date 
              FROM academic_period 
              WHERE is_active = 1 
              LIMIT 1";
$periodResult = $db->query($periodSql);
$activePeriod = $periodResult->fetch_assoc();

if (!$activePeriod) {
    sendResponse(false, 'No active academic period found.', [], 404);
}

$periodId = (int) $activePeriod['period_id'];

// ── 2. Student profile with group and programme ───────────────
$stmt = $db->prepare("
    SELECT 
        s.student_id,
        s.index_number,
        s.first_name,
        s.last_name,
        s.email,
        s.phone,
        s.level,
        p.name AS programme_name,
        p.code AS programme_code,
        sg.group_id,
        sg.group_number,
        CONCAT(SUBSTRING(s.first_name, 1, 1), SUBSTRING(s.last_name, 1, 1)) AS initials
    FROM student s
    JOIN programme p ON p.programme_id = s.programme_id
    JOIN student_group sg ON sg.group_id = s.group_id
    WHERE s.student_id = ?
    LIMIT 1
");

if (!$stmt) {
    sendResponse(false, 'Server error (profile).', [], 500);
}

$stmt->bind_param('i', $studentId);
$stmt->execute();
$profile = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$profile) {
    sendResponse(false, 'Student not found.', [], 404);
}

$groupId = (int) $profile['group_id'];

// Check if student is a course rep for the current period
$repCheckSql = "SELECT COUNT(*) as is_rep FROM course_rep WHERE student_id = ? AND period_id = ?";
$repStmt = $db->prepare($repCheckSql);
$repStmt->bind_param('ii', $studentId, $periodId);
$repStmt->execute();
$repResult = $repStmt->get_result()->fetch_assoc();
$repStmt->close();
$isCourseRep = ($repResult['is_rep'] > 0) || ($role === 'rep');

// ── 3. Attendance statistics ───────────────────────────────────
// Get total sessions for the group in this period
$stmt = $db->prepare("
    SELECT
        COUNT(DISTINCT a_s.session_id) AS total_sessions
    FROM attendance_session a_s
    JOIN course_rep cr ON cr.id = a_s.course_rep_id
    WHERE cr.group_id = ?
        AND a_s.period_id = ?
        AND a_s.status != 'closed'
");

if (!$stmt) {
    sendResponse(false, 'Server error (total sessions).', [], 500);
}

$stmt->bind_param('ii', $groupId, $periodId);
$stmt->execute();
$totalRow = $stmt->get_result()->fetch_assoc();
$stmt->close();

$totalSessions = (int) ($totalRow['total_sessions'] ?? 0);

// Get student's attended and missed counts
$stmt = $db->prepare("
    SELECT
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS attended,
        SUM(CASE WHEN ar.status = 'rejected' THEN 1 ELSE 0 END) AS missed
    FROM attendance_session a_s
    JOIN course_rep cr ON cr.id = a_s.course_rep_id
    LEFT JOIN attendance_record ar ON ar.session_id = a_s.session_id AND ar.student_id = ?
    WHERE cr.group_id = ?
        AND a_s.period_id = ?
");

if (!$stmt) {
    sendResponse(false, 'Server error (attendance stats).', [], 500);
}

$stmt->bind_param('iii', $studentId, $groupId, $periodId);
$stmt->execute();
$statsRow = $stmt->get_result()->fetch_assoc();
$stmt->close();

$attended = (int) ($statsRow['attended'] ?? 0);
$missed   = (int) ($statsRow['missed'] ?? 0);
$percentage = $totalSessions > 0 ? (int) round(($attended / $totalSessions) * 100) : 0;

// ── 4. Today's timetable for student's group/programme ─────────
$todayName = date('l'); // Monday, Tuesday, etc.

$stmt = $db->prepare("
    SELECT DISTINCT
        c.code AS course_code,
        c.title AS course_title,
        v.name AS venue,
        t.day_of_week,
        t.start_time,
        t.end_time,
        CONCAT(l.first_name, ' ', l.last_name) AS lecturer
    FROM timetable t
    JOIN course c ON c.course_id = t.course_id
    JOIN venue v ON v.venue_id = t.venue_id
    JOIN lecturer l ON l.lecturer_id = t.lecturer_id
    LEFT JOIN timetable_group tg ON tg.timetable_id = t.timetable_id
    LEFT JOIN timetable_programme tp ON tp.timetable_id = t.timetable_id
    WHERE t.period_id = ?
      AND t.day_of_week = ?
      AND (
          tg.group_id = ?
          OR tp.programme_id = (SELECT programme_id FROM student WHERE student_id = ?)
          OR (tg.group_id IS NULL AND tp.programme_id IS NULL)
      )
    ORDER BY t.start_time ASC
");

if (!$stmt) {
    sendResponse(false, 'Server error (timetable).', [], 500);
}

$stmt->bind_param('isii', $periodId, $todayName, $groupId, $studentId);
$stmt->execute();
$ttRows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$timetable = array_map(function($row) {
    return [
        'course_code'  => $row['course_code'],
        'course_title' => $row['course_title'],
        'venue'        => $row['venue'],
        'day'          => $row['day_of_week'],
        'start_time'   => $row['start_time'],
        'end_time'     => $row['end_time'],
        'lecturer'     => $row['lecturer'],
    ];
}, $ttRows);

// ── 5. Recent attendance records (last 10) ────────────────────
$stmt = $db->prepare("
    SELECT
        ar.record_id,
        ar.method,
        ar.status,
        ar.submitted_at,
        c.code AS course_code,
        c.title AS course_title
    FROM attendance_record ar
    JOIN attendance_session a_s ON a_s.session_id = ar.session_id
    JOIN course_rep cr ON cr.id = a_s.course_rep_id
    JOIN course c ON c.course_id = cr.course_id
    WHERE ar.student_id = ?
        AND a_s.period_id = ?
    ORDER BY ar.submitted_at DESC
    LIMIT 10
");

if (!$stmt) {
    sendResponse(false, 'Server error (recent).', [], 500);
}

$stmt->bind_param('ii', $studentId, $periodId);
$stmt->execute();
$recentRows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$todayDt     = new DateTime('today');
$yesterdayDt = (clone $todayDt)->modify('-1 day');

$recent = array_map(function($row) use ($todayDt, $yesterdayDt) {
    $dt = new DateTime($row['submitted_at']);
    
    if ($dt->format('Y-m-d') === $todayDt->format('Y-m-d')) {
        $dateLabel = 'Today';
    } elseif ($dt->format('Y-m-d') === $yesterdayDt->format('Y-m-d')) {
        $dateLabel = 'Yesterday';
    } else {
        $dateLabel = $dt->format('D, d M');
    }
    
    return [
        'record_id'     => (string) $row['record_id'],
        'course_code'   => $row['course_code'],
        'course_title'  => $row['course_title'],
        'time'          => $dt->format('h:i A'),
        'date'          => $dateLabel,
        'method'        => strtoupper($row['method']),
        'attended'      => $row['status'] === 'present',
        'submitted_at'  => $row['submitted_at'],
    ];
}, $recentRows);

// ── 6. Send response ──────────────────────────────────────────
sendResponse(true, 'Dashboard data loaded successfully.', [
    'student' => [
        'student_id'     => (int) $profile['student_id'],
        'index_number'   => $profile['index_number'],
        'full_name'      => $profile['first_name'] . ' ' . $profile['last_name'],
        'first_name'     => $profile['first_name'],
        'last_name'      => $profile['last_name'],
        'initials'       => $profile['initials'],
        'email'          => $profile['email'],
        'phone'          => $profile['phone'],
        'level'          => (int) $profile['level'],
        'programme_name' => $profile['programme_name'],
        'programme_code' => $profile['programme_code'],
        'group_number'   => (int) $profile['group_number'],
        'is_course_rep'  => $isCourseRep,
    ],
    'period' => [
        'period_id'       => $periodId,
        'label'           => $activePeriod['label'],
        'academic_year'   => $activePeriod['academic_year'],
        'semester_number' => (int) $activePeriod['semester_number'],
        'start_date'      => $activePeriod['start_date'],
        'end_date'        => $activePeriod['end_date'],
    ],
    'stats' => [
        'total_sessions' => $totalSessions,
        'attended'       => $attended,
        'missed'         => $missed,
        'percentage'     => $percentage,
    ],
    'timetable' => $timetable,
    'recent'    => $recent,
]);