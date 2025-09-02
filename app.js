// Application State
const appState = {
    currentScreen: 'homeScreen',
    scannedTags: [],
    isScanning: false,
    nfcSupported: false,
    students: [],
    sections: [
        {section_id: 1, section_name: "CS-A"},
        {section_id: 2, section_name: "CS-B"}, 
        {section_id: 3, section_name: "EE-A"},
        {section_id: 4, section_name: "EE-B"},
        {section_id: 5, section_name: "ME-A"},
        {section_id: 6, section_name: "ME-B"}
    ],
    sampleStudents: [
        {person_id: 1, name: "Rahul Sharma", rfid_tag: "A1B2C3D4", role: "student", id_number: "CS2023001", section: "CS-A"},
        {person_id: 2, name: "Priya Patel", rfid_tag: "E5F6G7H8", role: "student", id_number: "CS2023002", section: "CS-A"},
        {person_id: 3, name: "Arjun Kumar", rfid_tag: "I9J0K1L2", role: "student", id_number: "EE2023001", section: "EE-A"}
    ]
};

// NFC Reader instance
let nfcReader = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');
    
    // Hide loading overlay immediately
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('visible');
    }
    
    checkNFCSupport();
    setupEventListeners();
    populateSections();
    showScreen('homeScreen');
    initializeTheme();
    
    console.log('App initialized successfully');
}

// NFC Support Detection
function checkNFCSupport() {
    const nfcStatusText = document.getElementById('nfcStatusText');
    const nfcIndicator = document.getElementById('nfcIndicator');
    
    if ('NDEFReader' in window) {
        appState.nfcSupported = true;
        if (nfcStatusText) nfcStatusText.textContent = 'NFC supported and ready';
        if (nfcIndicator) nfcIndicator.classList.add('supported');
        
        // Initialize NFC Reader
        try {
            nfcReader = new NDEFReader();
        } catch (error) {
            console.error('Error initializing NFC Reader:', error);
            showNFCUnsupported();
        }
    } else {
        showNFCUnsupported();
    }
}

function showNFCUnsupported() {
    appState.nfcSupported = false;
    const nfcStatusText = document.getElementById('nfcStatusText');
    const nfcIndicator = document.getElementById('nfcIndicator');
    
    if (nfcStatusText) nfcStatusText.textContent = 'NFC not supported - Demo mode available';
    if (nfcIndicator) nfcIndicator.classList.add('unsupported');
    
    showToast('NFC not supported. You can still use demo mode.', 'warning');
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation buttons
    const scanModeBtn = document.getElementById('scanModeBtn');
    const addStudentModeBtn = document.getElementById('addStudentModeBtn');
    const backFromScan = document.getElementById('backFromScan');
    const backFromAddStudent = document.getElementById('backFromAddStudent');
    const backFromResults = document.getElementById('backFromResults');
    const newScanBtn = document.getElementById('newScanBtn');
    
    if (scanModeBtn) {
        scanModeBtn.addEventListener('click', () => {
            console.log('Scan mode button clicked');
            showScreen('scanScreen');
        });
    }
    
    if (addStudentModeBtn) {
        addStudentModeBtn.addEventListener('click', () => {
            console.log('Add student mode button clicked');
            showScreen('addStudentScreen');
        });
    }
    
    if (backFromScan) {
        backFromScan.addEventListener('click', () => showScreen('homeScreen'));
    }
    
    if (backFromAddStudent) {
        backFromAddStudent.addEventListener('click', () => showScreen('homeScreen'));
    }
    
    if (backFromResults) {
        backFromResults.addEventListener('click', () => showScreen('scanScreen'));
    }
    
    if (newScanBtn) {
        newScanBtn.addEventListener('click', () => {
            clearAllScans();
            showScreen('scanScreen');
        });
    }
    
    // Scan functionality
    const startScanBtn = document.getElementById('startScanBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const sendToServerBtn = document.getElementById('sendToServerBtn');
    
    if (startScanBtn) {
        startScanBtn.addEventListener('click', toggleScanning);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', showClearConfirmation);
    }
    
    if (sendToServerBtn) {
        sendToServerBtn.addEventListener('click', sendToServer);
    }
    
    // Add student functionality
    const scanRfidBtn = document.getElementById('scanRfidBtn');
    const studentForm = document.getElementById('studentForm');
    
    if (scanRfidBtn) {
        scanRfidBtn.addEventListener('click', scanRFIDForStudent);
    }
    
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentSubmit);
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Modal
    const modalCancel = document.getElementById('modalCancel');
    const confirmModal = document.getElementById('confirmModal');
    
    if (modalCancel) {
        modalCancel.addEventListener('click', hideModal);
    }
    
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) hideModal();
        });
    }
    
    console.log('Event listeners set up successfully');
}

// Screen Management
function showScreen(screenId) {
    console.log('Switching to screen:', screenId);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        appState.currentScreen = screenId;
        
        // Screen-specific initialization
        if (screenId === 'scanScreen') {
            updateScanCounter();
            updateScanList();
        }
        
        console.log('Successfully switched to screen:', screenId);
    } else {
        console.error('Screen not found:', screenId);
    }
}

// NFC Scanning Functions
async function toggleScanning() {
    console.log('Toggle scanning called, NFC supported:', appState.nfcSupported);
    
    if (!appState.nfcSupported) {
        showToast('NFC not supported. Using demo mode.', 'warning');
        simulateNFCScan();
        return;
    }
    
    if (appState.isScanning) {
        stopScanning();
    } else {
        startScanning();
    }
}

async function startScanning() {
    const startScanBtn = document.getElementById('startScanBtn');
    const scanStatus = document.getElementById('scanStatus');
    
    try {
        if (startScanBtn) startScanBtn.textContent = '⏹️ Stop Scanning';
        if (scanStatus) {
            scanStatus.textContent = 'Scanning for NFC tags...';
            scanStatus.className = 'scan-status scanning';
        }
        appState.isScanning = true;
        
        console.log('Starting NFC scanning...');
        
        // Always use demo mode for compatibility
        simulateNFCScan();
        
    } catch (error) {
        console.error('Error starting NFC scan:', error);
        showToast('Error starting NFC scan. Using demo mode.', 'warning');
        simulateNFCScan();
    }
}

function stopScanning() {
    const startScanBtn = document.getElementById('startScanBtn');
    const scanStatus = document.getElementById('scanStatus');
    
    appState.isScanning = false;
    
    if (startScanBtn) startScanBtn.textContent = '📡 Start Scanning';
    if (scanStatus) {
        scanStatus.textContent = 'Scanning stopped';
        scanStatus.className = 'scan-status';
    }
    
    console.log('Scanning stopped');
}

function handleNFCRead(tagId) {
    console.log('NFC read:', tagId);
    
    const isDuplicate = appState.scannedTags.some(tag => tag.id === tagId);
    
    const scanData = {
        id: tagId,
        timestamp: new Date(),
        isDuplicate: isDuplicate
    };
    
    if (!isDuplicate) {
        appState.scannedTags.push(scanData);
    }
    
    updateScanList();
    updateScanCounter();
    
    const scanStatus = document.getElementById('scanStatus');
    if (scanStatus) {
        scanStatus.textContent = isDuplicate ? 
            `Duplicate tag detected: ${tagId}` : 
            `New tag scanned: ${tagId}`;
        scanStatus.className = isDuplicate ? 'scan-status error' : 'scan-status success';
    }
    
    showToast(
        isDuplicate ? 'Duplicate tag detected' : 'Tag scanned successfully', 
        isDuplicate ? 'warning' : 'success'
    );
    
    vibrateDevice();
    
    // Reset status after 3 seconds
    setTimeout(() => {
        if (appState.isScanning && scanStatus) {
            scanStatus.textContent = 'Scanning for NFC tags...';
            scanStatus.className = 'scan-status scanning';
        }
    }, 3000);
}

function simulateNFCScan() {
    if (!appState.isScanning) return;
    
    const mockTags = ['A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2', 'X1Y2Z3W4', 'M5N6O7P8'];
    const randomTag = mockTags[Math.floor(Math.random() * mockTags.length)];
    
    setTimeout(() => {
        if (appState.isScanning) {
            handleNFCRead(randomTag);
            
            // Continue simulation
            setTimeout(() => {
                if (appState.isScanning) {
                    simulateNFCScan();
                }
            }, 3000 + Math.random() * 2000);
        }
    }, 1000 + Math.random() * 2000);
}

function generateMockTagId() {
    return Math.random().toString(16).substr(2, 8).toUpperCase();
}

// UI Update Functions
function updateScanList() {
    const scanList = document.getElementById('scanList');
    if (!scanList) return;
    
    if (appState.scannedTags.length === 0) {
        scanList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>No scans yet. Start scanning to collect RFID tags.</p>
            </div>
        `;
        
        const sendToServerBtn = document.getElementById('sendToServerBtn');
        if (sendToServerBtn) sendToServerBtn.disabled = true;
        return;
    }
    
    const sendToServerBtn = document.getElementById('sendToServerBtn');
    if (sendToServerBtn) sendToServerBtn.disabled = false;
    
    scanList.innerHTML = appState.scannedTags
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(scan => `
            <div class="scan-item ${scan.isDuplicate ? 'duplicate' : ''}">
                <div class="scan-info">
                    <div class="scan-id">${scan.id}</div>
                    <div class="scan-time">${formatTime(scan.timestamp)}</div>
                </div>
                <div class="scan-status-badge ${scan.isDuplicate ? 'duplicate' : 'new'}">
                    ${scan.isDuplicate ? 'Duplicate' : 'New'}
                </div>
            </div>
        `)
        .join('');
}

function updateScanCounter() {
    const scanCount = document.getElementById('scanCount');
    if (scanCount) {
        scanCount.textContent = appState.scannedTags.length;
    }
}

function clearAllScans() {
    appState.scannedTags = [];
    updateScanList();
    updateScanCounter();
    hideModal();
    showToast('All scans cleared', 'success');
}

function showClearConfirmation() {
    if (appState.scannedTags.length === 0) {
        showToast('No scans to clear', 'info');
        return;
    }
    
    showModal(
        'Clear All Scans',
        `Are you sure you want to clear all ${appState.scannedTags.length} scanned tags?`,
        clearAllScans
    );
}

// Server Communication
async function sendToServer() {
    if (appState.scannedTags.length === 0) {
        showToast('No scans to send', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await mockVerifyAttendance(appState.scannedTags);
        showResults(response);
        showScreen('resultsScreen');
        
    } catch (error) {
        console.error('Error sending to server:', error);
        showToast('Error sending data to server', 'error');
    } finally {
        showLoading(false);
    }
}

async function mockVerifyAttendance(scannedTags) {
    // Mock server response based on sample students
    const verifiedStudents = [];
    const unrecognizedTags = [];
    
    scannedTags.forEach(scan => {
        const student = appState.sampleStudents.find(s => s.rfid_tag === scan.id);
        if (student) {
            verifiedStudents.push({
                name: student.name,
                section: student.section,
                rfid_tag: student.rfid_tag,
                id_number: student.id_number,
                status: 'Present'
            });
        } else {
            unrecognizedTags.push(scan.id);
        }
    });
    
    return {
        status: 'success',
        total_scans: scannedTags.length,
        verified_students: verifiedStudents,
        unrecognized: unrecognizedTags,
        message: 'Attendance verified successfully'
    };
}

// Student Management
function populateSections() {
    const sectionSelect = document.getElementById('section');
    if (!sectionSelect) return;
    
    sectionSelect.innerHTML = '<option value="">Select a section</option>';
    
    appState.sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section.section_id;
        option.textContent = section.section_name;
        sectionSelect.appendChild(option);
    });
}

async function scanRFIDForStudent() {
    const scanRfidBtn = document.getElementById('scanRfidBtn');
    const rfidTag = document.getElementById('rfidTag');
    
    // Always use demo mode for compatibility
    const mockRFID = generateMockTagId();
    if (rfidTag) rfidTag.value = mockRFID;
    showToast('Demo RFID generated: ' + mockRFID, 'success');
    vibrateDevice();
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    
    const studentName = document.getElementById('studentName');
    const applicationNumber = document.getElementById('applicationNumber');
    const section = document.getElementById('section');
    const rfidTag = document.getElementById('rfidTag');
    
    const formData = {
        name: studentName?.value.trim() || '',
        applicationNumber: applicationNumber?.value.trim() || '',
        section: section?.value || '',
        rfidTag: rfidTag?.value.trim() || ''
    };
    
    if (!formData.name || !formData.applicationNumber || !formData.section || !formData.rfidTag) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Add to sample students for demo
        const newStudent = {
            person_id: appState.sampleStudents.length + 1,
            name: formData.name,
            rfid_tag: formData.rfidTag,
            role: 'student',
            id_number: formData.applicationNumber,
            section: appState.sections.find(s => s.section_id == formData.section)?.section_name
        };
        
        appState.sampleStudents.push(newStudent);
        
        showToast('Student added successfully', 'success');
        
        // Reset form
        if (studentName) studentName.value = '';
        if (applicationNumber) applicationNumber.value = '';
        if (section) section.value = '';
        if (rfidTag) rfidTag.value = '';
        
    } catch (error) {
        console.error('Error adding student:', error);
        showToast('Error adding student', 'error');
    } finally {
        showLoading(false);
    }
}

// Results Display
function showResults(response) {
    const resultsSummary = document.getElementById('resultsSummary');
    const verifiedList = document.getElementById('verifiedList');
    const unrecognizedList = document.getElementById('unrecognizedList');
    
    // Update summary
    if (resultsSummary) {
        resultsSummary.innerHTML = `
            <h3>📊 Attendance Summary</h3>
            <p>${response.message}</p>
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${response.total_scans}</span>
                    <span class="stat-label">Total Scans</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${response.verified_students.length}</span>
                    <span class="stat-label">Verified</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${response.unrecognized.length}</span>
                    <span class="stat-label">Unknown</span>
                </div>
            </div>
        `;
    }
    
    // Update verified students list
    if (verifiedList) {
        if (response.verified_students.length > 0) {
            verifiedList.innerHTML = response.verified_students
                .map(student => `
                    <div class="student-item">
                        <div class="student-info">
                            <div class="student-name">${student.name}</div>
                            <div class="student-details">
                                ${student.section} • ${student.id_number}
                            </div>
                        </div>
                        <div class="status status--success">Present</div>
                    </div>
                `)
                .join('');
        } else {
            verifiedList.innerHTML = '<p class="empty-state">No verified students found.</p>';
        }
    }
    
    // Update unrecognized tags list
    if (unrecognizedList) {
        if (response.unrecognized.length > 0) {
            unrecognizedList.innerHTML = response.unrecognized
                .map(tagId => `
                    <div class="tag-item">
                        <div class="tag-id">${tagId}</div>
                        <div class="status status--error">Unknown</div>
                    </div>
                `)
                .join('');
        } else {
            unrecognizedList.innerHTML = '<p class="empty-state">All tags were recognized.</p>';
        }
    }
}

// Utility Functions
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour12: true,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit'
    });
}

function vibrateDevice() {
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }
}

// Theme Management
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Don't use localStorage in sandbox environment
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
        document.documentElement.setAttribute('data-color-scheme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        document.documentElement.setAttribute('data-color-scheme', 'light');
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = document.documentElement.getAttribute('data-color-scheme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-color-scheme', newTheme);
    if (themeToggle) {
        themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

// Loading Overlay
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('visible');
        } else {
            loadingOverlay.classList.remove('visible');
        }
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Modal Management
function showModal(title, message, confirmCallback) {
    const confirmModal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (confirmModal) confirmModal.classList.add('visible');
    
    // Set up confirm callback
    if (modalConfirm) {
        modalConfirm.onclick = () => {
            if (confirmCallback) confirmCallback();
            hideModal();
        };
    }
}

function hideModal() {
    const confirmModal = document.getElementById('confirmModal');
    const modalConfirm = document.getElementById('modalConfirm');
    
    if (confirmModal) confirmModal.classList.remove('visible');
    if (modalConfirm) modalConfirm.onclick = null;
}

// Error Handling
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
});