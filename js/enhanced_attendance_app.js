// Enhanced Attendance Application
class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.faceSystem = null;
        this.currentSession = null;
        this.enrolledStudents = [];
        this.attendanceRecords = new Map();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        if (this.authToken) {
            await this.verifyToken();
        }

        // Initialize face recognition system
        this.faceSystem = new MediaPipeFaceSystem();
        await this.faceSystem.initialize();
        
        this.faceSystem.onFaceDetection = (detections) => {
            this.handleFaceDetections(detections);
        };
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Video source buttons
        document.getElementById('webcamBtn').addEventListener('click', () => {
            this.startWebcam();
        });

        document.getElementById('screenCaptureBtn').addEventListener('click', () => {
            this.startScreenCapture();
        });

        // Session management
        document.getElementById('startSessionBtn').addEventListener('click', () => {
            this.startSession();
        });

        document.getElementById('endSessionBtn').addEventListener('click', () => {
            this.endSession();
        });

        // Student enrollment
        document.getElementById('enrollStudentBtn').addEventListener('click', () => {
            this.showEnrollmentModal();
        });

        document.getElementById('capturePhotoBtn').addEventListener('click', () => {
            this.captureStudentPhoto();
        });

        // Export buttons
        document.getElementById('exportPDFBtn').addEventListener('click', () => {
            this.exportToPDF();
        });

        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            this.exportToExcel();
        });
    }

    updateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = 
            now.toLocaleTimeString('en-US', { hour12: false });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                
                this.showDashboard();
                this.showStatus('Login successful!', 'success');
                await this.loadEnrolledStudents();
            } else {
                this.showStatus(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus('Connection error. Please try again.', 'error');
        }
    }

    async verifyToken() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STUDENTS}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                this.showDashboard();
                await this.loadEnrolledStudents();
            } else {
                localStorage.removeItem('authToken');
                this.authToken = null;
            }
        } catch (error) {
            localStorage.removeItem('authToken');
            this.authToken = null;
        }
    }

    handleLogout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        
        this.showStatus('Logged out successfully', 'info');
    }

    showDashboard() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.classList.add('hidden');
        });
        
        const activeTab = document.getElementById(`${tabName}Tab`);
        activeTab.classList.remove('hidden');
        activeTab.classList.add('active');

        // Load tab-specific data
        if (tabName === 'analytics') {
            this.loadAnalytics();
        } else if (tabName === 'students') {
            this.loadEnrolledStudents();
        }
    }

    async startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 } 
            });
            this.setupVideoStream(stream);
            this.updateVideoSourceButtons('webcam');
        } catch (error) {
            this.showStatus('Camera access denied or not available', 'error');
        }
    }

    async startScreenCapture() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true 
            });
            this.setupVideoStream(stream);
            this.updateVideoSourceButtons('screen');
        } catch (error) {
            this.showStatus('Screen capture denied or not available', 'error');
        }
    }

    setupVideoStream(stream) {
        const video = document.getElementById('videoFeed');
        const videoSection = document.getElementById('videoSection');
        
        video.srcObject = stream;
        videoSection.classList.remove('hidden');
        
        this.faceSystem.setVideoElement(video);
        
        // Enable session controls
        document.getElementById('startSessionBtn').disabled = false;
        
        this.showStatus('Video source connected successfully', 'success');
    }

    updateVideoSourceButtons(activeSource) {
        document.querySelectorAll('.video-source-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (activeSource === 'webcam') {
            document.getElementById('webcamBtn').classList.add('active');
        } else if (activeSource === 'screen') {
            document.getElementById('screenCaptureBtn').classList.add('active');
        }
    }

    async startSession() {
        const subject = document.getElementById('subjectInput').value;
        const section = document.getElementById('sectionSelect').value;
        const sessionType = document.getElementById('sessionTypeSelect').value;

        if (!subject) {
            this.showStatus('Please enter a subject name', 'error');
            return;
        }

        this.currentSession = {
            subject,
            section,
            sessionType,
            startTime: new Date(),
            duration: sessionType === 'offline' ? 50 : 90, // minutes
            active: true
        };

        // Reset attendance records
        this.attendanceRecords.clear();
        this.enrolledStudents.forEach(student => {
            this.attendanceRecords.set(student.student_id, {
                studentId: student.student_id,
                name: student.full_name,
                status: 'absent',
                detectionCount: 0,
                confidenceScore: 0,
                firstDetectionTime: null,
                lastDetectionTime: null
            });
        });

        // Update UI
        document.getElementById('startSessionBtn').disabled = true;
        document.getElementById('endSessionBtn').disabled = false;
        document.getElementById('sessionStatus').classList.remove('hidden');
        document.getElementById('currentSessionStatus').textContent = 'ACTIVE';

        // Start face detection
        this.faceSystem.startDetection();
        document.getElementById('detectionIndicator').classList.add('detection-active');
        document.getElementById('detectionIndicator').classList.remove('detection-inactive');

        // Start session timer
        this.sessionTimer = setInterval(() => {
            this.updateSessionProgress();
        }, 1000);

        this.showStatus(`Session started: ${subject} (${section})`, 'success');
        this.updateAttendanceDisplay();
    }

    async endSession() {
        if (!this.currentSession) return;

        this.currentSession.endTime = new Date();
        this.currentSession.active = false;

        // Stop detection
        this.faceSystem.stopDetection();
        document.getElementById('detectionIndicator').classList.remove('detection-active');
        document.getElementById('detectionIndicator').classList.add('detection-inactive');

        // Stop timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }

        // Save attendance data
        await this.saveAttendanceData();

        // Update UI
        document.getElementById('startSessionBtn').disabled = false;
        document.getElementById('endSessionBtn').disabled = true;
        document.getElementById('currentSessionStatus').textContent = 'COMPLETED';

        this.showStatus('Session ended and data saved', 'success');
    }

    updateSessionProgress() {
        if (!this.currentSession || !this.currentSession.active) return;

        const elapsed = Math.floor((Date.now() - this.currentSession.startTime) / 60000);
        const remaining = Math.max(0, this.currentSession.duration - elapsed);
        const progress = Math.min(100, (elapsed / this.currentSession.duration) * 100);

        document.getElementById('timeElapsed').textContent = elapsed;
        document.getElementById('timeRemaining').textContent = remaining;
        document.getElementById('sessionProgress').style.width = `${progress}%`;

        if (remaining === 0) {
            this.endSession();
        }
    }

    handleFaceDetections(detections) {
        if (!this.currentSession?.active || detections.length === 0) return;

        detections.forEach(detection => {
            const matchedStudent = this.findMatchingStudent(detection.embedding);
            
            if (matchedStudent) {
                const record = this.attendanceRecords.get(matchedStudent.student_id);
                if (record) {
                    record.detectionCount++;
                    record.confidenceScore = Math.max(record.confidenceScore, detection.confidence);
                    record.lastDetectionTime = new Date();
                    
                    if (!record.firstDetectionTime) {
                        record.firstDetectionTime = new Date();
                    }

                    // Update status based on detection count
                    if (this.currentSession.sessionType === 'offline') {
                        if (record.detectionCount >= 5) {
                            record.status = 'present';
                        } else if (record.detectionCount >= 2) {
                            record.status = 'partial';
                        }
                    } else {
                        record.status = 'present';
                    }
                }
            }
        });

        this.updateAttendanceDisplay();
    }

    findMatchingStudent(embedding) {
        const threshold = parseFloat(document.getElementById('recognitionThreshold').value);
        let bestMatch = null;
        let bestSimilarity = 0;

        this.enrolledStudents.forEach(student => {
            if (student.face_embedding) {
                const similarity = this.calculateCosineSimilarity(
                    embedding, 
                    JSON.parse(student.face_embedding)
                );
                
                if (similarity > threshold && similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = student;
                }
            }
        });

        return bestMatch;
    }

    calculateCosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    updateAttendanceDisplay() {
        const records = Array.from(this.attendanceRecords.values());
        
        // Update KPI cards
        const presentCount = records.filter(r => r.status === 'present').length;
        const partialCount = records.filter(r => r.status === 'partial').length;
        const absentCount = records.filter(r => r.status === 'absent').length;

        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('partialCount').textContent = partialCount;
        document.getElementById('absentCount').textContent = absentCount;

        // Update table
        const tbody = document.getElementById('attendanceBody');
        tbody.innerHTML = '';

        records.forEach(record => {
            const row = tbody.insertRow();
            row.className = `status-${record.status}`;
            
            row.insertCell(0).textContent = record.name;
            row.insertCell(1).textContent = record.status.toUpperCase();
            row.insertCell(2).textContent = record.detectionCount;
            row.insertCell(3).textContent = (record.confidenceScore * 100).toFixed(1) + '%';
            row.insertCell(4).textContent = record.firstDetectionTime ? 
                record.firstDetectionTime.toLocaleTimeString() : '-';
            row.insertCell(5).textContent = record.lastDetectionTime ? 
                record.lastDetectionTime.toLocaleTimeString() : '-';
        });
    }

    async saveAttendanceData() {
        const sessionData = {
            subject: this.currentSession.subject,
            section: this.currentSession.section,
            sessionType: this.currentSession.sessionType,
            startTime: this.currentSession.startTime,
            endTime: this.currentSession.endTime,
            duration: Math.floor((this.currentSession.endTime - this.currentSession.startTime) / 60000)
        };

        const attendanceRecords = Array.from(this.attendanceRecords.values());

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATTENDANCE_SAVE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    sessionData,
                    attendanceRecords,
                    subject: sessionData.subject,
                    section: sessionData.section,
                    sessionType: sessionData.sessionType
                })
            });

            if (response.ok) {
                this.showStatus('Attendance data saved successfully', 'success');
            } else {
                const error = await response.json();
                this.showStatus(error.message || 'Failed to save attendance data', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showStatus('Failed to save attendance data', 'error');
        }
    }

    async loadEnrolledStudents() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STUDENTS}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                this.enrolledStudents = await response.json();
                this.displayEnrolledStudents();
            } else {
                this.showStatus('Failed to load students', 'error');
            }
        } catch (error) {
            console.error('Load students error:', error);
            this.showStatus('Failed to load students', 'error');
        }
    }

    displayEnrolledStudents() {
        const container = document.getElementById('enrolledStudentsList');
        container.innerHTML = '';

        if (this.enrolledStudents.length === 0) {
            container.innerHTML = '<p>No students enrolled yet.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'attendance-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Section</th>
                    <th>Face Data</th>
                    <th>Enrolled</th>
                </tr>
            </thead>
            <tbody>
                ${this.enrolledStudents.map(student => `
                    <tr>
                        <td>${student.student_id}</td>
                        <td>${student.full_name}</td>
                        <td>${student.section}</td>
                        <td>${student.has_face_data ? '✅ Yes' : '❌ No'}</td>
                        <td>${new Date(student.enrollment_date).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        container.appendChild(table);
    }

    showEnrollmentModal() {
        document.getElementById('enrollmentModal').style.display = 'block';
        this.startEnrollmentCamera();
    }

    async startEnrollmentCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            const video = document.getElementById('enrollmentVideo');
            video.srcObject = stream;
            this.enrollmentStream = stream;
        } catch (error) {
            this.showStatus('Camera access required for enrollment', 'error');
        }
    }

    async captureStudentPhoto() {
        const name = document.getElementById('enrollStudentName').value;
        const studentId = document.getElementById('enrollStudentId').value;

        if (!name || !studentId) {
            this.showStatus('Please enter student name and ID', 'error');
            return;
        }

        const video = document.getElementById('enrollmentVideo');
        const canvas = document.getElementById('enrollmentCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Extract face embedding
        const embedding = await this.faceSystem.extractFaceEmbedding(video);
        
        if (!embedding) {
            this.showStatus('No face detected. Please ensure your face is clearly visible.', 'error');
            return;
        }

        // Save student
        await this.enrollStudent(studentId, name, embedding);

        // Close modal and cleanup
        document.getElementById('enrollmentModal').style.display = 'none';
        if (this.enrollmentStream) {
            this.enrollmentStream.getTracks().forEach(track => track.stop());
        }
        
        // Clear form
        document.getElementById('enrollStudentName').value = '';
        document.getElementById('enrollStudentId').value = '';
    }

    async enrollStudent(studentId, fullName, faceEmbedding) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STUDENT_ENROLL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    studentId,
                    fullName,
                    faceEmbedding,
                    section: document.getElementById('sectionSelect').value
                })
            });

            if (response.ok) {
                this.showStatus(`Student ${fullName} enrolled successfully`, 'success');
                await this.loadEnrolledStudents();
            } else {
                const error = await response.json();
                this.showStatus(error.error || 'Failed to enroll student', 'error');
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            this.showStatus('Failed to enroll student', 'error');
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ANALYTICS}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const analytics = await response.json();
                this.displayAnalytics(analytics);
            } else {
                this.showStatus('Failed to load analytics', 'error');
            }
        } catch (error) {
            console.error('Analytics error:', error);
            this.showStatus('Failed to load analytics', 'error');
        }
    }

    displayAnalytics(data) {
        // Update KPI cards
        const avgEngagement = data.engagement.length > 0 ? 
            (data.engagement.reduce((sum, e) => sum + parseFloat(e.avg_engagement || 0), 0) / data.engagement.length * 100).toFixed(1) : '0';
        
        document.getElementById('engagementScore').textContent = avgEngagement + '%';
        document.getElementById('riskStudents').textContent = data.riskStudents.length;
        
        // Calculate improvement trend (simplified)
        const improvement = data.trends.length > 1 ? 
            ((data.trends[data.trends.length - 1].attendance_rate - data.trends[0].attendance_rate) || 0).toFixed(1) : '0';
        document.getElementById('improvementTrend').textContent = improvement + '%';

        // Render charts with the analytics data
        if (window.analyticsSystem) {
            window.analyticsSystem.renderCharts(data);
        }
    }

    exportToPDF() {
        // Basic PDF export implementation
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text('Attendance Report', 20, 20);
        doc.text('Generated: ' + new Date().toLocaleString(), 20, 30);
        
        // Add basic attendance data
        let y = 50;
        this.attendanceRecords.forEach(record => {
            doc.text(`${record.name}: ${record.status}`, 20, y);
            y += 10;
        });
        
        doc.save('attendance-report.pdf');
        this.showStatus('PDF report generated', 'success');
    }

    exportToExcel() {
        const data = Array.from(this.attendanceRecords.values()).map(record => ({
            'Student Name': record.name,
            'Status': record.status,
            'Detection Count': record.detectionCount,
            'Confidence': (record.confidenceScore * 100).toFixed(1) + '%',
            'First Seen': record.firstDetectionTime ? record.firstDetectionTime.toLocaleString() : 'N/A',
            'Last Seen': record.lastDetectionTime ? record.lastDetectionTime.toLocaleString() : 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
        XLSX.writeFile(wb, 'attendance-report.xlsx');
        
        this.showStatus('Excel report generated', 'success');
    }

    showStatus(message, type = 'info') {
        const container = document.getElementById('statusContainer');
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        
        container.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 5000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.attendanceApp = new AttendanceApp();
});
