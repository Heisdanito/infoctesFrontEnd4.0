<?php
require_once __DIR__ . '/../../connections/database.php';

$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT programme_id, name, code FROM programme ORDER BY name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Programmes loaded.', ['programmes' => $rows]);
        break;

    case 'insert':
        $name = sanitize($body['name'] ?? '');
        $code = sanitize($body['code'] ?? '');

        if (!$name || !$code) {
            sendResponse(false, 'name and code are required.', [], 422);
        }

        $stmt = $db->prepare("INSERT INTO programme (name, code) VALUES (?, ?)");
        $stmt->bind_param('ss', $name, $code);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Programme added successfully.', ['programme_id' => $newId]);
        break;

    case 'delete':
        $id = (int) ($body['programme_id'] ?? 0);
        if (!$id) sendResponse(false, 'programme_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM programme WHERE programme_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Programme deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>