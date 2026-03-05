<?php
// =============================================
//   ECG Medical Portal - Staff Signup
//   File: signup.php
//   Method: POST
//   Fields: name, staff_id, email, password, dept, phone
// =============================================
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$staff_id = trim($_POST['staff_id'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');
$dept = trim($_POST['dept'] ?? '');
$phone = trim($_POST['phone'] ?? '');

if (!$name || !$staff_id || !$email || !$password || !$dept) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields.']);
    exit;
}

$password_hash = password_hash($password, PASSWORD_DEFAULT);
$role = ($dept === 'IT') ? 2 : 0; // 2 = Super Admin, 1 = Manager, 0 = Staff

try {
    $stmt = $pdo->prepare(
        "INSERT INTO users (staff_id, full_name, email, password_hash, dept, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$staff_id, $name, $email, $password_hash, $dept, $phone, $role]);

    $user_id = $pdo->lastInsertId();
    $_SESSION['user_id'] = $user_id;
    $_SESSION['role'] = $role;

    echo json_encode([
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
        echo json_encode(['success' => false, 'message' => 'A staff member with this ID or Email already exists.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
    }
}
?>