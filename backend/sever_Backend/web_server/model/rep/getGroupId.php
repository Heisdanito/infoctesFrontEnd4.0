<?php
// web_server/model/lec/getGroupId.php
require_once __DIR__ . '/../../../connections/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

$groupNumber = (int) ($_GET['group_number'] ?? 0);
$periodId    = (int) ($_GET['period_id'] ?? 0);

error_log("getGroupId called: group_number=$groupNumber, period_id=$periodId");

if (!$groupNumber || !$periodId) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters: group_number and period_id required']);
    exit;
}

$db = getDB();

$stmt = $db->prepare("
    SELECT group_id, group_number 
    FROM student_group 
    WHERE group_number = ? AND period_id = ? 
    LIMIT 1
");
$stmt->bind_param('ii', $groupNumber, $periodId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    error_log("Group not found: group_number=$groupNumber, period_id=$periodId");
    echo json_encode(['success' => false, 'message' => 'Group not found']);
    exit;
}

$group = $result->fetch_assoc();
$stmt->close();

error_log("Group found: group_id=" . $group['group_id']);

echo json_encode([
    'success' => true,
    'data' => [
        'group_id' => (int) $group['group_id'],
        'group_number' => (int) $group['group_number']
    ]
]);