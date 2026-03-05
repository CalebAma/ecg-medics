<?php
// =============================================
//   ECG Medical Portal - Save / Update Profile
//   File: save_profile.php
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
$full_name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$dob = trim($_POST['dob'] ?? '');
$designation = trim($_POST['designation'] ?? '');
$region = trim($_POST['region'] ?? '');
$district = trim($_POST['district'] ?? '');

// Spouse (stored as JSON)
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
$child_names = $_POST['child_name'] ?? [];
$child_dobs = $_POST['child_dob'] ?? [];
$children = [];
foreach ($child_names as $i => $c_name) {
    if (!empty(trim($c_name))) {
        $children[] = ['name' => trim($c_name), 'dob' => $child_dobs[$i] ?? ''];
    }
}
$children_json = json_encode($children);

// --- File Upload Helper ---
function uploadFile($file, $folder)
{
    $upload_dir = __DIR__ . '/uploads/' . $folder . '/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = uniqid('', true) . '.' . $ext;
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

// Build dynamic SQL
$fields = [
    'full_name=?',
    'phone=?',
    'dob=?',
    'designation=?',
    'region=?',
    'district=?',
    'profile_completed=1',
    'children=?'
];
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

$params[] = $user_id;

try {
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Return refreshed user data
    $stmt2 = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt2->execute([$user_id]);
    $u = $stmt2->fetch();

    send_json([
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
    send_json(['success' => false, 'message' => 'Profile save failed: ' . $e->getMessage()]);
}
?>