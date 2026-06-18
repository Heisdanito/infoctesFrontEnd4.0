<?php
// ============================================================
//  web_server/model/lec/lecDashboard.php
//  GET /web_server/model/lec/lecDashboard.php?lecturer_id=1
//  NO session check — lecturer_id comes from query string.
//  Same require pattern as authLogin.php (works with CORS).
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

requireMethod('GET');

// ── Read lecturer_id from query string ────────────────────────
$lecturerId = (int) ($_GET['lecturer_id'] ?? 0);

if ($lecturerId === 0) {
    sendResponse(false, 'lecturer_id is required.', [], 422);
}

$db = getDB();

// ── Verify lecturer exists ────────────────────────────────────
$lecStmt = $db->prepare("
    SELECT lecturer_id, first_name, last_name, email, staff_id
    FROM lecturer WHERE lecturer_id = ? LIMIT 1
");
$lecStmt->bind_param('i', $lecturerId);
$lecStmt->execute();
$lecturer = $lecStmt->get_result()->fetch_assoc();
$lecStmt->close();

if (!$lecturer) {
    sendResponse(false, 'Lecturer not found.', [], 404);
}

// ── Active period ─────────────────────────────────────────────
$pStmt = $db->prepare("
    SELECT period_id, label, academic_year, semester_number, start_date, end_date
    FROM academic_period WHERE is_active = 1 LIMIT 1
");
$pStmt->execute();
$period = $pStmt->get_result()->fetch_assoc();
$pStmt->close();

if (!$period) {
    sendResponse(false, 'No active academic period found.', [], 404);
}

$periodId = (int) $period['period_id'];

// ── Distinct levels this lecturer teaches ─────────────────────
$lvlStmt = $db->prepare("
    SELECT DISTINCT c.level
    FROM timetable t
    JOIN course c ON c.course_id = t.course_id
    WHERE t.lecturer_id = ? AND t.period_id = ?
    ORDER BY c.level ASC
");
$lvlStmt->bind_param('ii', $lecturerId, $periodId);
$lvlStmt->execute();
$levelRows = $lvlStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$lvlStmt->close();

$levelConfig = [
    100 => ['color' => '#3b82f6', 'bg' => '#eff6ff', 'border' => '#bfdbfe', 'year' => 'First Year'],
    200 => ['color' => '#10b981', 'bg' => '#ecfdf5', 'border' => '#a7f3d0', 'year' => 'Second Year'],
    300 => ['color' => '#f59e0b', 'bg' => '#fffbeb', 'border' => '#fde68a', 'year' => 'Third Year'],
    400 => ['color' => '#8b5cf6', 'bg' => '#f5f3ff', 'border' => '#ddd6fe', 'year' => 'Fourth Year'],
];

$levels = [];

foreach ($levelRows as $lvlRow) {
    $level = (int) $lvlRow['level'];
    $cfg   = $levelConfig[$level] ?? [
        'color' => '#64748b', 'bg' => '#f8fafc', 'border' => '#e2e8f0', 'year' => 'Level ' . $level,
    ];

    // Courses
    $cStmt = $db->prepare("
        SELECT DISTINCT c.course_id, c.code, c.title, c.credit_hours
        FROM timetable t JOIN course c ON c.course_id = t.course_id
        WHERE t.lecturer_id = ? AND t.period_id = ? AND c.level = ?
        ORDER BY c.code ASC
    ");
    $cStmt->bind_param('iii', $lecturerId, $periodId, $level);
    $cStmt->execute();
    $courseRows = $cStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $cStmt->close();

    $courses   = array_map(fn($c) => ['course_id' => (int)$c['course_id'], 'code' => $c['code'], 'name' => $c['title']], $courseRows);
    $courseIds = array_column($courseRows, 'course_id');

    if (empty($courseIds)) {
        $levels[] = makeLevel($level, $cfg, $courses, [], [], [], []);
        continue;
    }

    $inList = implode(',', array_fill(0, count($courseIds), '?'));
    $types  = str_repeat('i', count($courseIds));

    // Groups
    $gStmt = $db->prepare("
        SELECT DISTINCT sg.group_id, sg.group_number
        FROM course_registration cr
        JOIN student s        ON s.student_id = cr.student_id
        JOIN student_group sg ON sg.group_id  = s.group_id
        WHERE cr.course_id IN ($inList) AND cr.period_id = ? AND cr.status = 'registered'
        ORDER BY sg.group_number ASC
    ");
    $gStmt->bind_param($types . 'i', ...array_merge($courseIds, [$periodId]));
    $gStmt->execute();
    $groups = array_map(fn($g) => 'Group ' . $g['group_number'], $gStmt->get_result()->fetch_all(MYSQLI_ASSOC));
    $gStmt->close();

    // Students
    $sStmt = $db->prepare("
        SELECT DISTINCT s.student_id,
            s.index_number,
            CONCAT(s.first_name,' ',s.last_name) AS full_name,
            sg.group_number
        FROM course_registration cr
        JOIN student s        ON s.student_id = cr.student_id
        JOIN student_group sg ON sg.group_id  = s.group_id
        WHERE cr.course_id IN ($inList) AND cr.period_id = ? AND cr.status = 'registered'
        ORDER BY full_name ASC
    ");
    $sStmt->bind_param($types . 'i', ...array_merge($courseIds, [$periodId]));
    $sStmt->execute();
    $studentRows = $sStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $sStmt->close();

    // Total sessions
    $tsStmt = $db->prepare("
        SELECT COUNT(DISTINCT ases.session_id) AS total
        FROM attendance_session ases
        JOIN course_rep cr ON cr.id = ases.course_rep_id
        WHERE cr.course_id IN ($inList) AND ases.period_id = ?
    ");
    $tsStmt->bind_param($types . 'i', ...array_merge($courseIds, [$periodId]));
    $tsStmt->execute();
    $totalSessions = (int) $tsStmt->get_result()->fetch_assoc()['total'];
    $tsStmt->close();

    // Per-student attendance + device flags
    $students = [];
    foreach ($studentRows as $row) {
        $sid = (int) $row['student_id'];

        $attStmt = $db->prepare("
            SELECT COUNT(*) AS attended
            FROM attendance_record ar
            JOIN attendance_session ases ON ases.session_id = ar.session_id
            JOIN course_rep cr           ON cr.id           = ases.course_rep_id
            WHERE ar.student_id = ? AND cr.course_id IN ($inList)
              AND ases.period_id = ? AND ar.status = 'present'
        ");
        $attStmt->bind_param('i' . $types . 'i', $sid, ...array_merge($courseIds, [$periodId]));
        $attStmt->execute();
        $attended = (int) $attStmt->get_result()->fetch_assoc()['attended'];
        $attStmt->close();

        $pct = $totalSessions > 0 ? (int) round(($attended / $totalSessions) * 100) : 0;

        $devStmt = $db->prepare("
            SELECT DISTINCT ar.device_build_number
            FROM attendance_record ar
            JOIN attendance_session ases ON ases.session_id = ar.session_id
            WHERE ar.student_id = ? AND ases.period_id = ?
        ");
        $devStmt->bind_param('ii', $sid, $periodId);
        $devStmt->execute();
        $devices = array_column($devStmt->get_result()->fetch_all(MYSQLI_ASSOC), 'device_build_number');
        $devStmt->close();

        $flagged = count($devices) > 1;
        $students[] = [
            'id'         => $sid,
            'name'       => $row['full_name'],
            'index'      => $row['index_number'],
            'group'      => 'Group ' . $row['group_number'],
            'device'     => count($devices) > 0 ? substr($devices[0], 0, 22) : 'No record',
            'attended'   => $attended,
            'total'      => $totalSessions,
            'pct'        => $pct,
            'flagged'    => $flagged,
            'alertType'  => $flagged ? 'multi_device' : null,
            'flagReason' => $flagged ? 'Multiple devices detected: ' . implode(', ', $devices) : null,
        ];
    }

    // Recent sessions
    $sessStmt = $db->prepare("
        SELECT ases.session_id, ases.started_at, ases.status, c.code AS course_code,
               (SELECT COUNT(*) FROM attendance_record ar WHERE ar.session_id = ases.session_id AND ar.status = 'present') AS checkins
        FROM attendance_session ases
        JOIN course_rep crep ON crep.id     = ases.course_rep_id
        JOIN course     c    ON c.course_id = crep.course_id
        WHERE crep.course_id IN ($inList) AND ases.period_id = ?
        ORDER BY ases.started_at DESC LIMIT 10
    ");
    $sessStmt->bind_param($types . 'i', ...array_merge($courseIds, [$periodId]));
    $sessStmt->execute();
    $sessions = array_map(fn($s) => [
        'id' => 'ATT-' . $s['session_id'], 'course' => $s['course_code'],
        'date' => date('d M Y', strtotime($s['started_at'])),
        'checkins' => (int)$s['checkins'], 'status' => $s['status'],
    ], $sessStmt->get_result()->fetch_all(MYSQLI_ASSOC));
    $sessStmt->close();

    // Progress rings
    $total     = count($students);
    $avgPct    = $total > 0 ? (int) round(array_sum(array_column($students, 'pct')) / $total) : 0;
    $goodCount = count(array_filter($students, fn($s) => $s['pct'] >= 75));
    $lowCount  = count(array_filter($students, fn($s) => $s['pct'] < 75));
    $flagCount = count(array_filter($students, fn($s) => $s['flagged']));

    $progress = [
        ['label' => 'Avg. Attendance', 'value' => $avgPct, 'color' => $avgPct >= 75 ? '#10b981' : '#ef4444', 'raw' => null],
        ['label' => 'Above Threshold', 'value' => $total > 0 ? (int)round($goodCount / $total * 100) : 0, 'color' => '#3b82f6', 'raw' => "$goodCount Students"],
        ['label' => 'Below 75%',       'value' => $total > 0 ? (int)round($lowCount  / $total * 100) : 0, 'color' => '#f59e0b', 'raw' => "$lowCount Students"],
        ['label' => 'Total Enrolled',  'value' => 100, 'color' => '#8b5cf6', 'raw' => "$total Students"],
    ];

    $levels[] = makeLevel($level, $cfg, $courses, $groups, $students, $sessions, $progress, [
        'courses' => count($courses), 'groups' => count($groups),
        'lowAttendance' => $lowCount, 'flagged' => $flagCount,
    ]);
}

sendResponse(true, 'Dashboard loaded.', [
    'lecturer' => [
        'lecturer_id' => (int)$lecturer['lecturer_id'],
        'staff_id'    => $lecturer['staff_id'],
        'first_name'  => $lecturer['first_name'],
        'last_name'   => $lecturer['last_name'],
        'full_name'   => $lecturer['first_name'] . ' ' . $lecturer['last_name'],
        'email'       => $lecturer['email'],
    ],
    'current_period' => [
        'period_id'       => (int)$period['period_id'],
        'label'           => $period['label'],
        'academic_year'   => $period['academic_year'],
        'semester_number' => (int)$period['semester_number'],
        'start_date'      => $period['start_date'],
        'end_date'        => $period['end_date'],
    ],
    'levels' => $levels,
]);

function makeLevel(int $level, array $cfg, array $courses, array $groups, array $students, array $sessions, array $progress, array $stats = []): array {
    return [
        'id' => 'L'.$level, 'label' => 'Level '.$level, 'year' => $cfg['year'],
        'color' => $cfg['color'], 'bg' => $cfg['bg'], 'border' => $cfg['border'],
        'courses' => $courses, 'groups' => $groups, 'students' => $students,
        'sessions' => $sessions, 'progress' => $progress,
        'stats' => array_merge(['courses' => count($courses), 'groups' => count($groups), 'lowAttendance' => 0, 'flagged' => 0], $stats),
    ];
}