<?php
// ============================================================
//  connections/config.php
//  Universal admin endpoint — handles all operations
//
//  POST /connections/config.php
//  Body: { "action": "...", ...fields }
//
//  Actions:
//    Lecturers: get_lecturers, insert_lecturer, update_lecturer, delete_lecturer
//    Students:  get_students,  insert_student,  update_student,  delete_student
//    Courses:   get_courses,   insert_course,   update_course,   delete_course
//    Seed:      get_programmes, get_groups, get_periods, get_venues, get_lecturers_list
//    Timetable: get_timetable, insert_timetable, update_timetable, delete_timetable
//    Venues:    get_venues, insert_venue, update_venue, delete_venue
//    Periods:   get_periods, insert_period, update_period, delete_period, set_active_period
// ============================================================

require_once __DIR__ . '/database.php';

// Allow GET and POST
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST', 'OPTIONS'])) {
    sendResponse(false, 'Method not allowed.', [], 405);
}

$db     = getDB();
$body   = getRequestBody();
$action = sanitize($_GET['action'] ?? $body['action'] ?? '');

if (empty($action)) {
    sendResponse(false, 'action is required.', [], 422);
}

switch ($action) {

    // ══════════════════════════════════════════════════════
    //  LECTURERS
    // ══════════════════════════════════════════════════════

    case 'get_lecturers':
        $result = $db->query("
            SELECT lecturer_id, staff_id, first_name, last_name, email
            FROM lecturer ORDER BY last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Lecturers loaded.', ['lecturers' => $rows]);

    case 'get_lecturers_list':
        $result = $db->query("
            SELECT lecturer_id, CONCAT(first_name, ' ', last_name, ' (', staff_id, ')') as name
            FROM lecturer ORDER BY last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Lecturers loaded.', ['lecturers' => $rows]);

    case 'insert_lecturer':
        $staffId   = sanitize($body['staff_id']   ?? '');
        $firstName = sanitize($body['first_name'] ?? '');
        $lastName  = sanitize($body['last_name']  ?? '');
        $email     = sanitize($body['email']       ?? '');
        $password  = $body['password'] ?? '';

        if (!$staffId || !$firstName || !$lastName || !$email || !$password) {
            sendResponse(false, 'All fields are required.', [], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, 'Invalid email address.', [], 422);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare("
            INSERT INTO lecturer (staff_id, first_name, last_name, email, password_hash)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('sssss', $staffId, $firstName, $lastName, $email, $hash);
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to insert lecturer. Staff ID or email may already exist.', [], 400);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Lecturer added successfully.', ['lecturer_id' => $newId]);

    case 'update_lecturer':
        $id        = (int) ($body['lecturer_id'] ?? 0);
        $staffId   = sanitize($body['staff_id']   ?? '');
        $firstName = sanitize($body['first_name'] ?? '');
        $lastName  = sanitize($body['last_name']  ?? '');
        $email     = sanitize($body['email']       ?? '');
        $password  = $body['password'] ?? '';

        if (!$id) sendResponse(false, 'lecturer_id is required.', [], 422);

        if ($password) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $db->prepare("
                UPDATE lecturer SET staff_id=?, first_name=?, last_name=?, email=?, password_hash=?
                WHERE lecturer_id=?
            ");
            $stmt->bind_param('sssssi', $staffId, $firstName, $lastName, $email, $hash, $id);
        } else {
            $stmt = $db->prepare("
                UPDATE lecturer SET staff_id=?, first_name=?, last_name=?, email=?
                WHERE lecturer_id=?
            ");
            $stmt->bind_param('ssssi', $staffId, $firstName, $lastName, $email, $id);
        }
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Lecturer updated successfully.');

    case 'delete_lecturer':
        $id = (int) ($body['lecturer_id'] ?? 0);
        if (!$id) sendResponse(false, 'lecturer_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM lecturer WHERE lecturer_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Lecturer deleted.');

    // ══════════════════════════════════════════════════════
    //  STUDENTS
    // ══════════════════════════════════════════════════════

    case 'get_students':
        $result = $db->query("
            SELECT s.student_id, s.index_number, s.first_name, s.last_name,
                   s.email, s.phone, s.level,
                   p.name AS programme_name, p.code AS programme_code, p.programme_id,
                   sg.group_number, sg.group_id,
                   ap.label AS period_label, ap.period_id
            FROM student s
            JOIN programme p ON p.programme_id = s.programme_id
            JOIN student_group sg ON sg.group_id = s.group_id
            JOIN academic_period ap ON ap.period_id = sg.period_id
            ORDER BY s.last_name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Students loaded.', ['students' => $rows]);

    case 'insert_student':
        $indexNum    = sanitize($body['index_number']  ?? '');
        $firstName   = sanitize($body['first_name']    ?? '');
        $lastName    = sanitize($body['last_name']     ?? '');
        $email       = sanitize($body['email']         ?? '');
        $phone       = sanitize($body['phone']         ?? '');
        $level       = (int) ($body['level']           ?? 0);
        $programmeId = (int) ($body['programme_id']    ?? 0);
        $groupId     = (int) ($body['group_id']        ?? 0);

        if (!$indexNum || !$firstName || !$lastName || !$level || !$programmeId || !$groupId) {
            sendResponse(false, 'index_number, first_name, last_name, level, programme_id, group_id are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO student (index_number, first_name, last_name, email, phone, level, programme_id, group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('sssssiii', $indexNum, $firstName, $lastName, $email, $phone, $level, $programmeId, $groupId);
        
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to insert student. Index number may already exist.', [], 400);
        }
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Student added successfully.', ['student_id' => $newId]);

    case 'update_student':
        $id          = (int) ($body['student_id']      ?? 0);
        $indexNum    = sanitize($body['index_number']  ?? '');
        $firstName   = sanitize($body['first_name']    ?? '');
        $lastName    = sanitize($body['last_name']     ?? '');
        $email       = sanitize($body['email']         ?? '');
        $phone       = sanitize($body['phone']         ?? '');
        $level       = (int) ($body['level']           ?? 0);
        $programmeId = (int) ($body['programme_id']    ?? 0);
        $groupId     = (int) ($body['group_id']        ?? 0);

        if (!$id) sendResponse(false, 'student_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE student
            SET index_number=?, first_name=?, last_name=?, email=?, phone=?, level=?, programme_id=?, group_id=?
            WHERE student_id=?
        ");
        $stmt->bind_param('sssssiiii', $indexNum, $firstName, $lastName, $email, $phone, $level, $programmeId, $groupId, $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Student updated successfully.');

    case 'delete_student':
        $id = (int) ($body['student_id'] ?? 0);
        if (!$id) sendResponse(false, 'student_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM student WHERE student_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Student deleted.');

    // ══════════════════════════════════════════════════════
    //  COURSES
    // ══════════════════════════════════════════════════════

    case 'get_courses':
        $result = $db->query("
            SELECT c.course_id, c.code, c.title, c.credit_hours, c.level, c.semester,
                   GROUP_CONCAT(DISTINCT p.code ORDER BY p.code SEPARATOR ', ') AS programmes,
                   GROUP_CONCAT(DISTINCT p.programme_id SEPARATOR ',') AS programme_ids
            FROM course c
            LEFT JOIN programme_course pc ON pc.course_id = c.course_id
            LEFT JOIN programme p ON p.programme_id = pc.programme_id
            GROUP BY c.course_id
            ORDER BY c.level ASC, c.code ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Courses loaded.', ['courses' => $rows]);

    case 'insert_course':
        $code        = sanitize($body['code']         ?? '');
        $title       = sanitize($body['title']        ?? '');
        $creditHours = (int) ($body['credit_hours']   ?? 3);
        $level       = (int) ($body['level']          ?? 0);
        $semester    = (int) ($body['semester']       ?? 0);
        $programmes  = $body['programme_ids']         ?? [];

        if (!$code || !$title || !$level || !$semester) {
            sendResponse(false, 'code, title, level, semester are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO course (code, title, credit_hours, level, semester) VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('ssiii', $code, $title, $creditHours, $level, $semester);
        if (!$stmt->execute()) {
            sendResponse(false, 'Failed to insert course. Code may already exist.', [], 400);
        }
        $courseId = $stmt->insert_id;
        $stmt->close();

        if (!empty($programmes)) {
            $pcStmt = $db->prepare("INSERT IGNORE INTO programme_course (programme_id, course_id) VALUES (?, ?)");
            foreach ($programmes as $pid) {
                $pid = (int) $pid;
                $pcStmt->bind_param('ii', $pid, $courseId);
                $pcStmt->execute();
            }
            $pcStmt->close();
        }

        sendResponse(true, 'Course added successfully.', ['course_id' => $courseId]);

    case 'update_course':
        $id          = (int) ($body['course_id']      ?? 0);
        $code        = sanitize($body['code']         ?? '');
        $title       = sanitize($body['title']        ?? '');
        $creditHours = (int) ($body['credit_hours']   ?? 3);
        $level       = (int) ($body['level']          ?? 0);
        $semester    = (int) ($body['semester']       ?? 0);
        $programmes  = $body['programme_ids']         ?? [];

        if (!$id) sendResponse(false, 'course_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE course SET code=?, title=?, credit_hours=?, level=?, semester=? WHERE course_id=?
        ");
        $stmt->bind_param('ssiiii', $code, $title, $creditHours, $level, $semester, $id);
        $stmt->execute();
        $stmt->close();

        // Re-sync programme links
        $delStmt = $db->prepare("DELETE FROM programme_course WHERE course_id=?");
        $delStmt->bind_param('i', $id);
        $delStmt->execute();
        $delStmt->close();

        if (!empty($programmes)) {
            $pcStmt = $db->prepare("INSERT IGNORE INTO programme_course (programme_id, course_id) VALUES (?, ?)");
            foreach ($programmes as $pid) {
                $pid = (int) $pid;
                $pcStmt->bind_param('ii', $pid, $id);
                $pcStmt->execute();
            }
            $pcStmt->close();
        }

        sendResponse(true, 'Course updated successfully.');

    case 'delete_course':
        $id = (int) ($body['course_id'] ?? 0);
        if (!$id) sendResponse(false, 'course_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM course WHERE course_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Course deleted.');

    // ══════════════════════════════════════════════════════
    //  VENUES
    // ══════════════════════════════════════════════════════

    case 'get_venues':
        $result = $db->query("
            SELECT venue_id, name, type, capacity, gps_lat, gps_lng
            FROM venue ORDER BY name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Venues loaded.', ['venues' => $rows]);

    case 'insert_venue':
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

    case 'update_venue':
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

    case 'delete_venue':
        $id = (int) ($body['venue_id'] ?? 0);
        if (!$id) sendResponse(false, 'venue_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM venue WHERE venue_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Venue deleted.');

    // ══════════════════════════════════════════════════════
    //  ACADEMIC PERIODS
    // ══════════════════════════════════════════════════════

    case 'get_periods':
        $result = $db->query("
            SELECT period_id, label, academic_year, semester_number, 
                   start_date, end_date, is_active, created_at
            FROM academic_period ORDER BY period_id DESC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Periods loaded.', ['periods' => $rows]);

    case 'insert_period':
        $label       = sanitize($body['label']           ?? '');
        $academicYear = sanitize($body['academic_year']   ?? '');
        $semester    = (int) ($body['semester_number']   ?? 1);
        $startDate   = sanitize($body['start_date']      ?? '');
        $endDate     = sanitize($body['end_date']        ?? '');
        $isActive    = (int) ($body['is_active']         ?? 0);

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

    case 'update_period':
        $id          = (int) ($body['period_id']        ?? 0);
        $label       = sanitize($body['label']           ?? '');
        $academicYear = sanitize($body['academic_year']   ?? '');
        $semester    = (int) ($body['semester_number']   ?? 1);
        $startDate   = sanitize($body['start_date']      ?? '');
        $endDate     = sanitize($body['end_date']        ?? '');
        $isActive    = (int) ($body['is_active']         ?? 0);

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

    case 'delete_period':
        $id = (int) ($body['period_id'] ?? 0);
        if (!$id) sendResponse(false, 'period_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM academic_period WHERE period_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Academic period deleted.');

    case 'set_active_period':
        $id = (int) ($body['period_id'] ?? 0);
        if (!$id) sendResponse(false, 'period_id is required.', [], 422);
        
        // Deactivate all first
        $db->query("UPDATE academic_period SET is_active = 0");
        
        // Activate selected
        $stmt = $db->prepare("UPDATE academic_period SET is_active = 1 WHERE period_id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Active period set successfully.');

    // ══════════════════════════════════════════════════════
    //  STUDENT GROUPS
    // ══════════════════════════════════════════════════════

    case 'get_groups':
        $result = $db->query("
            SELECT sg.group_id, sg.group_number, ap.label AS period_label, ap.period_id
            FROM student_group sg
            JOIN academic_period ap ON ap.period_id = sg.period_id
            ORDER BY sg.group_number ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Groups loaded.', ['groups' => $rows]);

    case 'insert_group':
        $groupNumber = (int) ($body['group_number'] ?? 0);
        $periodId    = (int) ($body['period_id']    ?? 0);

        if (!$groupNumber || !$periodId) {
            sendResponse(false, 'group_number and period_id are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO student_group (group_number, period_id) VALUES (?, ?)
        ");
        $stmt->bind_param('ii', $groupNumber, $periodId);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Group added successfully.', ['group_id' => $newId]);

    // ══════════════════════════════════════════════════════
    //  PROGRAMMES
    // ══════════════════════════════════════════════════════

    case 'get_programmes':
        $result = $db->query("
            SELECT programme_id, name, code FROM programme ORDER BY name ASC
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Programmes loaded.', ['programmes' => $rows]);

    case 'insert_programme':
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

    // ══════════════════════════════════════════════════════
    //  TIMETABLE
    // ══════════════════════════════════════════════════════

    case 'get_timetable':
        $result = $db->query("
            SELECT t.timetable_id, t.day_of_week, t.start_time, t.end_time,
                   c.course_id, c.code as course_code, c.title as course_title,
                   l.lecturer_id, CONCAT(l.first_name, ' ', l.last_name) as lecturer_name,
                   v.venue_id, v.name as venue_name,
                   ap.period_id, ap.label as period_label
            FROM timetable t
            JOIN course c ON c.course_id = t.course_id
            JOIN lecturer l ON l.lecturer_id = t.lecturer_id
            JOIN venue v ON v.venue_id = t.venue_id
            JOIN academic_period ap ON ap.period_id = t.period_id
            ORDER BY t.day_of_week, t.start_time
        ");
        $rows = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        sendResponse(true, 'Timetable loaded.', ['timetable' => $rows]);

    case 'insert_timetable':
        $courseId    = (int) ($body['course_id']    ?? 0);
        $lecturerId  = (int) ($body['lecturer_id']  ?? 0);
        $venueId     = (int) ($body['venue_id']     ?? 0);
        $periodId    = (int) ($body['period_id']    ?? 0);
        $dayOfWeek   = sanitize($body['day_of_week'] ?? '');
        $startTime   = sanitize($body['start_time']  ?? '');
        $endTime     = sanitize($body['end_time']    ?? '');

        if (!$courseId || !$lecturerId || !$venueId || !$periodId || !$dayOfWeek || !$startTime || !$endTime) {
            sendResponse(false, 'All fields are required.', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO timetable (course_id, lecturer_id, venue_id, period_id, day_of_week, start_time, end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('iiiiiss', $courseId, $lecturerId, $venueId, $periodId, $dayOfWeek, $startTime, $endTime);
        $stmt->execute();
        $newId = $stmt->insert_id;
        $stmt->close();
        sendResponse(true, 'Timetable entry added successfully.', ['timetable_id' => $newId]);

    case 'update_timetable':
        $id          = (int) ($body['timetable_id'] ?? 0);
        $courseId    = (int) ($body['course_id']    ?? 0);
        $lecturerId  = (int) ($body['lecturer_id']  ?? 0);
        $venueId     = (int) ($body['venue_id']     ?? 0);
        $periodId    = (int) ($body['period_id']    ?? 0);
        $dayOfWeek   = sanitize($body['day_of_week'] ?? '');
        $startTime   = sanitize($body['start_time']  ?? '');
        $endTime     = sanitize($body['end_time']    ?? '');

        if (!$id) sendResponse(false, 'timetable_id is required.', [], 422);

        $stmt = $db->prepare("
            UPDATE timetable 
            SET course_id=?, lecturer_id=?, venue_id=?, period_id=?, day_of_week=?, start_time=?, end_time=?
            WHERE timetable_id=?
        ");
        $stmt->bind_param('iiiiissi', $courseId, $lecturerId, $venueId, $periodId, $dayOfWeek, $startTime, $endTime, $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Timetable entry updated successfully.');

    case 'delete_timetable':
        $id = (int) ($body['timetable_id'] ?? 0);
        if (!$id) sendResponse(false, 'timetable_id is required.', [], 422);
        $stmt = $db->prepare("DELETE FROM timetable WHERE timetable_id=?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();
        sendResponse(true, 'Timetable entry deleted.');

    default:
        sendResponse(false, "Unknown action: $action", [], 422);
}
?>