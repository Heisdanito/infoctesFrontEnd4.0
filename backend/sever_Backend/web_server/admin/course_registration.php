<?php
require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {

    case 'get':
        $periodId = (int) ($body['period_id'] ?? $_GET['period_id'] ?? 0);
        $where = $periodId ? "WHERE cr.period_id = $periodId" : '';
        $result = $db->query("
            SELECT cr.id, cr.status, cr.created_at, cr.period_id,
                   s.student_id, s.index_number,
                   CONCAT(s.first_name,' ',s.last_name) AS student_name,
                   s.level, p.code AS programme_code,
                   c.course_id, c.code AS course_code, c.title AS course_title,
                   ap.label AS period_label
            FROM course_registration cr
            JOIN student s ON s.student_id = cr.student_id
            JOIN programme p ON p.programme_id = s.programme_id
            JOIN course c ON c.course_id = cr.course_id
            JOIN academic_period ap ON ap.period_id = cr.period_id
            $where
            ORDER BY s.last_name ASC, c.code ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Registrations loaded.', ['registrations' => $rows]);
        break;

    case 'insert':
        $studentId = (int) ($body['student_id'] ?? 0);
        $courseId  = (int) ($body['course_id']  ?? 0);
        $periodId  = (int) ($body['period_id']  ?? 0);
        if (!$studentId || !$courseId || !$periodId) {
            sendResponse(false, 'student_id, course_id, period_id are required.', [], 422);
        }
        $stmt = $db->prepare("INSERT IGNORE INTO course_registration (student_id, course_id, period_id, status) VALUES (?, ?, ?, 'registered')");
        $stmt->bind_param('iii', $studentId, $courseId, $periodId);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        if (!$newId) sendResponse(false, 'Already registered for this course in this period.', [], 409);
        sendResponse(true, 'Course registered successfully.', ['id' => $newId]);
        break;

    case 'bulk_register':
        $courseId = (int) ($body['course_id'] ?? 0);
        $periodId = (int) ($body['period_id'] ?? 0);
        $filter   = sanitize($body['filter']  ?? '');
        if (!$courseId || !$periodId || !$filter) {
            sendResponse(false, 'course_id, period_id, filter are required.', [], 422);
        }

        $cond = match($filter) {
            'level100' => "s.level = 100",
            'level200' => "s.level = 200",
            'level300' => "s.level = 300",
            'level400' => "s.level = 400",
            'bed'      => "p.code LIKE 'BED%'",
            'bsc'      => "p.code LIKE 'BSC%'",
            'all'      => "1=1",
            default    => null
        };
        if (!$cond) sendResponse(false, 'Invalid filter value.', [], 422);

        $result = $db->query("SELECT s.student_id FROM student s JOIN programme p ON p.programme_id = s.programme_id WHERE $cond");
        $students = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        if (empty($students)) sendResponse(false, 'No students matched the filter.', [], 404);

        $stmt = $db->prepare("INSERT IGNORE INTO course_registration (student_id, course_id, period_id, status) VALUES (?, ?, ?, 'registered')");
        $inserted = 0;
        foreach ($students as $stu) {
            $sid = (int) $stu['student_id'];
            $stmt->bind_param('iii', $sid, $courseId, $periodId);
            $stmt->execute();
            if ($stmt->insert_id) $inserted++;
        }
        $stmt->close();
        $skipped = count($students) - $inserted;
        sendResponse(true, "Bulk done: $inserted registered, $skipped skipped (already existed).", [
            'inserted' => $inserted, 'skipped' => $skipped, 'total' => count($students)
        ]);
        break;

    case 'bulk_complete':
        $courseId = (int) ($body['course_id'] ?? 0);
        $periodId = (int) ($body['period_id'] ?? 0);
        $filter   = sanitize($body['filter']  ?? '');
        if (!$courseId || !$periodId) sendResponse(false, 'course_id and period_id are required.', [], 422);

        if ($filter && $filter !== 'all') {
            $cond = match($filter) {
                'level100' => "s.level = 100",
                'level200' => "s.level = 200",
                'level300' => "s.level = 300",
                'level400' => "s.level = 400",
                'bed'      => "p.code LIKE 'BED%'",
                'bsc'      => "p.code LIKE 'BSC%'",
                default    => null
            };
            if (!$cond) sendResponse(false, 'Invalid filter.', [], 422);
            $result = $db->query("SELECT s.student_id FROM student s JOIN programme p ON p.programme_id = s.programme_id WHERE $cond");
            $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
            if (empty($rows)) sendResponse(false, 'No students matched.', [], 404);
            $ids = implode(',', array_map(fn($r) => (int)$r['student_id'], $rows));
            $db->query("UPDATE course_registration SET status='completed' WHERE course_id=$courseId AND period_id=$periodId AND student_id IN ($ids) AND status='registered'");
        } else {
            $stmt = $db->prepare("UPDATE course_registration SET status='completed' WHERE course_id=? AND period_id=? AND status='registered'");
            $stmt->bind_param('ii', $courseId, $periodId);
            $stmt->execute();
            $stmt->close();
        }

        $affected = $db->affected_rows;
        sendResponse(true, "$affected registration(s) marked as completed.", ['affected' => $affected]);
        break;

    case 'update_status':
        $id = (int) ($body['id'] ?? 0);
        $status = sanitize($body['status'] ?? '');
        if (!$id || !in_array($status, ['registered','dropped','completed'])) {
            sendResponse(false, 'id and valid status are required.', [], 422);
        }
        $stmt = $db->prepare("UPDATE course_registration SET status=? WHERE id=?");
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Status updated.');
        break;

    case 'delete':
        $id = (int) ($body['id'] ?? 0);
        if (!$id) sendResponse(false, 'id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM course_registration WHERE id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Registration removed.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>