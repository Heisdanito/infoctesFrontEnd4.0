<?php
// api/groups.php

require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT sg.group_id, sg.group_number, ap.label AS period_label, ap.period_id
            FROM student_group sg
            JOIN academic_period ap ON ap.period_id = sg.period_id
            ORDER BY sg.group_number ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Groups loaded.', ['groups' => $rows]);
        break;

    case 'insert':
        $groupNumber = (int) ($body['group_number'] ?? 0);
        $periodId    = (int) ($body['period_id']    ?? 0);

        if (!$groupNumber || !$periodId) {
            sendResponse(false, 'group_number and period_id are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO student_group (group_number, period_id) VALUES (?, ?)
        ");
        $stmt->bind_param('ii', $groupNumber, $periodId);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Group added successfully.', ['group_id' => $newId]);
        break;

    case 'delete':
        $id = (int) ($body['group_id'] ?? 0);
        if (!$id) sendResponse(false, 'group_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM student_group WHERE group_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Group deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>