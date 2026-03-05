<?php
// =============================================
//   ECG Medical Portal - Save / Update Profile
//   File: save_profile.php
//   Method: POST
//   Handles: text fields, profile pic, spouse pic, spouse ID doc
// =============================================
session_start();
require_once 'db_connect.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
    exit;
}

$user_id = $_SESSION['user_id'];

// Text fields
$full_name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$dob = trim($_POST['dob'] ?? '');
$designation = trim($_POST['designation'] ?? '');
$region = trim($_POST['region'] ?? '');
$district = trim($_POST['district'] ?? '');

// Spouse info (stored as JSON)
$spouse = null;
$spouse_name = trim($_POST['spouse_name'] ?? '');
$spouse_dob = trim($_POST['spouse_dob'] ?? '');
if ($spouse_name && $spouse_dob) {
    $spouse = json_encode([
        'name' => $spouse_name,
        'dob' => $spouse_dob,
        'phone' => trim($_POST['spouse_phone'] ?? ''),
        'idType' => trim($_POST['spouse_idtype'] ?? ''),
        'idNumber' => trim($_POST['spouse_idnumber'] ?? ''),
    ]);
}

// Children (stored as JSON)
$children_names = $_POST['child_name'] ?? [];
$children_dobs = $_POST['child_dob'] ?? [];
$children = [];
foreach ($children_names as $i => $c_name) {
    if (!empty($c_name)) {
        $children[] = ['name' => $c_name, 'dob' => $children_dobs[$i] ?? ''];
    }
}
$children_json = json_encode($children);

// ----- File Upload Helper -----
function uploadFile($file, $folder)
{
    $upload_dir = __DIR__ . '/uploads/' . $folder . '/';
    if (!is_dir($upload_dir))
        mkdir($upload_dir, 0755, true);

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '.' . strtolower($ext);
    $dest = $upload_dir . $filename;

    if (move_uploaded_file($file['tmp_name'], $dest)) {
        return 'uploads/' . $folder . '/' . $filename;
    }
    return null;
}

$profile_pic = null;
$spouse_pic = null;
$spouse_id_url = null;

if (!empty($_FILES['profile_pic']['name'])) {
    $profile_pic = uploadFile($_FILES['profile_pic'], 'profile_pics');
}
if (!empty($_FILES['spouse_pic']['name'])) {
    $spouse_pic = uploadFile($_FILES['spouse_pic'], 'spouse_pics');
}
if (!empty($_FILES['spouse_id']['name'])) {
    $spouse_id_url = uploadFile($_FILES['spouse_id'], 'spouse_ids');
}

// Build dynamic SQL query
$fields = ['full_name=?', 'phone=?', 'dob=?', 'designation=?', 'region=?', 'district=?', 'profile_completed=1', 'children=?'];
$params = [$full_name, $phone, $dob, $designation, $region, $district, $children_json];

if ($spouse) {
    $fields[] = 'spouse=?';
    $params[] = $spouse;
}
if ($profile_pic) {
    $fields[] = 'profile_pic=?';
    $params[] = $profile_pic;
}
if ($spouse_pic) {
    $fields[] = 'spouse_pic=?';
    $params[] = $spouse_pic;
}
if ($spouse_id_url) {
    $fields[] = 'spouse_id_url=?';
    $params[] = $spouse_id_url;
}

$params[] = $user_id; // WHERE user_id = ?

try {
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Return updated user for session storage refresh
    $stmt2 = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt2->execute([$user_id]);
    $u = $stmt2->fetch();

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $u['id'],
            'staffId' => $u['staff_id'],
            'name' => $u['full_name'],
            'email' => $u['email'],
            'dept' => $u['dept'],
            'phone' => $u['phone'],
            'role' => (int) $u['role'],
            'profileCompleted' => true,
            'profilePic' => $u['profile_pic'],
            'spousePic' => $u['spouse_pic'],
            'spouse_id_url' => $u['spouse_id_url'],
            'designation' => $u['designation'],
            'region' => $u['region'],
            'district' => $u['district'],
            'spouse' => $u['spouse'] ? json_decode($u['spouse'], true) : null,
            'children' => $u['children'] ? json_decode($u['children'], true) : [],
            'isAdmin' => (int) $u['role'] >= 1,
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Profile save failed: ' . $e->getMessage()]);
}
?>