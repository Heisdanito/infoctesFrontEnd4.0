<?php
// api/periods.php

require_once __DIR__ . '/../../connections/database.php';
$db = getDB();
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

switch ($action) {
    case 'get':
        $result = $db->query("
            SELECT period_id, label, academic_year, semester_number, 
                   start_date, end_date, is_active, created_at
            FROM academic_period ORDER BY period_id DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Periods loaded.', ['periods' => $rows]);
        break;

    case 'get_active':
        $result = $db->query("
            SELECT period_id, label, academic_year, semester_number, is_active
            FROM academic_period WHERE is_active = 1 LIMIT 1
        ");
        $row = $result ? $result->fetch_assoc() : null;
        sendResponse(true, 'Active period loaded.', ['period' => $row]);
        break;

    case 'insert':
        $label        = sanitize($body['label']            ?? '');
        $academicYear = sanitize($body['academic_year']    ?? '');
        $semester     = (int) ($body['semester_number']    ?? 1);
        $startDate    = sanitize($body['start_date']       ?? '');
        $endDate      = sanitize($body['end_date']         ?? '');
        $isActive     = (int) ($body['is_active']          ?? 0);

        if (!$label || !$academicYear || !$startDate || !$endDate) {
            sendResponse(false, 'label, academic_year, start_date, end_date are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO academic_period (label, academic_year, semester_number, start_date, end_date, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('ssissi', $label, $academicYear, $semester, $startDate, $endDate, $isActive);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Academic period added successfully.', ['period_id' => $newId]);
        break;

    case 'update':
        $id           = (int) ($body['period_id']         ?? 0);
        $label        = sanitize($body['label']            ?? '');
        $academicYear = sanitize($body['academic_year']    ?? '');
        $semester     = (int) ($body['semester_number']    ?? 1);
        $startDate    = sanitize($body['start_date']       ?? '');
        $endDate      = sanitize($body['end_date']         ?? '');
        $isActive     = (int) ($body['is_active']          ?? 0);

        if (!$id) sendResponse(false, 'period_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE academic_period 
            SET label=?, academic_year=?, semester_number=?, start_date=?, end_date=?, is_active=?
            WHERE period_id=?
        ");
        $stmt->bind_param('ssissii', $label, $academicYear, $semester, $startDate, $endDate, $isActive, $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Academic period updated successfully.');
        break;

    case 'delete':
        $id = (int) ($body['period_id'] ?? 0);
        if (!$id) sendResponse(false, 'period_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM academic_period WHERE period_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Academic period deleted.');
        break;

    case 'set_active':
        $id = (int) ($body['period_id'] ?? 0);
        if (!$id) sendResponse(false, 'period_id is required.', [], 422);
        
        $db->query("UPDATE academic_period SET is_active = 0");
        $stmt = $db->prepare("UPDATE academic_period SET is_active = 1 WHERE period_id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Active period set successfully.');
        break;

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>