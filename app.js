// =============================================
//  Firebase Backend Configuration
//  Migrated from PHP/PostgreSQL
// =============================================
import { auth, db, storage, firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let currentUser = null;
let pageId = null;
let users = [];
let medicalRequests = [];
let auditLogs = [];

// Role Constants
const ROLES = {
    STAFF: 0,
    MANAGER: 1,
    SUPER_ADMIN: 2
};

// Helper to format timestamps (Firestore or Native JS)
function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString(); // Firestore
    if (typeof ts === 'string' || ts instanceof Date) return new Date(ts).toLocaleString();
    return 'N/A';
}

function formatDateOnly(ts) {
    if (!ts) return 'N/A';
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString(); // Firestore
    if (typeof ts === 'string' || ts instanceof Date) return new Date(ts).toLocaleDateString();
    return 'N/A';
}

// ── Page Loading Skeleton ──────────────────────────────────────────────────
function showPageLoader() {
    // Show a full-page dimmed skeleton only if the page content is not yet
    // visible (avoids flicker on fast connections).
    let overlay = document.getElementById('_page-loader');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = '_page-loader';
        overlay.style.cssText = [
            'position:fixed', 'inset:0', 'z-index:9999',
            'background:rgba(248,250,252,0.85)', 'backdrop-filter:blur(4px)',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'transition:opacity 0.3s ease'
        ].join(';');
        overlay.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
                <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#2E3192;border-radius:50%;animation:_spin 0.75s linear infinite"></div>
                <p style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#6b7280;letter-spacing:0.02em">Loading your portal…</p>
            </div>
            <style>@keyframes _spin{to{transform:rotate(360deg)}}</style>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
}

function hidePageLoader() {
    const overlay = document.getElementById('_page-loader');
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => overlay.remove(), 350);
}

// ── Data Fetching ───────────────────────────────────────────────────────────
async function refreshData() {
    try {
        // Only fetch shared data for users who have completed their profile
        // (avoids permission errors for newly registered, uncompleted users)
        if (!currentUser || !currentUser.profileCompleted) {
            return;
        }

        // Fetch all needed data IN PARALLEL (not sequentially)
        const fetchPromises = [
            getDocs(collection(db, 'users')),
            getDocs(query(collection(db, 'medical_requests'), orderBy('timestamp', 'desc')))
        ];

        // Only fetch audit logs for managers/admins
        if (currentUser.role >= ROLES.MANAGER) {
            fetchPromises.push(
                getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100)))
            );
        }

        const results = await Promise.all(fetchPromises);

        users = results[0].docs.map(d => ({ id: d.id, ...d.data() }));
        medicalRequests = results[1].docs.map(d => ({ id: d.id, ...d.data() }));
        if (results[2]) auditLogs = results[2].docs.map(d => ({ id: d.id, ...d.data() }));

    } catch (e) {
        console.error('Error fetching data from Firestore:', e);
    }
}


async function addAuditLog(action, type, details) {
    try {
        const logData = {
            action,
            target_type: type,
            details,
            admin_name: currentUser ? currentUser.name : 'System',
            timestamp: serverTimestamp()
        };
        await addDoc(collection(db, "audit_logs"), logData);

        // Also update local array immediately for UI
        auditLogs.unshift({
            id: Date.now(),
            ...logData,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Could not write audit log:', e);
    }
}

// Map functions to window object for legacy HTML onclick handlers
// Map functions to window object for legacy HTML onclick handlers
window.logoutUser = logoutUser;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
window.toggleAuthForm = toggleAuthForm;
window.toggleMobileMenu = toggleMobileMenu;
window.switchAdminTab = switchAdminTab;
window.filterAdminRequests = filterAdminRequests;
window.filterAdminUsers = filterAdminUsers;
window.clearAuditLogs = clearAuditLogs;
window.adminToggleProfileLock = adminToggleProfileLock;
window.adminDeleteUser = adminDeleteUser;
window.viewDetails = viewDetails;
window.updateRequestStatus = updateRequestStatus;
window.openAdminRejectModal = openAdminRejectModal;
window.handleAdminReject = handleAdminReject;
window.closeAdminRejectModal = closeAdminRejectModal;
window.adminOpenAddUserModal = adminOpenAddUserModal;
window.adminCloseAddUserModal = adminCloseAddUserModal;
window.handleAdminAddUser = handleAdminAddUser;
window.adminViewUser = adminViewUser;
window.adminCloseUserDetails = adminCloseUserDetails;
window.handleMedicalRequest = handleMedicalRequest;
window.toggleDependantSections = toggleDependantSections;
window.renderHistory = renderHistory;
window.closeModal = closeModal;
window.handleProfileSave = handleProfileSave;
window.previewProfilePic = previewProfilePic;
window.previewSpousePic = previewSpousePic;
window.addProfileChildRow = addProfileChildRow;
window.calcChildAge = calcChildAge;
window.calculateAge = calculateAge;
window.exportToCSV = exportToCSV;
window.generatePDFReport = generatePDFReport;
window.printSingleRequest = printSingleRequest;
window.handleBulkPrint = handleBulkPrint;
window.toggleSelectAllRequests = toggleSelectAllRequests;
window.updateBulkPrintVisibility = updateBulkPrintVisibility;

// DOM Loaded Initialization
document.addEventListener('DOMContentLoaded', async () => {
    pageId = document.body.id;

    // Show skeleton loader immediately so nothing looks blank
    if (pageId !== 'page-auth') showPageLoader();

    // ── Listen for Auth State Changes ──────────────────────────────────────
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // Get user details from Firestore by UID (fast single-doc read)
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                currentUser = {
                    id: userSnap.id,
                    ...userData,
                    uid: firebaseUser.uid
                };

                // Persist minimal user info in sessionStorage so next page
                // load can show navbar instantly before Firebase responds
                try {
                    sessionStorage.setItem('_cu', JSON.stringify({
                        name: currentUser.name,
                        staffId: currentUser.staffId,
                        profilePic: currentUser.profilePic,
                        role: currentUser.role,
                        profileCompleted: currentUser.profileCompleted
                    }));
                } catch (_) { }

                // --- Routing Logic ------------------------------------------

                // 1. Logged-in user on auth page -> redirect appropriately
                if (pageId === 'page-auth') {
                    if (!currentUser.profileCompleted) {
                        window.location.href = 'profile.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                    return;
                }

                // 2. User without a completed profile -> force profile page
                if (!currentUser.profileCompleted && pageId !== 'page-profile') {
                    window.location.href = 'profile.html';
                    return;
                }

                // 3. Safe to load data and render the page
                try {
                    await refreshData();
                    handleAdminNavbar();
                    updateNavbarUser();
                    initPage(pageId);
                } catch (e) {
                    console.error('Initialization Error:', e);
                } finally {
                    hidePageLoader();
                }

            } else {
                // User exists in Auth but not in Firestore — sign them out
                await signOut(auth);
                window.location.href = 'index.html';
            }
        } else {
            // Not logged in — send to auth page
            hidePageLoader();
            if (pageId !== 'page-auth') {
                window.location.href = 'index.html';
            } else {
                const loginForm = document.getElementById('login-form');
                if (loginForm) loginForm.classList.remove('view-hidden');
            }
        }
    });

    // ── Instant Navbar Pre-render from cache ───────────────────────────────
    // While Firebase is still resolving auth, pre-populate the navbar
    // with the last known user data for a snappy perceived load time.
    if (pageId !== 'page-auth') {
        try {
            const cached = JSON.parse(sessionStorage.getItem('_cu') || 'null');
            if (cached) {
                const nameEl = document.getElementById('nav-user-info');
                if (nameEl && !nameEl.innerHTML) {
                    const avatarUrl = cached.profilePic ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(cached.name || 'User')}&background=2E3192&color=fff&size=64`;
                    nameEl.innerHTML = `
                        <div class="flex items-center space-x-2">
                            <img src="${avatarUrl}" class="h-8 w-8 rounded-full object-cover border-2 border-white/30" alt="avatar">
                            <span class="text-sm font-semibold text-white">${(cached.name || '').split(' ')[0]}</span>
                        </div>`;
                }
            }
        } catch (_) { }
    }
});


// File uploads are now handled server-side by save_profile.php
// The uploadFile function is no longer needed.


function initPage(pageId) {
    // Guard is already handled in onAuthStateChanged — just init the correct page
    if (pageId === 'page-dashboard') updateDashboard();
    else if (pageId === 'page-request') setupRequestForm();
    else if (pageId === 'page-history') renderHistory();
    else if (pageId === 'page-profile') setupProfile();
    else if (pageId === 'page-admin') {
        // Extra guard: only managers/admins can access admin page
        if (currentUser.role < ROLES.MANAGER) {
            window.location.href = 'dashboard.html';
            return;
        }
        setupAdmin();
    }
}


// Admin Specific Logic
function setupAdmin() {
    updateAdminStats();
    renderAdminDashboard();
    renderAdminRequests();
    renderAdminUsers();
    renderAdminAuditLogs();
    switchAdminTab('overview'); // Ensure this is called last to highlight the correct tab
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
                <p class="text-[10px] text-gray-500">${formatTimestamp(req.timestamp)}</p>
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
            <td class="px-6 py-4">
                <input type="checkbox" name="admin-req-select" value="${req.id}" onchange="updateBulkPrintVisibility()" class="rounded text-ecgBlue focus:ring-ecgBlue">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDateOnly(req.timestamp)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-ecgBlue">${staff ? staff.staffId : 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${req.hospital}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-bold rounded-full border ${statusClass}">${req.status}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onclick="viewDetails('${req.id}')" class="text-ecgBlue hover:bg-blue-50 px-2 py-1 rounded">View</button>
                ${req.status === 'Pending' ? `
                    <button onclick="updateRequestStatus('${req.id}', 'Approved')" class="text-green-600 hover:bg-green-50 px-2 py-1 rounded">Approve</button>
                    <button onclick="openAdminRejectModal('${req.id}')" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded">Reject</button>
                ` : `
                    <button onclick="printSingleRequest('${req.id}')" class="text-green-600 hover:bg-green-50 px-2 py-1 rounded">Print</button>
                `}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateBulkPrintVisibility() {
    const checked = document.querySelectorAll('input[name="admin-req-select"]:checked');
    const btn = document.getElementById('btn-bulk-print');
    if (btn) {
        if (checked.length > 0) btn.classList.remove('view-hidden');
        else btn.classList.add('view-hidden');
    }
}

function toggleSelectAllRequests(master) {
    const checkboxes = document.querySelectorAll('input[name="admin-req-select"]');
    checkboxes.forEach(c => c.checked = master.checked);
    updateBulkPrintVisibility();
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
                    <img class="h-8 w-8 rounded-full mr-3 border border-gray-100" src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + user.name}" loading="lazy">
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

async function updateRequestStatus(reqId, status, reason = '') {
    try {
        const reqRef = doc(db, "medical_requests", reqId);
        const updateData = { status };
        if (reason) updateData.rejection_reason = reason;

        await updateDoc(reqRef, updateData);

        // Update local state for immediate UI refresh
        const idx = medicalRequests.findIndex(r => r.id == reqId);
        if (idx !== -1) {
            medicalRequests[idx].status = status;
            if (reason) medicalRequests[idx].rejection_reason = reason;
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

async function adminToggleProfileLock(userId) {
    const user = users.find(u => u.id == userId);
    if (!user) return;
    const newStatus = user.profileCompleted ? false : true;

    try {
        await updateDoc(doc(db, "users", userId), { profileCompleted: newStatus });

        user.profileCompleted = newStatus;
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
        // 1. Delete user document
        await deleteDoc(doc(db, "users", userId));

        // 2. Delete all medical requests for this user
        const q = query(collection(db, "medical_requests"), where("userId", "==", userId));
        const snapshots = await getDocs(q);
        const deletePromises = snapshots.docs.map(d => deleteDoc(doc(db, "medical_requests", d.id)));
        await Promise.all(deletePromises);

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
    if (!currentUser || currentUser.role < ROLES.MANAGER) return;
    let navbar = document.querySelector('#app-navbar .md\\:flex');
    if (!navbar) navbar = document.querySelector('#app-navbar .flex.items-center.space-x-4');
    if (navbar && !document.getElementById('nav-admin-link')) {
        const divider = document.createElement('div');
        divider.className = 'border-l border-blue-700 h-6 mx-2';

        const adminLink = document.createElement('a');
        adminLink.id = 'nav-admin-link';
        adminLink.href = 'admin.html';
        adminLink.className = 'hover:text-ecgYellow px-3 py-2 rounded-md text-sm font-bold bg-white/10 border border-white/20 transition flex items-center text-white';
        adminLink.innerHTML = `<svg class="w-4 h-4 mr-1 text-ecgYellow" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0v-7.268a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v2.268a2 2 0 010 3.464V16a1 1 0 11-2 0V9.732a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg> Admin Console`;

        const refBtn = navbar.querySelector('button');
        if (refBtn && refBtn.parentNode === navbar) {
            navbar.insertBefore(divider, refBtn);
            navbar.insertBefore(adminLink, divider);
        } else {
            navbar.appendChild(divider);
            navbar.appendChild(adminLink);
        }
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

    const avatarUrl = currentUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=f3b204&color=2E3192`;

    userInfo.innerHTML = `
        <div class="flex items-center space-x-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm mr-4">
            <div class="text-right hidden sm:block">
                <p class="text-xs font-bold text-white tracking-wide">${firstName}</p>
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">${roleName}</p>
            </div>
            <div class="h-8 w-8 rounded-lg overflow-hidden border border-white/20 shadow-inner">
                <img src="${avatarUrl}" class="h-full w-full object-cover">
            </div>
        </div>
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
const validateEcgEmail = (email) => email.toLowerCase().endsWith('@ecggh.com');

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
        showError(errorDiv, 'Email must use the ECG domain (@ecggh.com).');
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
        // 1. Create Auth Account
        const userCredential = await createUserWithEmailAndPassword(auth, email, pwd);
        const user = userCredential.user;

        // 2. Create Firestore Profile using UID
        const role = (dept === 'IT') ? ROLES.SUPER_ADMIN : ROLES.STAFF;
        await setDoc(doc(db, "users", user.uid), {
            name,
            staffId,
            email,
            dept,
            phone,
            role,
            profileCompleted: false,
            created_at: serverTimestamp()
        });

        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Signup Error:', error);
        let msg = error.message || 'Registration failed.';
        if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
        showError(errorDiv, msg);
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

    const emailInput = document.getElementById('login-email').value.trim();
    const pwd = document.getElementById('login-pwd').value;

    if (!validateEcgEmail(emailInput)) {
        showError(errorDiv, 'Only official ECG emails (@ecggh.com) are allowed.');
        btn.disabled = false; btn.textContent = originalText;
        return;
    }

    try {
        // Sign in with Firebase Auth directly
        await signInWithEmailAndPassword(auth, emailInput, pwd);
        // Redirect handled by onAuthStateChanged
    } catch (error) {
        console.error('Login Error:', error);
        let msg = 'Invalid Email or Password.';
        if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
        if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
        showError(errorDiv, msg);
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (e) {
        console.error("Logout error:", e);
    }
}

let resetUserId = null;

async function handleForgotPassword(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('forgot-error');
    const successDiv = document.getElementById('forgot-success');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const staffId = document.getElementById('forgot-id').value.trim();
    const email = document.getElementById('forgot-email').value.trim().toLowerCase();

    if (!validateEcgEmail(email)) {
        showError(errorDiv, 'Please enter a valid ECG official email (@ecggh.com).');
        return;
    }

    try {
        const q = query(collection(db, "users"), where("staffId", "==", staffId), where("email", "==", email));
        const snap = await getDocs(q);

        if (!snap.empty) {
            // Check if Firebase Auth has the sendPasswordResetEmail method imported, else import it
            const { getAuth, sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
            await sendPasswordResetEmail(auth, email);

            successDiv.innerHTML = `<div class="font-bold text-green-700">Reset Link Sent!</div>Please check your ECG inbox (${email}) for instructions.`;
            successDiv.classList.remove('hidden');
            e.target.reset();
        } else {
            showError(errorDiv, 'Staff ID and Email do not match our records.');
        }
    } catch (err) {
        console.error(err);
        showError(errorDiv, 'Failed to process request: ' + err.message);
    }
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
    if (!currentUser) return;

    const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'User';
    document.getElementById('dash-name').textContent = firstName;
    document.getElementById('dash-id').textContent = currentUser.staffId || 'N/A';

    const deptEl = document.getElementById('dash-dept');
    if (deptEl) {
        deptEl.textContent = currentUser.dept || 'N/A';
    }

    const profPicEl = document.getElementById('dash-profile-pic');
    if (profPicEl) {
        const background = currentUser.role >= ROLES.MANAGER ? '2E3192' : 'f3b204';
        const color = currentUser.role >= ROLES.MANAGER ? 'fff' : '2E3192';
        const avatarUrl = currentUser.profilePic ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=${background}&color=${color}&size=128`;

        // Swap src; onload handler in HTML removes the skeleton shimmer class
        profPicEl.onload = () => profPicEl.classList.remove('skeleton');
        profPicEl.src = avatarUrl;
    }

    // Every user (Staff and Manager) should see their personal stats on the dashboard
    const personalRequests = medicalRequests.filter(r => r.userId === currentUser.id);

    document.getElementById('stat-total').textContent = personalRequests.length;
    document.getElementById('stat-approved').textContent = personalRequests.filter(r => r.status === 'Approved').length;
    document.getElementById('stat-pending').textContent = personalRequests.filter(r => r.status === 'Pending').length;
    document.getElementById('stat-rejected').textContent = personalRequests.filter(r => r.status === 'Rejected').length;
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
        const el = document.getElementById(`section-${s}`);
        if (el) el.classList.add('view-hidden');

        const sideBtn = document.getElementById(`side-tab-${s}`);
        if (sideBtn) {
            sideBtn.classList.remove('bg-blue-50', 'text-ecgBlue', 'border', 'border-blue-100', 'font-bold');
            sideBtn.classList.add('text-gray-600', 'hover:bg-gray-50', 'font-medium');

            const svg = sideBtn.querySelector('svg');
            if (svg) svg.classList.replace('text-ecgBlue', 'text-gray-400');
        }
    });

    // Show active section
    const activeSection = document.getElementById(`section-${tab}`);
    if (activeSection) activeSection.classList.remove('view-hidden');

    const activeSideBtn = document.getElementById(`side-tab-${tab}`);
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
        const action = log.action || '';
        if (action.includes('Approved')) actionColor = 'text-green-600';
        else if (action.includes('Rejected')) actionColor = 'text-red-500';
        else if (action.includes('Deleted')) actionColor = 'text-red-700';

        div.innerHTML = `
            <div class="flex-1">
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase tracking-tighter">${log.target_type || log.type || 'System'}</span>
                    <span class="text-sm font-bold ${actionColor}">${action || 'Action'}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${log.details || ''}</p>
            </div>
            <div class="text-right">
                <p class="text-xs font-bold text-gray-900">${log.admin_name || log.adminName || 'System'}</p>
                <p class="text-[10px] text-gray-400">${formatTimestamp(log.created_at || log.timestamp)}</p>
            </div>
        `;
        logContainer.appendChild(div);
    });
}

async function clearAuditLogs() {
    if (!confirm('Are you sure you want to clear all system audit logs? This action is permanent.')) return;
    const btn = document.querySelector('button[onclick="clearAuditLogs()"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Clearing...';

    try {
        // Firestore doesn't have a truncate, so we delete each doc
        const q = query(collection(db, "audit_logs"));
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "audit_logs", d.id)));
        await Promise.all(deletePromises);

        auditLogs = [];
        renderAdminAuditLogs();
        alert('Audit logs cleared successfully.');
    } catch (e) {
        console.error('Clear Logs Error:', e);
        alert('Failed to clear logs: ' + e.message);
    } finally {
        if (btn) btn.textContent = originalText;
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
        // To create a user without signing out the current admin, we use a secondary app instance
        const secondaryApp = initializeApp(firebaseConfig, 'secondary');
        const { getAuth, createUserWithEmailAndPassword, signOut: secondarySignOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        const secondaryAuth = getAuth(secondaryApp);

        // 1. Create Auth Account
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pwd);
        const newUid = userCredential.user.uid;

        // 2. Create Firestore Profile using UID
        const role = (dept === 'IT') ? ROLES.SUPER_ADMIN : ROLES.STAFF;
        await setDoc(doc(db, "users", newUid), {
            name,
            staffId,
            email,
            dept,
            role,
            profileCompleted: false,
            created_at: serverTimestamp()
        });

        // 3. Clean up secondary auth session
        await secondarySignOut(secondaryAuth);

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
                <img class="h-20 w-20 rounded-2xl border-4 border-white shadow-lg object-cover" src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + user.name + '&size=128'}" loading="lazy">
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
        // Update directly in Firestore
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { role: parseInt(newRole) });

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
        depSelect.innerHTML = `<option value="${currentUser.name}">${currentUser.name} (Self)</option>`;
    } else if (type === 'Spouse') {
        if (!currentUser.spouse || !currentUser.spouse.name) {
            alert('No spouse configured in your profile. Please contact an administrator to update your profile.');
            document.getElementById('req-type').value = '';
            return;
        }
        depContainer.classList.remove('hidden');
        depSelect.innerHTML = `<option value="${currentUser.spouse.name}">${currentUser.spouse.name} (Spouse)</option>`;
    } else if (type === 'Child') {
        if (!currentUser.children || currentUser.children.length === 0) {
            alert('No dependants configured in your profile. Please contact an administrator to update your profile.');
            document.getElementById('req-type').value = '';
            return;
        }
        depContainer.classList.remove('hidden');
        let options = '<option value="">Select Dependant...</option>';
        currentUser.children.forEach(c => {
            options += `<option value="${c.name}">${c.name}</option>`;
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
        const docRef = await addDoc(collection(db, "medical_requests"), {
            userId: currentUser.id,
            purpose,
            hospital,
            targetDate: dateInput,
            patientType: type,
            patientName: patientName,
            status: 'Pending',
            timestamp: serverTimestamp()
        });

        alert(`Medical Request Submitted Successfully!\nRequest ID: ${docRef.id}`);
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

    let userRequests = medicalRequests.filter(r => r.userId === currentUser.id);
    if (filter !== 'All') {
        userRequests = userRequests.filter(r => r.status === filter);
    }

    // Sort by timestamp (handling serverTimestamp which might be an object)
    userRequests.sort((a, b) => {
        const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
        const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
        return tB - tA;
    });

    if (userRequests.length === 0) {
        emptyDiv.classList.remove('view-hidden');
        tbody.parentElement.classList.add('hidden');
    } else {
        emptyDiv.classList.add('view-hidden');
        tbody.parentElement.classList.remove('hidden');
        userRequests.forEach(req => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${formatDateOnly(req.timestamp)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">${req.patientName || 'Self'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">${req.hospital}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm ${getStatusClass(req.status)}">
                        ${req.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onclick="viewDetails('${req.id}')" class="text-ecgBlue hover:text-ecgBlueDark font-bold inline-flex items-center group">
                        View Details 
                        <svg class="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                    ${req.status === 'Approved' ? `
                    <button onclick="printSingleRequest('${req.id}')" class="text-green-600 hover:text-green-700 font-bold inline-flex items-center ml-4">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Print
                    </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function viewDetails(reqId) {
    const req = medicalRequests.find(r => r.id === reqId);
    if (!req) return;

    const staff = users.find(u => u.id === req.userId);

    document.getElementById('modal-id').textContent = `Req ID: #${req.id.substring(0, 8).toUpperCase()}`;

    let content = `
        <div class="grid grid-cols-2 gap-y-6 gap-x-4">
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Submitted On</strong> <span class="text-gray-900 font-medium">${formatTimestamp(req.timestamp)}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Status</strong> <span class="font-bold border px-3 py-1 rounded-full text-xs inline-block shadow-sm ${getStatusClass(req.status)}">${req.status}</span></div>
            
            ${pageId === 'page-admin' ? `
            <div class="col-span-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                <strong class="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Staff Member</strong> 
                <span class="text-gray-900 font-bold text-base">${staff ? staff.name : 'Unknown Staff'} <span class="text-xs text-gray-500 font-normal ml-1">(${staff ? staff.staffId : 'N/A'})</span></span>
            </div>
            ` : ''}

            <div class="col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Purpose</strong> 
                <span class="text-gray-800 leading-relaxed">${req.purpose}</span>
            </div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Hospital</strong> <span class="text-gray-900 font-medium">${req.hospital}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Target Date</strong> <span class="text-gray-900 font-medium">${req.targetDate}</span></div>
            
            <div class="col-span-2 pt-4 border-t border-gray-100 mt-2">
                <strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Primary Patient</strong> 
                <span class="text-gray-900 font-bold text-base">${req.patientName} <span class="text-sm font-normal text-gray-500 ml-1 bg-gray-100 px-2 py-0.5 rounded-full">(${req.patientType})</span></span>
            </div>
        </div>
    `;

    if (req.status === 'Rejected' && req.rejection_reason) {
        content += `
            <div class="mt-4 p-4 bg-red-50/80 border border-red-200 rounded-xl text-red-800">
                <strong class="font-bold flex items-center mb-1">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Rejection Reason
                </strong>
                <p class="text-sm mt-1 ml-5.5 text-red-700">${req.rejection_reason}</p>
            </div>
        `;
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
function previewProfilePic(e) {
    const file = e.target.files[0];
    if (file) {
        const previewEl = document.getElementById('prof-pic-preview');
        if (previewEl) previewEl.src = URL.createObjectURL(file);
    }
}

function previewSpousePic(e) {
    const file = e.target.files[0];
    if (file) {
        const previewEl = document.getElementById('prof-spouse-pic-preview');
        if (previewEl) previewEl.src = URL.createObjectURL(file);
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
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Child Name *</label>
            <input type="text" value="${nameVal}" required class="input-premium prof-child-name block w-full bg-white border border-gray-200 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-ecgBlue/50 focus:border-ecgBlue sm:text-sm">
        </div>
        <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Date of Birth *</label>
            <input type="date" value="${dobVal}" required onchange="calcChildAge(this)" class="input-premium prof-child-dob block w-full bg-white border border-gray-200 rounded-lg shadow-sm py-2 px-3 focus:ring-2 focus:ring-ecgBlue/50 focus:border-ecgBlue sm:text-sm">
            <p class="text-xs text-gray-500 mt-2 font-medium bg-gray-50 border border-gray-100 rounded px-2 py-1 inline-block">Age: ${dobVal ? calculateAge(dobVal) + ' years' : '--'}</p>
        </div>
        <div class="relative flex items-center justify-end md:pt-6">
            ${currentUser.profileCompleted ? '' : '<button type="button" onclick="this.closest(\'.prof-child-entry\').remove()" class="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-xs font-bold hover:bg-red-100 transition-all border border-red-100 shadow-sm" title="Remove">Remove Child</button>'}
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
        const userData = {
            name: document.getElementById('prof-staff-name').value,
            phone: document.getElementById('prof-staff-phone').value,
            dob: document.getElementById('prof-staff-dob').value,
            designation: document.getElementById('prof-staff-designation').value,
            region: document.getElementById('prof-staff-region').value,
            district: document.getElementById('prof-staff-district').value,
            profileCompleted: true,
            spouse: {
                name: document.getElementById('prof-spouse-name').value,
                dob: document.getElementById('prof-spouse-dob').value,
                phone: document.getElementById('prof-spouse-phone').value,
                idType: document.getElementById('prof-spouse-idtype').value,
                idNumber: document.getElementById('prof-spouse-idnumber').value
            },
            children: []
        };

        // 1. Skip Image Uploads (Free Plan - No Storage)
        userData.profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=2E3192&color=fff`;

        // 4. Handle Children (Text Only)
        const childEntries = document.querySelectorAll('.prof-child-entry');
        for (const entry of childEntries) {
            const childName = entry.querySelector('.prof-child-name').value;
            const childDob = entry.querySelector('.prof-child-dob').value;

            userData.children.push({
                name: childName,
                dob: childDob
            });
        }

        // 5. Update Firestore — use uid which is always the document ID
        await updateDoc(doc(db, "users", currentUser.uid), userData);

        // Update local state
        Object.assign(currentUser, userData);

        // Attempt audit log — silently skip if permission denied (e.g. role not yet elevated)
        try {
            await addAuditLog('Completed Profile', 'Profile', `Staff member ${currentUser.name} completed and locked their profile.`);
        } catch (_) { }

        alert('Profile saved successfully! Redirecting to your dashboard...');
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
            formatTimestamp(req.timestamp)
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
            formatDateOnly(req.timestamp),
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

function printSingleRequest(reqId) {
    if (typeof jspdf === 'undefined') {
        alert('PDF library not loaded.');
        return;
    }

    const req = medicalRequests.find(r => r.id === reqId);
    if (!req) return;

    const staff = users.find(u => u.id === req.userId);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Template for a medical request form
    renderMedicalPDF(doc, req, staff, 20);

    doc.save(`Medical_Request_${req.id.substring(0, 8)}.pdf`);
}

function handleBulkPrint() {
    if (typeof jspdf === 'undefined') {
        alert('PDF library not loaded.');
        return;
    }

    const checked = document.querySelectorAll('input[name="admin-req-select"]:checked');
    if (checked.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    checked.forEach((cb, index) => {
        const reqId = cb.value;
        const req = medicalRequests.find(r => r.id === reqId);
        const staff = users.find(u => u.id === req.userId);

        if (index > 0) doc.addPage();
        renderMedicalPDF(doc, req, staff, 20);
    });

    doc.save(`Bulk_Medical_Requests_${new Date().getTime()}.pdf`);
}

function renderMedicalPDF(doc, req, staff, startY) {
    // Header
    doc.setFillColor(46, 49, 146);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("ECG MEDICAL PORTAL", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("OFFICIAL MEDICAL ATTENTION REQUEST", 105, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    let y = 55;

    // Staff Info
    doc.setFont("helvetica", "bold");
    doc.text("STAFF INFORMATION", 20, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    doc.autoTable({
        startY: y,
        body: [
            ["Name:", staff ? staff.name : "N/A", "Staff ID:", staff ? staff.staffId : "N/A"],
            ["Department:", staff ? staff.dept : "N/A", "Email:", staff ? staff.email : "N/A"]
        ],
        theme: 'plain',
        styles: { fontSize: 10 }
    });

    y = doc.lastAutoTable.finalY + 15;

    // Request Info
    doc.setFont("helvetica", "bold");
    doc.text("REQUEST DETAILS", 20, y);
    doc.setFont("helvetica", "normal");
    y += 10;
    doc.autoTable({
        startY: y,
        body: [
            ["Request ID:", req.id, "Status:", req.status],
            ["Hospital/Facility:", req.hospital, "Date Requested:", req.targetDate],
            ["Patient Name:", req.patientName, "Patient Type:", req.patientType]
        ],
        theme: 'grid',
        headStyles: { fillColor: [46, 49, 146] }
    });

    y = doc.lastAutoTable.finalY + 15;

    // Purpose
    doc.setFont("helvetica", "bold");
    doc.text("PURPOSE OF VISIT", 20, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    doc.setFontSize(10);
    const splitPurpose = doc.splitTextToSize(req.purpose, 170);
    doc.text(splitPurpose, 20, y);

    y += (splitPurpose.length * 5) + 20;

    // Footer/Signatures
    doc.line(20, y, 90, y);
    doc.line(120, y, 190, y);
    y += 5;
    doc.setFontSize(8);
    doc.text("STAFF SIGNATURE", 55, y, { align: "center" });
    doc.text("ADMINISTRATOR APPROVAL", 155, y, { align: "center" });

    y += 15;
    doc.text(`Printed on: ${new Date().toLocaleString()}`, 105, y, { align: "center" });
}

