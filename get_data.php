<?php
// =============================================
//   ECG Medical Portal - Fetch All Data
//   File: get_data.php
// =============================================
session_start();
error_reporting(0);
ini_set('display_errors', 0);
ob_start();

require_once 'db_connect.php';

function send_json($data)
{
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    send_json(['success' => false, 'message' => 'Not authenticated.']);
}

try {
    // Fetch all users
    $users = $pdo->query(
        "SELECT id, staff_id, full_name, email, dept, phone, role, profile_completed,
                profile_pic, designation, region, district, spouse, children,
                spouse_pic, spouse_id_url, created_at
         FROM users ORDER BY created_at DESC"
    )->fetchAll();

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

    // Fetch all requests
    $requests = $pdo->query(
        "SELECT * FROM medical_requests ORDER BY timestamp DESC"
    )->fetchAll();

    $requests = array_map(function ($r) {
        $r['userId'] = $r['user_id'];
        $r['targetDate'] = $r['request_date'];
        $r['dependantName'] = $r['patient_name'];
        $r['dependantType'] = $r['patient_type'];
        return $r;
    }, $requests);

    // Fetch audit logs (last 100)
    $logs = $pdo->query(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100"
    )->fetchAll();

    send_json([
        'success' => true,
        'users' => $users,
        'requests' => $requests,
        'logs' => $logs
    ]);

} catch (PDOException $e) {
    send_json(['success' => false, 'message' => 'Data fetch failed: ' . $e->getMessage()]);
}
?>