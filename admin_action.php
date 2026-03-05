<?php
// =============================================
//   ECG Medical Portal - Admin Actions API
//   File: admin_action.php
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

if (!isset($_SESSION['user_id']) || $_SESSION['role'] < 1) {
    send_json(['success' => false, 'message' => 'Unauthorized. Admin access required.']);
}

$action = trim($_POST['action'] ?? '');

try {
    switch ($action) {

        case 'update_status':
            $req_id = $_POST['req_id'] ?? '';
            $status = $_POST['status'] ?? '';
            $reason = $_POST['reason'] ?? '';
            $stmt = $pdo->prepare("UPDATE medical_requests SET status=?, rejection_reason=? WHERE id=?");
            $stmt->execute([$status, $reason, $req_id]);
            send_json(['success' => true]);
            break;

        case 'toggle_lock':
            $user_id = $_POST['user_id'] ?? '';
            $new_status = (int) ($_POST['new_status'] ?? 0);
            $stmt = $pdo->prepare("UPDATE users SET profile_completed=? WHERE id=?");
            $stmt->execute([$new_status, $user_id]);
            send_json(['success' => true]);
            break;

        case 'delete_user':
            if ($_SESSION['role'] < 2) {
                send_json(['success' => false, 'message' => 'Only Super Admins can delete users.']);
            }
            $user_id = $_POST['user_id'] ?? '';
            $stmt = $pdo->prepare("DELETE FROM users WHERE id=?");
            $stmt->execute([$user_id]);
            send_json(['success' => true]);
            break;

        case 'update_role':
            if ($_SESSION['role'] < 2) {
                send_json(['success' => false, 'message' => 'Only Super Admins can change roles.']);
            }
            $user_id = $_POST['user_id'] ?? '';
            $new_role = (int) ($_POST['new_role'] ?? 0);
            $stmt = $pdo->prepare("UPDATE users SET role=? WHERE id=?");
            $stmt->execute([$new_role, $user_id]);
            send_json(['success' => true]);
            break;

        case 'add_user':
            $name = trim($_POST['name'] ?? '');
            $staff_id = trim($_POST['staff_id'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = trim($_POST['password'] ?? 'Ecg12345');
            $dept = trim($_POST['dept'] ?? '');
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $role = ($dept === 'IT') ? 2 : 0;
            $stmt = $pdo->prepare(
                "INSERT INTO users (staff_id, full_name, email, password_hash, dept, role) VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([$staff_id, $name, $email, $hash, $dept, $role]);
            send_json(['success' => true, 'new_id' => $pdo->lastInsertId()]);
            break;

        case 'add_log':
            $admin_name = trim($_POST['admin_name'] ?? 'System');
            $log_action = trim($_POST['log_action'] ?? '');
            $target_type = trim($_POST['target_type'] ?? '');
            $details = trim($_POST['details'] ?? '');
            $stmt = $pdo->prepare(
                "INSERT INTO audit_logs (action, target_type, details, admin_name) VALUES (?, ?, ?, ?)"
            );
            $stmt->execute([$log_action, $target_type, $details, $admin_name]);
            send_json(['success' => true]);
            break;

        case 'clear_logs':
            if ($_SESSION['role'] < 2) {
                send_json(['success' => false, 'message' => 'Only Super Admins can clear logs.']);
            }
            $pdo->exec("TRUNCATE TABLE audit_logs");
            send_json(['success' => true]);
            break;

        default:
            send_json(['success' => false, 'message' => 'Unknown action: ' . htmlspecialchars($action)]);
    }
} catch (PDOException $e) {
    send_json(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>