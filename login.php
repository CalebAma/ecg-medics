<?php
// =============================================
//   ECG Medical Portal - Login
//   File: login.php
// =============================================
session_start();
error_reporting(0);
ini_set('display_errors', 0);
ob_start();

require_once 'db_connect.php';

// Helper: clear buffer and send JSON
function send_json($data)
{
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['success' => false, 'message' => 'Invalid request method.']);
}

$staff_id = trim($_POST['staff_id'] ?? '');
$password = trim($_POST['password'] ?? '');

if (!$staff_id || !$password) {
    send_json(['success' => false, 'message' => 'Please enter your Staff ID and Password.']);
}

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE staff_id = ? LIMIT 1");
    $stmt->execute([$staff_id]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];

        $spouse = $user['spouse'] ? json_decode($user['spouse'], true) : null;
        $children = $user['children'] ? json_decode($user['children'], true) : [];

        send_json([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'staffId' => $user['staff_id'],
                'name' => $user['full_name'],
                'email' => $user['email'],
                'dept' => $user['dept'],
                'phone' => $user['phone'],
                'role' => (int) $user['role'],
                'profileCompleted' => (bool) $user['profile_completed'],
                'profilePic' => $user['profile_pic'],
                'designation' => $user['designation'],
                'region' => $user['region'],
                'district' => $user['district'],
                'spouse' => $spouse,
                'children' => $children,
                'isAdmin' => (int) $user['role'] >= 1,
            ]
        ]);
    } else {
        send_json(['success' => false, 'message' => 'Invalid Staff ID or Password.']);
    }
} catch (PDOException $e) {
    send_json(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>