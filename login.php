<?php
// =============================================
//   ECG Medical Portal - Staff Login
//   File: login.php
//   Method: POST
//   Fields: staff_id, password
// =============================================
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

$staff_id = trim($_POST['staff_id'] ?? '');
$password = trim($_POST['password'] ?? '');

if (!$staff_id || !$password) {
    echo json_encode(['success' => false, 'message' => 'Please enter your Staff ID and Password.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE staff_id = ? LIMIT 1");
    $stmt->execute([$staff_id]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];

        // Decode JSON fields
        $spouse = $user['spouse'] ? json_decode($user['spouse'], true) : null;
        $children = $user['children'] ? json_decode($user['children'], true) : [];

        echo json_encode([
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
        echo json_encode(['success' => false, 'message' => 'Invalid Staff ID or Password.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>