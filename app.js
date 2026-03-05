// =============================================
//  PHP Backend Configuration
//  All data comes from the MySQL database
//  via PHP API files.
// =============================================
const API_BASE = ''; // Same directory as HTML files

let currentUser = null;
let pageId = null;
let users = [];
let medicalRequests = [];
let auditLogs = [];

// Central POST helper - sends FormData to any PHP endpoint
async function apiPost(endpoint, data = {}) {
    const form = new FormData();
    for (const key in data) {
        form.append(key, data[key]);
    }
    const res = await fetch(API_BASE + endpoint, { method: 'POST', body: form });
    return await res.json();
}

// Fetch all portal data from get_data.php
async function refreshData() {
    try {
        const res = await fetch(API_BASE + 'get_data.php');
        const data = await res.json();
        if (!data.success) { console.warn('Could not load data:', data.message); return; }
        users = data.users || [];
        medicalRequests = data.requests || [];
        auditLogs = data.logs || [];
    } catch (e) {
        console.error('Error fetching data from server:', e);
    }
}

async function addAuditLog(action, type, details) {
    try {
        await apiPost('admin_action.php', {
            action: 'add_log',
            log_action: action,
            target_type: type,
            details: details,
            admin_name: currentUser ? currentUser.name : 'System'
        });
        // Also update local array immediately for UI
        auditLogs.unshift({
            id: Date.now(),
            action, target_type: type, details,
            admin_name: currentUser ? currentUser.name : 'System',
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Could not write audit log:', e);
    }
}

// DOM Loaded Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await refreshData();
    const sessionUser = sessionStorage.getItem('ecgCurrentUser');
    pageId = document.body.id;

    if (sessionUser) {
        const storedUser = JSON.parse(sessionUser);

        // Sync with localStorage to reflect admin changes (like profile locking)
        if (!storedUser.isAdmin) {
            const latestUser = users.find(u => u.id === storedUser.id);
            if (latestUser) {
                currentUser = latestUser;
                sessionStorage.setItem('ecgCurrentUser', JSON.stringify(currentUser));
            } else {
                currentUser = storedUser;
            }
        } else {
            currentUser = storedUser;
        }

        // Redirect mapped out for backwards compatibility
        if (pageId === 'page-auth') {
            window.location.href = 'dashboard.html';
        } else {
            handleAdminNavbar();
            updateNavbarUser();
            initPage(pageId);
        }
    } else {
        if (pageId !== 'page-auth') {
            window.location.href = 'index.html';
        } else {
            // Unhide login if on index and logged out
            document.getElementById('login-form').classList.remove('view-hidden');
        }
    }
});

// Role Constants
const ROLES = {
    STAFF: 0,
    MANAGER: 1,
    SUPER_ADMIN: 2
};

// File uploads are now handled server-side by save_profile.php
// The uploadFile function is no longer needed.


function initPage(pageId) {
    if (pageId !== 'page-profile' && pageId !== 'page-auth' && !currentUser.profileCompleted) {
        window.location.href = 'profile.html';
        return;
    }

    if (pageId === 'page-dashboard') updateDashboard();
    if (pageId === 'page-request') setupRequestForm();
    if (pageId === 'page-history') renderHistory();
    if (pageId === 'page-profile') setupProfile();
    if (pageId === 'page-admin') setupAdmin();
}

// Admin Specific Logic
function setupAdmin() {
    updateAdminStats();
    renderAdminDashboard();
    renderAdminRequests();
    renderAdminUsers();
    renderAdminAuditLogs();
    switchAdminTab('overview');
}

function updateAdminStats() {
    if (!document.getElementById('admin-stat-users')) return;
    document.getElementById('admin-stat-users').textContent = users.length;
    document.getElementById('admin-stat-pending').textContent = medicalRequests.filter(r => r.status === 'Pending').length;
    document.getElementById('admin-stat-approved').textContent = medicalRequests.filter(r => r.status === 'Approved').length;
    document.getElementById('admin-stat-rejected').textContent = medicalRequests.filter(r => r.status === 'Rejected').length;
}

function renderAdminDashboard() {
    const activityList = document.getElementById('admin-recent-activity');
    if (!activityList) return;

    activityList.innerHTML = '';

    // Combine some recent events
    const recentRequests = [...medicalRequests].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);
    const recentUsers = [...users].reverse().slice(0, 2);

    if (recentRequests.length === 0 && recentUsers.length === 0) {
        activityList.innerHTML = '<p class="text-xs text-gray-400 italic">No recent activity detected.</p>';
    }

    recentRequests.forEach(req => {
        const staff = users.find(u => u.id === req.userId);
        const div = document.createElement('div');
        div.className = 'flex items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm';
        div.innerHTML = `
            <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-ecgBlue mr-3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <div class="flex-1">
                <p class="text-xs font-bold text-gray-900">${staff ? staff.name : 'Unknown Staff'} submitted a request</p>
                <p class="text-[10px] text-gray-500">${new Date(req.timestamp).toLocaleString()}</p>
            </div>
            <span class="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">${req.status}</span>
        `;
        activityList.appendChild(div);
    });

    recentUsers.forEach(user => {
        const div = document.createElement('div');
        div.className = 'flex items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm';
        div.innerHTML = `
            <div class="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            </div>
            <div class="flex-1">
                <p class="text-xs font-bold text-gray-900">${user.name} joined the portal</p>
                <p class="text-[10px] text-gray-500">Staff ID: ${user.staffId}</p>
            </div>
        `;
        activityList.appendChild(div);
    });

    // Animate Charts
    setTimeout(() => {
        const total = medicalRequests.length || 1;
        const pending = (medicalRequests.filter(r => r.status === 'Pending').length / total) * 100;
        const approved = (medicalRequests.filter(r => r.status === 'Approved').length / total) * 100;
        const rejected = (medicalRequests.filter(r => r.status === 'Rejected').length / total) * 100;

        document.getElementById('chart-bar-pending').style.height = `${pending}%`;
        document.getElementById('chart-bar-approved').style.height = `${approved}%`;
        document.getElementById('chart-bar-rejected').style.height = `${rejected}%`;
    }, 100);
}

function renderAdminRequests(filtered = null) {
    const tbody = document.getElementById('admin-requests-tbody');
    const emptyDiv = document.getElementById('admin-requests-empty');
    if (!tbody) return;
    tbody.innerHTML = '';

    const requestsToRender = filtered || medicalRequests;
    const sortedRequests = [...requestsToRender].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (sortedRequests.length === 0) {
        emptyDiv.classList.remove('hidden');
    } else {
        emptyDiv.classList.add('hidden');
    }

    sortedRequests.forEach(req => {
        const staff = users.find(u => u.id === req.userId);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';

        const statusClass = getStatusClass(req.status);

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(req.timestamp).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-ecgBlue">${staff ? staff.staffId : 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${req.hospital}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-bold rounded-full border ${statusClass}">${req.status}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onclick="viewDetails('${req.id}')" class="text-ecgBlue hover:bg-blue-50 px-2 py-1 rounded">View</button>
                ${req.status === 'Pending' ? `
                    <button onclick="updateRequestStatus('${req.id}', 'Approved')" class="text-green-600 hover:bg-green-50 px-2 py-1 rounded">Approve</button>
                    <button onclick="openAdminRejectModal('${req.id}')" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded">Reject</button>
                ` : ``}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminUsers(filtered = null) {
    const tbody = document.getElementById('admin-users-tbody');
    const emptyDiv = document.getElementById('admin-users-empty');
    if (!tbody) return;
    tbody.innerHTML = '';

    const usersToRender = filtered || users;

    if (usersToRender.length === 0) {
        emptyDiv.classList.remove('hidden');
    } else {
        emptyDiv.classList.add('hidden');
    }

    usersToRender.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';

        // Role Badge logic
        let roleBadge = '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600">Staff</span>';
        if (user.role === ROLES.MANAGER) {
            roleBadge = '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-ecgBlue">Manager</span>';
        } else if (user.role === ROLES.SUPER_ADMIN) {
            roleBadge = '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700">Super Admin</span>';
        }

        const isSuperAdmin = currentUser.role === ROLES.SUPER_ADMIN;

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img class="h-8 w-8 rounded-full mr-3 border border-gray-100" src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + user.name}">
                    <div>
                        <span class="text-sm font-medium text-gray-900 block">${user.name}</span>
                        ${roleBadge}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.staffId}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.dept}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs rounded-full font-bold ${user.profileCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${user.profileCompleted ? 'Locked' : 'Incomplete'}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <button onclick="adminViewUser('${user.id}')" class="text-ecgBlue hover:bg-blue-50 px-2 py-1 rounded font-bold transition-colors">
                    View
                </button>
                <button onclick="adminToggleProfileLock('${user.id}')" class="text-gray-600 hover:text-ecgBlue font-bold transition-colors">
                    ${user.profileCompleted ? 'Unlock' : 'Lock'}
                </button>
                ${isSuperAdmin ? `
                <button onclick="adminDeleteUser('${user.id}')" class="text-red-600 hover:text-red-800 transition-colors p-1.5 rounded-lg hover:bg-red-50 group" title="Delete User">
                    <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateRequestStatus(reqId, status, reason = '') {
    try {
        const data = await apiPost('admin_action.php', {
            action: 'update_status',
            req_id: reqId,
            status,
            reason
        });
        if (!data.success) throw new Error(data.message);

        // Update local state for immediate UI refresh
        const idx = medicalRequests.findIndex(r => r.id == reqId);
        if (idx !== -1) {
            medicalRequests[idx].status = status;
            if (reason) medicalRequests[idx].rejectionReason = reason;
        }

        const req = medicalRequests.find(r => r.id == reqId);
        const staff = users.find(u => u.id == req?.userId);
        await addAuditLog(
            status === 'Approved' ? 'Approved Request' : 'Rejected Request',
            'Medical Request',
            `${status} request #${reqId} for ${staff ? staff.name : 'Unknown'}${reason ? '. Reason: ' + reason : ''}`
        );
        setupAdmin();
    } catch (error) {
        console.error('Update Status Error:', error);
        alert('Failed to update request status: ' + error.message);
    }
}

function openAdminRejectModal(reqId) {
    document.getElementById('reject-req-id').value = reqId;
    document.getElementById('reject-modal').classList.remove('view-hidden');
}

function closeAdminRejectModal() {
    document.getElementById('reject-modal').classList.add('view-hidden');
    document.getElementById('reject-reason').value = '';
}

function handleAdminReject(e) {
    e.preventDefault();
    const reqId = document.getElementById('reject-req-id').value;
    const reason = document.getElementById('reject-reason').value;
    updateRequestStatus(reqId, 'Rejected', reason);
    closeAdminRejectModal();
}

async function adminToggleProfileLock(userId) {
    const userIdx = users.findIndex(u => u.id == userId);
    if (userIdx === -1) return;
    const user = users[userIdx];
    const newStatus = user.profileCompleted ? 0 : 1;

    try {
        const data = await apiPost('admin_action.php', {
            action: 'toggle_lock',
            user_id: userId,
            new_status: newStatus
        });
        if (!data.success) throw new Error(data.message);

        user.profileCompleted = !!newStatus;
        await addAuditLog(
            newStatus ? 'Locked Profile' : 'Unlocked Profile',
            'Staff Member',
            `${newStatus ? 'Locked' : 'Unlocked'} profile for ${user.name} (${user.staffId})`
        );
        renderAdminUsers();
        alert(`Profile for ${user.name} has been ${newStatus ? 'Locked' : 'Unlocked'}.`);
    } catch (error) {
        console.error('Lock Toggle Error:', error);
        alert('Failed to toggle profile lock: ' + error.message);
    }
}

async function adminDeleteUser(userId) {
    const user = users.find(u => u.id == userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to PERMANENTLY delete staff member:\n${user.name} (${user.staffId})?\n\nAll their medical requests will also be deleted. This cannot be undone.`)) return;

    try {
        const data = await apiPost('admin_action.php', {
            action: 'delete_user',
            user_id: userId
        });
        if (!data.success) throw new Error(data.message);

        await addAuditLog('Deleted Staff', 'Staff Member',
            `Permanently deleted ${user.name} (${user.staffId}) and all associated records.`);

        users = users.filter(u => u.id != userId);
        medicalRequests = medicalRequests.filter(r => r.userId != userId);
        setupAdmin();
        alert(`Staff member ${user.name} has been permanently removed.`);
    } catch (error) {
        console.error('Delete User Error:', error);
        alert('Failed to delete user: ' + error.message);
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

function handleAdminNavbar() {
    if (!currentUser || (!currentUser.isAdmin && currentUser.role === ROLES.STAFF)) return;
    const navbar = document.querySelector('#app-navbar .md\\:flex');
    if (navbar && !document.getElementById('nav-admin-link')) {
        const divider = document.createElement('div');
        divider.className = 'border-l border-blue-700 h-6 mx-2';

        const adminLink = document.createElement('a');
        adminLink.id = 'nav-admin-link';
        adminLink.href = 'admin.html';
        adminLink.className = 'hover:text-ecgYellow px-3 py-2 rounded-md text-sm font-bold bg-white/10 border border-white/20 transition flex items-center text-white';
        adminLink.innerHTML = `<svg class="w-4 h-4 mr-1 text-ecgYellow" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0v-7.268a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v2.268a2 2 0 010 3.464V16a1 1 0 11-2 0V9.732a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg> Admin Console`;

        navbar.insertBefore(divider, navbar.querySelector('button'));
        navbar.insertBefore(adminLink, divider);
    }
}

function updateNavbarUser() {
    const userInfo = document.getElementById('nav-user-info');
    if (!userInfo || !currentUser) return;

    let roleName = 'Staff';
    let roleClass = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

    if (currentUser.role === ROLES.MANAGER) {
        roleName = 'Manager';
        roleClass = 'bg-blue-500/20 text-blue-200 border-blue-500/30';
    } else if (currentUser.role === ROLES.SUPER_ADMIN) {
        roleName = 'Super Admin';
        roleClass = 'bg-ecgYellow/20 text-ecgYellow border-ecgYellow/30';
    }

    const firstName = currentUser.name.split(' ')[0];

    userInfo.innerHTML = `
        < div class="flex items-center space-x-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm mr-4" >
            <div class="text-right hidden sm:block">
                <p class="text-xs font-bold text-white tracking-wide">${firstName}</p>
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">${roleName}</p>
            </div>
            <div class="h-8 w-8 rounded-lg overflow-hidden border border-white/20 shadow-inner">
                <img src="${currentUser.profilePic || 'https://ui-avatars.com/api/?name=' + currentUser.name + '&background=f3b204&color=0b3b60'}" class="h-full w-full object-cover">
            </div>
        </div >
        `;
}

// Authentication Forms Toggle
function toggleAuthForm(type) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');

    if (!loginForm || !signupForm) return;

    [loginForm, signupForm, forgotForm, resetForm].forEach(f => {
        if (f) f.classList.add('view-hidden');
    });

    if (type === 'login') loginForm.classList.remove('view-hidden');
    else if (type === 'signup') signupForm.classList.remove('view-hidden');
    else if (type === 'forgot') forgotForm.classList.remove('view-hidden');
    else if (type === 'reset') resetForm.classList.remove('view-hidden');
}

function showSuccess(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

// Validation Helpers
const validatePassword = (pwd) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);
const validateEcgEmail = (email) => email.toLowerCase().endsWith('@ecg.com.gh');

// Signup
async function handleSignup(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    const errorDiv = document.getElementById('signup-error');
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    const name = document.getElementById('reg-name').value;
    const staffId = document.getElementById('reg-staffId').value;
    const dept = document.getElementById('reg-dept').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const pwd = document.getElementById('reg-pwd').value;
    const confirmPwd = document.getElementById('reg-confirm').value;

    if (!validateEcgEmail(email)) {
        showError(errorDiv, 'Email must use the ECG domain (@ecg.com.gh).');
        btn.disabled = false; btn.textContent = originalText;
        return;
    }
    if (!validatePassword(pwd)) {
        showError(errorDiv, 'Password must be at least 8 characters with 1 uppercase letter and 1 number.');
        btn.disabled = false; btn.textContent = originalText;
        return;
    }
    if (pwd !== confirmPwd) {
        showError(errorDiv, 'Passwords do not match.');
        btn.disabled = false; btn.textContent = originalText;
        return;
    }

    try {
        const data = await apiPost('signup.php', {
            name, staff_id: staffId, email, password: pwd, dept, phone
        });
        if (!data.success) throw new Error(data.message);
        await completeLogin(data.user, true);
    } catch (error) {
        console.error('Signup Error:', error);
        showError(errorDiv, error.message || 'Registration failed. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.add('hidden');

    const staffIdInput = document.getElementById('login-id').value.trim();
    const pwd = document.getElementById('login-pwd').value;

    try {
        const data = await apiPost('login.php', {
            staff_id: staffIdInput,
            password: pwd
        });
        if (!data.success) throw new Error(data.message);
        await completeLogin(data.user);
    } catch (error) {
        console.error('Login Error:', error);
        showError(errorDiv, error.message || 'Invalid Staff ID or Password.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function completeLogin(user, fromSignup = false) {
    // PHP already normalizes fields, just store as-is
    const sessionUser = {
        ...user,
        staffId: user.staffId || user.staff_id,
        profileCompleted: user.profileCompleted ?? user.profile_completed ?? false,
        isAdmin: user.isAdmin || (user.role >= 1)
    };
    sessionStorage.setItem('ecgCurrentUser', JSON.stringify(sessionUser));
    if (fromSignup) {
        window.location.href = 'profile.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

async function logoutUser() {
    try { await fetch('logout.php'); } catch (e) { }
    sessionStorage.removeItem('ecgCurrentUser');
    window.location.href = 'index.html';
}

let resetUserId = null;

function handleForgotPassword(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('forgot-error');
    const successDiv = document.getElementById('forgot-success');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const staffId = document.getElementById('forgot-id').value;
    const email = document.getElementById('forgot-email').value;

    const user = users.find(u => u.staffId === staffId && u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        showError(errorDiv, 'No account found with these details.');
        return;
    }

    resetUserId = user.id;
    showSuccess(successDiv, 'Identity Verified. Proceeding to reset password...');

    setTimeout(() => {
        toggleAuthForm('reset');
    }, 1500);
}

function handleResetPassword(e) {
    e.preventDefault();
    alert('For security reasons, please contact the IT Administrator to reset your password. Password resets require manual verification.');
    toggleAuthForm('login');
    resetUserId = null;
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

// Dashboard Update
function updateDashboard() {
    const firstName = currentUser.name.split(' ')[0];
    document.getElementById('dash-name').textContent = firstName;
    document.getElementById('dash-id').textContent = currentUser.staffId;

    const deptEl = document.getElementById('dash-dept');
    if (deptEl) {
        deptEl.textContent = currentUser.isAdmin ? 'System Administration' : (currentUser.dept || 'N/A');
    }

    if (currentUser.profilePic && document.getElementById('dash-profile-pic')) {
        document.getElementById('dash-profile-pic').src = currentUser.profilePic;
    } else if (currentUser.isAdmin && document.getElementById('dash-profile-pic')) {
        document.getElementById('dash-profile-pic').src = 'https://ui-avatars.com/api/?name=Admin+User&background=0b3b60&color=fff';
    }

    // For Admin on dashboard, show global stats. For users, show personal stats.
    const displayRequests = currentUser.isAdmin ? medicalRequests : medicalRequests.filter(r => r.userId === currentUser.id);

    document.getElementById('stat-total').textContent = displayRequests.length;
    document.getElementById('stat-approved').textContent = displayRequests.filter(r => r.status === 'Approved').length;
    document.getElementById('stat-pending').textContent = displayRequests.filter(r => r.status === 'Pending').length;
    document.getElementById('stat-rejected').textContent = displayRequests.filter(r => r.status === 'Rejected').length;
}

// Request Medical Attention Methods
function setupRequestForm() {
    document.getElementById('medical-form').reset();
    toggleDependantSections();

    // Set max date (30 days from today)
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    const dateInput = document.getElementById('req-date');
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
}

function switchAdminTab(tab) {
    // Hide all sections
    const sections = ['overview', 'requests', 'users', 'logs'];
    sections.forEach(s => {
        const el = document.getElementById(`section - ${s} `);
        if (el) el.classList.add('view-hidden');

        const sideBtn = document.getElementById(`side - tab - ${s} `);
        if (sideBtn) {
            sideBtn.classList.remove('bg-blue-50', 'text-ecgBlue', 'border', 'border-blue-100', 'font-bold');
            sideBtn.classList.add('text-gray-600', 'hover:bg-gray-50', 'font-medium');

            const svg = sideBtn.querySelector('svg');
            if (svg) svg.classList.replace('text-ecgBlue', 'text-gray-400');
        }
    });

    // Show active section
    const activeSection = document.getElementById(`section - ${tab} `);
    if (activeSection) activeSection.classList.remove('view-hidden');

    const activeSideBtn = document.getElementById(`side - tab - ${tab} `);
    if (activeSideBtn) {
        activeSideBtn.classList.add('bg-blue-50', 'text-ecgBlue', 'border', 'border-blue-100', 'font-bold');
        activeSideBtn.classList.remove('text-gray-600', 'hover:bg-gray-50', 'font-medium');

        const svg = activeSideBtn.querySelector('svg');
        if (svg) svg.classList.replace('text-gray-400', 'text-ecgBlue');
    }

    // Update Header Text
    const title = document.getElementById('admin-main-title');
    const desc = document.getElementById('admin-main-desc');
    const btnAdd = document.getElementById('btn-add-staff');

    if (btnAdd) btnAdd.classList.add('hidden');

    if (tab === 'users') {
        title.textContent = 'Staff Directory';
        desc.textContent = 'Manage staff accounts, profile access, and directory details.';
        if (btnAdd && currentUser.role === ROLES.SUPER_ADMIN) btnAdd.classList.remove('hidden');
    } else if (tab === 'logs') {
        if (currentUser.role !== ROLES.SUPER_ADMIN) {
            alert('Access Denied: Managers do not have permission to view audit logs.');
            switchAdminTab('overview');
            return;
        }
        title.textContent = 'Security Audit Logs';
        desc.textContent = 'Track administrative actions and system modifications.';
    }

    if (tab === 'overview') renderAdminDashboard();
}

function filterAdminRequests() {
    const query = document.getElementById('admin-search-requests').value.toLowerCase();
    const status = document.getElementById('admin-filter-status').value;

    const filtered = medicalRequests.filter(req => {
        const staff = users.find(u => u.id === req.userId);
        const matchesQuery = (staff && staff.staffId.toLowerCase().includes(query)) ||
            req.hospital.toLowerCase().includes(query) ||
            req.id.toLowerCase().includes(query);
        const matchesStatus = status === 'All' || req.status === status;
        return matchesQuery && matchesStatus;
    });

    renderAdminRequests(filtered);
}

function filterAdminUsers() {
    const query = document.getElementById('admin-search-users').value.toLowerCase();
    const profile = document.getElementById('admin-filter-profile').value;

    const filtered = users.filter(user => {
        const matchesQuery = user.name.toLowerCase().includes(query) ||
            user.staffId.toLowerCase().includes(query) ||
            user.dept.toLowerCase().includes(query);
        const matchesProfile = profile === 'All' ||
            (profile === 'Locked' && user.profileCompleted) ||
            (profile === 'Incomplete' && !user.profileCompleted);
        return matchesQuery && matchesProfile;
    });

    renderAdminUsers(filtered);
}

function renderAdminAuditLogs() {
    const logContainer = document.getElementById('admin-audit-logs');
    if (!logContainer) return;

    logContainer.innerHTML = '';

    if (auditLogs.length === 0) {
        logContainer.innerHTML = '<div class="text-center py-10 text-gray-400 italic">No activity logged yet.</div>';
        return;
    }

    auditLogs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0';

        let actionColor = 'text-blue-600';
        if (log.action.includes('Approved')) actionColor = 'text-green-600';
        if (log.action.includes('Rejected')) actionColor = 'text-red-500';
        if (log.action.includes('Deleted')) actionColor = 'text-red-700';

        div.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase tracking-tighter">${log.target_type || log.type}</span>
                    <span class="text-sm font-bold ${actionColor}">${log.action}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${log.details}</p>
            </div>
            <div class="text-right">
                <p class="text-xs font-bold text-gray-900">${log.admin_name || log.adminName}</p>
                <p class="text-[10px] text-gray-400">${new Date(log.created_at || log.timestamp).toLocaleString()}</p>
            </div>
        `;
        logContainer.appendChild(div);
    });
}

async function clearAuditLogs() {
    if (!confirm('Are you sure you want to clear all system audit logs? This action is permanent.')) return;
    try {
        const data = await apiPost('admin_action.php', { action: 'clear_logs' });
        if (!data.success) throw new Error(data.message);
        auditLogs = [];
        renderAdminAuditLogs();
    } catch (e) {
        alert('Failed to clear logs: ' + e.message);
    }
}

function adminOpenAddUserModal() {
    document.getElementById('add-user-modal').classList.remove('view-hidden');
}

function adminCloseAddUserModal() {
    document.getElementById('add-user-modal').classList.add('view-hidden');
}

async function handleAdminAddUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    const name = document.getElementById('add-staff-name').value;
    const staffId = document.getElementById('add-staff-id').value;
    const dept = document.getElementById('add-staff-dept').value;
    const email = document.getElementById('add-staff-email').value;
    const pwd = document.getElementById('add-staff-pwd').value;

    try {
        const data = await apiPost('admin_action.php', {
            action: 'add_user',
            name, staff_id: staffId, dept, email, password: pwd
        });
        if (!data.success) throw new Error(data.message);

        await addAuditLog('Created Staff Account', 'System Admin',
            `Manually created account for ${name} (${staffId}) in ${dept} department.`);

        await refreshData();
        renderAdminUsers();
        adminCloseAddUserModal();
        e.target.reset();
        alert('Staff account created successfully. They can now log in.');
    } catch (error) {
        console.error('Admin Add User Error:', error);
        alert('Failed to create account: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function adminViewUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const content = document.getElementById('user-details-content');
    content.innerHTML = `
        <div class="flex items-start justify-between mb-8">
            <div class="flex items-center">
                <img class="h-20 w-20 rounded-2xl border-4 border-white shadow-lg object-cover" src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + user.name + '&size=128'}">
                    <div class="ml-6">
                        <h2 class="text-2xl font-bold text-ecgBlue font-display">${user.name}</h2>
                        <p class="text-gray-500 font-medium">${user.staffId} • ${user.dept} Department</p>
                        <span class="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${user.profileCompleted ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}">
                            ${user.profileCompleted ? 'Profile Verified & Locked' : 'Incomplete Profile'}
                        </span>
                        ${currentUser.role === ROLES.SUPER_ADMIN ? `
                    <div class="mt-3">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign User Role</label>
                        <select onchange="adminUpdateUserRole('${user.id}', this.value)" class="bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold p-1 text-ecgBlue outline-none">
                            <option value="${ROLES.STAFF}" ${user.role === ROLES.STAFF ? 'selected' : ''}>Staff Member</option>
                            <option value="${ROLES.MANAGER}" ${user.role === ROLES.MANAGER ? 'selected' : ''}>Manager (Admin)</option>
                            <option value="${ROLES.SUPER_ADMIN}" ${user.role === ROLES.SUPER_ADMIN ? 'selected' : ''}>Super Admin (IT)</option>
                        </select>
                    </div>
                    ` : ''}
                    </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-6">
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Employment Details</h3>
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div class="flex justify-between text-sm"><span class="text-gray-500">Designation:</span> <span class="font-bold text-gray-900">${user.designation || 'Not Set'}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-gray-500">Region:</span> <span class="font-bold text-gray-900">${user.region || 'Not Set'}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-gray-500">District:</span> <span class="font-bold text-gray-900">${user.district || 'Not Set'}</span></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contact Information</h3>
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div class="flex justify-between text-sm"><span class="text-gray-500">Email:</span> <span class="font-bold text-ecgBlue underline">${user.email}</span></div>
                        <div class="flex justify-between text-sm"><span class="text-gray-500">Phone:</span> <span class="font-bold text-gray-900">${user.phone || 'Not Set'}</span></div>
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Family & Dependants</h3>
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-3 text-sm">
                        <div class="flex justify-between items-center mb-2"><span class="text-gray-500">Spouse:</span> <span class="font-bold text-gray-900">${user.spouse ? user.spouse.name : 'No spouse listed'}</span></div>
                        ${user.spousePic ? `<img src="${user.spousePic}" class="h-16 w-16 rounded-lg object-cover border border-white shadow-sm mb-2" title="Spouse Picture">` : ''}
                        ${user.spouse_id_url ? `
                            <a href="${user.spouse_id_url}" target="_blank" class="text-[10px] font-bold text-ecgBlue hover:underline flex items-center bg-white p-1.5 rounded border border-gray-100">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                View ID Document
                            </a>
                        ` : ''}
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm">
                        <span class="text-gray-500 block mb-3">Children:</span>
                        ${user.children && user.children.length > 0 ?
            `<div class="space-y-2">` + user.children.map(c => `<div class="bg-white p-2 rounded border border-gray-200 flex justify-between"><span>${c.name}</span> <span class="text-xs text-gray-400">${c.dob}</span></div>`).join('') + `</div>`
            : '<span class="italic text-gray-400">No children listed</span>'}
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-100">
            <h3 class="text-sm font-bold text-ecgBlue mb-4">Account Administration</h3>
            <div class="flex space-x-4">
                <button onclick="adminToggleProfileLock('${user.id}'); adminCloseUserDetails();" class="flex-1 bg-white border border-ecgBlue text-ecgBlue px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all">
                    ${user.profileCompleted ? 'Unlock Profile File' : 'Verify & Lock Profile'}
                </button>
                <button onclick="window.location.href='mailto:${user.email}'" class="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Contact Staff</button>
            </div>
        </div>
    `;

    document.getElementById('user-details-modal').classList.remove('view-hidden');
}

function adminCloseUserDetails() {
    document.getElementById('user-details-modal').classList.add('view-hidden');
}

async function adminUpdateUserRole(userId, newRole) {
    if (currentUser.role !== ROLES.SUPER_ADMIN) {
        alert('Permission Denied: Only Super Admins can assign roles.');
        return;
    }

    const userIdx = users.findIndex(u => u.id == userId);
    if (userIdx === -1) return;
    const user = users[userIdx];
    const oldRoleName = Object.keys(ROLES).find(key => ROLES[key] === user.role);
    const newRoleName = Object.keys(ROLES).find(key => ROLES[key] === parseInt(newRole));

    try {
        const data = await apiPost('admin_action.php', {
            action: 'update_role',
            user_id: userId,
            new_role: parseInt(newRole)
        });
        if (!data.success) throw new Error(data.message);

        user.role = parseInt(newRole);
        await addAuditLog('Updated User Role', 'System Admin',
            `Changed role for ${user.name} (${user.staffId}) from ${oldRoleName} to ${newRoleName}.`);

        renderAdminUsers();
        alert(`Role for ${user.name} updated to ${newRoleName}.`);
        adminViewUser(userId);
    } catch (error) {
        console.error('Role Update Error:', error);
        alert('Failed to update role: ' + error.message);
    }
}

function toggleDependantSections() {
    if (!document.getElementById('req-type')) return;

    const type = document.getElementById('req-type').value;
    const depContainer = document.getElementById('req-dependant-container');
    const depSelect = document.getElementById('req-dependant');

    if (!depContainer || !depSelect) return;

    depContainer.classList.add('hidden');
    depSelect.innerHTML = '';
    depSelect.required = true;

    if (type === 'Self') {
        depContainer.classList.remove('hidden');
        depSelect.innerHTML = `< option value = "${currentUser.name}" > ${currentUser.name} (Self)</option > `;
    } else if (type === 'Spouse') {
        if (!currentUser.spouse || !currentUser.spouse.name) {
            alert('No spouse configured in your profile. Please contact an administrator to update your profile.');
            document.getElementById('req-type').value = '';
            return;
        }
        depContainer.classList.remove('hidden');
        depSelect.innerHTML = `< option value = "${currentUser.spouse.name}" > ${currentUser.spouse.name} (Spouse)</option > `;
    } else if (type === 'Child') {
        if (!currentUser.children || currentUser.children.length === 0) {
            alert('No dependants configured in your profile. Please contact an administrator to update your profile.');
            document.getElementById('req-type').value = '';
            return;
        }
        depContainer.classList.remove('hidden');
        let options = '<option value="">Select Dependant...</option>';
        currentUser.children.forEach(c => {
            options += `< option value = "${c.name}" > ${c.name}</option > `;
        });
        depSelect.innerHTML = options;
    }
}

async function handleMedicalRequest(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const dateInput = document.getElementById('req-date').value;
    const reqDate = new Date(dateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    if (reqDate < today || reqDate > maxDate) {
        alert('Date cannot be in the past or exceed 30 days from today.');
        btn.disabled = false; btn.textContent = originalText;
        return;
    }

    const type = document.getElementById('req-type').value;
    const patientName = document.getElementById('req-dependant').value;

    if (!patientName) {
        alert('Please select the patient requiring medical attention.');
        btn.disabled = false; btn.textContent = originalText;
        return;
    }

    const purpose = document.getElementById('req-purpose').value;
    const hospital = document.getElementById('req-hospital').value;

    try {
        const data = await apiPost('submit_request.php', {
            purpose, hospital,
            request_date: dateInput,
            patient_type: type,
            patient_name: patientName
        });
        if (!data.success) throw new Error(data.message);
        alert(`Medical Request Submitted Successfully!\nRequest ID: REQ-${data.id}`);
        window.location.href = 'history.html';
    } catch (error) {
        console.error('Request Error:', error);
        alert('Failed to submit request: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Medical History Methods
async function renderHistory() {
    const tbody = document.getElementById('history-table-body');
    const emptyDiv = document.getElementById('history-empty');
    if (!tbody || !emptyDiv) return;

    const filter = document.getElementById('filter-status').value;

    tbody.innerHTML = '';

    let userRequests = [];

    // Use local array fetched from PHP backend
    userRequests = medicalRequests.filter(r => r.userId == currentUser.id);
    if (filter !== 'All') {
        userRequests = userRequests.filter(r => r.status === filter);
    }
    userRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (userRequests.length === 0) {
        emptyDiv.classList.remove('view-hidden');
        tbody.parentElement.classList.add('hidden');
    } else {
        emptyDiv.classList.add('view-hidden');
        tbody.parentElement.classList.remove('hidden');

        userRequests.forEach(req => {
            const dateStr = new Date(req.timestamp).toLocaleDateString();
            const tr = document.createElement('tr');

            let statusColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
            if (req.status === 'Approved') statusColor = 'bg-green-50 text-green-700 border-green-200';
            if (req.status === 'Rejected') statusColor = 'bg-red-50 text-red-700 border-red-200';

            tr.className = 'hover:bg-blue-50/50 transition-colors duration-200';
            tr.innerHTML = `
        < td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" > ${dateStr}</td >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">${req.dependantName} <span class="text-xs text-gray-500 font-normal ml-1 bg-gray-100 px-2 py-0.5 rounded-full">(${req.dependantType})</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${req.hospital}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border shadow-sm tag-status cursor-default ${statusColor}">
                        ${req.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="viewDetails('${req.id}')" class="text-ecgBlue hover:text-white hover:bg-ecgBlue bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100 shadow-sm transition-all duration-200">View</button>
                </td>
    `;
            tbody.appendChild(tr);
        });
    }
}

async function viewDetails(reqId) {
    let req = medicalRequests.find(r => r.id == reqId);
    if (!req) return;

    const staff = users.find(u => u.id === req.userId);

    document.getElementById('modal-id').textContent = `Req ID: #${req.id} `;
    let content = `
        < div class="grid grid-cols-2 gap-y-6 gap-x-4" >
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Submitted On</strong> <span class="text-gray-900 font-medium">${new Date(req.timestamp).toLocaleString()}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Status</strong> <span class="font-bold border px-3 py-1 rounded-full text-xs inline-block shadow-sm ${getStatusClass(req.status)}">${req.status}</span></div>
            
            ${pageId === 'page-admin' ? `
            <div class="col-span-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                <strong class="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Staff Member</strong> 
                <span class="text-gray-900 font-bold text-base">${staff ? staff.name : 'Unknown Staff'} <span class="text-xs text-gray-500 font-normal ml-1">(${staff ? staff.staffId : 'N/A'})</span></span>
            </div>
            ` : ''
        }

            <div class="col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100"><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Purpose</strong> <span class="text-gray-800 leading-relaxed">${req.purpose}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Hospital</strong> <span class="text-gray-900 font-medium">${req.hospital}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Target Date</strong> <span class="text-gray-900 font-medium">${req.targetDate}</span></div>
            
            <div class="col-span-2 pt-4 border-t border-gray-100 mt-2">
                <strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Primary Patient</strong> 
                <span class="text-gray-900 font-bold text-base">${req.dependantName} <span class="text-sm font-normal text-gray-500 ml-1 bg-gray-100 px-2 py-0.5 rounded-full">(${req.dependantType})</span></span>
            </div>
        </div >
        `;

    // Show extra details for dependants
    if (req.dependantType === 'Spouse') {
        content += `< div class="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl" ><strong class="text-sm font-bold text-ecgBlue block mb-2 flex items-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>Spouse Details</strong> <div class="grid grid-cols-2 gap-2 text-sm text-gray-700"><div>Name: <span class="font-medium text-gray-900">${req.spouseName || req.dependantName}</span></div><div>DOB: <span class="font-medium text-gray-900">${req.spouseDob || 'N/A'}</span></div></div></div > `;
    } else if (req.dependantType === 'Child' && req.children) {
        content += `< div class="mt-4 p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl" ><strong class="text-sm font-bold text-yellow-700 block mb-3 flex items-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>Children Details</strong><div class="space-y-3">`;
        req.children.forEach(c => {
            content += `<div class="bg-white p-3 rounded-lg border border-yellow-200/50 shadow-sm text-sm"><div class="font-bold text-gray-900">${c.name}</div><div class="text-gray-600 mt-1">Born: ${c.dob}</div></div>`;
        });
        content += `</div></div > `;
    }

    if (req.status === 'Rejected' && req.rejectionReason) {
        content += `< div class="mt-4 p-4 bg-red-50/80 border border-red-200 rounded-xl text-red-800" ><strong class="font-bold flex items-center mb-1"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Rejection Reason</strong><p class="text-sm mt-1 ml-5.5 text-red-700">${req.rejectionReason}</p></div > `;
    }

    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('details-modal').classList.remove('view-hidden');
}

function getStatusClass(status) {
    if (status === 'Approved') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'Rejected') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
}

function closeModal() {
    document.getElementById('details-modal').classList.add('view-hidden');
}

// Profile Handling Methods
let tempProfilePicBase64 = null;
let tempSpousePicBase64 = null;

function previewProfilePic(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            tempProfilePicBase64 = event.target.result;
            const previewEl = document.getElementById('prof-pic-preview');
            if (previewEl) previewEl.src = tempProfilePicBase64;
        };
        reader.readAsDataURL(file);
    }
}

function previewSpousePic(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            tempSpousePicBase64 = event.target.result;
            const previewEl = document.getElementById('prof-spouse-pic-preview');
            if (previewEl) previewEl.src = tempSpousePicBase64;
        };
        reader.readAsDataURL(file);
    }
}

function calcChildAge(inputEl) {
    const ageDisplay = inputEl.nextElementSibling;
    if (inputEl.value) {
        ageDisplay.textContent = 'Age: ' + calculateAge(inputEl.value) + ' years';
    } else {
        ageDisplay.textContent = 'Age: --';
    }
}

function calculateAge(dobString) {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function setupProfile() {
    // Populate Staff Display Info
    if (document.getElementById('prof-staff-name')) {
        document.getElementById('prof-staff-name').value = currentUser.name || '';
        document.getElementById('prof-staff-id').value = currentUser.staffId || '';
        document.getElementById('prof-staff-dept').value = currentUser.dept || '';
        document.getElementById('prof-staff-email').value = currentUser.email || '';
        document.getElementById('prof-staff-phone').value = currentUser.phone || '';

        document.getElementById('prof-staff-dob').value = currentUser.dob || '';
        document.getElementById('prof-staff-designation').value = currentUser.designation || '';
        document.getElementById('prof-staff-region').value = currentUser.region || '';
        document.getElementById('prof-staff-district').value = currentUser.district || '';
    }

    if (currentUser.profilePic && document.getElementById('prof-pic-preview')) {
        document.getElementById('prof-pic-preview').src = currentUser.profilePic;
        tempProfilePicBase64 = currentUser.profilePic;
    }

    if (currentUser.spousePic && document.getElementById('prof-spouse-pic-preview')) {
        document.getElementById('prof-spouse-pic-preview').src = currentUser.spousePic;
        tempSpousePicBase64 = currentUser.spousePic;
    }

    const profSpouseName = document.getElementById('prof-spouse-name');
    if (profSpouseName && currentUser.spouse) {
        profSpouseName.value = currentUser.spouse.name || '';
        document.getElementById('prof-spouse-dob').value = currentUser.spouse.dob || '';
        document.getElementById('prof-spouse-phone').value = currentUser.spouse.phone || '';
        document.getElementById('prof-spouse-idtype').value = currentUser.spouse.idType || 'Ghana Card';
        document.getElementById('prof-spouse-idnumber').value = currentUser.spouse.idNumber || '';
    }

    if (currentUser.children && currentUser.children.length > 0) {
        currentUser.children.forEach(c => {
            addProfileChildRow(c);
        });
    }

    if (currentUser.profileCompleted) {
        lockProfileForm();
    }
}

function lockProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    // Disable all inputs and selects
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
        el.disabled = true;
        el.classList.add('bg-gray-100', 'cursor-not-allowed');
    });

    // Hide Action Buttons
    const submitBtn = document.getElementById('prof-submit-btn');
    if (submitBtn) submitBtn.classList.add('hidden');

    const addChildBtn = document.getElementById('prof-add-child-btn');
    if (addChildBtn) addChildBtn.classList.add('hidden');

    // Show locked message
    const lockMsg = document.getElementById('prof-locked-msg');
    if (lockMsg) lockMsg.classList.remove('hidden');

    // Remove child deletion buttons
    const removeBtns = form.querySelectorAll('.prof-child-entry button');
    removeBtns.forEach(btn => btn.remove());
}

function addProfileChildRow(childData = null) {
    const container = document.getElementById('prof-children-container');
    const childCount = document.querySelectorAll('.prof-child-entry').length;
    if (childCount >= 4) {
        alert('Maximum of 4 children allowed.');
        return;
    }

    const div = document.createElement('div');
    div.className = 'prof-child-entry grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3 rounded-md border';

    const nameVal = childData ? childData.name : '';
    const dobVal = childData ? childData.dob : '';

    div.innerHTML = `
        < div >
            <label class="block text-sm font-semibold text-gray-700 mb-1">Child Name *</label>
            <input type="text" value="${nameVal}" required class="input-premium prof-child-name block w-full bg-white border border-gray-200 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-ecgBlue/50 focus:border-ecgBlue sm:text-sm">
        </div>
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Date of Birth *</label>
            <input type="date" value="${dobVal}" required onchange="calcChildAge(this)" class="input-premium prof-child-dob block w-full bg-white border border-gray-200 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-ecgBlue/50 focus:border-ecgBlue sm:text-sm">
            <p class="text-xs text-gray-500 mt-2 font-medium bg-gray-50 border border-gray-100 rounded px-2 py-1 inline-block">Age: ${dobVal ? calculateAge(dobVal) + ' years' : '--'}</p>
        </div>
        <div class="relative">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Birth Cert ${childData ? '' : '*'}</label>
            <input type="file" ${childData ? '' : 'required'} accept=".pdf,.png,.jpeg,.jpg" class="prof-child-file block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-ecgBlue hover:file:bg-blue-100 mt-2">
            ${childData ? '<p class="text-xs text-green-600 mt-2 font-medium flex items-center"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> File Added</p>' : ''}
            ${currentUser.profileCompleted ? '' : '<button type="button" onclick="this.closest(\'.prof-child-entry\').remove()" class="absolute -right-3 -top-3 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-200 shadow-sm transition-colors border border-red-200" title="Remove">&times;</button>'}
        </div>
    `;
    container.appendChild(div);
}

async function handleProfileSave(e) {
    e.preventDefault();
    const btn = document.getElementById('prof-submit-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving Profile...';

    try {
        // Build FormData to support file uploads
        const form = new FormData();

        // Text fields
        form.append('name', document.getElementById('prof-staff-name').value);
        form.append('phone', document.getElementById('prof-staff-phone').value);
        form.append('dob', document.getElementById('prof-staff-dob').value);
        form.append('designation', document.getElementById('prof-staff-designation').value);
        form.append('region', document.getElementById('prof-staff-region').value);
        form.append('district', document.getElementById('prof-staff-district').value);

        // Spouse fields
        form.append('spouse_name', document.getElementById('prof-spouse-name').value);
        form.append('spouse_dob', document.getElementById('prof-spouse-dob').value);
        form.append('spouse_phone', document.getElementById('prof-spouse-phone').value);
        form.append('spouse_idtype', document.getElementById('prof-spouse-idtype').value);
        form.append('spouse_idnumber', document.getElementById('prof-spouse-idnumber').value);

        // Children
        const childEntries = document.querySelectorAll('.prof-child-entry');
        childEntries.forEach(entry => {
            form.append('child_name[]', entry.querySelector('.prof-child-name').value);
            form.append('child_dob[]', entry.querySelector('.prof-child-dob').value);
        });

        // Profile picture file
        const profilePicInput = document.getElementById('prof-pic-file');
        if (profilePicInput && profilePicInput.files[0]) {
            form.append('profile_pic', profilePicInput.files[0]);
        }

        // Spouse picture file
        const spousePicInput = document.getElementById('prof-spouse-pic-file');
        if (spousePicInput && spousePicInput.files[0]) {
            form.append('spouse_pic', spousePicInput.files[0]);
        }

        // Spouse ID document
        const spouseIdInput = document.getElementById('prof-spouse-id');
        if (spouseIdInput && spouseIdInput.files[0]) {
            form.append('spouse_id', spouseIdInput.files[0]);
        }

        const res = await fetch('save_profile.php', { method: 'POST', body: form });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        // Update local session with fresh data from server
        Object.assign(currentUser, data.user);
        currentUser.profileCompleted = true;
        sessionStorage.setItem('ecgCurrentUser', JSON.stringify(currentUser));

        alert('Profile saved successfully! Your profile is now locked for verification.');
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Profile Save Error:', error);
        alert('Failed to save profile: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Data Export & Reporting Functions
async function exportToCSV() {
    let requestsToExport = medicalRequests;

    if (requestsToExport.length === 0) {
        alert('No data available to export.');
        return;
    }

    const headers = ['Request ID', 'Staff Name', 'Staff ID', 'Hospital', 'Target Date', 'Status', 'Timestamp'];
    const rows = medicalRequests.map(req => {
        const staff = users.find(u => u.id === req.userId);
        return [
            req.id,
            staff ? staff.name : 'Unknown',
            staff ? staff.staffId : 'N/A',
            req.hospital,
            req.targetDate,
            req.status,
            new Date(req.timestamp).toLocaleString()
        ];
    });

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ECG_Medical_Requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function generatePDFReport() {
    if (typeof jspdf === 'undefined') {
        alert('PDF library not loaded. Please ensure you are connected to the internet.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // Add Branding
    doc.setFillColor(11, 59, 96); // ecgBlue
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ECG Medical Portal", 15, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Administrative Summary Report", 15, 32);
    doc.text(`Generated on: ${today}`, 160, 32);

    // Stats Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("System Overview", 15, 55);

    doc.setFontSize(10);
    const total = medicalRequests.length;
    const approved = medicalRequests.filter(r => r.status === 'Approved').length;
    const pending = medicalRequests.filter(r => r.status === 'Pending').length;
    const rejected = medicalRequests.filter(r => r.status === 'Rejected').length;

    doc.text(`Total Staff Members: ${users.length}`, 15, 65);
    doc.text(`Total Medical Requests: ${total}`, 15, 72);
    doc.text(`Approved: ${approved} | Pending: ${pending} | Rejected: ${rejected}`, 15, 79);

    // Table
    const tableData = medicalRequests.map(req => {
        const staff = users.find(u => u.id === req.userId);
        return [
            new Date(req.timestamp).toLocaleDateString(),
            staff ? staff.staffId : 'N/A',
            req.hospital,
            req.status
        ];
    });

    doc.autoTable({
        startY: 90,
        head: [['Date', 'Staff ID', 'Patient', 'Hospital', 'Status']],
        body: tableData,
        headStyles: { fillStyle: [11, 59, 96], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`ECG_System_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
