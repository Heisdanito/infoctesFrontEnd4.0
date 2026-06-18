<?php
require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {

    case 'live':
        $result = $db->query("
            SELECT ar.device_build_number, ar.submitted_at,
                   s.student_id, s.index_number,
                   CONCAT(s.first_name,' ',s.last_name) AS student_name,
                   c.code AS course_code,
                   ases.session_id, ases.status AS session_status,
                   ases.started_at, ases.expires_at,
                   sg.group_number
            FROM attendance_record ar
            JOIN attendance_session ases ON ases.session_id = ar.session_id
            JOIN student s ON s.student_id = ar.student_id
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            LEFT JOIN course c ON c.course_id = cr.course_id
            JOIN student_group sg ON sg.group_id = cr.group_id
            WHERE ases.status = 'active'
            ORDER BY ar.submitted_at DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Live devices loaded.', ['devices' => $rows]);
        break;

    case 'suspicious':
        $result = $db->query("
            SELECT v.session_id, v.device_build_number, v.student_count, v.index_numbers,
                   ases.started_at, ases.status AS session_status,
                   c.code AS course_code, c.title AS course_title,
                   CONCAT(s.first_name,' ',s.last_name) AS rep_name,
                   sg.group_number, ap.label AS period_label
            FROM v_suspicious_device_activity v
            JOIN attendance_session ases ON ases.session_id = v.session_id
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            LEFT JOIN course c ON c.course_id = cr.course_id
            JOIN student s ON s.student_id = cr.student_id
            JOIN student_group sg ON sg.group_id = cr.group_id
            JOIN academic_period ap ON ap.period_id = ases.period_id
            ORDER BY v.student_count DESC, ases.started_at DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Suspicious activity loaded.', ['suspicious' => $rows]);
        break;

    case 'multi_device_users':
        $result = $db->query("
            SELECT s.student_id, s.index_number,
                   CONCAT(s.first_name,' ',s.last_name) AS student_name,
                   COUNT(DISTINCT ar.device_build_number) AS device_count,
                   GROUP_CONCAT(DISTINCT ar.device_build_number ORDER BY ar.submitted_at SEPARATOR ' | ') AS devices,
                   MIN(ar.submitted_at) AS first_seen, MAX(ar.submitted_at) AS last_seen
            FROM attendance_record ar
            JOIN student s ON s.student_id = ar.student_id
            GROUP BY s.student_id
            HAVING COUNT(DISTINCT ar.device_build_number) > 1
            ORDER BY device_count DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Multi-device users loaded.', ['users' => $rows]);
        break;

    case 'all_devices':
        $result = $db->query("
            SELECT ar.device_build_number,
                   COUNT(DISTINCT ar.student_id) AS student_count,
                   COUNT(DISTINCT ar.session_id) AS session_count,
                   COUNT(ar.record_id) AS record_count,
                   MIN(ar.submitted_at) AS first_seen,
                   MAX(ar.submitted_at) AS last_seen,
                   GROUP_CONCAT(DISTINCT s.index_number ORDER BY ar.submitted_at DESC SEPARATOR ', ') AS index_numbers
            FROM attendance_record ar
            JOIN student s ON s.student_id = ar.student_id
            GROUP BY ar.device_build_number
            ORDER BY record_count DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'All devices loaded.', ['devices' => $rows]);
        break;

    case 'student_devices':
        $studentId = (int) ($body['student_id'] ?? $_GET['student_id'] ?? 0);
        if (!$studentId) sendResponse(false, 'student_id is required.', [], 422);
        $result = $db->query("
            SELECT ar.device_build_number, ar.method, ar.submitted_at,
                   ar.location_valid, ar.status,
                   ases.session_id, c.code AS course_code,
                   sg.group_number
            FROM attendance_record ar
            JOIN attendance_session ases ON ases.session_id = ar.session_id
            JOIN course_rep cr ON cr.id = ases.course_rep_id
            LEFT JOIN course c ON c.course_id = cr.course_id
            JOIN student_group sg ON sg.group_id = cr.group_id
            WHERE ar.student_id = $studentId
            ORDER BY ar.submitted_at DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Student device history loaded.', ['records' => $rows]);
        break;

    case 'reject_suspicious_record':
        $recordId = (int) ($body['record_id'] ?? 0);
        if (!$recordId) sendResponse(false, 'record_id is required.', [], 422);
        $stmt = $db->prepare("UPDATE attendance_record SET status='rejected' WHERE record_id=?");
        $stmt->bind_param('i', $recordId);
        $stmt->execute(); $stmt->close();
        sendResponse(true, 'Record rejected.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>