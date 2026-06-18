<?php
// ============================================================
//  mobile_server/model/stu/dashboard.php
//  GET ?student_id=123&role=student|rep
//
//  Returns: student, period, stats, timetable, recent
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed. Use GET.', [], 405);
}

$studentId = (int) ($_GET['student_id'] ?? 0);
$role      = trim($_GET['role'] ?? 'student');

if ($studentId <= 0) {
    sendResponse(false, 'student_id is required.', [], 400);
}

if (!in_array($role, ['student', 'rep'], true)) {
    sendResponse(false, 'Access denied. Valid role required.', [], 403);
}

$db = getDB();

// ── 1. Active academic period ─────────────────────────────────
$periodResult = $db->query("
    SELECT period_id, label, academic_year, semester_number, start_date, end_date
    FROM academic_period
    WHERE is_active = 1
    LIMIT 1
");
$activePeriod = $periodResult->fetch_assoc();

if (!$activePeriod) {
    sendResponse(false, 'No active academic period found.', [], 404);
}

$periodId = (int) $activePeriod['period_id'];

// ── 2. Student profile ────────────────────────────────────────
$stmt = $db->prepare("
    SELECT
        s.student_id,
        s.index_number,
        s.first_name,
        s.last_name,
        s.email,
        s.phone,
        s.level,
        s.group_id,
        p.name AS programme_name,
        p.code AS programme_code,
        sg.group_number,
        CONCAT(SUBSTRING(s.first_name, 1, 1), SUBSTRING(s.last_name, 1, 1)) AS initials
    FROM student s
    JOIN programme p ON p.programme_id = s.programme_id
    JOIN student_group sg ON sg.group_id = s.group_id
    WHERE s.student_id = ?
    LIMIT 1
");
$stmt->bind_param('i', $studentId);
$stmt->execute();
$profile = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$profile) {
    sendResponse(false, 'Student not found.', [], 404);
}

$groupId = (int) $profile['group_id'];

// ── 3. Is course rep? ─────────────────────────────────────────
$repStmt = $db->prepare("
    SELECT COUNT(*) AS is_rep FROM course_rep
    WHERE student_id = ? AND period_id = ?
");
$repStmt->bind_param('ii', $studentId, $periodId);
$repStmt->execute();
$repResult = $repStmt->get_result()->fetch_assoc();
$repStmt->close();
$isCourseRep = ($repResult['is_rep'] > 0) || ($role === 'rep');

// ── 4. Attendance statistics (FIXED) ──────────────────────────
//
//  total_sessions = all completed sessions for the student's group
//  attended       = sessions where student has 'present' status
//  rejected       = sessions where student has 'rejected' status  
//  missed         = total_sessions - attended (includes rejected + no record)
//  percentage     = (attended / (total_sessions - rejected)) * 100
//                   (rejected sessions don't count toward percentage)
//

// First, get total completed sessions for the group in this period
$totalStmt = $db->prepare("
    SELECT COUNT(DISTINCT ases.session_id) AS total_sessions
    FROM attendance_session ases
    JOIN course_rep cr ON cr.id = ases.course_rep_id
    WHERE cr.group_id = ?
      AND ases.period_id = ?
      AND ases.status != 'active'
");
$totalStmt->bind_param('ii', $groupId, $periodId);
$totalStmt->execute();
$totalResult = $totalStmt->get_result()->fetch_assoc();
$totalStmt->close();

$totalSessions = (int) ($totalResult['total_sessions'] ?? 0);

// Get student's attendance breakdown
$statsStmt = $db->prepare("
    SELECT
        COUNT(DISTINCT ases.session_id) AS total_eligible,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS attended,
        SUM(CASE WHEN ar.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN ar.status IS NULL OR ar.status = '' THEN 1 ELSE 0 END) AS no_record
    FROM attendance_session ases
    JOIN course_rep cr ON cr.id = ases.course_rep_id
    LEFT JOIN attendance_record ar 
        ON ar.session_id = ases.session_id 
        AND ar.student_id = ?
    WHERE cr.group_id = ?
      AND ases.period_id = ?
      AND ases.status != 'active'
");
$statsStmt->bind_param('iii', $studentId, $groupId, $periodId);
$statsStmt->execute();
$statsRow = $statsStmt->get_result()->fetch_assoc();
$statsStmt->close();

$attended = (int) ($statsRow['attended'] ?? 0);
$rejected = (int) ($statsRow['rejected'] ?? 0);
$noRecord = (int) ($statsRow['no_record'] ?? 0);

// Missed = total sessions - attended (includes both rejected and no record)
$missed = $totalSessions - $attended;

// Calculate percentage based on valid sessions (excluding rejected)
$validSessions = $totalSessions - $rejected;
$percentage = $validSessions > 0 
    ? (int) round(($attended / $validSessions) * 100) 
    : 0;

// ── 5. Today's timetable ──────────────────────────────────────
$todayName = date('l');

$ttStmt = $db->prepare("
    SELECT DISTINCT
        c.code  AS course_code,
        c.title AS course_title,
        v.name  AS venue,
        t.day_of_week,
        t.start_time,
        t.end_time,
        CONCAT(l.first_name, ' ', l.last_name) AS lecturer
    FROM timetable t
    JOIN course   c ON c.course_id   = t.course_id
    JOIN venue    v ON v.venue_id    = t.venue_id
    JOIN lecturer l ON l.lecturer_id = t.lecturer_id
    LEFT JOIN timetable_group      tg ON tg.timetable_id = t.timetable_id
    LEFT JOIN timetable_programme  tp ON tp.timetable_id = t.timetable_id
    WHERE t.period_id    = ?
      AND t.day_of_week  = ?
      AND (
          tg.group_id    = ?
          OR tp.programme_id = (SELECT programme_id FROM student WHERE student_id = ?)
      )
    ORDER BY t.start_time ASC
");
$ttStmt->bind_param('isii', $periodId, $todayName, $groupId, $studentId);
$ttStmt->execute();
$ttRows = $ttStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$ttStmt->close();

$timetable = array_map(fn($r) => [
    'course_code'  => $r['course_code'],
    'course_title' => $r['course_title'],
    'venue'        => $r['venue'],
    'day'          => $r['day_of_week'],
    'start_time'   => $r['start_time'],
    'end_time'     => $r['end_time'],
    'lecturer'     => $r['lecturer'],
], $ttRows);

// ── 6. Recent attendance records (last 10) ────────────────────
$recentStmt = $db->prepare("
    SELECT
        ar.record_id,
        ar.method,
        ar.status,
        ar.submitted_at,
        c.code  AS course_code,
        c.title AS course_title
    FROM attendance_record ar
    JOIN attendance_session ases ON ases.session_id  = ar.session_id
    JOIN course_rep         cr   ON cr.id            = ases.course_rep_id
    JOIN course             c    ON c.course_id      = cr.course_id
    WHERE ar.student_id  = ?
      AND ases.period_id = ?
    ORDER BY ar.submitted_at DESC
    LIMIT 10
");
$recentStmt->bind_param('ii', $studentId, $periodId);
$recentStmt->execute();
$recentRows = $recentStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$recentStmt->close();

$todayDt     = new DateTime('today');
$yesterdayDt = new DateTime('yesterday');

$recent = array_map(function ($row) use ($todayDt, $yesterdayDt) {
    $dt = new DateTime($row['submitted_at']);
    if ($dt->format('Y-m-d') === $todayDt->format('Y-m-d')) {
        $dateLabel = 'Today';
    } elseif ($dt->format('Y-m-d') === $yesterdayDt->format('Y-m-d')) {
        $dateLabel = 'Yesterday';
    } else {
        $dateLabel = $dt->format('D, d M');
    }
    return [
        'record_id'    => (string) $row['record_id'],
        'course_code'  => $row['course_code'],
        'course_title' => $row['course_title'],
        'time'         => $dt->format('h:i A'),
        'date'         => $dateLabel,
        'method'       => strtoupper($row['method']),
        'attended'     => $row['status'] === 'present',
        'submitted_at' => $row['submitted_at'],
    ];
}, $recentRows);

// ── 7. Send response ──────────────────────────────────────────
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
        'rejected'       => $rejected,
        'percentage'     => $percentage,
    ],
    'timetable' => $timetable,
    'recent'    => $recent,
]);