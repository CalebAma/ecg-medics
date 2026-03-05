<?php
// =============================================
//   ECG Medical Portal - Signup
//   File: signup.php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['success' => false, 'message' => 'Invalid request method.']);
}

$name = trim($_POST['name'] ?? '');
$staff_id = trim($_POST['staff_id'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');
$dept = trim($_POST['dept'] ?? '');
$phone = trim($_POST['phone'] ?? '');

if (!$name || !$staff_id || !$email || !$password || !$dept) {
    send_json(['success' => false, 'message' => 'Please fill in all required fields.']);
}

$password_hash = password_hash($password, PASSWORD_DEFAULT);
$role = ($dept === 'IT') ? 2 : 0;

try {
    $stmt = $pdo->prepare(
        "INSERT INTO users (staff_id, full_name, email, password_hash, dept, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$staff_id, $name, $email, $password_hash, $dept, $phone, $role]);
    $user_id = $pdo->lastInsertId();

    $_SESSION['user_id'] = $user_id;
    $_SESSION['role'] = $role;

    send_json([
        'success' => true,
        'user' => [
            'id' => $user_id,
            'staffId' => $staff_id,
            'name' => $name,
            'email' => $email,
            'dept' => $dept,
            'phone' => $phone,
            'role' => $role,
            'profileCompleted' => false,
            'profilePic' => null,
            'spouse' => null,
            'children' => [],
            'isAdmin' => $role >= 1,
        ]
    ]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        send_json(['success' => false, 'message' => 'A staff member with this ID or Email already exists.']);
    }
    send_json(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
}
?>