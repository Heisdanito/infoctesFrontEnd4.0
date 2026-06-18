<?php
// web_server/model/lec/getGroupRep.php
// Fetches the course rep for a SPECIFIC GROUP (not per course)
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$groupName = $_GET['group_name'] ?? '';
$periodId  = (int) ($_GET['period_id'] ?? 0);

if (!$groupName || !$periodId) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters: group_name and period_id required']);
    exit;
}

$db = getDB();

// Get group_id from group_number
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
    echo json_encode(['success' => false, 'message' => 'Group not found for this period']);
    exit;
}

$group = $groupResult->fetch_assoc();
$groupId = $group['group_id'];
$groupStmt->close();

// Find course rep assignments for this GROUP, including student programme and course details.
$repStmt = $db->prepare(
    "SELECT cr.id AS rep_id,
            cr.course_id,
            c.code AS course_code,
            c.title AS course_title,
            s.student_id,
            CONCAT(s.first_name, ' ', s.last_name) AS student_name,
            s.index_number,
            p.code AS programme_code
     FROM course_rep cr
     JOIN student s ON s.student_id = cr.student_id
     JOIN programme p ON p.programme_id = s.programme_id
     LEFT JOIN course c ON c.course_id = cr.course_id
     WHERE cr.group_id = ? AND cr.period_id = ?
     ORDER BY s.last_name ASC, c.code ASC"
);
$repStmt->bind_param('ii', $groupId, $periodId);
$repStmt->execute();
$repResult = $repStmt->get_result();
$reps = [];

while ($row = $repResult->fetch_assoc()) {
    $reps[] = [
        'rep_id' => (int) $row['rep_id'],
        'course_id' => $row['course_id'] !== null ? (int) $row['course_id'] : null,
        'course_code' => $row['course_code'],
        'course_title' => $row['course_title'],
        'student_id' => (int) $row['student_id'],
        'student_name' => $row['student_name'],
        'index_number' => $row['index_number'],
        'programme_code' => $row['programme_code'],
    ];
}

if (!empty($reps)) {
    echo json_encode([
        'success' => true,
        'data' => [
            'group_id' => $groupId,
            'group_number' => (int) $groupName,
            'reps' => $reps,
        ]
    ]);
} else {
    echo json_encode([
        'success' => true,
        'data' => null,
        'message' => 'No course rep assigned for this group'
    ]);
}
$repStmt->close();