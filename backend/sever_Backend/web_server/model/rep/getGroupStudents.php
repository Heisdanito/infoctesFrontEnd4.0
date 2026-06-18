<?php
// web_server/model/lec/getGroupStudents.php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$groupName = $_GET['group_name'] ?? '';
$periodId  = (int) ($_GET['period_id'] ?? 0);

if (!$groupName || !$periodId) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

$db = getDB();

// Get group_id
$groupStmt = $db->prepare("
    SELECT group_id, group_number 
    FROM student_group 
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

// Get all students in this group
$studentsStmt = $db->prepare("
    SELECT s.student_id, s.index_number, 
           CONCAT(s.first_name, ' ', s.last_name) as full_name,
           p.code as programme_code,
           p.name as programme_name
    FROM student s
    JOIN programme p ON p.programme_id = s.programme_id
    WHERE s.group_id = ?
    ORDER BY s.last_name ASC
");
$studentsStmt->bind_param('i', $groupId);
$studentsStmt->execute();
$students = $studentsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$studentsStmt->close();

// Get existing course rep for this group
$repStmt = $db->prepare("
    SELECT cr.id as rep_id, cr.student_id,
           CONCAT(s.first_name, ' ', s.last_name) as student_name,
           s.index_number
    FROM course_rep cr
    JOIN student s ON s.student_id = cr.student_id
    WHERE cr.group_id = ? AND cr.period_id = ?
    ORDER BY cr.assigned_at DESC
    LIMIT 1
");
$repStmt->bind_param('ii', $groupId, $periodId);
$repStmt->execute();
$repResult = $repStmt->get_result();
$existingRep = $repResult->num_rows > 0 ? $repResult->fetch_assoc() : null;
$repStmt->close();

echo json_encode([
    'success' => true,
    'data' => [
        'students' => $students,
        'existing_rep' => $existingRep,
        'group_id' => $groupId,
        'group_number' => (int) $groupName
    ]
]);