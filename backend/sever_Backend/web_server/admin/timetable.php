<?php
require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT t.timetable_id, t.day_of_week, t.start_time, t.end_time, t.period_id,
                   c.course_id, c.code AS course_code, c.title AS course_title,
                   l.lecturer_id, CONCAT(l.first_name,' ',l.last_name) AS lecturer_name,
                   v.venue_id, v.name AS venue_name,
                   ap.label AS period_label,
                   GROUP_CONCAT(DISTINCT tg.group_id ORDER BY tg.group_id SEPARATOR ',') AS group_ids,
                   GROUP_CONCAT(DISTINCT sg.group_number ORDER BY sg.group_number SEPARATOR ',') AS group_numbers,
                   GROUP_CONCAT(DISTINCT tp.programme_id ORDER BY tp.programme_id SEPARATOR ',') AS programme_ids,
                   GROUP_CONCAT(DISTINCT p.code ORDER BY p.code SEPARATOR ', ') AS programme_codes
            FROM timetable t
            JOIN course c ON c.course_id = t.course_id
            JOIN lecturer l ON l.lecturer_id = t.lecturer_id
            JOIN venue v ON v.venue_id = t.venue_id
            JOIN academic_period ap ON ap.period_id = t.period_id
            LEFT JOIN timetable_group tg ON tg.timetable_id = t.timetable_id
            LEFT JOIN student_group sg ON sg.group_id = tg.group_id
            LEFT JOIN timetable_programme tp ON tp.timetable_id = t.timetable_id
            LEFT JOIN programme p ON p.programme_id = tp.programme_id
            GROUP BY t.timetable_id
            ORDER BY FIELD(t.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.start_time ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Timetable loaded.', ['timetable' => $rows]);
        break;

    case 'insert':
        $courseId   = (int) ($body['course_id']   ?? 0);
        $lecturerId = (int) ($body['lecturer_id'] ?? 0);
        $venueId    = (int) ($body['venue_id']    ?? 0);
        $periodId   = (int) ($body['period_id']   ?? 0);
        $day        = sanitize($body['day_of_week'] ?? '');
        $start      = sanitize($body['start_time']  ?? '');
        $end        = sanitize($body['end_time']    ?? '');
        $groupIds   = $body['group_ids']     ?? [];
        $progIds    = $body['programme_ids'] ?? [];

        if (!$courseId || !$lecturerId || !$venueId || !$periodId || !$day || !$start || !$end) {
            sendResponse(false, 'course, lecturer, venue, period, day, start_time, end_time are required.', [], 422);
        }

        $stmt = $db->prepare("INSERT INTO timetable (course_id, lecturer_id, venue_id, period_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('iiiisss', $courseId, $lecturerId, $venueId, $periodId, $day, $start, $end);
        if (!$stmt->execute()) sendResponse(false, 'Failed to insert timetable entry.', [], 400);
        $ttId = $stmt->insert_id;
        $stmt->close();

        if (!empty($groupIds)) {
            $gs = $db->prepare("INSERT IGNORE INTO timetable_group (timetable_id, group_id) VALUES (?, ?)");
            foreach ($groupIds as $gid) { $gid = (int)$gid; $gs->bind_param('ii', $ttId, $gid); $gs->execute(); }
            $gs->close();
        }
        if (!empty($progIds)) {
            $ps = $db->prepare("INSERT IGNORE INTO timetable_programme (timetable_id, programme_id) VALUES (?, ?)");
            foreach ($progIds as $pid) { $pid = (int)$pid; $ps->bind_param('ii', $ttId, $pid); $ps->execute(); }
            $ps->close();
        }
        sendResponse(true, 'Timetable entry added.', ['timetable_id' => $ttId]);
        break;

    case 'update':
        $ttId       = (int) ($body['timetable_id'] ?? 0);
        $courseId   = (int) ($body['course_id']    ?? 0);
        $lecturerId = (int) ($body['lecturer_id']  ?? 0);
        $venueId    = (int) ($body['venue_id']     ?? 0);
        $periodId   = (int) ($body['period_id']    ?? 0);
        $day        = sanitize($body['day_of_week']  ?? '');
        $start      = sanitize($body['start_time']   ?? '');
        $end        = sanitize($body['end_time']     ?? '');
        $groupIds   = $body['group_ids']     ?? [];
        $progIds    = $body['programme_ids'] ?? [];
        if (!$ttId) sendResponse(false, 'timetable_id is required.', [], 422);

        $stmt = $db->prepare("UPDATE timetable SET course_id=?, lecturer_id=?, venue_id=?, period_id=?, day_of_week=?, start_time=?, end_time=? WHERE timetable_id=?");
        $stmt->bind_param('iiiiissi', $courseId, $lecturerId, $venueId, $periodId, $day, $start, $end, $ttId);
        $stmt->execute(); $stmt->close();

        $d1 = $db->prepare("DELETE FROM timetable_group WHERE timetable_id=?");
        $d1->bind_param('i', $ttId); $d1->execute(); $d1->close();
        $d2 = $db->prepare("DELETE FROM timetable_programme WHERE timetable_id=?");
        $d2->bind_param('i', $ttId); $d2->execute(); $d2->close();

        if (!empty($groupIds)) {
            $gs = $db->prepare("INSERT IGNORE INTO timetable_group (timetable_id, group_id) VALUES (?, ?)");
            foreach ($groupIds as $gid) { $gid = (int)$gid; $gs->bind_param('ii', $ttId, $gid); $gs->execute(); }
            $gs->close();
        }
        if (!empty($progIds)) {
            $ps = $db->prepare("INSERT IGNORE INTO timetable_programme (timetable_id, programme_id) VALUES (?, ?)");
            foreach ($progIds as $pid) { $pid = (int)$pid; $ps->bind_param('ii', $ttId, $pid); $ps->execute(); }
            $ps->close();
        }
        sendResponse(true, 'Timetable entry updated.');
        break;

    case 'delete':
        $ttId = (int) ($body['timetable_id'] ?? 0);
        if (!$ttId) sendResponse(false, 'timetable_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM timetable WHERE timetable_id=?");
        $stmt->bind_param('i', $ttId);
        $stmt->execute(); $stmt->close();
        sendResponse(true, 'Timetable entry deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>