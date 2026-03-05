<?php
// =============================================
//   ECG Medical Portal - Submit Medical Request
//   File: submit_request.php
//   Method: POST
// =============================================
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$purpose = trim($_POST['purpose'] ?? '');
$hospital = trim($_POST['hospital'] ?? '');
$request_date = trim($_POST['request_date'] ?? '');
$patient_type = trim($_POST['patient_type'] ?? '');
$patient_name = trim($_POST['patient_name'] ?? '');

if (!$purpose || !$hospital || !$request_date || !$patient_name) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields.']);
    exit;
}

// Validate date range (not in the past, not more than 30 days ahead)
$today = new DateTime('today');
$max_date = (new DateTime('today'))->modify('+30 days');
$req_date = new DateTime($request_date);

if ($req_date < $today || $req_date > $max_date) {
    echo json_encode(['success' => false, 'message' => 'Date must be between today and 30 days from now.']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "INSERT INTO medical_requests (user_id, purpose, hospital, request_date, patient_type, patient_name, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending')"
    );
    $stmt->execute([$user_id, $purpose, $hospital, $request_date, $patient_type, $patient_name]);

    $new_id = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'id' => $new_id,
        'message' => "Medical Request Submitted! Request ID: REQ-{$new_id}"
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Submission failed: ' . $e->getMessage()]);
}
?>