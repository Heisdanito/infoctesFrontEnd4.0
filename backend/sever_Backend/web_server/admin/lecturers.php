<?php
// api/lecturers.php

require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT lecturer_id, staff_id, first_name, last_name, email
            FROM lecturer ORDER BY last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Lecturers loaded.', ['lecturers' => $rows]);
        break;

    case 'get_list':
        $result = $db->query("
            SELECT lecturer_id, CONCAT(first_name, ' ', last_name, ' (', staff_id, ')') as name
            FROM lecturer ORDER BY last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Lecturers loaded.', ['lecturers' => $rows]);
        break;

    case 'insert':
        $staffId   = sanitize($body['staff_id']   ?? '');
        $firstName = sanitize($body['first_name'] ?? '');
        $lastName  = sanitize($body['last_name']  ?? '');
        $email     = sanitize($body['email']      ?? '');
        $password  = $body['password'] ?? '';

        if (!$staffId || !$firstName || !$lastName || !$email || !$password) {
            sendResponse(false, 'All fields are required.', [], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, 'Invalid email address.', [], 422);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare("
            INSERT INTO lecturer (staff_id, first_name, last_name, email, password_hash)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('sssss', $staffId, $firstName, $lastName, $email, $hash);
        
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to insert lecturer. Staff ID or email may already exist.', [], 400);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Lecturer added successfully.', ['lecturer_id' => $newId]);
        break;

    case 'update':
        $id        = (int) ($body['lecturer_id'] ?? 0);
        $staffId   = sanitize($body['staff_id']   ?? '');
        $firstName = sanitize($body['first_name'] ?? '');
        $lastName  = sanitize($body['last_name']  ?? '');
        $email     = sanitize($body['email']      ?? '');
        $password  = $body['password'] ?? '';

        if (!$id) sendResponse(false, 'lecturer_id is required.', [], 422);

        if ($password) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $db->prepare("
                UPDATE lecturer SET staff_id=?, first_name=?, last_name=?, email=?, password_hash=?
                WHERE lecturer_id=?
            ");
            $stmt->bind_param('sssssi', $staffId, $firstName, $lastName, $email, $hash, $id);
        } else {
            $stmt = $db->prepare("
                UPDATE lecturer SET staff_id=?, first_name=?, last_name=?, email=?
                WHERE lecturer_id=?
            ");
            $stmt->bind_param('ssssi', $staffId, $firstName, $lastName, $email, $id);
        }
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Lecturer updated successfully.');
        break;

    case 'delete':
        $id = (int) ($body['lecturer_id'] ?? 0);
        if (!$id) sendResponse(false, 'lecturer_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM lecturer WHERE lecturer_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Lecturer deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>