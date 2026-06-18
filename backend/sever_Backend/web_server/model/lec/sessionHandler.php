<?php
// ============================================================
//  web_server/model/lec/sessionHandler.php
//  Clean rewrite — no timetable dependency for session creation.
//
//  Actions (POST unless noted):
//    create_session_manual — create session by group + course (no timetable needed)
//    close_session         — manually close an active session
//    get_sessions          — GET: list sessions for lecturer this period
//    get_session_students  — GET: all group students + who attended a session
//    delete_attendance     — soft-delete one attendance record
//    get_groups_for_lecturer — GET: groups this lecturer teaches
//    get_courses_for_group   — GET: courses available for a group
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

// Suppress any stray output so JSON is always clean
ob_start();
set_exception_handler(function(Throwable $e) {
    ob_end_clean();
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});

// Handle GET or POST
$isGet  = $_SERVER['REQUEST_METHOD'] === 'GET';
$body   = $isGet ? [] : getRequestBody();
$action = sanitize(($isGet ? ($_GET['action'] ?? '') : ($body['action'] ?? '')));

if (empty($action)) {
    sendResponse(false, 'action is required.', [], 422);
}

$db = getDB();

// ── Helper: generate a unique numeric code ────────────────────
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

// ── Helper: ensure course_rep row exists for group ────────────
// Returns course_rep.id (creates one if missing)
function ensureCourseRep(mysqli $db, int $groupId, int $periodId, int $courseId): int {
    // Look for existing rep for this group+period (course_id can be NULL)
    $stmt = $db->prepare("
        SELECT id FROM course_rep
        WHERE group_id = ? AND period_id = ?
        LIMIT 1
    ");
    $stmt->bind_param('ii', $groupId, $periodId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        // Update course_id if it was NULL
        $upd = $db->prepare("UPDATE course_rep SET course_id = ? WHERE id = ? AND course_id IS NULL");
        $upd->bind_param('ii', $courseId, $row['id']);
        $upd->execute();
        $upd->close();
        return (int) $row['id'];
    }

    // Get first student in this group to use as placeholder rep
    $sSmt = $db->prepare("SELECT student_id FROM student WHERE group_id = ? LIMIT 1");
    $sSmt->bind_param('i', $groupId);
    $sSmt->execute();
    $sRow = $sSmt->get_result()->fetch_assoc();
    $sSmt->close();

    if (!$sRow) return 0;

    $studentId = (int) $sRow['student_id'];
    $ins = $db->prepare("
        INSERT INTO course_rep (student_id, course_id, group_id, period_id)
        VALUES (?, ?, ?, ?)
    ");
    $ins->bind_param('iiii', $studentId, $courseId, $groupId, $periodId);
    $ins->execute();
    $id = $ins->insert_id;
    $ins->close();
    return $id;
}

// ── Helper: ensure timetable row exists ──────────────────────
// Reuses existing timetable for this course+lecturer+period if found,
// then ensures timetable_group link exists. Creates new row only if none exists.
function ensureTimetable(mysqli $db, int $courseId, int $groupId, int $periodId, int $lecturerId): int {
    // Step 1: Find any existing timetable for this course+lecturer+period (no group join)
    $stmt = $db->prepare("
        SELECT timetable_id FROM timetable
        WHERE course_id = ? AND lecturer_id = ? AND period_id = ?
        LIMIT 1
    ");
    $stmt->bind_param('iii', $courseId, $lecturerId, $periodId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        $timetableId = (int) $row['timetable_id'];
    } else {
        // Get or create a default venue
        $vRow = $db->query("SELECT venue_id FROM venue LIMIT 1")->fetch_assoc();
        if (!$vRow) {
            $db->query("INSERT INTO venue (name, type, capacity) VALUES ('Default Venue', 'lecture_hall', 100)");
            $venueId = $db->insert_id;
        } else {
            $venueId = (int) $vRow['venue_id'];
        }

        // Create new timetable row
        $ins = $db->prepare("
            INSERT INTO timetable (course_id, lecturer_id, venue_id, period_id, day_of_week, start_time, end_time)
            VALUES (?, ?, ?, ?, 'Monday', '08:00:00', '10:00:00')
        ");
        $ins->bind_param('iiii', $courseId, $lecturerId, $venueId, $periodId);
        $ins->execute();
        $timetableId = $ins->insert_id;
        $ins->close();
    }

    // Step 2: Ensure timetable_group link exists (INSERT IGNORE = safe if already linked)
    $tg = $db->prepare("INSERT IGNORE INTO timetable_group (timetable_id, group_id) VALUES (?, ?)");
    $tg->bind_param('ii', $timetableId, $groupId);
    $tg->execute();
    $tg->close();

    return $timetableId;
}

switch ($action) {

    // ══════════════════════════════════════════════════════
    //  GET GROUPS FOR LECTURER
    //  Returns all groups this lecturer teaches (via timetable_group)
    //  If no timetable, falls back to all groups in active period
    // ══════════════════════════════════════════════════════
    case 'get_groups_for_lecturer':
        $lecturerId = (int) ($_GET['lecturer_id'] ?? 0);
        $periodId   = (int) ($_GET['period_id']   ?? 0);

        if (!$lecturerId || !$periodId) {
            sendResponse(false, 'lecturer_id and period_id are required.', [], 422);
        }

        // Try via timetable first
        $stmt = $db->prepare("
            SELECT DISTINCT sg.group_id, sg.group_number
            FROM timetable t
            JOIN timetable_group tg ON tg.timetable_id = t.timetable_id
            JOIN student_group   sg ON sg.group_id     = tg.group_id
            WHERE t.lecturer_id = ? AND t.period_id = ?
            ORDER BY sg.group_number ASC
        ");
        $stmt->bind_param('ii', $lecturerId, $periodId);
        $stmt->execute();
        $groups = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // Fallback: all groups for this period
        if (empty($groups)) {
            $stmt2 = $db->prepare("
                SELECT group_id, group_number
                FROM student_group WHERE period_id = ?
                ORDER BY group_number ASC
            ");
            $stmt2->bind_param('i', $periodId);
            $stmt2->execute();
            $groups = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt2->close();
        }

        sendResponse(true, 'Groups loaded.', ['groups' => $groups]);
        break;

    // ══════════════════════════════════════════════════════
    //  GET COURSES FOR GROUP
    //  Returns courses available for a group
    //  (via programme_course or all courses at that level)
    // ══════════════════════════════════════════════════════
    case 'get_courses_for_group':
        $groupId  = (int) ($_GET['group_id']  ?? 0);
        $periodId = (int) ($_GET['period_id'] ?? 0);

        if (!$groupId || !$periodId) {
            sendResponse(false, 'group_id and period_id are required.', [], 422);
        }

        // Get programmes in this group
        $stmt = $db->prepare("
            SELECT DISTINCT c.course_id, c.code, c.title, c.level, c.credit_hours, c.semester
            FROM student s
            JOIN programme_course pc ON pc.programme_id = s.programme_id
            JOIN course           c  ON c.course_id     = pc.course_id
            WHERE s.group_id = ?
            ORDER BY c.level ASC, c.code ASC
        ");
        $stmt->bind_param('i', $groupId);
        $stmt->execute();
        $courses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        // Fallback: all courses
        if (empty($courses)) {
            $all = $db->query("SELECT course_id, code, title, level, credit_hours, semester FROM course ORDER BY level ASC, code ASC");
            $courses = $all->fetch_all(MYSQLI_ASSOC);
        }

        sendResponse(true, 'Courses loaded.', ['courses' => $courses]);
        break;

    // ══════════════════════════════════════════════════════
    //  CREATE SESSION MANUAL
    //  No timetable required. Lecturer picks group + course.
    //  System auto-creates timetable + course_rep if needed.
    // ══════════════════════════════════════════════════════
    case 'create_session_manual':
        $lecturerId  = (int)   ($body['lecturer_id']  ?? 0);
        $courseId    = (int)   ($body['course_id']    ?? 0);
        $groupId     = (int)   ($body['group_id']     ?? 0);
        $periodId    = (int)   ($body['period_id']    ?? 0);
        $repLat      = (float) ($body['rep_lat']      ?? 0.0);
        $repLng      = (float) ($body['rep_lng']      ?? 0.0);
        $durationMin = (int)   ($body['duration_min'] ?? 30);

        if (!$lecturerId || !$courseId || !$groupId || !$periodId) {
            sendResponse(false, 'lecturer_id, course_id, group_id, period_id are required.', [], 422);
        }
        if ($durationMin < 5 || $durationMin > 120) {
            $durationMin = 30;
        }

        // Verify course exists
        $cStmt = $db->prepare("SELECT course_id, code, title FROM course WHERE course_id = ? LIMIT 1");
        $cStmt->bind_param('i', $courseId);
        $cStmt->execute();
        $course = $cStmt->get_result()->fetch_assoc();
        $cStmt->close();
        if (!$course) {
            sendResponse(false, 'Course not found.', [], 404);
        }

        // Verify group exists
        $gStmt = $db->prepare("SELECT group_id, group_number FROM student_group WHERE group_id = ? LIMIT 1");
        $gStmt->bind_param('i', $groupId);
        $gStmt->execute();
        $group = $gStmt->get_result()->fetch_assoc();
        $gStmt->close();
        if (!$group) {
            sendResponse(false, 'Group not found.', [], 404);
        }

        // Ensure course_rep exists for this group
        $courseRepId = ensureCourseRep($db, $groupId, $periodId, $courseId);
        if (!$courseRepId) {
            sendResponse(false, 'No students found in this group. Cannot create session.', [], 400);
        }

        // Ensure timetable row exists (required by FK)
        $timetableId = ensureTimetable($db, $courseId, $groupId, $periodId, $lecturerId);
        if (!$timetableId) {
            sendResponse(false, 'Failed to create timetable entry.', [], 500);
        }

        // Check no active session for this timetable+group already
        $activeCheck = $db->prepare("
            SELECT session_id FROM attendance_session
            WHERE timetable_id = ? AND status = 'active'
            LIMIT 1
        ");
        $activeCheck->bind_param('i', $timetableId);
        $activeCheck->execute();
        if ($activeCheck->get_result()->num_rows > 0) {
            $activeCheck->close();
            sendResponse(false, 'An active session already exists for this course/group. Close it first.', [], 409);
        }
        $activeCheck->close();

        // Generate unique tokens
        
        $qrToken     = bin2hex(random_bytes(24));
        $numericCode = uniqueNumericCode($db);

        // Use DB NOW()+INTERVAL so started_at and expires_at are always in sync
        // This satisfies the chk_expires constraint (expires_at > started_at)
        $ins = $db->prepare("
            INSERT INTO attendance_session
                (course_rep_id, timetable_id, period_id, qr_code, numeric_code,
                 rep_lat, rep_lng, radius_meters,
                 started_at, expires_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 50,
                    NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'active')
        ");
        $ins->bind_param('iiissddi',
            $courseRepId, $timetableId, $periodId,
            $qrToken, $numericCode,
            $repLat, $repLng,
            $durationMin
        );
        if (!$ins->execute()) {
            sendResponse(false, 'Failed to create session: ' . $db->error, [], 500);
        }
        $sessionId = $ins->insert_id;

        // Read back the actual timestamps the DB set
        $tsStmt = $db->prepare("SELECT started_at, expires_at FROM attendance_session WHERE session_id = ?");
        $tsStmt->bind_param('i', $sessionId);
        $tsStmt->execute();
        $ts = $tsStmt->get_result()->fetch_assoc();
        $tsStmt->close();
        $ins->close();

        ob_end_clean();
        sendResponse(true, 'Session created successfully.', [
            'session_id'   => $sessionId,
            'qr_code'      => $qrToken,
            'numeric_code' => $numericCode,
            'started_at'   => $ts['started_at'],
            'expires_at'   => $ts['expires_at'],
            'duration_min' => $durationMin,
            'course'       => $course,
            'group_number' => $group['group_number'],
        ]);
        break;

    // ══════════════════════════════════════════════════════
    //  CLOSE SESSION
    // ══════════════════════════════════════════════════════
    case 'close_session':
        $sessionId  = (int) ($body['session_id']  ?? 0);
        $lecturerId = (int) ($body['lecturer_id'] ?? 0);

        if (!$sessionId) {
            sendResponse(false, 'session_id is required.', [], 422);
        }

        // Verify session exists (relaxed — no timetable ownership check needed)
        $chk = $db->prepare("SELECT session_id FROM attendance_session WHERE session_id = ? LIMIT 1");
        $chk->bind_param('i', $sessionId);
        $chk->execute();
        if ($chk->get_result()->num_rows === 0) {
            sendResponse(false, 'Session not found.', [], 404);
        }
        $chk->close();

        $now  = date('Y-m-d H:i:s');
        $stmt = $db->prepare("
            UPDATE attendance_session
            SET status = 'closed', closed_at = ?
            WHERE session_id = ? AND status = 'active'
        ");
        $stmt->bind_param('si', $now, $sessionId);
        $stmt->execute();
        $stmt->close();

        sendResponse(true, 'Session closed.');
        break;

    // ══════════════════════════════════════════════════════
    //  GET SESSIONS — list for lecturer this period
    // ══════════════════════════════════════════════════════
    case 'get_sessions':
        $lecturerId = (int) ($_GET['lecturer_id'] ?? 0);
        $periodId   = (int) ($_GET['period_id']   ?? 0);

        if (!$lecturerId || !$periodId) {
            sendResponse(false, 'lecturer_id and period_id are required.', [], 422);
        }

        // Auto-expire sessions past their expiry time
        $db->query("UPDATE attendance_session SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()");

        $stmt = $db->prepare("
            SELECT
                ases.session_id,
                ases.numeric_code,
                ases.qr_code,
                ases.started_at,
                ases.expires_at,
                ases.closed_at,
                ases.status,
                ases.rep_lat,
                ases.rep_lng,
                c.course_id,
                c.code        AS course_code,
                c.title       AS course_title,
                c.level,
                sg.group_number,
                sg.group_id,
                t.day_of_week,
                t.start_time,
                (SELECT COUNT(*) FROM attendance_record ar
                 WHERE ar.session_id = ases.session_id AND ar.status = 'present')   AS checkins,
                (SELECT COUNT(*) FROM attendance_record ar2
                 WHERE ar2.session_id = ases.session_id AND ar2.status = 'rejected') AS rejected
            FROM attendance_session ases
            JOIN timetable       t   ON t.timetable_id   = ases.timetable_id
            JOIN course          c   ON c.course_id      = t.course_id
            JOIN course_rep      cr  ON cr.id            = ases.course_rep_id
            JOIN student_group   sg  ON sg.group_id      = cr.group_id
            WHERE t.lecturer_id = ? AND ases.period_id = ?
            ORDER BY ases.started_at DESC
            LIMIT 50
        ");
        $stmt->bind_param('ii', $lecturerId, $periodId);
        $stmt->execute();
        $sessions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        sendResponse(true, 'Sessions loaded.', ['sessions' => $sessions]);
        break;

    // ══════════════════════════════════════════════════════
    //  GET SESSION STUDENTS
    //  All students in the group + who attended
    // ══════════════════════════════════════════════════════
    case 'get_session_students':
        $sessionId = (int) ($_GET['session_id'] ?? $body['session_id'] ?? 0);
        if (!$sessionId) {
            sendResponse(false, 'session_id is required.', [], 422);
        }

        // Get session + group info
        $sessStmt = $db->prepare("
            SELECT
                ases.session_id, ases.numeric_code, ases.qr_code,
                ases.started_at, ases.expires_at, ases.status,
                cr.group_id, sg.group_number,
                c.code AS course_code, c.title AS course_title
            FROM attendance_session ases
            JOIN course_rep    cr  ON cr.id          = ases.course_rep_id
            JOIN student_group sg  ON sg.group_id    = cr.group_id
            JOIN timetable     t   ON t.timetable_id = ases.timetable_id
            JOIN course        c   ON c.course_id    = t.course_id
            WHERE ases.session_id = ? LIMIT 1
        ");
        $sessStmt->bind_param('i', $sessionId);
        $sessStmt->execute();
        $session = $sessStmt->get_result()->fetch_assoc();
        $sessStmt->close();

        if (!$session) {
            sendResponse(false, 'Session not found.', [], 404);
        }

        $groupId = (int) $session['group_id'];

        // All students in the group
        $sStmt = $db->prepare("
            SELECT s.student_id, s.index_number,
                   CONCAT(s.first_name,' ',s.last_name) AS full_name,
                   p.code AS programme_code
            FROM student s
            JOIN programme p ON p.programme_id = s.programme_id
            WHERE s.group_id = ?
            ORDER BY full_name ASC
        ");
        $sStmt->bind_param('i', $groupId);
        $sStmt->execute();
        $allStudents = $sStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $sStmt->close();

        // Attendance records for this session
        $arStmt = $db->prepare("
            SELECT record_id, student_id, method, status,
                   device_build_number, submitted_at, student_lat, student_lng, location_valid
            FROM attendance_record WHERE session_id = ?
        ");
        $arStmt->bind_param('i', $sessionId);
        $arStmt->execute();
        $records = $arStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $arStmt->close();

        $recordMap = [];
        foreach ($records as $r) {
            $recordMap[(int)$r['student_id']] = $r;
        }

        $students = array_map(function($s) use ($recordMap) {
            $sid    = (int) $s['student_id'];
            $record = $recordMap[$sid] ?? null;
            return [
                'student_id'     => $sid,
                'index_number'   => $s['index_number'],
                'full_name'      => $s['full_name'],
                'programme'      => $s['programme_code'],
                'attended'       => $record !== null && $record['status'] === 'present',
                'status'         => $record['status'] ?? 'absent',
                'method'         => $record['method'] ?? null,
                'device'         => $record ? substr($record['device_build_number'], 0, 22) : null,
                'submitted_at'   => $record['submitted_at'] ?? null,
                'location_valid' => $record ? (bool)$record['location_valid'] : null,
                'record_id'      => $record ? (int)$record['record_id'] : null,
            ];
        }, $allStudents);

        sendResponse(true, 'OK', [
            'session'  => $session,
            'students' => $students,
            'summary'  => [
                'total'    => count($allStudents),
                'attended' => count(array_filter($students, fn($s) => $s['attended'])),
                'absent'   => count(array_filter($students, fn($s) => !$s['attended'])),
            ],
        ]);
        break;

    // ══════════════════════════════════════════════════════
    //  DELETE ATTENDANCE RECORD (soft delete)
    // ══════════════════════════════════════════════════════
    case 'delete_attendance':
        $recordId   = (int) ($body['record_id']   ?? 0);
        $lecturerId = (int) ($body['lecturer_id'] ?? 0);

        if (!$recordId) {
            sendResponse(false, 'record_id is required.', [], 422);
        }

        // Soft delete — keep for audit trail
        $stmt = $db->prepare("UPDATE attendance_record SET status = 'rejected' WHERE record_id = ?");
        $stmt->bind_param('i', $recordId);
        $stmt->execute();
        $stmt->close();

        sendResponse(true, 'Attendance record removed (soft deleted).');
        break;

    default:
        sendResponse(false, "Unknown action: {$action}", [], 422);
}

?>


