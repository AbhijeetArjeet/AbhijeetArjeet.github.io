class NFCAttendanceScanner {
    constructor() {
        this.nfcSupported = false;
        this.nfcEnabled = false;
        this.isScanning = false;
        this.scanResults = new Map();
        this.currentReader = null;
        this.scanTimeout = null;
        this.selectedScheduleId = null;
        this.schedules = [];
        this.isFrozen = false;
        this.bulkSubmitted = false;
        
        this.API_BASE_URL = 'https://gameocoder-backend.onrender.com/faculty'; // Simplified for local server
        
        this.stats = {
            total: 0,
            unique: 0,
            successful: 0,
            failed: 0
        };
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkNFCSupport();
        await this.loadSchedules();
    }

    bindEvents() {
        document.getElementById('scanModeBtn').addEventListener('click', () => this.showScanMode());
        document.getElementById('addStudentModeBtn').addEventListener('click', () => this.showAddStudentMode());
        document.getElementById('retryBtn').addEventListener('click', () => this.checkNFCSupport());

        document.getElementById('backToModeSelect').addEventListener('click', () => this.showModeSelector());
        document.getElementById('backToModeSelect2').addEventListener('click', () => this.showModeSelector());

        document.getElementById('scheduleSelect').addEventListener('change', (e) => this.selectSchedule(e.target.value));
        document.getElementById('refreshSchedules').addEventListener('click', () => this.loadSchedules());

        document.getElementById('startScanBtn').addEventListener('click', () => this.startNFCScanning());
        document.getElementById('clearScansBtn').addEventListener('click', () => this.clearScans());

        document.getElementById('freezeAttendanceBtn').addEventListener('click', () => this.freezeAttendance());
        document.getElementById('submitAttendanceBtn').addEventListener('click', () => this.submitBulkAttendance());

        document.getElementById('scanRfidBtn').addEventListener('click', () => this.scanRFIDForStudent());
        document.getElementById('addStudentBtn').addEventListener('click', () => this.addStudent());

        document.getElementById('closeSuccessModal').addEventListener('click', () => this.hideModal('successModal'));
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async loadSchedules() {
        try {
            this.showLoading('Loading schedules...');
            const schedules = await this.apiCall('/schedules');
            this.schedules = schedules;
            this.populateScheduleDropdown();
            this.hideModal('loadingModal');
        } catch (error) {
            this.hideModal('loadingModal');
            console.error('Failed to load schedules:', error);
            this.showError('Failed to load schedules. Using offline mode.');
            this.schedules = [
                {
                    schedule_id: 1,
                    class_name: 'S33',
                    subject_name: 'Computer Science',
                    day_of_week: 'Monday',
                    start_time: '09:00',
                    end_time: '10:00',
                    date: new Date()
                }
            ];
            this.populateScheduleDropdown();
        }
    }

    populateScheduleDropdown() {
        const scheduleSelect = document.getElementById('scheduleSelect');
        scheduleSelect.innerHTML = '<option value="">Select a schedule</option>';
        
        this.schedules.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.schedule_id;
            option.textContent = `${schedule.subject_name} - ${schedule.class_name} (${new Date(schedule.date).toLocaleDateString()})`;
            scheduleSelect.appendChild(option);
        });
    }

    selectSchedule(scheduleId) {
        this.selectedScheduleId = scheduleId;
        const startScanBtn = document.getElementById('startScanBtn');
        const scheduleInfo = document.getElementById('scheduleInfo');
        
        if (scheduleId) {
            const schedule = this.schedules.find(s => s.schedule_id == scheduleId);
            if (schedule) {
                scheduleInfo.innerHTML = `
                    <div class="selected-schedule">
                        <h4>${schedule.subject_name}</h4>
                        <p><strong>Class:</strong> ${schedule.class_name}</p>
                        <p><strong>Date:</strong> ${new Date(schedule.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${schedule.start_time} - ${schedule.end_time}</p>
                    </div>
                `;
                startScanBtn.disabled = false;
                this.updateScanStatus('Ready to scan. Press "Start NFC Scanning" to begin.');
                this.updateBulkControls();
            }
        } else {
            scheduleInfo.innerHTML = '<p>Please select a schedule to begin scanning</p>';
            startScanBtn.disabled = true;
            this.updateScanStatus('Select a schedule to begin scanning.');
        }
    }

    updateBulkControls() {
        const freezeBtn = document.getElementById('freezeAttendanceBtn');
        const submitBtn = document.getElementById('submitAttendanceBtn');
        
        if (!this.selectedScheduleId) {
            freezeBtn.style.display = 'none';
            submitBtn.style.display = 'none';
            return;
        }

        if (!this.isFrozen) {
            freezeBtn.style.display = this.scanResults.size > 0 ? 'inline-block' : 'none';
            submitBtn.style.display = 'none';
            freezeBtn.textContent = `Freeze Attendance (${this.scanResults.size} scans)`;
        } else if (!this.bulkSubmitted) {
            freezeBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
            submitBtn.textContent = `Submit Attendance (${this.scanResults.size} students)`;
        } else {
            freezeBtn.style.display = 'none';
            submitBtn.style.display = 'none';
        }
    }

    freezeAttendance() {
        if (this.scanResults.size === 0) {
            this.showError('No attendance scans to freeze');
            return;
        }

        this.isFrozen = true;
        this.stopScanning();
        
        this.updateScanStatus('🔒 Attendance FROZEN! No more scans will be accepted. Review the list below and click "Submit Attendance" to finalize.', false);
        this.updateBulkControls();
        
        const startScanBtn = document.getElementById('startScanBtn');
        startScanBtn.disabled = true;
        startScanBtn.textContent = 'Attendance Frozen - No More Scans';
        
        this.showModal('successModal');
        document.getElementById('successMessage').textContent = 
            `Attendance frozen with ${this.scanResults.size} students. Click "Submit Attendance" to send to server.`;
    }

    async submitBulkAttendance() {
        if (this.scanResults.size === 0) {
            this.showError('No attendance data to submit');
            return;
        }

        if (!this.isFrozen) {
            this.showError('Please freeze attendance first');
            return;
        }

        this.showLoading('Submitting attendance to server...');

        try {
            const attendanceData = Array.from(this.scanResults.values()).map(scan => ({
                rfid_tag: scan.rfid,
                timestamp: scan.timestamp.toISOString()
            }));

            const payload = {
                schedule_id: this.selectedScheduleId,
                attendance_data: attendanceData
            };

            const result = await this.apiCall('/bulk-attendance', 'POST', payload);
            
            this.hideModal('loadingModal');

            if (result.success) {
                this.bulkSubmitted = true;
                this.updateBulkControls();
                
                if (result.results) {
                    result.results.forEach(serverResult => {
                        const localScan = this.scanResults.get(serverResult.rfid_tag);
                        if (localScan) {
                            localScan.status = serverResult.success ? 'success' : 'failed';
                            localScan.student = serverResult.student || null;
                            localScan.message = serverResult.message;
                            localScan.isDuplicate = serverResult.isDuplicate;
                        }
                    });
                }

                this.updateScanList();
                this.updateScanStatus(
                    `✅ ATTENDANCE SUBMITTED SUCCESSFULLY!\n${result.summary.successful} present, ${result.summary.duplicates} duplicates, ${result.summary.failed} failed`,
                    true
                );

                this.showModal('successModal');
                document.getElementById('successMessage').textContent = 
                    `Attendance submitted successfully! ${result.summary.successful} students marked present.`;

            } else {
                this.showError(result.message || 'Failed to submit attendance');
            }

        } catch (error) {
            this.hideModal('loadingModal');
            this.showError(`Failed to submit attendance: ${error.message}`);
        }
    }

    async addStudentToDatabase(studentData) {
        try {
            const result = await this.apiCall('/students', 'POST', studentData);
            return result;
        } catch (error) {
            console.error('Failed to add student:', error);
            throw error;
        }
    }

    async checkNFCSupport() {
        this.updateNFCStatus('loading', 'Checking NFC support...');
        
        try {
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                throw new Error('HTTPS_REQUIRED');
            }

            if (!('NDEFReader' in window)) {
                throw new Error('NOT_SUPPORTED');
            }

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
                this.updateNFCStatus('success', 'NFC Ready');
                this.showMainContent();
                
            } catch (error) {
                clearTimeout(checkTimeout);
                
                if (error.name === 'AbortError') {
                    this.nfcSupported = true;
                    this.nfcEnabled = true;
                    this.updateNFCStatus('success', 'NFC Ready (assumed)');
                    this.showMainContent();
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.log('NFC Check Error:', error);
            this.handleNFCError(error.message || error.name);
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
                    <h4>To fix this:</h4>
                    <ul>
                        <li>Deploy to a HTTPS server</li>
                        <li>Use localhost for development</li>
                        <li>Enable HTTPS in your development server</li>
                    </ul>
                `;
                break;
            case 'NOT_SUPPORTED':
                message = 'NFC is not supported on this device or browser.';
                instructions = `
                    <h4>Requirements:</h4>
                    <ul>
                        <li>Android device with NFC</li>
                        <li>Chrome browser (latest version)</li>
                        <li>NFC enabled in device settings</li>
                    </ul>
                `;
                break;
            default:
                message = 'NFC is not available. Please check your device settings.';
                instructions = `
                    <h4>Please ensure:</h4>
                    <ul>
                        <li>NFC is enabled in device settings</li>
                        <li>Using a supported browser (Chrome)</li>
                        <li>Browser permissions are granted</li>
                    </ul>
                `;
        }

        this.updateNFCStatus('error', message);
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorInstructions').innerHTML = instructions;
        document.getElementById('errorPanel').classList.remove('hidden');
    }

    updateNFCStatus(status, message) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = message;
    }

    showMainContent() {document.getElementById('mainContent').classList.remove('hidden');}
    showScanMode() {
        document.getElementById('modeSelector').classList.add('hidden');
        document.getElementById('scanMode').classList.remove('hidden');
        document.getElementById('addStudentMode').classList.add('hidden');
    }
    showAddStudentMode() {
        document.getElementById('modeSelector').classList.add('hidden');
        document.getElementById('scanMode').classList.add('hidden');
        document.getElementById('addStudentMode').classList.remove('hidden');
    }
    showModeSelector() {
        document.getElementById('modeSelector').classList.remove('hidden');
        document.getElementById('scanMode').classList.add('hidden');
        document.getElementById('addStudentMode').classList.add('hidden');
        this.stopScanning();
    }

    async startNFCScanning() {
        if (this.isFrozen) {
            this.showError('Attendance is frozen. No more scans allowed.');
            return;
        }

        if (!this.selectedScheduleId) {
            this.showError('Please select a schedule first');
            return;
        }

        if (this.isScanning) {
            this.stopScanning();
            return;
        }

        if (!this.nfcSupported || !this.nfcEnabled) {
            this.showError('NFC is not available');
            return;
        }

        this.isScanning = true;
        const startScanBtn = document.getElementById('startScanBtn');
        startScanBtn.textContent = 'Stop Scanning';
        startScanBtn.classList.add('scanning');

        try {
            this.currentReader = new NDEFReader();
            this.updateScanStatus('🔍 Ready for NFC tags... Hold student cards close to device', true);

            await this.currentReader.scan();

            this.currentReader.addEventListener('reading', (event) => {
                this.handleNFCReading(event);
            });

            this.currentReader.addEventListener('readingerror', (event) => {
                console.error('NFC reading error:', event);
                this.updateScanStatus('❌ Error reading NFC tag. Please try again.', false);
            });

        } catch (error) {
            console.error('Failed to start NFC scanning:', error);
            this.stopScanning();
            let errorMessage = '❌ Failed to start NFC scanning. ';
            
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please grant NFC permission.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'NFC not supported on this device.';
            } else if (error.name === 'InvalidStateError') {
                errorMessage += 'Please enable NFC in device settings.';
            } else {
                errorMessage += 'Please check NFC is enabled.';
            }
            
            this.updateScanStatus(errorMessage, false);
        }
    }

    async handleNFCReading(event) {
        if (this.isFrozen) {
            this.updateScanStatus('🔒 Attendance is frozen - scan ignored', false);
            return;
        }

        try {
            let rfidTag = '';
            
            if (event.serialNumber) {
                rfidTag = event.serialNumber.toUpperCase();
            } else if (event.message && event.message.records) {
                for (const record of event.message.records) {
                    if (record.recordType === 'mime' || record.recordType === 'text') {
                        const decoder = new TextDecoder();
                        rfidTag = decoder.decode(record.data).toUpperCase();
                        break;
                    }
                }
            }
            alert(rfidTag);
            if (!rfidTag && event.message) {
                rfidTag = this.generateRFIDFromNFCData(event);
            }

            if (!rfidTag) {
                throw new Error('Could not extract RFID from NFC tag');
            }

            this.processLocalScan(rfidTag);
            
        } catch (error) {
            console.error('Error processing NFC reading:', error);
            this.updateScanStatus('❌ Error processing NFC tag data.', false);
        }
    }

    generateRFIDFromNFCData(event) {
        let dataString = '';
        if (event.serialNumber) {
            dataString = event.serialNumber;
            alert('Using 1');
        } else if (event.message && event.message.records) {
            dataString = event.message.records.length.toString();
            alert('Using 2');
        } else {
            dataString = Date.now().toString();
            alert('Using 3');
        }

        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            hash = ((hash << 5) - hash + dataString.charCodeAt(i)) & 0xffffffff;
        }
        
        return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
    }

    processLocalScan(rfidTag) {
        const timestamp = new Date();
        
        const isDuplicate = this.scanResults.has(rfidTag);
        
        const scanData = {
            rfid: rfidTag,
            timestamp: timestamp,
            student: null,
            status: 'pending',
            message: isDuplicate ? 'Duplicate scan (will be ignored)' : 'Scan recorded locally',
            isDuplicate: isDuplicate
        };
        
        this.scanResults.set(rfidTag, scanData);
        
        this.stats.total++;
        if (!isDuplicate) {
            this.stats.unique++;
        }
        this.stats.successful++;

        let message = `✅ Scanned: ${rfidTag}`;
        if (isDuplicate) {
            message += '\n⚠️ Duplicate detected - will be ignored';
        }
        
        this.updateScanStatus(message, true);
        this.updateScanList();
        this.updateScanStats();
        this.updateBulkControls();
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
        const startScanBtn = document.getElementById('startScanBtn');
        
        if (!this.isFrozen) {
            startScanBtn.textContent = 'Start NFC Scanning';
            startScanBtn.classList.remove('scanning');
            startScanBtn.disabled = !this.selectedScheduleId;
        }
    }

    updateScanStatus(message, isSuccess = false) {
        const scanStatus = document.getElementById('scanStatus');
        scanStatus.innerHTML = `<p>${message}</p>`;
        
        if (isSuccess) {
            scanStatus.classList.add('active');
        } else {
            scanStatus.classList.remove('active', 'scanning');
        }
    }

    updateScanStats() {
        document.getElementById('totalScans').textContent = this.stats.total;
        document.getElementById('uniqueScans').textContent = this.stats.unique;
        document.getElementById('successfulScans').textContent = this.stats.successful;
        document.getElementById('failedScans').textContent = this.stats.failed;
    }

    updateScanList() {
        const scanList = document.getElementById('scanList');
        
        if (this.scanResults.size === 0) {
            scanList.innerHTML = '<p class="no-scans">No scans yet. Hold an NFC tag to your device to scan.</p>';
            return;
        }

        const scansArray = Array.from(this.scanResults.values()).reverse();
        scanList.innerHTML = scansArray.map(scan => {
            let statusIcon = '📱';
            let statusClass = 'local';
            
            if (scan.status === 'success') {
                statusIcon = '✅';
                statusClass = 'success';
            } else if (scan.status === 'failed') {
                statusIcon = '❌';
                statusClass = 'failed';
            }
            
            const studentInfo = scan.student ? `${scan.student.name} (${scan.student.section})` : 'Student pending verification';
            const timeString = scan.timestamp.toLocaleTimeString();
            const duplicateText = scan.isDuplicate ? ' - DUPLICATE' : '';
            const statusText = this.bulkSubmitted ? '' : ' - Local scan';
            
            return `
                <div class="scan-item ${statusClass}">
                    <div class="scan-icon">${statusIcon}</div>
                    <div class="scan-details">
                        <div class="scan-student">${studentInfo}</div>
                        <div class="scan-rfid">RFID: ${scan.rfid}</div>
                        <div class="scan-time">${timeString}${duplicateText}${statusText}</div>
                        ${scan.message ? `<div class="scan-message">${scan.message}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    clearScans() {
        if (this.isFrozen && !confirm('Attendance is frozen. Are you sure you want to clear all scans? This cannot be undone.')) {
            return;
        }

        if (confirm('Are you sure you want to clear all scan results?')) {
            this.scanResults.clear();
            this.stats = { total: 0, unique: 0, successful: 0, failed: 0 };
            this.isFrozen = false;
            this.bulkSubmitted = false;
            
            this.updateScanList();
            this.updateScanStats();
            this.updateScanStatus('Scan results cleared. Ready to scan.');
            this.updateBulkControls();
            
            const startScanBtn = document.getElementById('startScanBtn');
            startScanBtn.disabled = !this.selectedScheduleId;
            startScanBtn.textContent = 'Start NFC Scanning';
        }
    }

    async scanRFIDForStudent() {
        const scanRfidBtn = document.getElementById('scanRfidBtn');
        const rfidStatus = document.getElementById('rfidStatus');
        const manualRfid = document.getElementById('manualRfid');

        if (!this.nfcSupported || !this.nfcEnabled) {
            rfidStatus.innerHTML = '<p>❌ NFC not available. Please enter RFID manually.</p>';
            return;
        }

        try {
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

    async addStudent() {
        const name = document.getElementById('studentName').value.trim();
        const idNumber = document.getElementById('studentId').value.trim();
        const section = document.getElementById('studentSection').value;
        const rfid = document.getElementById('manualRfid').value.trim().toUpperCase();

        if (!name || !idNumber || !section || !rfid) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            this.showLoading('Adding student...');
            
            const studentData = {
                name: name,
                student_id: idNumber,
                section: section,
                rfid_tag: rfid
            };

            const result = await this.addStudentToDatabase(studentData);
            
            this.hideModal('loadingModal');
            
            if (result.success) {
                document.getElementById('successMessage').textContent = 
                    `Student ${name} added successfully with RFID ${rfid}`;
                this.showModal('successModal');
                this.resetAddStudentForm();
            } else {
                this.showError(result.message || 'Failed to add student');
            }
            
        } catch (error) {
            this.hideModal('loadingModal');
            this.showError(`Failed to add student: ${error.message}`);
        }
    }

    resetAddStudentForm() {
        document.getElementById('studentName').value = '';
        document.getElementById('studentId').value = '';
        document.getElementById('studentSection').value = '';
        document.getElementById('manualRfid').value = '';
        document.getElementById('rfidStatus').classList.remove('scanning', 'success');
        document.getElementById('rfidStatus').innerHTML = '<p>Click "Scan NFC Tag" and hold an NFC tag to your device</p>';
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    showLoading(message) {
        document.getElementById('loadingMessage').textContent = message;
        this.showModal('loadingModal');
    }

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NFCAttendanceScanner();
});