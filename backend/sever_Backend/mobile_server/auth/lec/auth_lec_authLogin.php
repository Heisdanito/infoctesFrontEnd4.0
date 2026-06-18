<?php
// ============================================================
//  mobile_server/auth/lec/authLogin.php
//  Lecturer login — email + password
//
//  POST body: { "role": "lecturer", "email": "...", "password": "..." }
// ============================================================

require_once __DIR__ . '/../../../connections/database.php';

requireMethod('POST');

$body     = getRequestBody();
$email    = strtolower(sanitize($body['email']    ?? ''));
$password = sanitize($body['password'] ?? '');

// ── Validate ──────────────────────────────────────────────────
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'A valid email address is required.', [], 422);
}
if (empty($password)) {
    sendResponse(false, 'Password is required.', [], 422);
}

$db = getDB();

// ── Fetch lecturer ────────────────────────────────────────────
$stmt = $db->prepare("
    SELECT lecturer_id, staff_id, first_name, last_name, email, password_hash
    FROM lecturer
    WHERE email = ?
    LIMIT 1
");

if (!$stmt) {
    sendResponse(false, 'Server error. Please try again.', [], 500);
}

$stmt->bind_param('s', $email);
$stmt->execute();
$lecturer = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$lecturer) {
    sendResponse(false, 'Lecturer account not found.', [], 404);
}

// ── Verify password ───────────────────────────────────────────
// Supports bcrypt (production) and plain-text (dev seed data).
$hash  = $lecturer['password_hash'];
$valid = str_starts_with($hash, '$2')
    ? password_verify($password, $hash)
    : ($password === $hash);

if (!$valid) {
    sendResponse(false, 'Incorrect password. Please try again.', [], 401);
}

// ── Build user payload ────────────────────────────────────────
$user = [
    'lecturer_id' => (int) $lecturer['lecturer_id'],
    'staff_id'    => $lecturer['staff_id'],
    'full_name'   => $lecturer['first_name'] . ' ' . $lecturer['last_name'],
    'first_name'  => $lecturer['first_name'],
    'last_name'   => $lecturer['last_name'],
    'initials'    => strtoupper(substr($lecturer['first_name'], 0, 1) . substr($lecturer['last_name'], 0, 1)),
    'email'       => $lecturer['email'],
    'role'        => 'lecturer',
    'login_time'  => date('Y-m-d H:i:s'),
];

sendResponse(true, 'Login successful. Welcome, ' . $lecturer['first_name'] . '.', [
    'user' => $user,
]);
