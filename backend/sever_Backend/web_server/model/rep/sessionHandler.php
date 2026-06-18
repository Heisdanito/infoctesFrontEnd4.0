<?php
ob_start(); // Capture any stray output (warnings, notices) so they never corrupt JSON responses
// ============================================================
//  web_server/model/rep/sessionHandler.php
//  Course Representative Session Management
//  
//  Actions Perfectly Integrated with Frontend (DashRep.jsx):
//    get_repr_groups        - GET: Get groups where user is a rep
//    get_repr_courses       - GET: Get courses for a group
//    create_session         - POST: Create new attendance session
//    get_repr_sessions      - GET: List sessions created by rep
//    get_session_details    - GET: Detailed session info with students (polling)
//    close_session          - POST: Close an active session
//    delete_attendance      - POST: Delete/reject attendance record
//    get_repr_stats         - GET: Get statistics for rep
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

require_once __DIR__ . '/../../../connections/database.php';

// Safe Global Exception Interceptor to enforce strict JSON standards
set_exception_handler(function(Throwable $e) {
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server runtime exception: ' . $e->getMessage(),
        'data' => []
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
});

// Parse HTTP Method Request Context
$isGet  = $_SERVER['REQUEST_METHOD'] === 'GET';
$body   = $isGet ? [] : getRequestBody();
$action = sanitize(($isGet ? ($_GET['action'] ?? '') : ($body['action'] ?? '')));

if (empty($action)) {
    sendResponse(false, 'Action string context is required.', [], 422);
}

$db = getDB();

// ── Shared Utility Helpers ────────────────────────────────────

function uniqueNumericCode(mysqli $db): string {
    do {
        $code  = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $check = $db->prepare("SELECT session_id FROM attendance_session WHERE numeric_code = ? LIMIT 1");
        $check->bind_param('s', $code);
        $check->execute();
        $exists = $check->get_result()->num_rows > 0;
        $check->close();
    } while ($exists);
    return $code;
}

function uniqueQrToken(): string {
    return bin2hex(random_bytes(24));
}

function computeInitials(string $fullName): string {
    $parts = explode(' ', trim($fullName));
    $initials = '';
    if (!empty($parts[0])) { $initials .= strtoupper(substr($parts[0], 0, 1)); }
    if (count($parts) > 1 && !empty($parts[count($parts) - 1])) {
        $initials .= strtoupper(substr($parts[count($parts) - 1], 0, 1));
    }
    return empty($initials) ? 'ST' : substr($initials, 0, 2);
}

function ensureCourseRepRow(mysqli $db, int $studentId, int $courseId, int $groupId, int $periodId): int {
    $stmt = $db->prepare("SELECT id FROM course_rep WHERE student_id = ? AND group_id = ? AND period_id = ? LIMIT 1");
    $stmt->bind_param('iii', $studentId, $groupId, $periodId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        return (int)$row['id'];
    }

    $ins = $db->prepare("INSERT INTO course_rep (student_id, course_id, group_id, period_id) VALUES (?, ?, ?, ?)");
    $ins->bind_param('iiii', $studentId, $courseId, $groupId, $periodId);
    $ins->execute();
    $newId = $ins->insert_id;
    $ins->close();
    return $newId;
}

function ensureTimetableRow(mysqli $db, int $courseId, int $groupId, int $periodId): int {
    $stmt = $db->prepare("
        SELECT t.timetable_id 
        FROM timetable t
        JOIN timetable_group tg ON tg.timetable_id = t.timetable_id
        WHERE t.course_id = ? AND tg.group_id = ? AND t.period_id = ?
        LIMIT 1
    ");
    $stmt->bind_param('iii', $courseId, $groupId, $periodId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        return (int)$row['timetable_id'];
    }

    $vRow = $db->query("SELECT venue_id FROM venue LIMIT 1")->fetch_assoc();
    $venueId = $vRow ? (int)$vRow['venue_id'] : 1;

    $lRow = $db->query("SELECT lecturer_id FROM lecturer LIMIT 1")->fetch_assoc();
    $lecturerId = $lRow ? (int)$lRow['lecturer_id'] : 1;

    $ins = $db->prepare("
        INSERT INTO timetable (course_id, lecturer_id, venue_id, period_id, day_of_week, start_time, end_time)
        VALUES (?, ?, ?, ?, 'Monday', '08:00:00', '10:00:00')
    ");
    $ins->bind_param('iiii', $courseId, $lecturerId, $venueId, $periodId);
    $ins->execute();
    $timetableId = $ins->insert_id;
    $ins->close();

    $tg = $db->prepare("INSERT INTO timetable_group (timetable_id, group_id) VALUES (?, ?)");
    $tg->bind_param('ii', $timetableId, $groupId);
    $tg->execute();
    $tg->close();

    return $timetableId;
}

// Ensure expired sessions switch status automatically upon inspection
$db->query("UPDATE attendance_session SET status = 'expired' WHERE status = 'active' AND expires_at <= NOW()");

// ── Router Action Processing ──────────────────────────────────
switch ($action) {

    case 'get_repr_groups':
        $studentId = (int)($_GET['student_id'] ?? 0);
        $periodId  = (int)($_GET['period_id'] ?? 0);

        if (!$studentId || !$periodId) {
            sendResponse(false, 'Missing required tracking identification attributes.', [], 422);
        }

        $stmt = $db->prepare("
            SELECT DISTINCT sg.group_id, sg.group_number, 
                            (SELECT COUNT(*) FROM student WHERE group_id = sg.group_id) as student_count,
                            p.name as programme_name, p.code as programme_code
            FROM course_rep cr
            JOIN student_group sg ON sg.group_id = cr.group_id
            JOIN student s ON s.student_id = cr.student_id
            JOIN programme p ON p.programme_id = s.programme_id
            WHERE cr.student_id = ? AND cr.period_id = ?
            ORDER BY sg.group_number ASC
        ");
        $stmt->bind_param('ii', $studentId, $periodId);
        $stmt->execute();
        $groups = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        sendResponse(true, 'Groups loaded successfully.', ['groups' => $groups]);
        break;

    case 'get_repr_courses':
        $groupId   = (int)($_GET['group_id'] ?? 0);
        $periodId  = (int)($_GET['period_id'] ?? 0);
        $studentId = (int)($_GET['student_id'] ?? 0);

        if (!$groupId || !$periodId || !$studentId) {
            sendResponse(false, 'Parameters missing.', [], 422);
        }

        // Fetch courses tied to the student's programme framework 
        $stmt = $db->prepare("
            SELECT DISTINCT c.course_id, c.code, c.title, c.level, c.credit_hours
            FROM student s
            JOIN programme_course pc ON pc.programme_id = s.programme_id
            JOIN course c ON c.course_id = pc.course_id
            WHERE s.student_id = ?
            ORDER BY c.code ASC
        ");
        $stmt->bind_param('i', $studentId);
        $stmt->execute();
        $courses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        sendResponse(true, 'Courses parsed successfully.', ['courses' => $courses]);
        break;

    case 'create_session':
        $studentId   = (int)($body['student_id'] ?? 0);
        $groupId     = (int)($body['group_id'] ?? 0);
        $courseId    = (int)($body['course_id'] ?? 0);
        $periodId    = (int)($body['period_id'] ?? 0);
        $durationMin = (int)($body['duration_min'] ?? 10);
        $radius      = (int)($body['radius_meters'] ?? 50);
        $repLat      = (float)($body['rep_lat'] ?? 0.0);
        $repLng      = (float)($body['rep_lng'] ?? 0.0);

        if (!$studentId || !$groupId || !$courseId || !$periodId) {
            sendResponse(false, 'Validation failed: structural entity references missing.', [], 422);
        }

        // Verify no overlapping live session is currently open for this specific course
        $check = $db->prepare("
            SELECT session_id FROM attendance_session ases
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            WHERE cr.group_id = ? AND cr.course_id = ? AND ases.status = 'active' LIMIT 1
        ");
        $check->bind_param('ii', $groupId, $courseId);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            sendResponse(false, 'An active session is already tracking attendance for this course.', [], 409);
        }
        $check->close();

        $courseRepId = ensureCourseRepRow($db, $studentId, $courseId, $groupId, $periodId);
        $timetableId = ensureTimetableRow($db, $courseId, $groupId, $periodId);

        $numericCode = uniqueNumericCode($db);
        $qrToken     = uniqueQrToken();

        $startedAt = date('Y-m-d H:i:s');
        $expiresAt = date('Y-m-d H:i:s', strtotime("+$durationMin minutes"));

        $ins = $db->prepare("
            INSERT INTO attendance_session 
            (course_rep_id, timetable_id, period_id, qr_code, numeric_code, rep_lat, rep_lng, radius_meters, started_at, expires_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ");
        $ins->bind_param('iiisssdiss', $courseRepId, $timetableId, $periodId, $qrToken, $numericCode, $repLat, $repLng, $radius, $startedAt, $expiresAt);
        
        if ($ins->execute()) {
            $sessId = $ins->insert_id;
            $ins->close();

            // Fetch compiled view to feed structural front-end state instantly
            $get = $db->prepare("
                SELECT ases.*, c.code AS course_code, c.title AS course_title
                FROM attendance_session ases
                JOIN course_rep cr ON cr.id = ases.course_rep_id
                JOIN course c ON c.course_id = cr.course_id
                WHERE ases.session_id = ?
            ");
            $get->bind_param('i', $sessId);
            $get->execute();
            $sessionData = $get->get_result()->fetch_assoc();
            $get->close();

            // Format precisely for buildSessionObj mapping array matching fields
            $sessionData['checkins'] = 0;

            sendResponse(true, 'Attendance tracker instantiated.', ['session' => $sessionData]);
        } else {
            sendResponse(false, 'Failed to insert session row.', [], 500);
        }
        break;

    case 'get_repr_sessions':
        $studentId = (int)($_GET['student_id'] ?? 0);
        $periodId  = (int)($_GET['period_id'] ?? 0);

        if (!$studentId || !$periodId) {
            sendResponse(false, 'Tracking properties missing.', [], 422);
        }

        $stmt = $db->prepare("
            SELECT ases.session_id, ases.qr_code, ases.numeric_code, ases.started_at, ases.expires_at, ases.closed_at, ases.status,
                   c.code AS course_code, c.title AS course_title,
                   COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS checkins
            FROM attendance_session ases
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            JOIN course c ON c.course_id = cr.course_id
            LEFT JOIN attendance_record ar ON ar.session_id = ases.session_id
            WHERE cr.student_id = ? AND ases.period_id = ?
            GROUP BY ases.session_id
            ORDER BY ases.session_id DESC
        ");
        $studentIdInt = (int)$studentId;
        $periodIdInt  = (int)$periodId;
        $stmt->bind_param('ii', $studentIdInt, $periodIdInt);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // Mutate numbers to native formats to protect state type checkers
        foreach ($rows as &$r) {
            $r['session_id'] = (int)$r['session_id'];
            $r['checkins']   = (int)$r['checkins'];
        }

        sendResponse(true, 'History parsed.', ['sessions' => $rows]);
        break;

    case 'get_session_details':
        $sessionId = (int)($_GET['session_id'] ?? 0);

        if (!$sessionId) {
            sendResponse(false, 'Target session context token context identifier missing.', [], 422);
        }

        // Fetch primary current session snapshot metrics
        $stmt = $db->prepare("
            SELECT ases.*, c.code AS course_code, c.title AS course_title,
                   COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as checkins
            FROM attendance_session ases
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            JOIN course c ON c.course_id = cr.course_id
            LEFT JOIN attendance_record ar ON ar.session_id = ases.session_id
            WHERE ases.session_id = ?
            GROUP BY ases.session_id
        ");
        $stmt->bind_param('i', $sessionId);
        $stmt->execute();
        $sessInfo = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$sessInfo) {
            sendResponse(false, 'The requested tracker node does not exist inside active scope.', [], 404);
        }

        // Process actual students checked in
        $stStmt = $db->prepare("
            SELECT ar.record_id, ar.submitted_at AS time, ar.method,
                   s.full_name, s.index_number
            FROM attendance_record ar
            JOIN student s ON s.student_id = ar.student_id
            WHERE ar.session_id = ? AND ar.status = 'present'
            ORDER BY ar.submitted_at DESC
        ");
        $stStmt->bind_param('i', $sessionId);
        $stStmt->execute();
        $rawStudents = $stStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stStmt->close();

        $studentsList = [];
        foreach ($rawStudents as $index => $row) {
            $formattedMethod = ($row['method'] === 'qr') ? 'QR Code' : 'Numeric Code';
            $studentsList[] = [
                'record_id'    => (int)$row['record_id'],
                'full_name'    => $row['full_name'],
                'index_number' => $row['index_number'],
                'avatar'       => computeInitials($row['full_name']),
                'method'       => $formattedMethod,
                'time'         => date('h:i A', strtotime($row['time']))
            ];
        }

        // Format root properties
        $sessInfo['session_id'] = (int)$sessInfo['session_id'];
        $sessInfo['checkins']   = (int)$sessInfo['checkins'];

        sendResponse(true, 'Live pool tracking processed.', [
            'session'  => $sessInfo,
            'students' => $studentsList
        ]);
        break;

    case 'close_session':
        $sessionId = (int)($body['session_id'] ?? 0);

        if (!$sessionId) {
            sendResponse(false, 'Session reference key target cannot be vacant.', [], 422);
        }

        $now = date('Y-m-d H:i:s');
        $upd = $db->prepare("UPDATE attendance_session SET status = 'closed', closed_at = ? WHERE session_id = ?");
        $upd->bind_param('si', $now, $sessionId);
        
        if ($upd->execute()) {
            $upd->close();
            sendResponse(true, 'Attendance collection session finalized and sealed successfully.');
        } else {
            sendResponse(false, 'Database internal close manipulation rejected.', [], 500);
        }
        break;

    case 'delete_attendance':
        $recordId  = (int)($body['record_id'] ?? 0);
        $sessionId = (int)($body['session_id'] ?? 0);

        if (!$recordId || !$sessionId) {
            sendResponse(false, 'Mapping identifiers for deletion targets are insufficient.', [], 422);
        }

        // Soft reject status update to match analytics criteria 
        $del = $db->prepare("UPDATE attendance_record SET status = 'rejected' WHERE record_id = ? AND session_id = ?");
        $del->bind_param('ii', $recordId, $sessionId);
        
        if ($del->execute()) {
            $del->close();
            sendResponse(true, 'Student record removed and marked as rejected.');
        } else {
            sendResponse(false, 'Failed to alter individual student attendance status.', [], 500);
        }
        break;

    case 'get_repr_stats':
        $studentId = (int)($_GET['student_id'] ?? 0);
        $periodId  = (int)($_GET['period_id'] ?? 0);

        if (!$studentId || !$periodId) {
            sendResponse(false, 'Telemetry metrics require student and period tracking hooks.', [], 422);
        }

        $statsStmt = $db->prepare("
            SELECT 
                COUNT(DISTINCT ases.session_id) AS total_sessions,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS total_checkins,
                SUM(CASE WHEN ar.status = 'rejected' THEN 1 ELSE 0 END) AS total_rejected,
                IF(COUNT(DISTINCT ases.session_id) > 0,
                    ROUND((SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) / COUNT(DISTINCT ases.session_id)), 1),
                    0.0) AS avg_attendance_rate,
                COUNT(DISTINCT ar.student_id) AS unique_students
            FROM attendance_session ases
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            LEFT JOIN attendance_record ar ON ar.session_id = ases.session_id
            WHERE cr.student_id = ? AND ases.period_id = ?
        ");
        $statsStmt->bind_param('ii', $studentId, $periodId);
        $statsStmt->execute();
        $stats = $statsStmt->get_result()->fetch_assoc();
        $statsStmt->close();

        sendResponse(true, 'Statistics telemetry engine updated.', [
            'stats' => [
                'total_sessions'       => (int)($stats['total_sessions'] ?? 0),
                'total_checkins'       => (int)($stats['total_checkins'] ?? 0),
                'total_rejected'       => (int)($stats['total_rejected'] ?? 0),
                'avg_attendance_rate'  => (float)($stats['avg_attendance_rate'] ?? 0.0),
                'unique_students'      => (int)($stats['unique_students'] ?? 0)
            ]
        ]);
        break;

    default:
        sendResponse(false, "Action handling route '{$action}' was not found in system manifest.", [], 400);
        break;
}