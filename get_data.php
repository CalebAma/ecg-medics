<?php
// =============================================
//   ECG Medical Portal - Fetch All App Data
//   File: get_data.php
//   Method: GET (called on page load)
//   Returns: users, requests, audit_logs
// =============================================
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

try {
    // Fetch all users/profiles
    $users = $pdo->query("SELECT id, staff_id, full_name, email, dept, phone, role, profile_completed, profile_pic, designation, region, district, spouse, children, spouse_pic, spouse_id_url, created_at FROM users ORDER BY created_at DESC")->fetchAll();

    // Normalize field names so the JS app treats them the same as before
    $users = array_map(function ($u) {
        $u['staffId'] = $u['staff_id'];
        $u['name'] = $u['full_name'];
        $u['profileCompleted'] = (bool) $u['profile_completed'];
        $u['profilePic'] = $u['profile_pic'];
        $u['spousePic'] = $u['spouse_pic'];
        $u['role'] = (int) $u['role'];
        $u['isAdmin'] = $u['role'] >= 1;
        $u['spouse'] = $u['spouse'] ? json_decode($u['spouse'], true) : null;
        $u['children'] = $u['children'] ? json_decode($u['children'], true) : [];
        return $u;
    }, $users);

    // Fetch all medical requests
    $requests = $pdo->query("SELECT * FROM medical_requests ORDER BY timestamp DESC")->fetchAll();
    $requests = array_map(function ($r) {
        $r['userId'] = $r['user_id'];
        $r['targetDate'] = $r['request_date'];
        $r['dependantName'] = $r['patient_name'];
        $r['dependantType'] = $r['patient_type'];
        return $r;
    }, $requests);

    // Fetch audit logs
    $logs = $pdo->query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100")->fetchAll();

    echo json_encode([
        'success' => true,
        'users' => $users,
        'requests' => $requests,
        'logs' => $logs
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Data fetch failed: ' . $e->getMessage()]);
}
?>