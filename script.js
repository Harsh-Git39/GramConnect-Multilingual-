// ===== GLOBAL STATE =====
let currentUser = null;
let jobs = [];
let applications = [];

// ===== HELPER FUNCTIONS =====

// Show custom message modal
const showMsg = (title, msg) => {
    const modal = document.getElementById('customMessageModal');
    if (!modal) return;
    document.getElementById('customMessageTitle').textContent = title;
    document.getElementById('customMessageBody').textContent = msg;
    modal.style.display = 'block';
};

const closeMsg = () => {
    const modal = document.getElementById('customMessageModal');
    if (modal) modal.style.display = 'none';
};

// Close modal on function name
function closeCustomMessageModal() {
    closeMsg();
}

// API call with loading state
const api = async (url, options = {}) => {
    try {
        showMsg('प्रसंस्करण', 'कृपया प्रतीक्षा करें...');
        const res = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'User-ID': currentUser?.id, ...options.headers }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        closeMsg();
        return data;
    } catch (err) {
        closeMsg();
        console.error('API Error:', err);
        showMsg('त्रुटि', 'नेटवर्क त्रुटि: ' + err.message);
        return { success: false, error: err.message };
    }
};

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    loadUser();
    initPage();
    document.addEventListener('click', e => e.target.classList.contains('modal') && (e.target.style.display = 'none'));
});

const loadUser = () => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        const el = document.getElementById('userName');
        if (el) el.textContent = currentUser.name;
    } else if (!location.pathname.includes('index.html') && !location.pathname.includes('auth.html') && !location.pathname.endsWith('/')) {
        location.href = 'auth.html';
    }
};

const initPage = () => {
    if (location.pathname.includes('farmDash.html')) loadFarmerDash();
    else if (location.pathname.includes('workDash.html')) loadWorkerDash();
};

// ===== NAVIGATION =====

const goHome = () => location.href = 'index.html';

function navigateToLanding() {
    goHome();
}

const goAuth = () => location.href = 'auth.html';

function navigateToAuth() {
    goAuth();
}

const logout = () => {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showMsg('सफलता', 'लॉग आउट सफल');
    setTimeout(goHome, 1000);
};

function handleLogout() {
    logout();
}

// ===== AUTHENTICATION =====

const switchTab = (tab) => {
    const isSignup = tab === 'signup';
    const signupTab = document.getElementById('signupTab');
    const loginTab = document.getElementById('loginTab');
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const authTitle = document.getElementById('authTitle');
    const authDescription = document.getElementById('authDescription');
    
    if (isSignup) {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        authTitle.textContent = 'ग्रामकनेक्ट से जुड़ें';
        authDescription.textContent = 'खेती समुदाय से जुड़ने के लिए अपना खाता बनाएँ';
    } else {
        signupTab.classList.remove('active');
        loginTab.classList.add('active');
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authTitle.textContent = 'लॉगिन करें';
        authDescription.textContent = 'अपने डैशबोर्ड तक पहुँचने के लिए साइन इन करें';
    }
};

function switchAuthTab(tab) {
    switchTab(tab);
}

const handleSignup = async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        phone: document.getElementById('signupPhone').value,
        location: document.getElementById('signupLocation').value,
        userType: document.getElementById('userType').value,
        password: document.getElementById('signupPassword').value
    };
    
    const res = await api('/api/signup', { method: 'POST', body: JSON.stringify(data) });
    
    if (res.success) {
        switchTab('login');
        showMsg('सफलता', 'पंजीकरण सफल! अब लॉगिन करें।');
    } else {
        showMsg('त्रुटि', res.error || 'पंजीकरण विफल');
    }
};

const handleLogin = async (e) => {
    e.preventDefault();
    const data = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };
    
    const res = await api('/api/login', { method: 'POST', body: JSON.stringify(data) });
    
    if (res.success && res.user) {
        currentUser = res.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMsg('सफलता', `स्वागत है ${currentUser.name}!`);
        setTimeout(() => location.href = currentUser.type === 'farmer' ? 'farmDash.html' : 'workDash.html', 1000);
    } else {
        showMsg('त्रुटि', res.error || 'लॉगिन विफल');
    }
};

// ===== DATA LOADING =====

const loadJobs = async () => {
    const res = await api('/api/jobs');
    if (res.success) {
        jobs = res.jobs || [];
        await loadApps();
        refresh();
    }
};

function loadJobsFromServer() {
    return loadJobs();
}

const loadApps = async () => {
    if (!currentUser) return;
    const res = await api('/api/applications');
    if (res.success) applications = res.applications || [];
};

const refresh = () => {
    if (currentUser?.type === 'farmer') {
        renderFarmerJobs();
        updateFarmerStats();
        renderApps();
    } else {
        renderAvailableJobs();
        updateWorkerStats();
    }
};

// ===== FARMER DASHBOARD =====

const loadFarmerDash = () => {
    loadJobs();
    const greetEl = document.getElementById('greetingText');
    if (greetEl) greetEl.textContent = `नमस्ते, ${currentUser?.name}!`;
};

function loadFarmerDashboard() {
    loadFarmerDash();
}

const updateFarmerStats = () => {
    const myJobs = jobs.filter(j => j.farmer_id === currentUser.id);
    const myApps = applications.filter(a => myJobs.some(j => j.id === a.jobId));
    
    const activeEl = document.getElementById('activeJobsCount');
    const totalEl = document.getElementById('totalApplicationsCount');
    const pendingEl = document.getElementById('pendingApprovalsCount');
    
    if (activeEl) activeEl.textContent = myJobs.length;
    if (totalEl) totalEl.textContent = myApps.length;
    if (pendingEl) pendingEl.textContent = myApps.filter(a => a.status === 'pending').length;
};

const renderFarmerJobs = () => {
    const el = document.getElementById('farmerJobsList');
    if (!el) return;
    
    console.log('All jobs:', jobs);
    console.log('Current user ID:', currentUser.id);
    
    const myJobs = jobs.filter(j => {
        console.log('Comparing:', j.farmer_id, 'with', currentUser.id);
        return j.farmer_id === currentUser.id;
    });
    
    console.log('My jobs:', myJobs);
    
    if (myJobs.length === 0) {
        el.innerHTML = '<div class="empty-state"><i data-lucide="package-open" class="empty-icon"></i><h3>कोई नौकरी पोस्ट नहीं की गई</h3><p>नई नौकरी पोस्ट करने के लिए ऊपर फॉर्म भरें</p></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    el.innerHTML = myJobs.map(job => {
        const jobApps = applications.filter(a => a.jobId === job.id);
        const pending = jobApps.filter(a => a.status === 'pending').length;
        
        return `<div class="job-card">
            <div class="job-info">
                <h4>${job.title}</h4>
                <p style="margin: 0.5rem 0; color: #666;">${job.description}</p>
                <div class="job-meta">
                    <span><i data-lucide="map-pin"></i>${job.location}</span>
                    <span><i data-lucide="indian-rupee"></i>${job.payRate}/दिन</span>
                    <span><i data-lucide="clock"></i>${job.duration}</span>
                </div>
            </div>
            <div class="job-actions">
                <span class="status-badge">${jobApps.length} आवेदन (${pending} लंबित)</span>
                <button class="btn btn-secondary" onclick="viewApps('${job.id}')">
                    <i data-lucide="eye"></i> देखें
                </button>
            </div>
        </div>`;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function loadFarmerJobs() {
    renderFarmerJobs();
}

const renderApps = () => {
    const el = document.getElementById('jobApplicationsList');
    if (!el) return;
    
    const myJobs = jobs.filter(j => j.farmer_id === currentUser.id);
    const myApps = applications.filter(a => myJobs.some(j => j.id === a.jobId));
    
    if (myApps.length === 0) {
        el.innerHTML = '<div class="no-data"><p>कोई आवेदन नहीं</p></div>';
        return;
    }
    
    el.innerHTML = myApps.map(app => {
        const statusMap = { approved: 'स्वीकृत', rejected: 'अस्वीकृत', pending: 'लंबित' };
        const statusClass = `status-${app.status}`;
        
        return `<div class="application-card">
            <div class="app-info">
                <span class="name">${app.workerName}</span>
                <span class="app-meta">${app.workerLocation}</span>
            </div>
            <div class="app-actions">
                <span class="status-badge ${statusClass}">${statusMap[app.status]}</span>
                ${app.status === 'pending' ? `
                    <button class="btn btn-primary btn-sm" onclick="updateApp('${app.id}', 'approved')">
                        <i data-lucide="check"></i> स्वीकृत
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="updateApp('${app.id}', 'rejected')">
                        <i data-lucide="x"></i> अस्वीकृत
                    </button>
                ` : ''}
            </div>
        </div>`;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function loadJobApplicationsList() {
    renderApps();
}

const updateApp = async (id, status) => {
    const res = await api(`/api/applications/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (res.success) {
        showMsg('सफलता', 'आवेदन अपडेट हो गया');
        loadJobs();
    }
};

function approveApplication(id) {
    updateApp(id, 'approved');
}

function rejectApplication(id) {
    updateApp(id, 'rejected');
}

const handlePostJob = async (e) => {
    e.preventDefault();
    
    const data = {
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('description').value,
        timeSlot: document.getElementById('timeSlot').value,
        duration: document.getElementById('duration').value,
        payRate: document.getElementById('payRate').value,
        skillsRequired: document.getElementById('cropType').value
    };
    
    const res = await api('/api/jobs', { method: 'POST', body: JSON.stringify(data) });
    
    if (res.success) {
        showMsg('सफलता', 'नौकरी पोस्ट हो गई!');
        document.getElementById('postJobForm').reset();
        loadJobs();
    }
};

const viewApps = (id) => {
    const section = document.getElementById('applicationsSection');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
};

function viewJobApplications(id) {
    viewApps(id);
}

// ===== WORKER DASHBOARD =====

const loadWorkerDash = () => {
    loadJobs();
    const greetEl = document.getElementById('greetingText');
    if (greetEl) greetEl.textContent = `स्वागत है, ${currentUser?.name}!`;
};

function loadWorkerDashboard() {
    loadWorkerDash();
}

const updateWorkerStats = () => {
    const applied = applications.filter(a => a.workerId === currentUser.id);
    
    const appliedEl = document.getElementById('jobsAppliedCount');
    const approvedEl = document.getElementById('approvedJobsCount');
    const availableEl = document.getElementById('availableJobsCount');
    
    if (appliedEl) appliedEl.textContent = applied.length;
    if (approvedEl) approvedEl.textContent = applied.filter(a => a.status === 'approved').length;
    if (availableEl) availableEl.textContent = jobs.length - applied.length;
};

const renderAvailableJobs = () => {
    const el = document.getElementById('availableJobsList');
    if (!el) return;
    
    const appliedIds = applications.map(a => a.jobId);
    const available = jobs.filter(j => !appliedIds.includes(j.id) && j.farmer_id !== currentUser.id);
    
    if (available.length === 0) {
        el.innerHTML = '<div class="empty-state"><h3>कोई नौकरी उपलब्ध नहीं</h3></div>';
        return;
    }
    
    el.innerHTML = available.map(job => `
        <div class="job-card">
            <div class="job-info">
                <h4>${job.title}</h4>
                <p>${job.description.substring(0, 100)}...</p>
                <div class="job-meta">
                    <span><i data-lucide="user"></i>${job.farmerName}</span>
                    <span><i data-lucide="map-pin"></i>${job.location}</span>
                    <span><i data-lucide="indian-rupee"></i>${job.payRate}/दिन</span>
                </div>
            </div>
            <div class="job-actions">
                <button class="btn btn-primary" onclick="apply('${job.id}')">
                    <i data-lucide="send"></i> आवेदन करें
                </button>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

function loadAvailableJobs() {
    renderAvailableJobs();
}

const apply = async (jobId) => {
    const res = await api('/api/apply', { method: 'POST', body: JSON.stringify({ jobId }) });
    if (res.success) {
        showMsg('सफलता', 'आवेदन जमा हो गया!');
        loadJobs();
    } else {
        showMsg('त्रुटि', res.error || 'आवेदन विफल');
    }
};

function applyForJob(jobId) {
    apply(jobId);
}

// Auto-load on page ready
window.addEventListener('load', () => currentUser && loadJobs());