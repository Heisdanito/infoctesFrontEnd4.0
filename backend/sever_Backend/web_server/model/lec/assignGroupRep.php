<?php
// web_server/model/lec/assignGroupRep.php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

$input = json_decode(file_get_contents('php://input'), true);

$lecturerId = (int) ($input['lecturer_id'] ?? 0);
$groupName  = $input['group_name'] ?? '';
$studentId  = (int) ($input['student_id'] ?? 0);
$periodId   = (int) ($input['period_id'] ?? 0);

if (!$lecturerId || !$groupName || !$studentId || !$periodId) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

$db = getDB();

// Get group_id
$groupStmt = $db->prepare("
    SELECT group_id FROM student_group 
    WHERE group_number = ? AND period_id = ? 
    LIMIT 1
");
$groupStmt->bind_param('ii', $groupName, $periodId);
$groupStmt->execute();
$groupResult = $groupStmt->get_result();
if ($groupResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Group not found']);
    exit;
}
$groupId = $groupResult->fetch_assoc()['group_id'];
$groupStmt->close();

// Verify student belongs to this group
$verifyStmt = $db->prepare("
    SELECT student_id FROM student 
    WHERE student_id = ? AND group_id = ?
    LIMIT 1
");
$verifyStmt->bind_param('ii', $studentId, $groupId);
$verifyStmt->execute();
if ($verifyStmt->get_result()->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Student does not belong to this group']);
    exit;
}
$verifyStmt->close();

// Check if rep already exists for this group
$checkStmt = $db->prepare("
    SELECT id FROM course_rep 
    WHERE group_id = ? AND period_id = ?
    LIMIT 1
");
$checkStmt->bind_param('ii', $groupId, $periodId);
$checkStmt->execute();

if ($checkStmt->get_result()->num_rows > 0) {
    // Update existing rep
    $checkStmt->close();
    $updateStmt = $db->prepare("
        UPDATE course_rep 
        SET student_id = ?, assigned_at = NOW()
        WHERE group_id = ? AND period_id = ?
    ");
    $updateStmt->bind_param('iii', $studentId, $groupId, $periodId);
    $updateStmt->execute();
    $repId = $updateStmt->insert_id ?: $db->insert_id;
    $updateStmt->close();
} else {
    $checkStmt->close();
    // Insert new rep (course_id can be NULL for group-wide rep)
    $insertStmt = $db->prepare("
        INSERT INTO course_rep (student_id, course_id, group_id, period_id)
        VALUES (?, NULL, ?, ?)
    ");
    $insertStmt->bind_param('iii', $studentId, $groupId, $periodId);
    $insertStmt->execute();
    $repId = $insertStmt->insert_id;
    $insertStmt->close();
}

// Get student info for response
$studentStmt = $db->prepare("
    SELECT CONCAT(first_name, ' ', last_name) as student_name, index_number
    FROM student WHERE student_id = ?
");
$studentStmt->bind_param('i', $studentId);
$studentStmt->execute();
$student = $studentStmt->get_result()->fetch_assoc();
$studentStmt->close();

echo json_encode([
    'success' => true,
    'data' => [
        'rep_id' => $repId,
        'student_id' => $studentId,
        'student_name' => $student['student_name'],
        'index_number' => $student['index_number'],
        'group_id' => $groupId,
        'group_number' => (int) $groupName
    ]
]);