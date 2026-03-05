<?php
// =============================================
//   ECG Medical Portal - Submit Medical Request
//   File: submit_request.php
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

$user_id = $_SESSION['user_id'];
$purpose = trim($_POST['purpose'] ?? '');
$hospital = trim($_POST['hospital'] ?? '');
$request_date = trim($_POST['request_date'] ?? '');
$patient_type = trim($_POST['patient_type'] ?? '');
$patient_name = trim($_POST['patient_name'] ?? '');

if (!$purpose || !$hospital || !$request_date || !$patient_name) {
    send_json(['success' => false, 'message' => 'Please fill in all required fields.']);
}

// Validate date range
$today = new DateTime('today');
$max_date = (new DateTime('today'))->modify('+30 days');
$req_date = new DateTime($request_date);

if ($req_date < $today || $req_date > $max_date) {
    send_json(['success' => false, 'message' => 'Date must be between today and 30 days from now.']);
}

try {
    $stmt = $pdo->prepare(
        "INSERT INTO medical_requests (user_id, purpose, hospital, request_date, patient_type, patient_name, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending')"
    );
    $stmt->execute([$user_id, $purpose, $hospital, $request_date, $patient_type, $patient_name]);
    $new_id = $pdo->lastInsertId();

    send_json([
        'success' => true,
        'id' => $new_id,
        'message' => "Request submitted successfully. ID: REQ-{$new_id}"
    ]);

} catch (PDOException $e) {
    send_json(['success' => false, 'message' => 'Submission failed: ' . $e->getMessage()]);
}
?>