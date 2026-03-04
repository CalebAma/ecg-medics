// State Management
let currentUser = null;
let users = JSON.parse(localStorage.getItem('ecgUsers')) || [];
let medicalRequests = JSON.parse(localStorage.getItem('ecgRequests')) || [];

// DOM Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
    const sessionUser = sessionStorage.getItem('ecgCurrentUser');
    const pageId = document.body.id;

    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);

        // Redirect mapped out for backwards compatibility
        if (pageId === 'page-auth') {
            window.location.href = 'dashboard.html';
        } else {
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
    renderAdminRequests();
    renderAdminUsers();
}

function updateAdminStats() {
    if (!document.getElementById('admin-stat-users')) return;
    document.getElementById('admin-stat-users').textContent = users.length;
    document.getElementById('admin-stat-pending').textContent = medicalRequests.filter(r => r.status === 'Pending').length;
    document.getElementById('admin-stat-approved').textContent = medicalRequests.filter(r => r.status === 'Approved').length;
    document.getElementById('admin-stat-rejected').textContent = medicalRequests.filter(r => r.status === 'Rejected').length;
}

function switchAdminTab(tab) {
    const tabs = ['requests', 'users'];
    tabs.forEach(t => {
        document.getElementById(`tab-${t}`).classList.remove('active');
        document.getElementById(`section-${t}`).classList.add('view-hidden');
    });

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`section-${tab}`).classList.remove('view-hidden');
}

function renderAdminRequests() {
    const tbody = document.getElementById('admin-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const sortedRequests = [...medicalRequests].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedRequests.forEach(req => {
        const staff = users.find(u => u.id === req.userId);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';

        const statusClass = getStatusClass(req.status);

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${new Date(req.timestamp).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-ecgBlue">${staff ? staff.staffId : 'Unknown'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${req.dependantName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${req.hospital}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-bold rounded-full border ${statusClass}">${req.status}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                ${req.status === 'Pending' ? `
                    <button onclick="updateRequestStatus('${req.id}', 'Approved')" class="text-green-600 hover:bg-green-50 px-2 py-1 rounded">Approve</button>
                    <button onclick="openAdminRejectModal('${req.id}')" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded">Reject</button>
                ` : `<span class="text-gray-400 italic">No actions</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <img class="h-8 w-8 rounded-full mr-3" src="${user.profilePic || 'https://ui-avatars.com/api/?name=' + user.name}">
                    <span class="text-sm font-medium text-gray-900">${user.name}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.staffId}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.dept}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs rounded-full ${user.profileCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${user.profileCompleted ? 'Locked' : 'Incomplete'}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="adminToggleProfileLock(${user.id})" class="text-ecgBlue hover:underline">${user.profileCompleted ? 'Unlock Profile' : 'Lock Profile'}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateRequestStatus(reqId, status, reason = '') {
    const idx = medicalRequests.findIndex(r => r.id === reqId);
    if (idx !== -1) {
        medicalRequests[idx].status = status;
        if (reason) medicalRequests[idx].rejectionReason = reason;
        localStorage.setItem('ecgRequests', JSON.stringify(medicalRequests));
        setupAdmin();
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

function adminToggleProfileLock(userId) {
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
        users[userIdx].profileCompleted = !users[userIdx].profileCompleted;
        localStorage.setItem('ecgUsers', JSON.stringify(users));
        renderAdminUsers();
        alert(`Profile for ${users[userIdx].name} has been ${users[userIdx].profileCompleted ? 'Locked' : 'Unlocked'}.`);
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

// Authentication Forms Toggle
function toggleAuthForm(type) {
    if (type === 'login') {
        document.getElementById('login-form').classList.remove('view-hidden');
        document.getElementById('signup-form').classList.add('view-hidden');
    } else {
        document.getElementById('login-form').classList.add('view-hidden');
        document.getElementById('signup-form').classList.remove('view-hidden');
    }
}

// Validation Helpers
const validatePassword = (pwd) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);
const validateEcgEmail = (email) => email.toLowerCase().endsWith('@ecg.com.gh');

// Signup
function handleSignup(e) {
    e.preventDefault();
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
        return;
    }
    if (users.some(u => u.staffId === staffId)) {
        showError(errorDiv, 'Staff ID is already registered.');
        return;
    }
    if (users.some(u => u.email === email)) {
        showError(errorDiv, 'Email is already registered.');
        return;
    }
    if (!validatePassword(pwd)) {
        showError(errorDiv, 'Password must be at least 8 characters, contain 1 uppercase letter and 1 number.');
        return;
    }
    if (pwd !== confirmPwd) {
        showError(errorDiv, 'Passwords do not match.');
        return;
    }

    const newUser = { id: Date.now(), name, staffId, dept, email, phone, pwd };
    users.push(newUser);
    localStorage.setItem('ecgUsers', JSON.stringify(users));

    completeLogin(newUser, true);
}

// Login
function handleLogin(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.add('hidden');

    const staffId = document.getElementById('login-id').value;
    const pwd = document.getElementById('login-pwd').value;

    // Admin Hardcoded Check
    if (staffId === 'ADMIN001' && pwd === 'admin123') {
        const adminUser = { name: 'Admin User', staffId: 'ADMIN001', isAdmin: true };
        sessionStorage.setItem('ecgCurrentUser', JSON.stringify(adminUser));
        window.location.href = 'admin.html';
        return;
    }

    const user = users.find(u => u.staffId === staffId && u.pwd === pwd);
    if (!user) {
        showError(errorDiv, 'Invalid Staff ID or Password.');
        return;
    }
    completeLogin(user);
}

function completeLogin(user, fromSignup = false) {
    sessionStorage.setItem('ecgCurrentUser', JSON.stringify(user));
    if (fromSignup) {
        window.location.href = 'profile.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

function logoutUser() {
    sessionStorage.removeItem('ecgCurrentUser');
    window.location.href = 'index.html';
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

// Dashboard Update
function updateDashboard() {
    document.getElementById('dash-name').textContent = currentUser.name;
    document.getElementById('dash-id').textContent = currentUser.staffId;
    document.getElementById('dash-dept').textContent = currentUser.dept;

    if (currentUser.profilePic && document.getElementById('dash-profile-pic')) {
        document.getElementById('dash-profile-pic').src = currentUser.profilePic;
    }

    const userRequests = medicalRequests.filter(r => r.userId === currentUser.id);
    document.getElementById('stat-total').textContent = userRequests.length;
    document.getElementById('stat-approved').textContent = userRequests.filter(r => r.status === 'Approved').length;
    document.getElementById('stat-pending').textContent = userRequests.filter(r => r.status === 'Pending').length;
    document.getElementById('stat-rejected').textContent = userRequests.filter(r => r.status === 'Rejected').length;
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

function handleMedicalRequest(e) {
    e.preventDefault();

    const dateInput = document.getElementById('req-date').value;
    const reqDate = new Date(dateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    if (reqDate < today || reqDate > maxDate) {
        alert('Date cannot be in the past or exceed 30 days from today.');
        return;
    }

    const type = document.getElementById('req-type').value;
    const patientName = document.getElementById('req-dependant').value;

    if (!patientName) {
        alert('Please select the patient requiring medical attention.');
        return;
    }

    const reqId = 'REQ-' + Math.floor(100000 + Math.random() * 900000);

    const newRequest = {
        id: reqId,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        purpose: document.getElementById('req-purpose').value,
        hospital: document.getElementById('req-hospital').value,
        targetDate: dateInput,
        dependantName: patientName,
        dependantType: type,
        status: 'Pending'
    };

    medicalRequests.push(newRequest);
    localStorage.setItem('ecgRequests', JSON.stringify(medicalRequests));

    alert(`Medical Request Submitted Successfully!\nRequest ID: ${reqId}`);
    window.location.href = 'history.html';
}

// Medical History Methods
function renderHistory() {
    const tbody = document.getElementById('history-table-body');
    const emptyDiv = document.getElementById('history-empty');
    if (!tbody || !emptyDiv) return;

    const filter = document.getElementById('filter-status').value;

    tbody.innerHTML = '';

    let userRequests = medicalRequests.filter(r => r.userId === currentUser.id);

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
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${dateStr}</td>
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

function viewDetails(reqId) {
    const req = medicalRequests.find(r => r.id === reqId);
    if (!req) return;

    document.getElementById('modal-id').textContent = `Req ID: #${req.id}`;
    let content = `
        <div class="grid grid-cols-2 gap-y-6 gap-x-4">
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Submitted On</strong> <span class="text-gray-900 font-medium">${new Date(req.timestamp).toLocaleString()}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Status</strong> <span class="font-bold border px-3 py-1 rounded-full text-xs inline-block shadow-sm ${getStatusClass(req.status)}">${req.status}</span></div>
            <div class="col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100"><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Purpose</strong> <span class="text-gray-800 leading-relaxed">${req.purpose}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Hospital</strong> <span class="text-gray-900 font-medium">${req.hospital}</span></div>
            <div><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Target Date</strong> <span class="text-gray-900 font-medium">${req.targetDate}</span></div>
            <div class="col-span-2 pt-4 border-t border-gray-100 mt-2"><strong class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Primary Patient</strong> <span class="text-gray-900 font-bold text-base">${req.dependantName} <span class="text-sm font-normal text-gray-500 ml-1 bg-gray-100 px-2 py-0.5 rounded-full">(${req.dependantType})</span></span></div>
        </div>
    `;

    if (req.dependantType === 'Spouse') {
        content += `<div class="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl"><strong class="text-sm font-bold text-ecgBlue block mb-2 flex items-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>Spouse Details</strong> <div class="grid grid-cols-2 gap-2 text-sm text-gray-700"><div>Name: <span class="font-medium text-gray-900">${req.spouseName}</span></div><div>DOB: <span class="font-medium text-gray-900">${req.spouseDob}</span></div><div class="col-span-2 mt-1 flex items-center text-green-600"><svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> File Previously Uploaded Check</div></div></div>`;
    } else if (req.dependantType === 'Child' && req.children) {
        content += `<div class="mt-4 p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl"><strong class="text-sm font-bold text-yellow-700 block mb-3 flex items-center"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>Children Details</strong><div class="space-y-3">`;
        req.children.forEach(c => {
            content += `<div class="bg-white p-3 rounded-lg border border-yellow-200/50 shadow-sm text-sm"><div class="font-bold text-gray-900">${c.name}</div><div class="text-gray-600 mt-1 flex justify-between"><span>Born: ${c.dob}</span><span class="text-green-600 flex items-center"><svg class="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>File Uploaded</span></div></div>`;
        });
        content += `</div></div>`;
    }

    if (req.status === 'Rejected' && req.rejectionReason) {
        content += `<div class="mt-4 p-4 bg-red-50/80 border border-red-200 rounded-xl text-red-800"><strong class="font-bold flex items-center mb-1"><svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Rejection Reason</strong><p class="text-sm mt-1 ml-5.5 text-red-700">${req.rejectionReason}</p></div>`;
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
        <div>
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

function handleProfileSave(e) {
    e.preventDefault();

    // Extract staff edits
    currentUser.name = document.getElementById('prof-staff-name').value;
    currentUser.email = document.getElementById('prof-staff-email').value;
    currentUser.phone = document.getElementById('prof-staff-phone').value;
    currentUser.dob = document.getElementById('prof-staff-dob').value;
    currentUser.designation = document.getElementById('prof-staff-designation').value;
    currentUser.region = document.getElementById('prof-staff-region').value;
    currentUser.district = document.getElementById('prof-staff-district').value;

    const spouseName = document.getElementById('prof-spouse-name').value;
    const spouseDob = document.getElementById('prof-spouse-dob').value;
    const spouseFile = document.getElementById('prof-spouse-id').files[0];

    let spouseObj = currentUser.spouse || null;
    if (spouseName && spouseDob) {
        if (!spouseFile && !spouseObj) {
            alert('Spouse Identification file is required');
            return;
        }
        spouseObj = {
            name: spouseName,
            dob: spouseDob,
            phone: document.getElementById('prof-spouse-phone').value,
            idType: document.getElementById('prof-spouse-idtype').value,
            idNumber: document.getElementById('prof-spouse-idnumber').value,
            hasFileName: spouseFile ? spouseFile.name : (spouseObj ? spouseObj.hasFileName : 'Not Provided')
        };
    }

    const entries = document.querySelectorAll('.prof-child-entry');
    const children = [];

    let childError = false;
    entries.forEach((entry, idx) => {
        const file = entry.querySelector('.prof-child-file').files[0];
        const existingChild = (currentUser.children && currentUser.children[idx]) ? currentUser.children[idx] : null;

        if (!file && !existingChild) {
            childError = true;
        }

        children.push({
            name: entry.querySelector('.prof-child-name').value,
            dob: entry.querySelector('.prof-child-dob').value,
            hasFileName: file ? file.name : (existingChild ? existingChild.hasFileName : 'Not Provided')
        });
    });

    if (childError) {
        alert('Birth certificate is required for new children entries.');
        return;
    }

    if (tempProfilePicBase64) {
        currentUser.profilePic = tempProfilePicBase64;
    }

    if (tempSpousePicBase64) {
        currentUser.spousePic = tempSpousePicBase64;
    }

    currentUser.spouse = spouseObj;
    currentUser.children = children;
    currentUser.profileCompleted = true;

    // Update local storage
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('ecgUsers', JSON.stringify(users));
        sessionStorage.setItem('ecgCurrentUser', JSON.stringify(currentUser));
        alert('Profile saved successfully!');
        window.location.href = 'dashboard.html';
    }
}
