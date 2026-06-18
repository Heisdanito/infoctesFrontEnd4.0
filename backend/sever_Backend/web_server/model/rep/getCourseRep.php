<?php
// web_server/model/lec/getCourseRep.php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$courseCode = $_GET['course_code'] ?? '';
$groupName  = $_GET['group'] ?? '';
$periodId   = (int) ($_GET['period_id'] ?? 0);

if (!$courseCode || !$groupName || !$periodId) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

$db = getDB();

// Get course_id
$courseStmt = $db->prepare("SELECT course_id FROM course WHERE code = ? LIMIT 1");
$courseStmt->bind_param('s', $courseCode);
$courseStmt->execute();
$courseResult = $courseStmt->get_result();
if ($courseResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Course not found']);
    exit;
}
$courseId = $courseResult->fetch_assoc()['course_id'];
$courseStmt->close();

// Get group_id
$groupStmt = $db->prepare("SELECT group_id FROM student_group WHERE group_number = ? AND period_id = ? LIMIT 1");
$groupStmt->bind_param('ii', $groupName, $periodId);
$groupStmt->execute();
$groupResult = $groupStmt->get_result();
if ($groupResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Group not found']);
    exit;
}
$groupId = $groupResult->fetch_assoc()['group_id'];
$groupStmt->close();

// Find course rep
$repStmt = $db->prepare("
    SELECT id as course_rep_id FROM course_rep 
    WHERE course_id = ? AND group_id = ? AND period_id = ? 
    LIMIT 1
");
$repStmt->bind_param('iii', $courseId, $groupId, $periodId);
$repStmt->execute();
$repResult = $repStmt->get_result();

if ($repResult->num_rows > 0) {
    echo json_encode([
        'success' => true,
        'data' => ['course_rep_id' => $repResult->fetch_assoc()['course_rep_id']]
    ]);
} else {
    echo json_encode(['success' => true, 'data' => ['course_rep_id' => null]]);
}
$repStmt->close();