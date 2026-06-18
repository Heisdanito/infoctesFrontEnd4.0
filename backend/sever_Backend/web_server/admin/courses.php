<?php
// api/courses.php

require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT c.course_id, c.code, c.title, c.credit_hours, c.level, c.semester,
                   GROUP_CONCAT(DISTINCT p.code ORDER BY p.code SEPARATOR ', ') AS programmes,
                   GROUP_CONCAT(DISTINCT p.programme_id SEPARATOR ',') AS programme_ids
            FROM course c
            LEFT JOIN programme_course pc ON pc.course_id = c.course_id
            LEFT JOIN programme p ON p.programme_id = pc.programme_id
            GROUP BY c.course_id
            ORDER BY c.level ASC, c.code ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Courses loaded.', ['courses' => $rows]);
        break;

    case 'insert':
        $code        = sanitize($body['code']         ?? '');
        $title       = sanitize($body['title']        ?? '');
        $creditHours = (int) ($body['credit_hours']   ?? 3);
        $level       = (int) ($body['level']          ?? 0);
        $semester    = (int) ($body['semester']       ?? 0);
        $programmes  = $body['programme_ids']         ?? [];

        if (!$code || !$title || !$level || !$semester) {
            sendResponse(false, 'code, title, level, semester are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO course (code, title, credit_hours, level, semester) VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('ssiii', $code, $title, $creditHours, $level, $semester);
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to insert course. Code may already exist.', [], 400);
        }
        $courseId = $stmt->insert_id;
        $stmt->close();

        if (!empty($programmes)) {
            $pcStmt = $db->prepare("INSERT IGNORE INTO programme_course (programme_id, course_id) VALUES (?, ?)");
            foreach ($programmes as $pid) {
                $pid = (int) $pid;
                $pcStmt->bind_param('ii', $pid, $courseId);
                $pcStmt->execute();
            }
            $pcStmt->close();
        }

        sendResponse(true, 'Course added successfully.', ['course_id' => $courseId]);
        break;

    case 'update':
        $id          = (int) ($body['course_id']      ?? 0);
        $code        = sanitize($body['code']         ?? '');
        $title       = sanitize($body['title']        ?? '');
        $creditHours = (int) ($body['credit_hours']   ?? 3);
        $level       = (int) ($body['level']          ?? 0);
        $semester    = (int) ($body['semester']       ?? 0);
        $programmes  = $body['programme_ids']         ?? [];

        if (!$id) sendResponse(false, 'course_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE course SET code=?, title=?, credit_hours=?, level=?, semester=? WHERE course_id=?
        ");
        $stmt->bind_param('ssiiii', $code, $title, $creditHours, $level, $semester, $id);
        $stmt->execute();
        $stmt->close();

        // Re-sync programme links
        $delStmt = $db->prepare("DELETE FROM programme_course WHERE course_id=?");
        $delStmt->bind_param('i', $id);
        $delStmt->execute();
        $delStmt->close();

        if (!empty($programmes)) {
            $pcStmt = $db->prepare("INSERT IGNORE INTO programme_course (programme_id, course_id) VALUES (?, ?)");
            foreach ($programmes as $pid) {
                $pid = (int) $pid;
                $pcStmt->bind_param('ii', $pid, $id);
                $pcStmt->execute();
            }
            $pcStmt->close();
        }

        sendResponse(true, 'Course updated successfully.');
        break;

    case 'delete':
        $id = (int) ($body['course_id'] ?? 0);
        if (!$id) sendResponse(false, 'course_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM course WHERE course_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Course deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>