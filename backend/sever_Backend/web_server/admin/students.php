<?php
// api/students.php

require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT s.student_id, s.index_number, s.first_name, s.last_name,
                   s.email, s.phone, s.level,
                   p.name AS programme_name, p.code AS programme_code, p.programme_id,
                   sg.group_number, sg.group_id,
                   ap.label AS period_label, ap.period_id
            FROM student s
            JOIN programme p ON p.programme_id = s.programme_id
            JOIN student_group sg ON sg.group_id = s.group_id
            JOIN academic_period ap ON ap.period_id = sg.period_id
            ORDER BY s.last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Students loaded.', ['students' => $rows]);
        break;

    case 'insert':
        $indexNum    = sanitize($body['index_number']  ?? '');
        $firstName   = sanitize($body['first_name']    ?? '');
        $lastName    = sanitize($body['last_name']     ?? '');
        $email       = sanitize($body['email']         ?? '');
        $phone       = sanitize($body['phone']         ?? '');
        $level       = (int) ($body['level']           ?? 0);
        $programmeId = (int) ($body['programme_id']    ?? 0);
        $groupId     = (int) ($body['group_id']        ?? 0);

        if (!$indexNum || !$firstName || !$lastName || !$level || !$programmeId || !$groupId) {
            sendResponse(false, 'index_number, first_name, last_name, level, programme_id, group_id are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO student (index_number, first_name, last_name, email, phone, level, programme_id, group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('sssssiii', $indexNum, $firstName, $lastName, $email, $phone, $level, $programmeId, $groupId);
        
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to insert student. Index number may already exist.', [], 400);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Student added successfully.', ['student_id' => $newId]);
        break;

    case 'update':
        $id          = (int) ($body['student_id']      ?? 0);
        $indexNum    = sanitize($body['index_number']  ?? '');
        $firstName   = sanitize($body['first_name']    ?? '');
        $lastName    = sanitize($body['last_name']     ?? '');
        $email       = sanitize($body['email']         ?? '');
        $phone       = sanitize($body['phone']         ?? '');
        $level       = (int) ($body['level']           ?? 0);
        $programmeId = (int) ($body['programme_id']    ?? 0);
        $groupId     = (int) ($body['group_id']        ?? 0);

        if (!$id) sendResponse(false, 'student_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE student
            SET index_number=?, first_name=?, last_name=?, email=?, phone=?, level=?, programme_id=?, group_id=?
            WHERE student_id=?
        ");
        $stmt->bind_param('sssssiiii', $indexNum, $firstName, $lastName, $email, $phone, $level, $programmeId, $groupId, $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Student updated successfully.');
        break;

    case 'delete':
        $id = (int) ($body['student_id'] ?? 0);
        if (!$id) sendResponse(false, 'student_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM student WHERE student_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Student deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>