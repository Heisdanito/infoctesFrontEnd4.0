<?php
require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {

    case 'get':
        $periodId = (int) ($body['period_id'] ?? $_GET['period_id'] ?? 0);
        $status   = sanitize($body['status']  ?? $_GET['status']   ?? '');
        $where = "WHERE 1=1";
        if ($periodId) $where .= " AND ases.period_id = $periodId";
        if ($status && in_array($status, ['active','expired','closed'])) $where .= " AND ases.status = '$status'";

        $result = $db->query("
            SELECT ases.session_id, ases.qr_code, ases.numeric_code,
                   ases.rep_lat, ases.rep_lng, ases.radius_meters,
                   ases.started_at, ases.expires_at, ases.closed_at, ases.status,
                   cr.id AS rep_assignment_id,
                   CONCAT(s.first_name,' ',s.last_name) AS rep_name, s.index_number AS rep_index,
                   c.code AS course_code, c.title AS course_title,
                   t.day_of_week, t.start_time, t.end_time,
                   v.name AS venue_name,
                   ap.label AS period_label,
                   sg.group_number,
                   COUNT(ar.record_id) AS attendance_count
            FROM attendance_session ases
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            JOIN student s ON s.student_id = cr.student_id
            LEFT JOIN course c ON c.course_id = cr.course_id
            JOIN timetable t ON t.timetable_id = ases.timetable_id
            JOIN venue v ON v.venue_id = t.venue_id
            JOIN academic_period ap ON ap.period_id = ases.period_id
            JOIN student_group sg ON sg.group_id = cr.group_id
            LEFT JOIN attendance_record ar ON ar.session_id = ases.session_id
            $where
            GROUP BY ases.session_id
            ORDER BY ases.started_at DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Sessions loaded.', ['sessions' => $rows]);
        break;

    case 'close':
        $sessionId = (int) ($body['session_id'] ?? 0);
        if (!$sessionId) sendResponse(false, 'session_id is required.', [], 422);
        $stmt = $db->prepare("UPDATE attendance_session SET status='closed', closed_at=NOW() WHERE session_id=? AND status='active'");
        $stmt->bind_param('i', $sessionId);
        $stmt->execute();
        $stmt->close();
        if ($db->affected_rows === 0) sendResponse(false, 'Session not found or already closed/expired.', [], 400);
        sendResponse(true, 'Session closed.');
        break;

    case 'get_records':
        $sessionId = (int) ($body['session_id'] ?? $_GET['session_id'] ?? 0);
        if (!$sessionId) sendResponse(false, 'session_id is required.', [], 422);
        $result = $db->query("
            SELECT ar.record_id, ar.status, ar.method, ar.location_valid,
                   ar.device_build_number, ar.submitted_at,
                   ar.student_lat, ar.student_lng,
                   s.index_number, CONCAT(s.first_name,' ',s.last_name) AS student_name
            FROM attendance_record ar
            JOIN student s ON s.student_id = ar.student_id
            WHERE ar.session_id = $sessionId
            ORDER BY ar.submitted_at ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Records loaded.', ['records' => $rows]);
        break;

    case 'update_record_status':
        $recordId = (int) ($body['record_id'] ?? 0);
        $status   = sanitize($body['status']  ?? '');
        if (!$recordId || !in_array($status, ['present','rejected'])) {
            sendResponse(false, 'record_id and valid status required.', [], 422);
        }
        $stmt = $db->prepare("UPDATE attendance_record SET status=? WHERE record_id=?");
        $stmt->bind_param('si', $status, $recordId);
        $stmt->execute(); $stmt->close();
        sendResponse(true, 'Record status updated.');
        break;

    case 'delete_record':
        $recordId = (int) ($body['record_id'] ?? 0);
        if (!$recordId) sendResponse(false, 'record_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM attendance_record WHERE record_id=?");
        $stmt->bind_param('i', $recordId);
        $stmt->execute(); $stmt->close();
        sendResponse(true, 'Attendance record removed.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>