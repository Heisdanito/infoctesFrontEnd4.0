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
            SELECT cr.id, cr.assigned_at, cr.period_id,
                   s.student_id, s.index_number,
                   CONCAT(s.first_name,' ',s.last_name) AS student_name,
                   s.pin_hash IS NOT NULL AS has_pin,
                   c.course_id, c.code AS course_code, c.title AS course_title,
                   sg.group_number, sg.group_id,
                   ap.label AS period_label
            FROM course_rep cr
            JOIN student s ON s.student_id = cr.student_id
            LEFT JOIN course c ON c.course_id = cr.course_id
            JOIN student_group sg ON sg.group_id = cr.group_id
            JOIN academic_period ap ON ap.period_id = cr.period_id
            $where
            ORDER BY sg.group_number ASC, s.last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Course reps loaded.', ['reps' => $rows]);
        break;

    case 'assign':
        $studentId = (int) ($body['student_id'] ?? 0);
        $courseId  = !empty($body['course_id']) ? (int)$body['course_id'] : null;
        $groupId   = (int) ($body['group_id']   ?? 0);
        $periodId  = (int) ($body['period_id']  ?? 0);
        $pin       = $body['pin'] ?? '';

        if (!$studentId || !$groupId || !$periodId) {
            sendResponse(false, 'student_id, group_id, period_id are required.', [], 422);
        }
        if ($pin && strlen($pin) < 4) {
            sendResponse(false, 'PIN must be at least 4 characters.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO course_rep (student_id, course_id, group_id, period_id)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param('iiii', $studentId, $courseId, $groupId, $periodId);
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to assign rep. This student may already be a rep for this course/group/period.', [], 409);
        }
        $newId = $stmt->insert_id;
        $stmt->close();

        if ($pin) {
            $hash = password_hash($pin, PASSWORD_BCRYPT);
            $ps = $db->prepare("UPDATE student SET pin_hash=? WHERE student_id=?");
            $ps->bind_param('si', $hash, $studentId);
            $ps->execute();
            $ps->close();
        }

        sendResponse(true, 'Course rep assigned successfully.', ['id' => $newId]);
        break;

    case 'remove':
        $id = (int) ($body['id'] ?? 0);
        if (!$id) sendResponse(false, 'id is required.', [], 422);

        $res = $db->prepare("SELECT student_id FROM course_rep WHERE id=?");
        $res->bind_param('i', $id);
        $res->execute();
        $row = $res->get_result()->fetch_assoc();
        $res->close();

        $stmt = $db->prepare("DELETE FROM course_rep WHERE id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        if ($row) {
            $stillRep = $db->prepare("SELECT COUNT(*) AS cnt FROM course_rep WHERE student_id=?");
            $stillRep->bind_param('i', $row['student_id']);
            $stillRep->execute();
            $cnt = $stillRep->get_result()->fetch_assoc()['cnt'];
            $stillRep->close();
            if ($cnt === 0) {
                $clear = $db->prepare("UPDATE student SET pin_hash=NULL WHERE student_id=?");
                $clear->bind_param('i', $row['student_id']);
                $clear->execute();
                $clear->close();
            }
        }

        sendResponse(true, 'Course rep removed. PIN cleared if no longer a rep anywhere.');
        break;

    case 'set_pin':
        $studentId = (int) ($body['student_id'] ?? 0);
        $pin       = $body['pin'] ?? '';
        if (!$studentId || !$pin) sendResponse(false, 'student_id and pin are required.', [], 422);
        if (strlen($pin) < 4) sendResponse(false, 'PIN must be at least 4 characters.', [], 422);
        $hash = password_hash($pin, PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE student SET pin_hash=? WHERE student_id=?");
        $stmt->bind_param('si', $hash, $studentId);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'PIN updated successfully.');
        break;

    case 'clear_pin':
        $studentId = (int) ($body['student_id'] ?? 0);
        if (!$studentId) sendResponse(false, 'student_id is required.', [], 422);
        $stmt = $db->prepare("UPDATE student SET pin_hash=NULL WHERE student_id=?");
        $stmt->bind_param('i', $studentId);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'PIN cleared.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>