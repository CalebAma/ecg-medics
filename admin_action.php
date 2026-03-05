<?php
// =============================================
//   ECG Medical Portal - Admin Actions API
//   File: admin_action.php
//   Method: POST
//   Handles: update_status, toggle_lock, delete_user, update_role, add_user, add_log, clear_logs
// =============================================
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] < 1) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
    exit;
}

$action = trim($_POST['action'] ?? '');

try {
    switch ($action) {

        // --- APPROVE / REJECT MEDICAL REQUEST ---
        case 'update_status':
            $req_id = $_POST['req_id'] ?? '';
            $status = $_POST['status'] ?? '';
            $reason = $_POST['reason'] ?? '';

            $stmt = $pdo->prepare("UPDATE medical_requests SET status=?, rejection_reason=? WHERE id=?");
            $stmt->execute([$status, $reason, $req_id]);
            echo json_encode(['success' => true]);
            break;

        // --- LOCK / UNLOCK STAFF PROFILE ---
        case 'toggle_lock':
            $user_id = $_POST['user_id'] ?? '';
            $new_status = (int) ($_POST['new_status'] ?? 0);

            $stmt = $pdo->prepare("UPDATE users SET profile_completed=? WHERE id=?");
            $stmt->execute([$new_status, $user_id]);
            echo json_encode(['success' => true]);
            break;

        // --- DELETE STAFF MEMBER ---
        case 'delete_user':
            if ($_SESSION['role'] < 2) {
                echo json_encode(['success' => false, 'message' => 'Only Super Admins can delete users.']);
                break;
            }
            $user_id = $_POST['user_id'] ?? '';
            // medical_requests will cascade delete via foreign key
            $stmt = $pdo->prepare("DELETE FROM users WHERE id=?");
            $stmt->execute([$user_id]);
            echo json_encode(['success' => true]);
            break;

        // --- UPDATE USER ROLE ---
        case 'update_role':
            if ($_SESSION['role'] < 2) {
                echo json_encode(['success' => false, 'message' => 'Only Super Admins can change roles.']);
                break;
            }
            $user_id = $_POST['user_id'] ?? '';
            $new_role = (int) ($_POST['new_role'] ?? 0);

            $stmt = $pdo->prepare("UPDATE users SET role=? WHERE id=?");
            $stmt->execute([$new_role, $user_id]);
            echo json_encode(['success' => true]);
            break;

        // --- ADD NEW STAFF (ADMIN CREATED) ---
        case 'add_user':
            if ($_SESSION['role'] < 1) {
                echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
                break;
            }
            $name = trim($_POST['name'] ?? '');
            $staff_id = trim($_POST['staff_id'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = trim($_POST['password'] ?? 'Ecg12345');
            $dept = trim($_POST['dept'] ?? '');

            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $role = ($dept === 'IT') ? 2 : 0;

            $stmt = $pdo->prepare(
                "INSERT INTO users (staff_id, full_name, email, password_hash, dept, role) VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([$staff_id, $name, $email, $password_hash, $dept, $role]);
            $new_id = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'new_id' => $new_id]);
            break;

        // --- WRITE AN AUDIT LOG ENTRY ---
        case 'add_log':
            $admin_name = trim($_POST['admin_name'] ?? 'System');
            $log_action = trim($_POST['log_action'] ?? '');
            $target_type = trim($_POST['target_type'] ?? '');
            $details = trim($_POST['details'] ?? '');

            $stmt = $pdo->prepare(
                "INSERT INTO audit_logs (action, target_type, details, admin_name) VALUES (?, ?, ?, ?)"
            );
            $stmt->execute([$log_action, $target_type, $details, $admin_name]);
            echo json_encode(['success' => true]);
            break;

        // --- CLEAR ALL AUDIT LOGS (SUPER ADMIN ONLY) ---
        case 'clear_logs':
            if ($_SESSION['role'] < 2) {
                echo json_encode(['success' => false, 'message' => 'Only Super Admins can clear logs.']);
                break;
            }
            $pdo->exec("TRUNCATE TABLE audit_logs");
            echo json_encode(['success' => true]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action: ' . $action]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>