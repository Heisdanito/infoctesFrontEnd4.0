<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');
// ============================================================
//  web_server/model/lec/lecDashboard.php
//  GET ?lecturer_id=900
//
//  Logic based on actual DB data:
//  - Lecturer 900 exists
//  - timetable links lecturer → course → group via timetable_group
//  - Students belong to groups via student.group_id
//  - course_rep.course_id is NULL in current data so we skip
//    course_rep joins for student fetching
//  - Students fetched by: group_id from timetable_group
//    for timetable rows taught by this lecturer this period
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

requireMethod('GET');

$lecturerId = (int) ($_GET['lecturer_id'] ?? 0);
if ($lecturerId === 0) {
    sendResponse(false, 'lecturer_id is required.', [], 422);
}

$db = getDB();

// ── 1. Verify lecturer ────────────────────────────────────────
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

// ── 2. Active period ──────────────────────────────────────────
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

// ── 3. Get all timetable entries for this lecturer this period ─
// Join timetable → timetable_group to get which groups attend
$ttStmt = $db->prepare("
    SELECT DISTINCT
        t.timetable_id,
        t.course_id,
        c.code        AS course_code,
        c.title       AS course_title,
        c.level,
        c.credit_hours,
        tg.group_id,
        sg.group_number
    FROM timetable t
    JOIN course         c   ON c.course_id   = t.course_id
    JOIN timetable_group tg ON tg.timetable_id = t.timetable_id
    JOIN student_group  sg  ON sg.group_id    = tg.group_id
    WHERE t.lecturer_id = ? AND t.period_id = ?
    ORDER BY c.level ASC, c.code ASC, sg.group_number ASC
");
$ttStmt->bind_param('ii', $lecturerId, $periodId);
$ttStmt->execute();
$ttRows = $ttStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$ttStmt->close();

// ── 4. Also get timetable entries via timetable_programme ──────
$tpStmt = $db->prepare("
    SELECT DISTINCT
        t.timetable_id,
        t.course_id,
        c.code        AS course_code,
        c.title       AS course_title,
        c.level,
        c.credit_hours,
        NULL          AS group_id,
        NULL          AS group_number,
        tp.programme_id
    FROM timetable t
    JOIN course             c   ON c.course_id    = t.course_id
    JOIN timetable_programme tp ON tp.timetable_id = t.timetable_id
    WHERE t.lecturer_id = ? AND t.period_id = ?
      AND t.timetable_id NOT IN (
          SELECT timetable_id FROM timetable_group
      )
    ORDER BY c.level ASC, c.code ASC
");
$tpStmt->bind_param('ii', $lecturerId, $periodId);
$tpStmt->execute();
$tpRows = $tpStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$tpStmt->close();

// ── 5. Group everything by level ──────────────────────────────
$levelConfig = [
    100 => ['color' => '#3b82f6', 'bg' => '#eff6ff', 'border' => '#bfdbfe', 'year' => 'First Year'],
    200 => ['color' => '#10b981', 'bg' => '#ecfdf5', 'border' => '#a7f3d0', 'year' => 'Second Year'],
    300 => ['color' => '#f59e0b', 'bg' => '#fffbeb', 'border' => '#fde68a', 'year' => 'Third Year'],
    400 => ['color' => '#8b5cf6', 'bg' => '#f5f3ff', 'border' => '#ddd6fe', 'year' => 'Fourth Year'],
];

// Organise by level → courses → groups
$byLevel = [];

foreach (array_merge($ttRows, $tpRows) as $row) {
    $level    = (int) $row['level'];
    $courseId = (int) $row['course_id'];
    $groupId  = $row['group_id'] !== null ? (int) $row['group_id'] : null;

    if (!isset($byLevel[$level])) {
        $byLevel[$level] = ['courses' => [], 'groups' => [], 'groupIds' => []];
    }

    // Add course (deduplicate)
    $byLevel[$level]['courses'][$courseId] = [
        'course_id' => $courseId,
        'code'      => $row['course_code'],
        'name'      => $row['course_title'],
    ];

    // Add group (deduplicate)
    if ($groupId !== null && !in_array($groupId, $byLevel[$level]['groupIds'])) {
        $byLevel[$level]['groupIds'][]  = $groupId;
        $byLevel[$level]['groups'][]    = [
            'group_id'     => $groupId,
            'group_number' => (int) $row['group_number'],
            'label'        => 'Group ' . $row['group_number'],
        ];
    }
}

$levels = [];

foreach ($byLevel as $level => $levelData) {
    $cfg      = $levelConfig[$level] ?? ['color' => '#64748b', 'bg' => '#f8fafc', 'border' => '#e2e8f0', 'year' => 'Level ' . $level];
    $courses  = array_values($levelData['courses']);
    $groups   = $levelData['groups'];
    $groupIds = $levelData['groupIds'];

    // ── Get students in these groups ──────────────────────────
    $students = [];

    if (!empty($groupIds)) {
        $inGroups = implode(',', array_fill(0, count($groupIds), '?'));
        $gTypes   = str_repeat('i', count($groupIds));

        $sStmt = $db->prepare("
            SELECT
                s.student_id,
                s.index_number,
                CONCAT(s.first_name,' ',s.last_name) AS full_name,
                sg.group_number,
                p.code AS programme_code
            FROM student s
            JOIN student_group sg ON sg.group_id   = s.group_id
            JOIN programme     p  ON p.programme_id = s.programme_id
            WHERE s.group_id IN ($inGroups)
            ORDER BY full_name ASC
        ");
        $sStmt->bind_param($gTypes, ...$groupIds);
        $sStmt->execute();
        $studentRows = $sStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $sStmt->close();

        // Get course IDs for session count queries
        $courseIds = array_column($courses, 'course_id');

        // Total sessions for this level's courses this period
        $totalSessions = 0;
        if (!empty($courseIds)) {
            $inCourses  = implode(',', array_fill(0, count($courseIds), '?'));
            $cTypes     = str_repeat('i', count($courseIds));

            $tsStmt = $db->prepare("
                SELECT COUNT(DISTINCT ases.session_id) AS total
                FROM attendance_session ases
                JOIN course_rep cr ON cr.id = ases.course_rep_id
                WHERE cr.course_id IN ($inCourses) AND ases.period_id = ?
            ");
            $tsStmt->bind_param($cTypes . 'i', ...array_merge($courseIds, [$periodId]));
            $tsStmt->execute();
            $totalSessions = (int) $tsStmt->get_result()->fetch_assoc()['total'];
            $tsStmt->close();
        }

        foreach ($studentRows as $row) {
            $sid      = (int) $row['student_id'];
            $attended = 0;

            if (!empty($courseIds) && $totalSessions > 0) {
                $inCourses = implode(',', array_fill(0, count($courseIds), '?'));
                $cTypes    = str_repeat('i', count($courseIds));

                $attStmt = $db->prepare("
                    SELECT COUNT(*) AS attended
                    FROM attendance_record ar
                    JOIN attendance_session ases ON ases.session_id = ar.session_id
                    JOIN course_rep cr           ON cr.id           = ases.course_rep_id
                    WHERE ar.student_id = ?
                      AND cr.course_id IN ($inCourses)
                      AND ases.period_id = ?
                      AND ar.status = 'present'
                ");
                $attStmt->bind_param('i' . $cTypes . 'i', $sid, ...array_merge($courseIds, [$periodId]));
                $attStmt->execute();
                $attended = (int) $attStmt->get_result()->fetch_assoc()['attended'];
                $attStmt->close();
            }

            $pct = $totalSessions > 0 ? (int) round(($attended / $totalSessions) * 100) : 0;

            // Device flags
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
                'programme'  => $row['programme_code'],
                'device'     => count($devices) > 0 ? substr($devices[0], 0, 22) : 'No record',
                'attended'   => $attended,
                'total'      => $totalSessions,
                'pct'        => $pct,
                'flagged'    => $flagged,
                'alertType'  => $flagged ? 'multi_device' : null,
                'flagReason' => $flagged ? 'Multiple devices: ' . implode(', ', $devices) : null,
            ];
        }
    }

    // ── Recent sessions for this level ────────────────────────
    $sessions = [];
    $courseIds = array_column($courses, 'course_id');

    if (!empty($courseIds)) {
        $inCourses = implode(',', array_fill(0, count($courseIds), '?'));
        $cTypes    = str_repeat('i', count($courseIds));

        $sessStmt = $db->prepare("
            SELECT
                ases.session_id,
                ases.started_at,
                ases.status,
                c.code AS course_code,
                (SELECT COUNT(*) FROM attendance_record ar
                 WHERE ar.session_id = ases.session_id AND ar.status = 'present') AS checkins
            FROM attendance_session ases
            JOIN course_rep cr ON cr.id       = ases.course_rep_id
            JOIN course     c  ON c.course_id = cr.course_id
            WHERE cr.course_id IN ($inCourses) AND ases.period_id = ?
            ORDER BY ases.started_at DESC LIMIT 10
        ");
        $sessStmt->bind_param($cTypes . 'i', ...array_merge($courseIds, [$periodId]));
        $sessStmt->execute();
        $sessions = array_map(fn($s) => [
            'id'       => 'ATT-' . $s['session_id'],
            'course'   => $s['course_code'],
            'date'     => date('d M Y', strtotime($s['started_at'])),
            'checkins' => (int) $s['checkins'],
            'status'   => $s['status'],
        ], $sessStmt->get_result()->fetch_all(MYSQLI_ASSOC));
        $sessStmt->close();
    }

    // ── Progress rings ────────────────────────────────────────
    $total     = count($students);
    $avgPct    = $total > 0 ? (int) round(array_sum(array_column($students, 'pct')) / $total) : 0;
    $goodCount = count(array_filter($students, fn($s) => $s['pct'] >= 75));
    $lowCount  = count(array_filter($students, fn($s) => $s['pct'] < 75));
    $flagCount = count(array_filter($students, fn($s) => $s['flagged']));

    $progress = [
        ['label' => 'Avg. Attendance', 'value' => $avgPct, 'color' => $avgPct >= 75 ? '#10b981' : '#ef4444', 'raw' => null],
        ['label' => 'Above Threshold', 'value' => $total > 0 ? (int) round($goodCount / $total * 100) : 0, 'color' => '#3b82f6', 'raw' => "$goodCount Students"],
        ['label' => 'Below 75%',       'value' => $total > 0 ? (int) round($lowCount  / $total * 100) : 0, 'color' => '#f59e0b', 'raw' => "$lowCount Students"],
        ['label' => 'Total Enrolled',  'value' => 100, 'color' => '#8b5cf6', 'raw' => "$total Students"],
    ];

    $levels[] = [
        'id'       => 'L' . $level,
        'label'    => 'Level ' . $level,
        'year'     => $cfg['year'],
        'color'    => $cfg['color'],
        'bg'       => $cfg['bg'],
        'border'   => $cfg['border'],
        'courses'  => $courses,
        'groups'   => $groups,
        'students' => $students,
        'sessions' => $sessions,
        'progress' => $progress,
        'stats'    => [
            'courses'       => count($courses),
            'groups'        => count($groups),
            'lowAttendance' => $lowCount,
            'flagged'       => $flagCount,
        ],
    ];
}

sendResponse(true, 'Dashboard loaded.', [
    'lecturer' => [
        'lecturer_id' => (int) $lecturer['lecturer_id'],
        'staff_id'    => $lecturer['staff_id'],
        'first_name'  => $lecturer['first_name'],
        'last_name'   => $lecturer['last_name'],
        'full_name'   => $lecturer['first_name'] . ' ' . $lecturer['last_name'],
        'email'       => $lecturer['email'],
    ],
    'current_period' => [
        'period_id'       => (int) $period['period_id'],
        'label'           => $period['label'],
        'academic_year'   => $period['academic_year'],
        'semester_number' => (int) $period['semester_number'],
        'start_date'      => $period['start_date'],
        'end_date'        => $period['end_date'],
    ],
    'levels' => $levels,
]);