<?php
// =============================================
//   ECG Medical Portal - Database Connection
//   File: db_connect.php
// =============================================

// Suppress PHP warnings/notices from polluting JSON output
error_reporting(0);
ini_set('display_errors', 0);

// Start output buffering so any stray output doesn't break JSON
ob_start();

$host = 'localhost';
$db_name = 'ecg-medics';
$username = 'root';  // Default XAMPP username
$password = '';      // Default XAMPP password is empty

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$db_name};charset=utf8mb4",
        $username,
        $password
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Clear any buffered output and return clean JSON error
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed. Check that MySQL is running and the database "ecg-medics" exists. Error: ' . $e->getMessage()
    ]);
    exit;
}
?>