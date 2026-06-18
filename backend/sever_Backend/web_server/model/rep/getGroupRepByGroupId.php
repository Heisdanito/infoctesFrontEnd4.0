<?php
// web_server/model/lec/getGroupRepByGroupId.php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$groupId  = (int) ($_GET['group_id'] ?? 0);
$periodId = (int) ($_GET['period_id'] ?? 0);

if (!$groupId || !$periodId) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

$db = getDB();

// Find course rep for this GROUP (with course_id IS NULL)
$repStmt = $db->prepare("
    SELECT cr.id as rep_id, 
           cr.student_id,
           CONCAT(s.first_name, ' ', s.last_name) as rep_name,
           s.index_number
    FROM course_rep cr
    JOIN student s ON s.student_id = cr.student_id
    WHERE cr.group_id = ? 
      AND cr.period_id = ? 
      AND (cr.course_id IS NULL OR cr.course_id = 0)
    ORDER BY cr.assigned_at DESC
    LIMIT 1
");
$repStmt->bind_param('ii', $groupId, $periodId);
$repStmt->execute();
$repResult = $repStmt->get_result();

if ($repResult->num_rows > 0) {
    $rep = $repResult->fetch_assoc();
    echo json_encode([
        'success' => true,
        'data' => [
            'hasRep' => true,
            'repId' => (int) $rep['rep_id'],
            'studentId' => (int) $rep['student_id'],
            'repName' => $rep['rep_name'],
            'indexNumber' => $rep['index_number']
        ]
    ]);
} else {
    echo json_encode([
        'success' => true,
        'data' => [
            'hasRep' => false,
            'message' => 'No course rep assigned for this group'
        ]
    ]);
}
$repStmt->close();