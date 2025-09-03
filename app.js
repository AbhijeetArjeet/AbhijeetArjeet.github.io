// NFC Attendance Scanner - Batch API for Render Deployment
class NFCBatchAttendanceScanner {
    constructor() {
        this.nfcSupported = false;
        this.nfcEnabled = false;
        this.isScanning = false;
        this.scanResults = new Map(); // Batch collection - no server calls
        this.currentReader = null;
        this.scanTimeout = null;
        this.sessionStartTime = null;
        this.sessionTimer = null;
        
        // API Configuration
        this.apiConfig = {
            baseUrl: 'https://your-app-name.onrender.com',
            endpoints: {
                verifyAttendance: '/api/verify-attendance',
                addStudent: '/api/add-student',
                getSections: '/api/sections'
            },
            timeout: 30000 // 30 seconds for Render cold starts
        };
        
        // Mock data for demonstration
        this.mockStudents = new Map([
            ['04A1B2C3', { name: 'Rahul Sharma', section: 'CS-A', id_number: 'CS2023001' }],
            ['04D4E5F6', { name: 'Priya Patel', section: 'CS-A', id_number: 'CS2023002' }],
            ['04G7H8I9', { name: 'Amit Singh', section: 'EE-B', id_number: 'EE2023003' }],
            ['04J1K2L3', { name: 'Sneha Gupta', section: 'ME-A', id_number: 'ME2023004' }]
        ]);
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.loadAPIConfig();
        await this.checkNFCSupport();
    }

    loadAPIConfig() {
        const serverUrl = document.getElementById('serverUrl');
        const savedUrl = serverUrl.value || this.apiConfig.baseUrl;
        this.apiConfig.baseUrl = savedUrl;
        
        serverUrl.addEventListener('change', (e) => {
            this.apiConfig.baseUrl = e.target.value || this.apiConfig.baseUrl;
            this.updateAPIStatus('Configuration updated');
        });
    }

    updateAPIStatus(message, type = 'info') {
        const apiStatus = document.getElementById('apiStatus');
        const statusClass = `status--${type}`;
        apiStatus.innerHTML = `<span class="status ${statusClass}">${message}</span>`;
    }

    bindEvents() {
        // Mode selection
        document.getElementById('scanModeBtn').addEventListener('click', () => this.showScanMode());
        document.getElementById('addStudentModeBtn').addEventListener('click', () => this.showAddStudentMode());
        
        // Navigation
        document.getElementById('backToModeSelect').addEventListener('click', () => this.showModeSelector());
        document.getElementById('backToModeSelect2').addEventListener('click', () => this.showModeSelector());
        
        // Batch scan controls
        document.getElementById('startScanBtn').addEventListener('click', () => this.startNFCScanning());
        document.getElementById('clearScansBtn').addEventListener('click', () => this.clearScans());
        document.getElementById('finalizeBatchBtn').addEventListener('click', () => this.finalizeBatch());
        document.getElementById('startNewSessionBtn').addEventListener('click', () => this.startNewSession());
        document.getElementById('startNewSessionFromModal').addEventListener('click', () => {
            this.hideModal('serverResponseModal');
            this.startNewSession();
        });
        
        // Add student controls
        document.getElementById('scanRfidBtn').addEventListener('click', () => this.scanRFIDForStudent());
        document.getElementById('addStudentBtn').addEventListener('click', () => this.addStudentToServer());
        
        // Modal controls
        document.getElementById('closeSuccessModal').addEventListener('click', () => this.hideModal('successModal'));
        document.getElementById('closeErrorModal').addEventListener('click', () => this.hideModal('errorModal'));
        document.getElementById('closeResponseModal').addEventListener('click', () => this.hideModal('serverResponseModal'));
    }

    async checkNFCSupport() {
        this.updateNFCStatus('loading', 'Checking NFC support...');
        
        try {
            // Check HTTPS requirement
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('HTTPS_REQUIRED');
            }

            // Check Web NFC API support
            if (!('NDEFReader' in window)) {
                throw new Error('NOT_SUPPORTED');
            }

            // Test NFC availability
            const reader = new NDEFReader();
            const controller = new AbortController();
            
            const checkTimeout = setTimeout(() => {
                controller.abort();
            }, 3000);

            try {
                await reader.scan({ signal: controller.signal });
                clearTimeout(checkTimeout);
                controller.abort();
                
                this.nfcSupported = true;
                this.nfcEnabled = true;
                this.updateNFCStatus('success', 'NFC Ready for Batch Collection');
                this.showMainContent();
                
            } catch (error) {
                clearTimeout(checkTimeout);
                
                if (error.name === 'AbortError') {
                    // Assume NFC is available
                    this.nfcSupported = true;
                    this.nfcEnabled = true;
                    this.updateNFCStatus('success', 'NFC Ready for Batch Collection');
                    this.showMainContent();
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.log('NFC Check Error:', error);
            // Show error but still allow interface access for demo/testing
            this.handleNFCError(error.message || error.name);
            // Always show main content for demo purposes
            setTimeout(() => {
                this.showMainContent();
                this.updateAPIStatus('NFC not available - demo mode enabled', 'warning');
            }, 2000);
        }
    }

    handleNFCError(errorType) {
        this.nfcSupported = false;
        this.nfcEnabled = false;
        
        let message = '';
        let instructions = '';
        
        switch (errorType) {
            case 'HTTPS_REQUIRED':
                message = 'This application requires HTTPS to access NFC functionality.';
                instructions = `
                    <h4>How to fix:</h4>
                    <ol>
                        <li>Deploy to Render with HTTPS enabled</li>
                        <li>Or use localhost for development</li>
                    </ol>
                    <p><strong>Demo mode enabled:</strong> You can still test the batch workflow interface.</p>
                `;
                break;
                
            case 'NOT_SUPPORTED':
            case 'NotSupportedError':
                message = 'Your browser or device does not support Web NFC API.';
                instructions = `
                    <h4>Requirements for Batch NFC:</h4>
                    <ol>
                        <li>Use Chrome browser on Android (version 89+)</li>
                        <li>Device must have NFC hardware</li>
                        <li>Access via HTTPS (required for Render deployment)</li>
                        <li>Grant NFC permissions when prompted</li>
                    </ol>
                    <p><strong>Demo mode:</strong> Interface will be available to test batch workflow.</p>
                `;
                break;
                
            case 'NotAllowedError':
                message = 'NFC permission was denied or device does not have NFC hardware.';
                instructions = `
                    <h4>How to fix:</h4>
                    <ol>
                        <li>Enable NFC in device settings</li>
                        <li>Grant NFC permission when prompted</li>
                        <li>Refresh the page and try again</li>
                    </ol>
                `;
                break;
                
            default:
                message = 'NFC functionality is not available on your current setup.';
                instructions = `
                    <h4>For Render Deployment:</h4>
                    <ol>
                        <li>Ensure HTTPS is enabled</li>
                        <li>Use Chrome on Android devices</li>
                        <li>Enable NFC in device settings</li>
                        <li>Grant app permissions</li>
                    </ol>
                    <p><strong>Demo Mode:</strong> The interface will still work for testing the batch workflow.</p>
                `;
        }
        
        this.updateNFCStatus('error', 'NFC Unavailable - Demo Mode');
        this.showError(message, instructions);
    }

    updateNFCStatus(type, text) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        statusDot.className = `status-dot ${type}`;
        statusText.textContent = text;
    }

    showError(message, instructions) {
        const errorPanel = document.getElementById('errorPanel');
        const errorMessage = document.getElementById('errorMessage');
        const errorInstructions = document.getElementById('errorInstructions');
        
        errorMessage.textContent = message;
        errorInstructions.innerHTML = instructions;
        
        errorPanel.classList.remove('hidden');
        // Don't hide main content - keep it accessible
        // document.getElementById('mainContent').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('errorPanel').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
    }

    showModeSelector() {
        document.getElementById('modeSelector').classList.remove('hidden');
        document.getElementById('scanMode').classList.add('hidden');
        document.getElementById('addStudentMode').classList.add('hidden');
        this.stopScanning();
        this.stopSessionTimer();
    }

    showScanMode() {
        document.getElementById('modeSelector').classList.add('hidden');
        document.getElementById('scanMode').classList.remove('hidden');
        this.updateScanStats();
        this.updateBatchActions();
    }

    showAddStudentMode() {
        document.getElementById('modeSelector').classList.add('hidden');
        document.getElementById('addStudentMode').classList.remove('hidden');
        this.resetAddStudentForm();
    }

    async startNFCScanning() {
        if (!this.nfcSupported) {
            // Demo mode - simulate NFC scanning
            this.simulateNFCScan();
            return;
        }

        // Start session timing if this is the first scan
        if (this.scanResults.size === 0) {
            this.sessionStartTime = Date.now();
            this.startSessionTimer();
        }

        try {
            this.isScanning = true;
            this.currentReader = new NDEFReader();
            
            const startScanBtn = document.getElementById('startScanBtn');
            const scanStatus = document.getElementById('scanStatus');
            
            // Update UI for batch scanning
            startScanBtn.textContent = 'Scanning... (Batch Mode)';
            startScanBtn.classList.add('scanning');
            startScanBtn.disabled = true;
            
            scanStatus.classList.add('active', 'scanning');
            scanStatus.innerHTML = '<p>🔍 Batch Mode: Hold NFC tag to device (collected offline)</p>';

            this.scanTimeout = setTimeout(() => {
                this.stopScanning();
                this.showScanStatus('⏰ No NFC tag detected. Ready for next scan.', false);
            }, 30000);

            await this.currentReader.scan();
            
            this.currentReader.addEventListener('reading', (event) => {
                this.handleNFCReading(event);
            });

            this.currentReader.addEventListener('readingerror', (event) => {
                console.error('NFC reading error:', event);
                this.stopScanning();
                this.showScanStatus('❌ Error reading NFC tag. Try again.', false);
            });

        } catch (error) {
            console.error('Failed to start NFC scanning:', error);
            this.stopScanning();
            this.showScanStatus('❌ Failed to start batch scanning. Check NFC is enabled.', false);
        }
    }

    simulateNFCScan() {
        // Demo mode simulation for when NFC is not available
        if (this.scanResults.size === 0) {
            this.sessionStartTime = Date.now();
            this.startSessionTimer();
        }

        const startScanBtn = document.getElementById('startScanBtn');
        const scanStatus = document.getElementById('scanStatus');
        
        startScanBtn.textContent = 'Demo Scanning... (Batch Mode)';
        startScanBtn.classList.add('scanning');
        startScanBtn.disabled = true;
        
        scanStatus.classList.add('active', 'scanning');
        scanStatus.innerHTML = '<p>📱 Demo Mode: Simulating NFC scan (offline batch collection)</p>';

        // Simulate scanning delay and add demo data
        setTimeout(() => {
            const demoRfids = ['04A1B2C3', '04D4E5F6', '04G7H8I9', '04J1K2L3', '04X9Y8Z7'];
            const randomRfid = demoRfids[Math.floor(Math.random() * demoRfids.length)];
            
            this.processBatchScan(randomRfid);
        }, 2000);
    }

    handleNFCReading(event) {
        try {
            let rfidTag = '';
            
            if (event.serialNumber) {
                rfidTag = event.serialNumber.toUpperCase();
            } else {
                rfidTag = this.generateRFIDFromNFCData(event);
            }
            
            if (!rfidTag) {
                throw new Error('Could not extract RFID from NFC tag');
            }

            this.processBatchScan(rfidTag);
            
        } catch (error) {
            console.error('Error processing NFC reading:', error);
            this.stopScanning();
            this.showScanStatus('❌ Error processing NFC tag data.', false);
        }
    }

    generateRFIDFromNFCData(event) {
        let dataString = '';
        
        if (event.serialNumber) {
            dataString = event.serialNumber;
        } else if (event.message && event.message.records) {
            dataString = event.message.records.length.toString() + Date.now().toString();
        } else {
            dataString = Date.now().toString();
        }
        
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            hash = ((hash << 5) - hash + dataString.charCodeAt(i)) & 0xffffffff;
        }
        
        return '04' + Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
    }

    processBatchScan(rfidTag) {
        const timestamp = new Date();
        const isDuplicate = this.scanResults.has(rfidTag);
        
        // Add to batch collection (offline)
        this.scanResults.set(rfidTag, {
            rfid: rfidTag,
            timestamp: timestamp,
            student: this.mockStudents.get(rfidTag) || null,
            isDuplicate: isDuplicate
        });

        // Update UI
        this.updateScanList();
        this.updateScanStats();
        this.updateBatchActions();
        
        // Show batch feedback
        const studentInfo = this.mockStudents.get(rfidTag);
        let message = `✅ Added to Batch: ${rfidTag}`;
        if (studentInfo) {
            message += `\n👤 ${studentInfo.name} (${studentInfo.section})`;
        }
        if (isDuplicate) {
            message += '\n⚠️ Duplicate - already in batch';
        } else {
            message += '\n📦 Collecting offline for batch send';
        }
        
        this.showScanStatus(message, true);
        
        // Continue scanning in batch mode
        setTimeout(() => {
            this.stopScanning();
        }, 3000);
    }

    stopScanning() {
        if (this.currentReader) {
            this.currentReader = null;
        }
        
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
            this.scanTimeout = null;
        }
        
        this.isScanning = false;
        
        // Reset UI
        const startScanBtn = document.getElementById('startScanBtn');
        const scanStatus = document.getElementById('scanStatus');
        
        const btnText = this.nfcSupported ? 'Start NFC Scanning' : 'Start Demo Scanning';
        startScanBtn.textContent = btnText;
        startScanBtn.classList.remove('scanning');
        startScanBtn.disabled = false;
        
        if (this.scanResults.size > 0) {
            scanStatus.classList.remove('active', 'scanning');
            scanStatus.innerHTML = `<p>📦 Batch collected: ${this.scanResults.size} scans. Continue scanning or finalize to send to server.</p>`;
        } else {
            scanStatus.classList.remove('active', 'scanning');
            const mode = this.nfcSupported ? 'NFC' : 'demo';
            scanStatus.innerHTML = `<p>Ready for batch collection. All scans stored offline until finalized. (${mode} mode)</p>`;
        }
    }

    showScanStatus(message, isSuccess) {
        const scanStatus = document.getElementById('scanStatus');
        scanStatus.innerHTML = `<p>${message}</p>`;
        
        if (isSuccess) {
            scanStatus.classList.add('active');
        }
    }

    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('sessionTime').textContent = timeString;
        }, 1000);
    }

    stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        document.getElementById('sessionTime').textContent = '00:00';
    }

    updateScanStats() {
        const totalScans = this.scanResults.size;
        const uniqueScans = Array.from(this.scanResults.values()).filter(scan => !scan.isDuplicate).length;
        
        document.getElementById('totalScans').textContent = totalScans;
        document.getElementById('uniqueScans').textContent = uniqueScans;
    }

    updateBatchActions() {
        const batchActions = document.getElementById('batchActions');
        const batchCount = document.getElementById('batchCount');
        
        if (this.scanResults.size > 0) {
            batchActions.classList.remove('hidden');
            batchCount.textContent = Array.from(this.scanResults.values()).filter(scan => !scan.isDuplicate).length;
        } else {
            batchActions.classList.add('hidden');
        }
    }

    updateScanList() {
        const scanList = document.getElementById('scanList');
        
        if (this.scanResults.size === 0) {
            const mode = this.nfcSupported ? 'NFC' : 'demo';
            scanList.innerHTML = `<p class="empty-state">No scans yet. Start ${mode} scanning to collect attendance data offline.</p>`;
            return;
        }
        
        const scansArray = Array.from(this.scanResults.values()).reverse();
        
        scanList.innerHTML = scansArray.map(scan => {
            const studentInfo = scan.student;
            const timeString = scan.timestamp.toLocaleTimeString();
            
            return `
                <div class="scan-item ${scan.isDuplicate ? 'duplicate' : ''}" aria-label="Batch scan result">
                    <div class="scan-item__info">
                        <div class="scan-item__rfid">${scan.rfid}</div>
                        ${studentInfo ? 
                            `<div class="scan-item__student">${studentInfo.name} - ${studentInfo.section} (${studentInfo.id_number})</div>` :
                            `<div class="scan-item__student">Unknown student - will check server</div>`
                        }
                    </div>
                    <div class="scan-item__status">
                        <div class="scan-item__time">${timeString}</div>
                        ${scan.isDuplicate ? 
                            '<span class="status status--warning">Duplicate</span>' : 
                            '<span class="status status--info">Queued</span>'
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    clearScans() {
        this.scanResults.clear();
        this.updateScanList();
        this.updateScanStats();
        this.updateBatchActions();
        this.stopSessionTimer();
        this.sessionStartTime = null;
        this.showScanStatus('Session cleared. Ready for new batch collection.', false);
    }

    startNewSession() {
        this.clearScans();
        this.showScanMode();
    }

    async finalizeBatch() {
        if (this.scanResults.size === 0) {
            this.showErrorModal('No scans to send', 'Please scan some NFC tags before finalizing the batch.');
            return;
        }

        const uniqueScans = Array.from(this.scanResults.values()).filter(scan => !scan.isDuplicate);
        const rfidTags = uniqueScans.map(scan => scan.rfid);
        
        this.showModal('loadingModal');
        document.getElementById('loadingMessage').textContent = `Sending ${rfidTags.length} RFID tags to server...`;

        try {
            // Mock API call to demonstrate batch functionality
            const response = await this.mockBatchAPICall(rfidTags);
            this.hideModal('loadingModal');
            this.displayServerResponse(response);
            
        } catch (error) {
            this.hideModal('loadingModal');
            this.showErrorModal('Batch Send Failed', `Failed to send batch to server: ${error.message}`);
        }
    }

    async mockBatchAPICall(rfidTags) {
        // Simulate API call delay and potential cold start
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        // Mock response based on provided data
        const verifiedStudents = [];
        const unrecognized = [];
        
        rfidTags.forEach(rfid => {
            const student = this.mockStudents.get(rfid);
            if (student) {
                verifiedStudents.push({
                    name: student.name,
                    section: student.section,
                    rfid_tag: rfid,
                    id_number: student.id_number,
                    status: 'Present'
                });
            } else {
                unrecognized.push(rfid);
            }
        });

        return {
            success: true,
            total_scans: rfidTags.length,
            verified_students: verifiedStudents,
            unrecognized: unrecognized,
            message: `${verifiedStudents.length} students verified, ${unrecognized.length} unrecognized tags`,
            server_info: {
                processed_at: new Date().toISOString(),
                server_url: this.apiConfig.baseUrl,
                processing_time: `${(Math.random() * 2 + 1).toFixed(1)}s`
            }
        };
    }

    displayServerResponse(response) {
        const modal = document.getElementById('serverResponseModal');
        const summary = document.getElementById('responseSummary');
        const details = document.getElementById('responseDetails');
        
        // Summary
        summary.innerHTML = `
            <h4>Batch Processing Complete</h4>
            <p><strong>${response.message}</strong></p>
            <p>Server: ${response.server_info.server_url}</p>
            <p>Processing Time: ${response.server_info.processing_time}</p>
        `;
        
        // Detailed results
        let detailsHTML = '';
        
        if (response.verified_students.length > 0) {
            detailsHTML += `
                <div class="response-section">
                    <h4>✅ Verified Students (${response.verified_students.length})</h4>
                    <div class="student-list">
                        ${response.verified_students.map(student => `
                            <div class="student-item">
                                <div class="student-name">${student.name}</div>
                                <div class="student-details">
                                    ${student.section} • ${student.id_number} • ${student.rfid_tag}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (response.unrecognized.length > 0) {
            detailsHTML += `
                <div class="response-section">
                    <h4>❌ Unrecognized Tags (${response.unrecognized.length})</h4>
                    <div class="unrecognized-list">
                        ${response.unrecognized.map(tag => `
                            <span class="unrecognized-tag">${tag}</span>
                        `).join('')}
                    </div>
                    <p style="margin-top: 12px; color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        These RFID tags are not registered in the system.
                    </p>
                </div>
            `;
        }
        
        details.innerHTML = detailsHTML;
        this.showModal('serverResponseModal');
    }

    async scanRFIDForStudent() {
        if (!this.nfcSupported) {
            // Demo mode for student RFID scanning
            this.simulateStudentRFIDScan();
            return;
        }

        try {
            const scanRfidBtn = document.getElementById('scanRfidBtn');
            const rfidStatus = document.getElementById('rfidStatus');
            const manualRfid = document.getElementById('manualRfid');
            
            scanRfidBtn.textContent = 'Scanning...';
            scanRfidBtn.disabled = true;
            rfidStatus.classList.add('scanning');
            rfidStatus.innerHTML = '<p>🔍 Hold NFC tag close to your device...</p>';
            
            const reader = new NDEFReader();
            await reader.scan();
            
            const timeout = setTimeout(() => {
                rfidStatus.classList.remove('scanning');
                rfidStatus.innerHTML = '<p>❌ No tag detected. Try again or enter RFID manually.</p>';
                scanRfidBtn.textContent = 'Scan NFC Tag';
                scanRfidBtn.disabled = false;
            }, 15000);
            
            reader.addEventListener('reading', (event) => {
                clearTimeout(timeout);
                
                let rfidTag = '';
                if (event.serialNumber) {
                    rfidTag = event.serialNumber.toUpperCase();
                } else {
                    rfidTag = this.generateRFIDFromNFCData(event);
                }
                
                manualRfid.value = rfidTag;
                rfidStatus.classList.remove('scanning');
                rfidStatus.classList.add('success');
                rfidStatus.innerHTML = `<p>✅ RFID captured: ${rfidTag}</p>`;
                scanRfidBtn.textContent = 'Scan NFC Tag';
                scanRfidBtn.disabled = false;
            });
            
        } catch (error) {
            console.error('RFID scan error:', error);
            document.getElementById('rfidStatus').innerHTML = '<p>❌ Failed to scan. Please try again or enter RFID manually.</p>';
            document.getElementById('scanRfidBtn').textContent = 'Scan NFC Tag';
            document.getElementById('scanRfidBtn').disabled = false;
        }
    }

    simulateStudentRFIDScan() {
        const scanRfidBtn = document.getElementById('scanRfidBtn');
        const rfidStatus = document.getElementById('rfidStatus');
        const manualRfid = document.getElementById('manualRfid');
        
        scanRfidBtn.textContent = 'Demo Scanning...';
        scanRfidBtn.disabled = true;
        rfidStatus.classList.add('scanning');
        rfidStatus.innerHTML = '<p>📱 Demo mode: Simulating NFC scan...</p>';
        
        setTimeout(() => {
            const demoRfid = '04' + Math.random().toString(16).substr(2, 6).toUpperCase();
            manualRfid.value = demoRfid;
            rfidStatus.classList.remove('scanning');
            rfidStatus.classList.add('success');
            rfidStatus.innerHTML = `<p>✅ Demo RFID captured: ${demoRfid}</p>`;
            scanRfidBtn.textContent = 'Scan NFC Tag (Demo)';
            scanRfidBtn.disabled = false;
        }, 2000);
    }

    async addStudentToServer() {
        const name = document.getElementById('studentName').value.trim();
        const idNumber = document.getElementById('studentId').value.trim();
        const section = document.getElementById('studentSection').value;
        const rfid = document.getElementById('manualRfid').value.trim().toUpperCase();
        
        if (!name || !idNumber || !section || !rfid) {
            this.showErrorModal('Missing Information', 'Please fill in all fields before adding student.');
            return;
        }
        
        this.showModal('loadingModal');
        document.getElementById('loadingMessage').textContent = 'Adding student to server...';
        
        try {
            // Mock API call for student addition
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Add to local mock data
            this.mockStudents.set(rfid, {
                name: name,
                section: section,
                id_number: idNumber
            });
            
            this.hideModal('loadingModal');
            document.getElementById('successMessage').textContent = 
                `Student ${name} added successfully to server with RFID ${rfid}`;
            this.showModal('successModal');
            this.resetAddStudentForm();
            
        } catch (error) {
            this.hideModal('loadingModal');
            this.showErrorModal('Add Student Failed', `Failed to add student to server: ${error.message}`);
        }
    }

    resetAddStudentForm() {
        document.getElementById('studentName').value = '';
        document.getElementById('studentId').value = '';
        document.getElementById('studentSection').value = '';
        document.getElementById('manualRfid').value = '';
        document.getElementById('rfidStatus').classList.remove('scanning', 'success');
        const mode = this.nfcSupported ? '' : ' (Demo)';
        document.getElementById('rfidStatus').innerHTML = `<p>Click "Scan NFC Tag${mode}" and hold an NFC tag to your device</p>`;
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showErrorModal(title, message, details = '') {
        document.getElementById('errorModalMessage').textContent = message;
        const errorDetails = document.getElementById('errorDetails');
        
        if (details) {
            errorDetails.innerHTML = `<h4>${title}</h4><p>${details}</p>`;
            errorDetails.style.display = 'block';
        } else {
            errorDetails.style.display = 'none';
        }
        
        this.showModal('errorModal');
    }
}

// Initialize the batch attendance scanner
document.addEventListener('DOMContentLoaded', () => {
    new NFCBatchAttendanceScanner();
});