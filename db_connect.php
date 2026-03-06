<?php
// =============================================
//   ECG Medical Portal - PHP API Backend
//   File: db_connect.php
//   Purpose: Central database connection (PostgreSQL)
// =============================================

// Use environment variables (for Vercel/Production) or local defaults
$host = getenv('DB_HOST') ?: 'localhost';
$port = getenv('DB_PORT') ?: '5432';
$db_name = getenv('DB_NAME') ?: 'ecg-medics';
$username = getenv('DB_USER') ?: 'postgres';
$password = getenv('DB_PASSWORD') ?: 'cr3d!tUni0n';

try {
    // For cloud databases (like Neon or Supabase), we often need SSL
    $dsn = "pgsql:host=$host;port=$port;dbname=$db_name";

    // Check if we are in production to potentially add SSL requirement
    if (getenv('DB_HOST')) {
        $dsn .= ";sslmode=require";
    }

    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'message' => 'PostgreSQL Connection Failed: ' . $e->getMessage()]));
}
?>