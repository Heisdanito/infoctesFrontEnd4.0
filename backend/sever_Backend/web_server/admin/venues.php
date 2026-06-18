<?php
// api/venues.php

require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT venue_id, name, type, capacity, gps_lat, gps_lng
            FROM venue ORDER BY name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Venues loaded.', ['venues' => $rows]);
        break;

    case 'insert':
        $name     = sanitize($body['name']     ?? '');
        $type     = sanitize($body['type']     ?? 'lecture_hall');
        $capacity = (int) ($body['capacity']   ?? 0);
        $gpsLat   = !empty($body['gps_lat']) ? (float) $body['gps_lat'] : null;
        $gpsLng   = !empty($body['gps_lng']) ? (float) $body['gps_lng'] : null;

        if (!$name || !$capacity) {
            sendResponse(false, 'name and capacity are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO venue (name, type, capacity, gps_lat, gps_lng)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('ssidd', $name, $type, $capacity, $gpsLat, $gpsLng);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Venue added successfully.', ['venue_id' => $newId]);
        break;

    case 'update':
        $id       = (int) ($body['venue_id'] ?? 0);
        $name     = sanitize($body['name']     ?? '');
        $type     = sanitize($body['type']     ?? 'lecture_hall');
        $capacity = (int) ($body['capacity']   ?? 0);
        $gpsLat   = !empty($body['gps_lat']) ? (float) $body['gps_lat'] : null;
        $gpsLng   = !empty($body['gps_lng']) ? (float) $body['gps_lng'] : null;

        if (!$id) sendResponse(false, 'venue_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE venue SET name=?, type=?, capacity=?, gps_lat=?, gps_lng=?
            WHERE venue_id=?
        ");
        $stmt->bind_param('ssiddi', $name, $type, $capacity, $gpsLat, $gpsLng, $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Venue updated successfully.');
        break;

    case 'delete':
        $id = (int) ($body['venue_id'] ?? 0);
        if (!$id) sendResponse(false, 'venue_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM venue WHERE venue_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Venue deleted.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>