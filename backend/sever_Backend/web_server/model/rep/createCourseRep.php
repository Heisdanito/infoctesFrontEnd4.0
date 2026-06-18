<?php
// web_server/model/lec/createCourseRep.php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

$input = json_decode(file_get_contents('php://input'), true);

$lecturerId = (int) ($input['lecturer_id'] ?? 0);
$courseCode = $input['course_code'] ?? '';
$groupName  = $input['group_name'] ?? '';
$periodId   = (int) ($input['period_id'] ?? 0);

if (!$lecturerId || !$courseCode || !$groupName || !$periodId) {
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

// Find a student from this group to be the course rep (first student as default)
$studentStmt = $db->prepare("
    SELECT student_id FROM student WHERE group_id = ? LIMIT 1
");
$studentStmt->bind_param('i', $groupId);
$studentStmt->execute();
$studentResult = $studentStmt->get_result();
if ($studentResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'No students found in this group']);
    exit;
}
$studentId = $studentResult->fetch_assoc()['student_id'];
$studentStmt->close();

// Create course rep
$insertStmt = $db->prepare("
    INSERT INTO course_rep (student_id, course_id, group_id, period_id)
    VALUES (?, ?, ?, ?)
");
$insertStmt->bind_param('iiii', $studentId, $courseId, $groupId, $periodId);

if ($insertStmt->execute()) {
    echo json_encode([
        'success' => true,
        'data' => ['course_rep_id' => $insertStmt->insert_id]
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to create course rep: ' . $db->error]);
}
$insertStmt->close();