<?php
// =============================================
//   ECG Medical Portal - PHP API Backend
//   File: db_connect.php
//   Purpose: Central database connection
// =============================================
$host = 'localhost';
$db_name = 'ecg-medics';
$username = 'root';  // Default XAMPP username
$password = '';      // Default XAMPP password is empty

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode(['success' => false, 'message' => 'Database Connection Failed: ' . $e->getMessage()]));
}
?>