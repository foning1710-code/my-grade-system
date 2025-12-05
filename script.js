// Main Application State
const AppState = {
    currentTab: 'dashboard',
    students: {},
    subjects: [],
    grades: {},
    settings: {},
    currentClass: null,
    currentStudent: null,
    currentTerm: 1,
    charts: {}
};

// DOM Elements
const DOM = {
    tabs: document.querySelectorAll('.tab-content'),
    navItems: document.querySelectorAll('.nav-item'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    confirmationModal: document.getElementById('confirmationModal'),
    modalConfirmBtn: document.getElementById('modalConfirmBtn'),
    modalCancelBtn: document.getElementById('modalCancelBtn'),
    importModal: document.getElementById('importModal'),
    importConfirmBtn: document.getElementById('importConfirmBtn'),
    importCancelBtn: document.getElementById('importCancelBtn'),
    importFile: document.getElementById('importFile')
};

// API Base URL - DYNAMIC FOR HEROKU
// For Heroku deployment, use relative URLs or the deployed URL
const getApiBase = () => {
    // In production (Heroku), use relative URL since frontend and backend are on same domain
    // Or use the full URL if you know your Heroku app name
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Development - using local server
        return 'http://localhost:3000/api';
    } else {
        // Production (Heroku) - use relative URL or your specific Heroku URL
        // Option 1: Relative URL (recommended for Heroku)
        return '/api';
        
        // Option 2: If you know your Heroku app name (replace with your app name)
        // return 'https://your-app-name.herokuapp.com/api';
    }
};

const API_BASE = getApiBase();

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initApplication();
    
    // Add a connection status indicator
    initConnectionStatus();
});

// Connection status for online/offline detection
function initConnectionStatus() {
    const statusElement = document.createElement('div');
    statusElement.id = 'connectionStatus';
    statusElement.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        z-index: 10000;
        display: none;
    `;
    document.body.appendChild(statusElement);
    
    // Check connection status
    updateConnectionStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Check server connection periodically
    setInterval(checkServerConnection, 30000); // Every 30 seconds
}

async function checkServerConnection() {
    try {
        const response = await fetch(`${API_BASE}/health`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            showConnectionStatus('Server connected', '#2E7D32');
        } else {
            showConnectionStatus('Server connection issue', '#F44336');
        }
    } catch (error) {
        showConnectionStatus('Server offline', '#F44336');
    }
}

function updateConnectionStatus() {
    if (navigator.onLine) {
        checkServerConnection();
    } else {
        showConnectionStatus('No internet connection', '#F44336');
    }
}

function showConnectionStatus(message, color) {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.backgroundColor = color;
        statusElement.style.color = 'white';
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds if it's a success message
        if (color === '#2E7D32') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
}

async function initApplication() {
    showLoading();
    
    try {
        // First check if server is running
        await checkServerConnection();
        
        // Load initial data with retry logic
        await Promise.all([
            loadStudents(),
            loadSubjects(),
            loadSettings(),
            loadSystemInfo()
        ]);
        
        // Initialize UI
        initDateDisplay();
        initClassSelectors();
        initEventListeners();
        initDashboard();
        
        // Update current year display
        if (AppState.settings.school) {
            document.getElementById('currentYear').textContent = AppState.settings.school.academicYear;
        }
        
        hideLoading();
        
        showToast('System loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        hideLoading();
        
        if (!navigator.onLine) {
            showToast('No internet connection. Please check your network.', 'error');
        } else {
            showToast('Failed to connect to server. Please try again later.', 'error');
        }
        
        // Show offline mode message
        document.getElementById('dashboard').innerHTML += `
            <div class="offline-alert">
                <p><i class="fas fa-wifi"></i> Running in limited offline mode. Some features may not be available.</p>
            </div>
        `;
    }
}

// Data Loading Functions with error handling for MongoDB Atlas
async function loadStudents() {
    try {
        const response = await fetchWithTimeout(`${API_BASE}/students`, {
            timeout: 10000 // 10 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        AppState.students = await response.json();
        updateDashboardStats();
    } catch (error) {
        console.error('Error loading students:', error);
        // Fallback to localStorage if available
        const localData = localStorage.getItem('students_backup');
        if (localData) {
            AppState.students = JSON.parse(localData);
            showToast('Loaded students from local backup', 'warning');
        }
        throw error;
    }
}

async function loadSubjects() {
    try {
        const response = await fetchWithTimeout(`${API_BASE}/subjects`, {
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        AppState.subjects = data.subjects || [];
        populateSubjectSelectors();
        updateSubjectList();
        
        // Backup to localStorage
        localStorage.setItem('subjects_backup', JSON.stringify(AppState.subjects));
    } catch (error) {
        console.error('Error loading subjects:', error);
        // Fallback
        const localData = localStorage.getItem('subjects_backup');
        if (localData) {
            AppState.subjects = JSON.parse(localData);
            populateSubjectSelectors();
            showToast('Loaded subjects from local backup', 'warning');
        }
        throw error;
    }
}

async function loadSettings() {
    try {
        const response = await fetchWithTimeout(`${API_BASE}/settings`, {
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        AppState.settings = await response.json();
        
        // Apply settings to UI
        if (AppState.settings.printing) {
            document.getElementById('autoPrint').checked = AppState.settings.printing.autoPrint;
            document.getElementById('showRank').checked = AppState.settings.printing.showRank;
            document.getElementById('showStatistics').checked = AppState.settings.printing.showStatistics;
        }
        
        if (AppState.settings.school) {
            document.getElementById('schoolName').value = AppState.settings.school.name;
            document.getElementById('schoolAddress').value = AppState.settings.school.address;
            document.getElementById('schoolPhone').value = AppState.settings.school.phone;
            document.getElementById('academicYear').value = AppState.settings.school.academicYear;
        }
        
        // Backup to localStorage
        localStorage.setItem('settings_backup', JSON.stringify(AppState.settings));
    } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback
        const localData = localStorage.getItem('settings_backup');
        if (localData) {
            AppState.settings = JSON.parse(localData);
            showToast('Loaded settings from local backup', 'warning');
        }
        throw error;
    }
}

async function loadSystemInfo() {
    try {
        const response = await fetch(`${API_BASE}/system/info`);
        const info = await response.json();
        document.getElementById('lastBackup').textContent = formatDate(info.lastBackup);
    } catch (error) {
        console.error('Error loading system info:', error);
        // Don't throw error - this is non-critical
    }
}

// Enhanced fetch with timeout and retry logic
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    clearTimeout(id);
    return response;
}

// UI Initialization
function initDateDisplay() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function initClassSelectors() {
    const classSelectors = [
        'entryClass', 'reportClass', 'cardClass', 'pvrClass',
        'statsClass', 'studentClassFilter', 'studentClass'
    ];
    
    const classes = Object.keys(AppState.students).sort();
    
    classSelectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select) {
            select.innerHTML = '<option value="">Select Class</option>';
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                select.appendChild(option);
            });
        }
    });
}

function populateSubjectSelectors() {
    const subjectSelectors = ['entrySubject', 'reportSubject'];
    
    subjectSelectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (select) {
            select.innerHTML = '<option value="">Select Subject</option>';
            AppState.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.code;
                option.textContent = subject.name;
                select.appendChild(option);
            });
        }
    });
}

// Modified initEventListeners to handle Heroku deployment differences
function initEventListeners() {
    // Navigation
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Quick actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Grade Entry
    const loadStudentsBtn = document.getElementById('loadStudentsBtn');
    if (loadStudentsBtn) {
        loadStudentsBtn.addEventListener('click', loadStudentsForGradeEntry);
    }
    
    const saveGradesBtn = document.getElementById('saveGradesBtn');
    if (saveGradesBtn) {
        saveGradesBtn.addEventListener('click', saveGrades);
    }
    
    const entryClass = document.getElementById('entryClass');
    if (entryClass) {
        entryClass.addEventListener('change', handleClassChangeForSubjects);
    }
    
    const evaluationDate = document.getElementById('evaluationDate');
    if (evaluationDate) {
        evaluationDate.valueAsDate = new Date();
    }
    
    // Grade Reports
    const filterReportBtn = document.getElementById('filterReportBtn');
    if (filterReportBtn) {
        filterReportBtn.addEventListener('click', generateGradeReport);
    }
    
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateGradeReport);
    }
    
    const printReportBtn = document.getElementById('printReportBtn');
    if (printReportBtn) {
        printReportBtn.addEventListener('click', printGradeReport);
    }
    
    // Report Cards
    const cardClass = document.getElementById('cardClass');
    if (cardClass) {
        cardClass.addEventListener('change', handleClassChangeForStudents);
    }
    
    const loadCardDataBtn = document.getElementById('loadCardDataBtn');
    if (loadCardDataBtn) {
        loadCardDataBtn.addEventListener('click', loadStudentDataForCard);
    }
    
    const generateCardBtn = document.getElementById('generateCardBtn');
    if (generateCardBtn) {
        generateCardBtn.addEventListener('click', generateReportCard);
    }
    
    const printCardBtn = document.getElementById('printCardBtn');
    if (printCardBtn) {
        printCardBtn.addEventListener('click', printReportCard);
    }
    
    const exportCardBtn = document.getElementById('exportCardBtn');
    if (exportCardBtn) {
        exportCardBtn.addEventListener('click', exportReportCard);
    }
    
    const generateAllCardsBtn = document.getElementById('generateAllCardsBtn');
    if (generateAllCardsBtn) {
        generateAllCardsBtn.addEventListener('click', generateAllReportCards);
    }
    
    // PVR Summary
    const loadPVRDataBtn = document.getElementById('loadPVRDataBtn');
    if (loadPVRDataBtn) {
        loadPVRDataBtn.addEventListener('click', loadPVRData);
    }
    
    const generatePVRBtn = document.getElementById('generatePVRBtn');
    if (generatePVRBtn) {
        generatePVRBtn.addEventListener('click', generatePVR);
    }
    
    const printPVRBtn = document.getElementById('printPVRBtn');
    if (printPVRBtn) {
        printPVRBtn.addEventListener('click', printPVR);
    }
    
    // Statistics
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', refreshStatistics);
    }
    
    const applyStatsFilterBtn = document.getElementById('applyStatsFilterBtn');
    if (applyStatsFilterBtn) {
        applyStatsFilterBtn.addEventListener('click', loadStatistics);
    }
    
    // Student Management
    const studentClassFilter = document.getElementById('studentClassFilter');
    if (studentClassFilter) {
        studentClassFilter.addEventListener('change', loadStudentList);
    }
    
    const studentSearch = document.getElementById('studentSearch');
    if (studentSearch) {
        studentSearch.addEventListener('input', loadStudentList);
    }
    
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', clearStudentForm);
    }
    
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', saveStudent);
    }
    
    const clearStudentFormBtn = document.getElementById('clearStudentFormBtn');
    if (clearStudentFormBtn) {
        clearStudentFormBtn.addEventListener('click', clearStudentForm);
    }
    
    const studentClass = document.getElementById('studentClass');
    if (studentClass) {
        studentClass.addEventListener('change', generateMatricule);
    }
    
    // Settings
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) {
        addSubjectBtn.addEventListener('click', addSubject);
    }
    
    const saveSubjectBtn = document.getElementById('saveSubjectBtn');
    if (saveSubjectBtn) {
        saveSubjectBtn.addEventListener('click', saveSubject);
    }
    
    const deleteSubjectBtn = document.getElementById('deleteSubjectBtn');
    if (deleteSubjectBtn) {
        deleteSubjectBtn.addEventListener('click', deleteSubject);
    }
    
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportData);
    }
    
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', showImportModal);
    }
    
    const backupDataBtn = document.getElementById('backupDataBtn');
    if (backupDataBtn) {
        backupDataBtn.addEventListener('click', backupData);
    }
    
    const resetDataBtn = document.getElementById('resetDataBtn');
    if (resetDataBtn) {
        resetDataBtn.addEventListener('click', resetData);
    }
    
    // Modal actions
    if (DOM.modalConfirmBtn) {
        DOM.modalConfirmBtn.addEventListener('click', confirmModalAction);
    }
    
    if (DOM.modalCancelBtn) {
        DOM.modalCancelBtn.addEventListener('click', closeModal);
    }
    
    if (DOM.importConfirmBtn) {
        DOM.importConfirmBtn.addEventListener('click', importData);
    }
    
    if (DOM.importCancelBtn) {
        DOM.importCancelBtn.addEventListener('click', closeImportModal);
    }
    
    // Subject list selection
    const subjectList = document.getElementById('subjectList');
    if (subjectList) {
        subjectList.addEventListener('click', handleSubjectSelection);
    }
    
    // Initialize statistics
    loadStatistics();
}

// Tab Navigation (unchanged from original)
function switchTab(tabName) {
    // Update active nav item
    DOM.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // Show selected tab
    DOM.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName);
    });
    
    AppState.currentTab = tabName;
    
    // Perform tab-specific initializations
    switch(tabName) {
        case 'dashboard':
            initDashboard();
            break;
        case 'student-management':
            loadStudentList();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'report-cards':
            // Hide all cards container when switching to this tab
            const allCardsContainer = document.getElementById('allCardsContainer');
            if (allCardsContainer) {
                allCardsContainer.style.display = 'none';
            }
            // Activer le bouton de génération si des données sont déjà chargées
            if (AppState.currentClass && AppState.currentStudent) {
                const generateCardBtn = document.getElementById('generateCardBtn');
                if (generateCardBtn) {
                    generateCardBtn.disabled = false;
                }
            }
            break;
    }
}

// Dashboard Functions (mostly unchanged)
function initDashboard() {
    updateDashboardStats();
    createEnrollmentChart();
    createGradeDistributionChart();
}

function updateDashboardStats() {
    let totalStudents = 0;
    let totalSubjects = AppState.subjects.length;
    let totalGrades = 0;
    let totalReports = 0;
    
    // Calculate total students
    Object.values(AppState.students).forEach(classStudents => {
        totalStudents += classStudents.length;
    });
    
    // TODO: Calculate total grades and reports from actual data
    
    const totalStudentsEl = document.getElementById('totalStudents');
    const totalSubjectsEl = document.getElementById('totalSubjects');
    const gradesEnteredEl = document.getElementById('gradesEntered');
    const reportsGeneratedEl = document.getElementById('reportsGenerated');
    
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    if (totalSubjectsEl) totalSubjectsEl.textContent = totalSubjects;
    if (gradesEnteredEl) gradesEnteredEl.textContent = totalGrades;
    if (reportsGeneratedEl) reportsGeneratedEl.textContent = totalReports;
}

function createEnrollmentChart() {
    const ctx = document.getElementById('enrollmentChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (AppState.charts.enrollment) {
        AppState.charts.enrollment.destroy();
    }
    
    const classes = Object.keys(AppState.students).sort();
    const data = classes.map(className => AppState.students[className]?.length || 0);
    
    AppState.charts.enrollment = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: classes,
            datasets: [{
                label: 'Number of Students',
                data: data,
                backgroundColor: '#2C5E3A',
                borderColor: '#1B5E20',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Students: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Class'
                    }
                }
            }
        }
    });
}

function createGradeDistributionChart() {
    const ctx = document.getElementById('gradeDistributionChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (AppState.charts.gradeDistribution) {
        AppState.charts.gradeDistribution.destroy();
    }
    
    // Sample data - in real app, this would come from actual grades
    const distribution = {
        excellent: 15,
        veryGood: 25,
        good: 35,
        passable: 15,
        insufficient: 10
    };
    
    AppState.charts.gradeDistribution = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Excellent (16-20)', 'Very Good (14-16)', 'Good (12-14)', 'Passable (10-12)', 'Insufficient (0-10)'],
            datasets: [{
                data: Object.values(distribution),
                backgroundColor: [
                    '#2E7D32',
                    '#4CAF50',
                    '#8BC34A',
                    '#FFC107',
                    '#F44336'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function handleQuickAction(action) {
    switch(action) {
        case 'enter-grades':
            switchTab('grade-entry');
            break;
        case 'generate-reports':
            switchTab('grade-reports');
            break;
        case 'print-cards':
            switchTab('report-cards');
            break;
        case 'view-statistics':
            switchTab('statistics');
            break;
    }
}

// Grade Entry Functions with enhanced error handling
async function loadStudentsForGradeEntry() {
    const className = document.getElementById('entryClass').value;
    const subjectCode = document.getElementById('entrySubject').value;
    const session = document.getElementById('entrySession').value;
    
    if (!className || !subjectCode || !session) {
        showToast('Please select class, subject, and session', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        // Load students for the class
        const response = await fetchWithTimeout(`${API_BASE}/students/${className}`, {
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load students: ${response.status}`);
        }
        
        const students = await response.json();
        
        // Load existing grades for this session
        const gradesResponse = await fetch(`${API_BASE}/grades/${className}/${subjectCode}/${session}`);
        const existingGrades = await gradesResponse.json();
        
        const tableBody = document.getElementById('gradeEntryTableBody');
        if (!tableBody) {
            throw new Error('Table body not found');
        }
        
        tableBody.innerHTML = '';
        
        students.forEach((student, index) => {
            const existingGrade = existingGrades.grades?.find(g => g.matricule === student.matricule);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.matricule}</td>
                <td>${student.name}</td>
                <td>
                    <input type="number" class="grade-input" 
                           value="${existingGrade?.grade || ''}" 
                           min="0" max="20" step="0.25"
                           data-matricule="${student.matricule}"
                           onchange="calculateStudentGrade('${student.matricule}')">
                </td>
                <td>
                    <input type="checkbox" class="absent-checkbox" 
                           ${existingGrade?.absent ? 'checked' : ''}
                           data-matricule="${student.matricule}">
                </td>
                <td>
                    <input type="text" class="observation-input" 
                           value="${existingGrade?.observation || ''}"
                           placeholder="Observation"
                           data-matricule="${student.matricule}">
                </td>
                <td>
                    <div class="student-cumulative">-</div>
                </td>
                <td>
                    <button class="btn-small" onclick="clearStudentGrade('${student.matricule}')">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Calculate cumulative averages for all students
        await calculateAllCumulativeAverages(className, subjectCode);
        
        hideLoading();
        showToast(`Loaded ${students.length} students`, 'success');
        
    } catch (error) {
        console.error('Error loading students:', error);
        hideLoading();
        showToast('Failed to load students. Please check your connection.', 'error');
    }
}

// Calculate cumulative average for a student
async function calculateStudentGrade(matricule) {
    const className = document.getElementById('entryClass').value;
    const subjectCode = document.getElementById('entrySubject').value;
    
    if (!className || !subjectCode) return;
    
    try {
        // Get all grades for this student in this subject
        const response = await fetch(`${API_BASE}/grades/student/${className}/${subjectCode}/${matricule}`);
        const gradesData = await response.json();
        
        // Calculate cumulative average
        let total = 0;
        let count = 0;
        
        gradesData.forEach(grade => {
            if (!grade.absent && grade.grade) {
                total += parseFloat(grade.grade);
                count++;
            }
        });
        
        const cumulativeAvg = count > 0 ? (total / count).toFixed(2) : '-';
        
        // Update display
        const row = document.querySelector(`tr:has(input[data-matricule="${matricule}"])`);
        if (row) {
            const cumulativeCell = row.querySelector('.student-cumulative');
            if (cumulativeCell) {
                cumulativeCell.textContent = cumulativeAvg;
                
                // Color code based on average
                const avgNum = parseFloat(cumulativeAvg);
                if (!isNaN(avgNum)) {
                    if (avgNum >= 16) cumulativeCell.className = 'student-cumulative excellent';
                    else if (avgNum >= 14) cumulativeCell.className = 'student-cumulative very-good';
                    else if (avgNum >= 12) cumulativeCell.className = 'student-cumulative good';
                    else if (avgNum >= 10) cumulativeCell.className = 'student-cumulative passable';
                    else cumulativeCell.className = 'student-cumulative insufficient';
                }
            }
        }
    } catch (error) {
        console.error('Error calculating cumulative average:', error);
    }
}

// Calculate cumulative averages for all students
async function calculateAllCumulativeAverages(className, subjectCode) {
    try {
        // Get all students in class
        const studentsResponse = await fetch(`${API_BASE}/students/${className}`);
        const students = await studentsResponse.json();
        
        // For each student, calculate cumulative average
        for (const student of students) {
            await calculateStudentGrade(student.matricule);
        }
        
        // Calculate class ranking for this subject
        await calculateSubjectRanking(className, subjectCode);
        
    } catch (error) {
        console.error('Error calculating all cumulative averages:', error);
    }
}

// Calculate subject ranking
async function calculateSubjectRanking(className, subjectCode) {
    try {
        const response = await fetch(`${API_BASE}/grades/class/${className}/subject/${subjectCode}/ranking`);
        const rankingData = await response.json();
        
        // Update ranking in the table
        rankingData.forEach((studentRank, index) => {
            const row = document.querySelector(`tr:has(input[data-matricule="${studentRank.matricule}"])`);
            if (row) {
                const rankCell = row.querySelector('.student-cumulative');
                if (rankCell) {
                    // Append rank to existing cumulative average
                    const currentText = rankCell.textContent;
                    rankCell.textContent = `${currentText} (Rank: ${studentRank.rank}/${rankingData.length})`;
                }
            }
        });
    } catch (error) {
        console.error('Error calculating subject ranking:', error);
    }
}

function clearStudentGrade(matricule) {
    const inputs = document.querySelectorAll(`[data-matricule="${matricule}"]`);
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.type === 'number') {
            input.value = '';
        } else if (input.classList.contains('observation-input')) {
            input.value = '';
        }
    });
    
    // Recalculate cumulative average
    calculateStudentGrade(matricule);
}

async function saveGrades() {
    const className = document.getElementById('entryClass').value;
    const subjectCode = document.getElementById('entrySubject').value;
    const session = document.getElementById('entrySession').value;
    const coefficient = document.getElementById('coefficient').value;
    const teacher = document.getElementById('teacherName').value;
    const date = document.getElementById('evaluationDate').value;
    
    if (!className || !subjectCode || !session) {
        showToast('Please select class, subject, and session', 'warning');
        return;
    }
    
    const gradeInputs = document.querySelectorAll('.grade-input');
    const absentCheckboxes = document.querySelectorAll('.absent-checkbox');
    const observationInputs = document.querySelectorAll('.observation-input');
    
    const gradesData = [];
    
    gradeInputs.forEach(input => {
        const matricule = input.dataset.matricule;
        const grade = input.value.trim();
        const absent = document.querySelector(`.absent-checkbox[data-matricule="${matricule}"]`).checked;
        const observation = document.querySelector(`.observation-input[data-matricule="${matricule}"]`).value.trim();
        
        gradesData.push({
            matricule,
            grade: grade || '0',
            absent,
            observation
        });
    });
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                className,
                subjectCode,
                session,
                gradesData,
                coefficient,
                teacher,
                date
            }),
            timeout: 20000
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            showToast('Grades saved successfully', 'success');
            // Recalculate cumulative averages
            await calculateAllCumulativeAverages(className, subjectCode);
        } else {
            showToast(result.message || 'Failed to save grades', 'error');
        }
        
    } catch (error) {
        console.error('Error saving grades:', error);
        hideLoading();
        showToast('Failed to save grades. Please check your connection.', 'error');
    }
}

function handleClassChangeForSubjects() {
    const className = this.value;
    // TODO: Filter subjects based on class if needed
}

// Grade Report Functions - UPDATED WITH COMPREHENSIVE ANALYSIS
async function generateGradeReport() {
    const className = document.getElementById('reportClass').value;
    const subjectCode = document.getElementById('reportSubject').value;
    const term = document.getElementById('reportTerm').value;
    
    if (!className || !subjectCode) {
        showToast('Please select class and subject', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/reports/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                className, 
                subjectCode, 
                term,
                includeAllSessions: true
            }),
            timeout: 15000
        });
        
        const report = await response.json();
        
        // Use the enhanced report renderer
        renderComprehensiveGradeReport(report);
        
        hideLoading();
        showToast('Report generated successfully', 'success');
        
        // Enable print button
        const printReportBtn = document.getElementById('printReportBtn');
        if (printReportBtn) {
            printReportBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        hideLoading();
        showToast('Failed to generate report. Server may be busy.', 'error');
    }
}

// Render comprehensive grade report with alphabetical order but showing rank
function renderComprehensiveGradeReport(report) {
    const isOL = report.className?.includes('FORM 4') || report.className?.includes('FORM 5');
    const isAL = report.className?.includes('L6') || report.className?.includes('U6');
    
    // All possible sessions
    const allSessions = ['CC1', 'DS1', 'CC2', 'DS2', 'CC3', 'DS3', 'CC4', 'DS4', 'CC5', 'DS5'];
    
    let html = `
        <div class="report-header">
            <h3>COMPREHENSIVE GRADE REPORT - ${report.className} - ${report.subject}</h3>
            <p>Academic Year: ${AppState.settings.school?.academicYear || '2024-2025'} | Date: ${report.date}</p>
            <div class="report-summary">
                <div class="summary-item">
                    <span>Total Students:</span>
                    <strong>${report.statistics?.totalStudents || 0}</strong>
                </div>
                <div class="summary-item">
                    <span>Class Average:</span>
                    <strong>${report.statistics?.overallAverage || 0}/20</strong>
                </div>
                <div class="summary-item">
                    <span>Success Rate:</span>
                    <strong>${report.statistics?.successRate || 0}%</strong>
                </div>
            </div>
        </div>
        
        <div class="report-statistics">
            <h4>Detailed Statistics</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Male Students:</span>
                    <span class="stat-value">${report.statistics?.maleStudents || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Female Students:</span>
                    <span class="stat-value">${report.statistics?.femaleStudents || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Male Average:</span>
                    <span class="stat-value">${report.statistics?.maleAverage || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Female Average:</span>
                    <span class="stat-value">${report.statistics?.femaleAverage || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Highest Grade:</span>
                    <span class="stat-value">${report.statistics?.highestGrade || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Lowest Grade:</span>
                    <span class="stat-value">${report.statistics?.lowestGrade || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Passed:</span>
                    <span class="stat-value">${report.statistics?.passed || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Failed:</span>
                    <span class="stat-value">${report.statistics?.failed || 0}</span>
                </div>
                ${isOL || isAL ? `
                <div class="stat-item">
                    <span class="stat-label">Letter Grade Distribution:</span>
                    <span class="stat-value">${report.statistics?.letterGradeDistribution || 'N/A'}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="performance-distribution">
            <h4>Performance Distribution</h4>
            <div class="distribution-bars">
                <div class="distribution-item">
                    <span class="dist-label">Excellent (16-20):</span>
                    <div class="dist-bar">
                        <div class="dist-fill excellent" style="width: ${((report.statistics?.excellentCount || 0) / (report.statistics?.totalStudents || 1) * 100)}%"></div>
                    </div>
                    <span class="dist-count">${report.statistics?.excellentCount || 0}</span>
                </div>
                <div class="distribution-item">
                    <span class="dist-label">Very Good (14-16):</span>
                    <div class="dist-bar">
                        <div class="dist-fill very-good" style="width: ${((report.statistics?.veryGoodCount || 0) / (report.statistics?.totalStudents || 1) * 100)}%"></div>
                    </div>
                    <span class="dist-count">${report.statistics?.veryGoodCount || 0}</span>
                </div>
                <div class="distribution-item">
                    <span class="dist-label">Good (12-14):</span>
                    <div class="dist-bar">
                        <div class="dist-fill good" style="width: ${((report.statistics?.goodCount || 0) / (report.statistics?.totalStudents || 1) * 100)}%"></div>
                    </div>
                    <span class="dist-count">${report.statistics?.goodCount || 0}</span>
                </div>
                <div class="distribution-item">
                    <span class="dist-label">Passable (10-12):</span>
                    <div class="dist-bar">
                        <div class="dist-fill passable" style="width: ${((report.statistics?.passableCount || 0) / (report.statistics?.totalStudents || 1) * 100)}%"></div>
                    </div>
                    <span class="dist-count">${report.statistics?.passableCount || 0}</span>
                </div>
                <div class="distribution-item">
                    <span class="dist-label">Insufficient (0-10):</span>
                    <div class="dist-bar">
                        <div class="dist-fill insufficient" style="width: ${((report.statistics?.insufficientCount || 0) / (report.statistics?.totalStudents || 1) * 100)}%"></div>
                    </div>
                    <span class="dist-count">${report.statistics?.insufficientCount || 0}</span>
                </div>
            </div>
        </div>
        
        <div class="report-table-container">
            <table class="comprehensive-report-table">
                <thead>
                    <tr>
                        <th rowspan="2">Rank</th>
                        <th rowspan="2">No.</th>
                        <th rowspan="2">Matricule</th>
                        <th rowspan="2">Name</th>
                        <th colspan="10">Sessions</th>
                        <th rowspan="2">Total</th>
                        <th rowspan="2">Average</th>
                        ${(isOL || isAL) ? '<th rowspan="2">Letter Grade</th>' : ''}
                        <th rowspan="2">Cumulative<br>Average</th>
                        <th rowspan="2">Remarks</th>
                    </tr>
                    <tr>
                        ${allSessions.map(session => `<th>${session}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Sort students alphabetically for display, but maintain rank from sorted by average
    const studentsByAverage = [...(report.studentGrades || [])].sort((a, b) => {
        return parseFloat(b.cumulativeAverage || b.average20) - parseFloat(a.cumulativeAverage || a.average20);
    });
    
    // Create rank mapping
    const rankMap = {};
    studentsByAverage.forEach((student, index) => {
        rankMap[student.matricule] = index + 1;
    });
    
    // Sort students alphabetically for display
    const studentsAlphabetical = [...(report.studentGrades || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    studentsAlphabetical.forEach((student, index) => {
        const rank = rankMap[student.matricule] || (index + 1);
        
        // Calculate session grades
        const sessionGrades = allSessions.map(session => {
            const grade = student.grades?.[session.toLowerCase()];
            if (!grade) return '<td>-</td>';
            if (grade.absent) return '<td class="absent">ABS</td>';
            return `<td>${grade.grade20 || grade.grade}</td>`;
        }).join('');
        
        // Calculate total points
        const totalPoints = allSessions.reduce((sum, session) => {
            const grade = student.grades?.[session.toLowerCase()];
            return sum + (grade && !grade.absent ? parseFloat(grade.grade20 || grade.grade) : 0);
        }, 0);
        
        const sessionsCount = allSessions.filter(session => {
            const grade = student.grades?.[session.toLowerCase()];
            return grade && !grade.absent && (grade.grade20 || grade.grade);
        }).length;
        
        const sessionAverage = sessionsCount > 0 ? (totalPoints / sessionsCount).toFixed(2) : '-';
        
        // Use cumulative average if available, otherwise calculate from sessions
        const cumulativeAverage = student.cumulativeAverage || sessionAverage;
        
        // Calculate letter grade if applicable
        let letterGrade = '';
        if (isOL || isAL) {
            // Convert average to percentage
            const avgNum = parseFloat(cumulativeAverage) * 5;
            if (isOL) {
                // Ordinary Level grading scale
                if (avgNum >= 70) letterGrade = 'A';
                else if (avgNum >= 60) letterGrade = 'B';
                else if (avgNum >= 50) letterGrade = 'C';
                else if (avgNum >= 40) letterGrade = 'D';
                else if (avgNum >= 30) letterGrade = 'E';
                else letterGrade = 'U';
            } else if (isAL) {
                // Advanced Level grading scale
                if (avgNum >= 80) letterGrade = 'A';
                else if (avgNum >= 70) letterGrade = 'B';
                else if (avgNum >= 60) letterGrade = 'C';
                else if (avgNum >= 50) letterGrade = 'D';
                else if (avgNum >= 40) letterGrade = 'E';
                else letterGrade = 'U';
            }
        }
        
        // Determine remarks
        const avgNum = parseFloat(cumulativeAverage);
        let remarks = '';
        let remarkClass = '';
        
        if (avgNum >= 16) {
            remarks = 'Excellent';
            remarkClass = 'excellent';
        } else if (avgNum >= 14) {
            remarks = 'Very Good';
            remarkClass = 'very-good';
        } else if (avgNum >= 12) {
            remarks = 'Good';
            remarkClass = 'good';
        } else if (avgNum >= 10) {
            remarks = 'Passable';
            remarkClass = 'passable';
        } else if (!isNaN(avgNum)) {
            remarks = 'Insufficient';
            remarkClass = 'insufficient';
        } else {
            remarks = '-';
            remarkClass = '';
        }
        
        html += `
            <tr>
                <td class="rank">${rank}</td>
                <td>${index + 1}</td>
                <td>${student.matricule || ''}</td>
                <td>${student.name || ''}</td>
                ${sessionGrades}
                <td class="total">${totalPoints.toFixed(1)}</td>
                <td class="average ${remarkClass}">${sessionAverage}</td>
                ${(isOL || isAL) ? `<td class="letter-grade">${letterGrade}</td>` : ''}
                <td class="cumulative-average ${remarkClass}">${cumulativeAverage}</td>
                <td class="${remarkClass}">${remarks}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div class="report-footer">
            <div class="teacher-signature">
                <p>Teacher: ${report.teacher || 'Not specified'}</p>
                <p>Date: ${report.date}</p>
            </div>
            <div class="analysis-notes">
                <h5>Analysis:</h5>
                <p>${generateAnalysisNotes(report)}</p>
            </div>
        </div>
    `;
    
    const container = document.getElementById('reportContainer');
    if (container) {
        container.innerHTML = html;
    }
}

// Helper function to generate analysis notes
function generateAnalysisNotes(report) {
    const stats = report.statistics || {};
    const total = stats.totalStudents || 0;
    const passed = stats.passed || 0;
    const failed = stats.failed || 0;
    const average = parseFloat(stats.overallAverage) || 0;
    
    let notes = [];
    
    if (total === 0) {
        notes.push("No student data available for analysis.");
    } else if (passed === total) {
        notes.push("All students passed with excellent results.");
    } else if (passed / total >= 0.8) {
        notes.push("Excellent performance with high success rate.");
    } else if (passed / total >= 0.6) {
        notes.push("Good overall performance.");
    } else if (passed / total >= 0.4) {
        notes.push("Average performance, some improvement needed.");
    } else {
        notes.push("Low performance, significant intervention required.");
    }
    
    if (average >= 16) {
        notes.push("Class average is excellent.");
    } else if (average >= 14) {
        notes.push("Class average is very good.");
    } else if (average >= 12) {
        notes.push("Class average is good.");
    } else if (average >= 10) {
        notes.push("Class average is passable.");
    } else if (average > 0) {
        notes.push("Class average is insufficient, urgent review needed.");
    }
    
    if (failed > 0) {
        notes.push(`${failed} student(s) need remedial support.`);
    }
    
    return notes.join(' ');
}

function printGradeReport() {
    const container = document.getElementById('reportContainer');
    if (!container) return;
    
    const printContent = container.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprehensive Grade Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                .report-header { text-align: center; margin-bottom: 20px; }
                .report-header h3 { color: #2C5E3A; margin-bottom: 10px; }
                .report-summary { display: flex; justify-content: center; gap: 30px; margin: 15px 0; }
                .summary-item { text-align: center; }
                .summary-item span { display: block; font-size: 11px; color: #666; }
                .summary-item strong { font-size: 16px; color: #2C5E3A; }
                .report-statistics { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
                .stat-item { display: flex; justify-content: space-between; }
                .stat-label { font-weight: bold; }
                .performance-distribution { margin-bottom: 20px; }
                .distribution-item { display: flex; align-items: center; margin-bottom: 8px; }
                .dist-label { width: 150px; }
                .dist-bar { flex: 1; height: 20px; background: #eee; border-radius: 3px; overflow: hidden; }
                .dist-fill { height: 100%; }
                .dist-count { width: 40px; text-align: right; }
                .excellent { background-color: #2E7D32; }
                .very-good { background-color: #4CAF50; }
                .good { background-color: #8BC34A; }
                .passable { background-color: #FFC107; }
                .insufficient { background-color: #F44336; }
                .report-table-container { overflow-x: auto; }
                .comprehensive-report-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .comprehensive-report-table th, .comprehensive-report-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
                .comprehensive-report-table th { background-color: #2C5E3A; color: white; font-weight: bold; }
                .comprehensive-report-table tr:nth-child(even) { background-color: #f9f9f9; }
                .absent { color: #C62828; font-weight: bold; }
                .average, .cumulative-average { font-weight: bold; }
                .total { font-weight: bold; color: #1565C0; }
                .rank { font-weight: bold; color: #C62828; }
                .letter-grade { font-weight: bold; color: #7B1FA2; }
                .report-footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #ddd; }
                .teacher-signature { float: right; text-align: right; }
                .analysis-notes { margin-top: 20px; padding: 15px; background: #FFF9C4; border-radius: 5px; }
                .analysis-notes h5 { margin-top: 0; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                    @page { margin: 20mm; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()">Print Report</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    switchTab('grade-reports');
}

// Report Card Functions - UPDATED WITH ALL CARDS GENERATION
function handleClassChangeForStudents() {
    const className = this.value;
    const studentSelect = document.getElementById('cardStudent');
    
    if (!className) {
        studentSelect.disabled = true;
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        return;
    }
    
    const students = AppState.students[className] || [];
    
    if (students.length === 0) {
        studentSelect.disabled = true;
        studentSelect.innerHTML = '<option value="">No students in this class</option>';
        return;
    }
    
    studentSelect.disabled = false;
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.matricule;
        option.textContent = `${student.matricule} - ${student.name}`;
        studentSelect.appendChild(option);
    });
}

async function loadStudentDataForCard() {
    const className = document.getElementById('cardClass').value;
    const matricule = document.getElementById('cardStudent').value;
    const term = document.getElementById('cardTerm').value;
    
    if (!className || !matricule) {
        showToast('Please select class and student', 'warning');
        return;
    }
    
    // Vérifier si l'étudiant existe
    const students = AppState.students[className] || [];
    const student = students.find(s => s.matricule === matricule);
    
    if (!student) {
        showToast('Student not found in selected class', 'error');
        return;
    }
    
    // Activer le bouton de génération
    const generateCardBtn = document.getElementById('generateCardBtn');
    if (generateCardBtn) {
        generateCardBtn.disabled = false;
    }
    
    AppState.currentClass = className;
    AppState.currentStudent = matricule;
    AppState.currentTerm = parseInt(term);
    
    showToast(`Student data loaded: ${student.name}`, 'success');
}

// Generate all report cards for a class
async function generateAllReportCards() {
    const className = document.getElementById('cardClass').value;
    const term = document.getElementById('cardTerm').value;
    
    if (!className) {
        showToast('Please select class first', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const students = AppState.students[className] || [];
        if (students.length === 0) {
            hideLoading();
            showToast('No students found in this class', 'warning');
            return;
        }
        
        // Hide single card preview
        const reportCardPreview = document.getElementById('reportCardPreview');
        if (reportCardPreview) {
            reportCardPreview.style.display = 'none';
        }
        
        // Show all cards container
        const allCardsContainer = document.getElementById('allCardsContainer');
        if (allCardsContainer) {
            allCardsContainer.style.display = 'block';
        }
        
        const allCardsPreview = document.getElementById('allCardsPreview');
        if (!allCardsPreview) {
            throw new Error('All cards preview container not found');
        }
        
        allCardsPreview.innerHTML = '';
        
        // Generate card for each student
        for (const student of students) {
            try {
                const response = await fetchWithTimeout(
                    `${API_BASE}/averages/${className}/${student.matricule}/term/${term}`,
                    { timeout: 15000 }
                );
                
                if (!response.ok) {
                    console.error(`Failed to get data for ${student.matricule}: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                
                if (!data.student || !data.subjectAverages) {
                    console.error(`Invalid data for ${student.matricule}`);
                    continue;
                }
                
                // Generate card HTML for this student
                const cardHtml = generateReportCardHTML(data, className, term);
                
                // Add to container
                const cardDiv = document.createElement('div');
                cardDiv.className = 'report-card-page';
                cardDiv.innerHTML = cardHtml;
                allCardsPreview.appendChild(cardDiv);
                
                // Add page break for printing
                const pageBreak = document.createElement('div');
                pageBreak.style.pageBreakAfter = 'always';
                pageBreak.style.marginBottom = '30px';
                allCardsPreview.appendChild(pageBreak);
                
            } catch (error) {
                console.error(`Error generating card for ${student.matricule}:`, error);
            }
        }
        
        hideLoading();
        showToast(`Generated ${students.length} report cards for ${className}`, 'success');
        
        // Scroll to the all cards section
        if (allCardsContainer) {
            allCardsContainer.scrollIntoView({ behavior: 'smooth' });
        }
        
    } catch (error) {
        console.error('Error generating all report cards:', error);
        hideLoading();
        showToast('Failed to generate all report cards', 'error');
    }
}

// Generate report card HTML (for single and multiple cards)
function generateReportCardHTML(data, className, term) {
    const student = data.student;
    const termAverage = data.termAverage20 || "0.00";
    
    // Group subjects by group
    const groups = {
        1: { subjects: [], totalCoefficient: 0, totalWeighted: 0 },
        2: { subjects: [], totalCoefficient: 0, totalWeighted: 0 },
        3: { subjects: [], totalCoefficient: 0, totalWeighted: 0 }
    };
    
    (data.subjectAverages || []).forEach(subject => {
        const group = subject.group || 1;
        groups[group].subjects.push(subject);
        groups[group].totalCoefficient += subject.coefficient || 1;
        groups[group].totalWeighted += (parseFloat(subject.average20 || 0) * (subject.coefficient || 1));
    });
    
    // Calculate group averages
    Object.keys(groups).forEach(group => {
        const g = groups[group];
        g.average = g.totalCoefficient > 0 ? (g.totalWeighted / g.totalCoefficient).toFixed(2) : '0.00';
    });
    
    // Determine sessions based on term
    const sessionHeaders = {
        1: ['CC1', 'DS1', 'CC2', 'DS2'],
        2: ['CC1', 'DS1', 'CC2', 'DS2', 'CC3', 'DS3', 'CC4', 'DS4'],
        3: ['CC1', 'DS1', 'CC2', 'DS2', 'CC3', 'DS3', 'CC4', 'DS4', 'CC5', 'DS5']
    };
    
    const sessions = sessionHeaders[term] || sessionHeaders[1];
    const totalCols = 7 + sessions.length; // Subject + sessions + Term + Remarks
    
    let html = `
        <div class="report-card-preview-content">
            <!-- Header -->
            <div class="report-card-header">
                <div class="school-header">
                    <div class="school-left">
                        <h1>REPUBLIQUE DU CAMEROUN</h1>
                        <p>Paix-Travail-Patrie</p>
                        <h2>${AppState.settings.school?.name || 'COMPLEXE SCOLAIRE BILINGUE LA TRIDYL'}</h2>
                        <p>${AppState.settings.school?.address || 'BP : 1748 Douala Tel. : 686 62 44 83/683 62 71 17'}</p>
                    </div>
                    <div class="logo-space">
                        <div class="logo-placeholder">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                    </div>
                    <div class="school-right">
                        <h1>REPUBLIC OF CAMEROON</h1>
                        <p>Peace-Work-Fatherland</p>
                        <h2>${AppState.settings.school?.name || 'LA TRIDYL BILINGUAL SCHOOL COMPLEX'}</h2>
                        <p>${AppState.settings.school?.address || 'P.O. Box : 1748 Douala Phone : 686 62 44 83/683 62 71 17'}</p>
                    </div>
                </div>
                
                <div class="report-title">
                    REPORT CARD Term ${term} / ${AppState.settings.school?.academicYear || '2024-2025'}
                </div>
            </div>
            
            <!-- Student Info -->
            <div class="student-section">
                <div class="student-info">
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Name(s) and Surname(s)</td>
                            <td>${student.name || ''}</td>
                            <td class="info-label">Reg. Number</td>
                            <td>${student.matricule || ''}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Date of Birth</td>
                            <td>${formatDate(student.birthDate)}</td>
                            <td class="info-label">Class</td>
                            <td>${className}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Place of Birth</td>
                            <td>${student.birthPlace || 'N/A'}</td>
                            <td class="info-label">Academic Year</td>
                            <td>${AppState.settings.school?.academicYear || '2024-2025'}</td>
                        </tr>
                        <tr>
                            <td class="info-label">Sex</td>
                            <td>${student.sexe === 'M' ? 'Male' : 'Female'}</td>
                            <td class="info-label">Number On Roll</td>
                            <td>${AppState.students[className]?.length || 0}</td>
                        </tr>
                    </table>
                </div>
                <div class="student-photo">
                    <div class="photo-placeholder">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="photo-label">Photo</div>
                </div>
            </div>
            
            <!-- Grades Table -->
            <table class="grades-table">
                <thead>
                    <tr>
                        <th class="col-subject">SUBJECTS</th>
    `;
    
    // Add session headers
    sessions.forEach(session => {
        html += `<th class="col-session">${session}</th>`;
    });
    
    html += `
                        <th class="col-term">Term ${term}</th>
                        <th class="col-remark">Remarks</th>
                        <th class="col-teacher">Class Teachers</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Group 1
    html += `<tr><td class="group-header" colspan="${totalCols}">Groupe 1</td></tr>`;
    (groups[1].subjects || []).forEach(subject => {
        html += `
            <tr>
                <td class="subject-cell">${subject.subject || subject.name}</td>
        `;
        
        // Session columns
        for (let i = 0; i < sessions.length; i++) {
            html += '<td>-</td>';
        }
        
        html += `
                <td class="term-grade">${subject.average20 || "0.00"}</td>
                <td class="remark">${subject.appreciation || getRemark(parseFloat(subject.average20 || 0))}</td>
                <td class="teacher">-</td>
            </tr>
        `;
    });
    
    // Group 2
    if (groups[2].subjects.length > 0) {
        html += `<tr><td class="group-header" colspan="${totalCols}">Groupe 2</td></tr>`;
        groups[2].subjects.forEach(subject => {
            html += `
                <tr>
                    <td class="subject-cell">${subject.subject || subject.name}</td>
            `;
            
            // Session columns
            for (let i = 0; i < sessions.length; i++) {
                html += '<td>-</td>';
            }
            
            html += `
                    <td class="term-grade">${subject.average20 || "0.00"}</td>
                    <td class="remark">${subject.appreciation || getRemark(parseFloat(subject.average20 || 0))}</td>
                    <td class="teacher">-</td>
                </tr>
            `;
        });
    }
    
    // Group 3
    if (groups[3].subjects.length > 0) {
        html += `<tr><td class="group-header" colspan="${totalCols}">Groupe 3</td></tr>`;
        groups[3].subjects.forEach(subject => {
            html += `
                <tr>
                    <td class="subject-cell">${subject.subject || subject.name}</td>
            `;
            
            // Session columns
            for (let i = 0; i < sessions.length; i++) {
                html += '<td>-</td>';
            }
            
            html += `
                    <td class="term-grade">${subject.average20 || "0.00"}</td>
                    <td class="remark">${subject.appreciation || getRemark(parseFloat(subject.average20 || 0))}</td>
                    <td class="teacher">-</td>
                </tr>
            `;
        });
    }
    
    html += `
                </tbody>
            </table>
            
            <!-- Summary Section -->
            <div class="summary-section">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2">Averages per Seq.</th>
                            <th colspan="2">Academics Term ${term}</th>
                            <th colspan="2">Conduct Term ${term}</th>
                            <th colspan="2">Class council decision</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="summary-left">AVERAGE CA. 1</td>
                            <td>-</td>
                            <td>TOTAL MARKS</td>
                            <td>-</td>
                            <td>TOTAL ABSENCES</td>
                            <td>0 Hour(s)</td>
                            <td>DISCIPLINARY WARNING</td>
                            <td>NO</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE EVAL. 1</td>
                            <td>-</td>
                            <td>TOTAL COEFF</td>
                            <td>${data.totalCoefficient || 0}</td>
                            <td>UNJUSTIFIED ABSENCES</td>
                            <td>0 Hour(s)</td>
                            <td>SERIOUS DISCIPLINARY WARNING</td>
                            <td>NO</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE CA. 2</td>
                            <td>-</td>
                            <td>AVERAGE</td>
                            <td>${termAverage}</td>
                            <td>DETENTIONS (Days)</td>
                            <td>0 Day(s)</td>
                            <td>HONOR ROLL</td>
                            <td>${parseFloat(termAverage) >= 16 ? 'YES' : 'NO'}</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE EVAL. 2</td>
                            <td>-</td>
                            <td>POSITION</td>
                            <td>${data.rank || '-'} / ${AppState.students[className]?.length || 0}</td>
                            <td>DETENTIONS (Hours)</td>
                            <td>0 Hour(s)</td>
                            <td>ENCOURAGEMENTS</td>
                            <td>${parseFloat(termAverage) >= 14 ? 'YES' : 'NO'}</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE CA. 3</td>
                            <td>-</td>
                            <td>AVERAGE OF THE BEST</td>
                            <td>-</td>
                            <td>SUSPENSIONS (Days)</td>
                            <td>0 Day(s)</td>
                            <td>DISTINCTIONS / VACATION</td>
                            <td>${parseFloat(termAverage) >= 12 ? 'YES' : 'NO'}</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE EVAL. 3</td>
                            <td>-</td>
                            <td>AVERAGE OF THE LAST</td>
                            <td>-</td>
                            <td>SUSPENSIONS (Hours)</td>
                            <td>0 Hour(s)</td>
                            <td>ACADEMIC WARNING</td>
                            <td>${parseFloat(termAverage) < 10 ? 'YES' : 'NO'}</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE TEAM 1</td>
                            <td>-</td>
                            <td>AVERAGE OF THE CLASS</td>
                            <td>-</td>
                            <td></td>
                            <td></td>
                            <td>SERIOUS ACADEMIC WARNING</td>
                            <td>${parseFloat(termAverage) < 8 ? 'YES' : 'NO'}</td>
                        </tr>
                        <tr>
                            <td class="summary-left">AVERAGE TEAM 2</td>
                            <td>-</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>DECISION OF THE CLASS COUNCIL</td>
                            <td>${data.councilDecision || getCouncilDecision(parseFloat(termAverage))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Term Average -->
            <div class="term-average">
                <span>AVERAGE TERM ${term}:</span> 
                <span class="average-value">${termAverage}</span>
            </div>
            
            <!-- Signatures -->
            <div class="teachers-section">
                <div class="signatures-title">SIGNATURES</div>
                <div class="signatures">
                    <span class="teacher-signature">Class Master</span>
                    <span class="teacher-signature">Principal</span>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer-note">
                Complaints are received (01) week latest after the distribution of report cards
            </div>
            
            <div class="academic-system">
                Logical Academy System - FONING B INTELLIGENCE INTERFACE (02) Tel: +237 673699442 / +237 696053829
            </div>
        </div>
    `;
    
    return html;
}

async function generateReportCard() {
    const className = AppState.currentClass;
    const matricule = AppState.currentStudent;
    const term = AppState.currentTerm;
    
    if (!className || !matricule || !term) {
        showToast('Please load student data first', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(
            `${API_BASE}/averages/${className}/${matricule}/term/${term}`,
            { timeout: 15000 }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Vérifier que les données nécessaires sont présentes
        if (!data.student || !data.subjectAverages) {
            throw new Error('Invalid data received from server');
        }
        
        // Hide all cards container
        const allCardsContainer = document.getElementById('allCardsContainer');
        if (allCardsContainer) {
            allCardsContainer.style.display = 'none';
        }
        
        // Show single card preview
        const preview = document.getElementById('reportCardPreview');
        if (preview) {
            preview.style.display = 'block';
        }
        
        // Render single card
        const cardHtml = generateReportCardHTML(data, className, term);
        if (preview) {
            preview.innerHTML = cardHtml;
        }
        
        hideLoading();
        showToast('Report card generated successfully', 'success');
        
        // Activer les boutons d'impression et d'export
        const printCardBtn = document.getElementById('printCardBtn');
        const exportCardBtn = document.getElementById('exportCardBtn');
        
        if (printCardBtn) printCardBtn.disabled = false;
        if (exportCardBtn) exportCardBtn.disabled = false;
        
    } catch (error) {
        console.error('Error generating report card:', error);
        hideLoading();
        showToast('Failed to generate report card. Please try again.', 'error');
    }
}

function getRemark(average) {
    if (average >= 16) return 'Excellent';
    if (average >= 14) return 'Very Good';
    if (average >= 12) return 'Good';
    if (average >= 10) return 'Passable';
    return 'Insufficient';
}

function getCouncilDecision(average) {
    if (average >= 10) return 'PASSABLE';
    if (average >= 8) return 'ACADEMIC WARNING';
    return 'SERIOUS ACADEMIC WARNING';
}

function printReportCard() {
    const preview = document.getElementById('reportCardPreview');
    if (!preview) return;
    
    const printContent = preview.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Card - Term ${AppState.currentTerm}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
                .report-card-preview-content { max-width: 1000px; margin: 0 auto; }
                .report-card-header { text-align: center; margin-bottom: 20px; }
                .school-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .school-left, .school-right { flex: 1; }
                .school-left h1, .school-right h1 { font-size: 14px; margin: 0; }
                .school-left h2, .school-right h2 { font-size: 16px; margin: 5px 0; font-weight: bold; }
                .school-left p, .school-right p { font-size: 11px; margin: 0; }
                .logo-space { padding: 0 20px; }
                .logo-placeholder { width: 70px; height: 70px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; }
                .report-title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; padding: 10px; background: #2C5E3A; color: white; }
                .student-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .student-info { flex: 1; }
                .info-table { width: 100%; border-collapse: collapse; }
                .info-table td { padding: 5px; border: 1px solid #ddd; }
                .info-label { font-weight: bold; width: 30%; background: #f5f5f5; }
                .student-photo { width: 120px; text-align: center; }
                .photo-placeholder { width: 100px; height: 120px; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #999; }
                .photo-label { margin-top: 5px; font-size: 11px; }
                .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .grades-table th, .grades-table td { border: 1px solid #000; padding: 6px; text-align: center; }
                .grades-table th { background: #f0f0f0; font-weight: bold; }
                .group-header { background: #e0e0e0; font-weight: bold; text-align: left !important; padding-left: 10px !important; }
                .subject-cell { text-align: left !important; padding-left: 10px !important; }
                .term-grade { font-weight: bold; }
                .remark { font-weight: bold; }
                .summary-section { margin-bottom: 20px; }
                .summary-table { width: 100%; border-collapse: collapse; }
                .summary-table th, .summary-table td { border: 1px solid #000; padding: 6px; }
                .summary-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
                .summary-left { text-align: left; font-weight: bold; }
                .term-average { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; }
                .average-value { font-size: 20px; color: #2C5E3A; }
                .teachers-section { margin-top: 30px; }
                .signatures-title { text-align: center; font-weight: bold; margin-bottom: 10px; }
                .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
                .teacher-signature { text-align: center; }
                .footer-note { text-align: center; font-size: 11px; margin-top: 20px; color: #666; }
                .academic-system { text-align: center; font-size: 10px; margin-top: 10px; color: #999; }
                @media print {
                    body { margin: 0; }
                    .report-card-preview-content { width: 100%; }
                    @page { margin: 15mm; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div style="text-align: center; margin-top: 30px; display: none;">
                <button onclick="window.print()">Print</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    switchTab('report-cards');
}

// Print all report cards
function printAllReportCards() {
    const allCardsPreview = document.getElementById('allCardsPreview');
    if (!allCardsPreview) return;
    
    const printContent = allCardsPreview.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>All Report Cards - ${AppState.currentClass} - Term ${AppState.currentTerm}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
                .report-card-page { page-break-after: always; margin-bottom: 30px; }
                .report-card-preview-content { max-width: 1000px; margin: 0 auto; }
                .report-card-header { text-align: center; margin-bottom: 20px; }
                .school-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .school-left, .school-right { flex: 1; }
                .school-left h1, .school-right h1 { font-size: 14px; margin: 0; }
                .school-left h2, .school-right h2 { font-size: 16px; margin: 5px 0; font-weight: bold; }
                .school-left p, .school-right p { font-size: 11px; margin: 0; }
                .logo-space { padding: 0 20px; }
                .logo-placeholder { width: 70px; height: 70px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; }
                .report-title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; padding: 10px; background: #2C5E3A; color: white; }
                .student-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .student-info { flex: 1; }
                .info-table { width: 100%; border-collapse: collapse; }
                .info-table td { padding: 5px; border: 1px solid #ddd; }
                .info-label { font-weight: bold; width: 30%; background: #f5f5f5; }
                .student-photo { width: 120px; text-align: center; }
                .photo-placeholder { width: 100px; height: 120px; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 40px; color: #999; }
                .photo-label { margin-top: 5px; font-size: 11px; }
                .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .grades-table th, .grades-table td { border: 1px solid #000; padding: 6px; text-align: center; }
                .grades-table th { background: #f0f0f0; font-weight: bold; }
                .group-header { background: #e0e0e0; font-weight: bold; text-align: left !important; padding-left: 10px !important; }
                .subject-cell { text-align: left !important; padding-left: 10px !important; }
                .term-grade { font-weight: bold; }
                .remark { font-weight: bold; }
                .summary-section { margin-bottom: 20px; }
                .summary-table { width: 100%; border-collapse: collapse; }
                .summary-table th, .summary-table td { border: 1px solid #000; padding: 6px; }
                .summary-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
                .summary-left { text-align: left; font-weight: bold; }
                .term-average { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; }
                .average-value { font-size: 20px; color: #2C5E3A; }
                .teachers-section { margin-top: 30px; }
                .signatures-title { text-align: center; font-weight: bold; margin-bottom: 10px; }
                .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
                .teacher-signature { text-align: center; }
                .footer-note { text-align: center; font-size: 11px; margin-top: 20px; color: #666; }
                .academic-system { text-align: center; font-size: 10px; margin-top: 10px; color: #999; }
                @media print {
                    body { margin: 0; }
                    .report-card-preview-content { width: 100%; }
                    @page { margin: 15mm; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div style="text-align: center; margin-top: 30px; display: none;">
                <button onclick="window.print()">Print All Cards</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    switchTab('report-cards');
}

// Export all report cards as PDF
async function exportAllReportCards() {
    const className = document.getElementById('cardClass').value;
    const term = document.getElementById('cardTerm').value;
    
    if (!className) {
        showToast('Please select class first', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/reports/cards/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                className: className,
                term: term
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            hideLoading();
            
            if (result.success) {
                showToast('Bulk PDF generation feature is ready - server returns placeholder', 'info');
                
                console.log('Server response for bulk PDF:', result);
            } else {
                showToast('Failed to generate bulk PDFs', 'error');
            }
        } else {
            throw new Error('Failed to generate PDFs');
        }
    } catch (error) {
        console.error('Error exporting all report cards:', error);
        hideLoading();
        showToast('Failed to export all report cards as PDFs. Please try printing instead.', 'error');
    }
}

// Export single report card as PDF
async function exportReportCard() {
    if (!AppState.currentClass || !AppState.currentStudent || !AppState.currentTerm) {
        showToast('Please generate a report card first', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/reports/card/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                className: AppState.currentClass,
                matricule: AppState.currentStudent,
                term: AppState.currentTerm
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            hideLoading();
            showToast(result.message || 'PDF export feature is ready - server returns placeholder', 'info');
        } else {
            throw new Error('Failed to generate PDF');
        }
    } catch (error) {
        console.error('Error exporting report card:', error);
        hideLoading();
        showToast('Failed to export report card as PDF. Please try printing instead.', 'error');
    }
}

// PVR Functions
async function loadPVRData() {
    const className = document.getElementById('pvrClass').value;
    const term = document.getElementById('pvrTerm').value;
    const sessionType = document.getElementById('pvrSession').value;
    
    if (!className) {
        showToast('Please select class', 'warning');
        return;
    }
    
    // Enable generate button
    const generatePVRBtn = document.getElementById('generatePVRBtn');
    if (generatePVRBtn) {
        generatePVRBtn.disabled = false;
    }
    
    AppState.currentClass = className;
    AppState.currentTerm = parseInt(term);
    AppState.currentSessionType = sessionType;
    
    showToast('PVR data loaded', 'success');
}

async function generatePVR() {
    if (!AppState.currentClass) {
        showToast('Please load PVR data first', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/reports/pvr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                className: AppState.currentClass,
                term: AppState.currentTerm,
                sessionType: AppState.currentSessionType
            }),
            timeout: 15000
        });
        
        const pvrData = await response.json();
        
        renderPVR(pvrData);
        
        hideLoading();
        showToast('PVR generated successfully', 'success');
        
        // Enable print button
        const printPVRBtn = document.getElementById('printPVRBtn');
        if (printPVRBtn) {
            printPVRBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Error generating PVR:', error);
        hideLoading();
        showToast('Failed to generate PVR', 'error');
    }
}

function renderPVR(pvrData) {
    const container = document.getElementById('pvrContainer');
    if (!container) return;
    
    let html = `
        <div class="pvr-header">
            <h3>PROCÈS-VERBAL DES NOTES - ${pvrData.className} - Term ${pvrData.term}</h3>
            <p>Date: ${pvrData.date} | Session Type: ${pvrData.sessionType.toUpperCase()}</p>
        </div>
        
        <div class="pvr-statistics">
            <h4>Class Statistics</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total Students:</span>
                    <span class="stat-value">${pvrData.statistics?.totalStudents || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Male Students:</span>
                    <span class="stat-value">${pvrData.statistics?.maleStudents || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Female Students:</span>
                    <span class="stat-value">${pvrData.statistics?.femaleStudents || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Overall Average:</span>
                    <span class="stat-value">${pvrData.statistics?.overallAverage20 || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Highest Average:</span>
                    <span class="stat-value">${pvrData.statistics?.highestAverage20 || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Lowest Average:</span>
                    <span class="stat-value">${pvrData.statistics?.lowestAverage20 || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Success Rate:</span>
                    <span class="stat-value">${pvrData.statistics?.successRate || 0}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Passed:</span>
                    <span class="stat-value">${pvrData.statistics?.passed || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Failed:</span>
                    <span class="stat-value">${pvrData.statistics?.failed || 0}</span>
                </div>
            </div>
        </div>
        
        <div class="pvr-table-container">
            <table class="pvr-table">
                <thead>
                    <tr>
                        <th rowspan="2">No.</th>
                        <th rowspan="2">Matricule</th>
                        <th rowspan="2">Name</th>
    `;
    
    // Subject headers
    (pvrData.subjects || []).forEach(subject => {
        html += `<th colspan="2">${subject.name}</th>`;
    });
    
    html += `
                        <th rowspan="2">Average</th>
                        <th rowspan="2">Rank</th>
                    </tr>
                    <tr>
    `;
    
    // Sub-columns for each subject
    (pvrData.subjects || []).forEach(() => {
        html += `
            <th>CC</th>
            <th>DS</th>
        `;
    });
    
    html += `
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Sort students alphabetically but show rank from sorted by average
    const studentsByAverage = [...(pvrData.students || [])].sort((a, b) => {
        const avgA = parseFloat(a.overallAverage20) || 0;
        const avgB = parseFloat(b.overallAverage20) || 0;
        return avgB - avgA;
    });
    
    // Create rank mapping
    const rankMap = {};
    studentsByAverage.forEach((student, index) => {
        rankMap[student.matricule] = index + 1;
    });
    
    // Sort students alphabetically for display
    const studentsAlphabetical = [...(pvrData.students || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Student rows
    studentsAlphabetical.forEach((student, index) => {
        const rank = rankMap[student.matricule] || (index + 1);
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${student.matricule || ''}</td>
                <td>${student.name || ''}</td>
        `;
        
        // Subject grades
        (pvrData.subjects || []).forEach(subject => {
            const grades = student.grades?.[subject.code];
            const ccGrade = grades && grades.cc1 ? grades.cc1.grade : '-';
            const dsGrade = grades && grades.ds1 ? grades.ds1.grade : '-';
            
            html += `
                <td>${ccGrade}</td>
                <td>${dsGrade}</td>
            `;
        });
        
        html += `
                <td class="average">${student.overallAverage20 || '-'}</td>
                <td class="rank">${rank}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

function printPVR() {
    const container = document.getElementById('pvrContainer');
    if (!container) return;
    
    const printContent = container.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>PVR Summary</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 10px; }
                .pvr-header { text-align: center; margin-bottom: 20px; }
                .pvr-header h3 { color: #2C5E3A; margin-bottom: 10px; }
                .pvr-statistics { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
                .stat-item { display: flex; justify-content: space-between; }
                .stat-label { font-weight: bold; }
                .pvr-table-container { overflow-x: auto; }
                .pvr-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9px; }
                .pvr-table th, .pvr-table td { border: 1px solid #ddd; padding: 4px; text-align: center; }
                .pvr-table th { background-color: #2C5E3A; color: white; }
                .pvr-table tr:nth-child(even) { background-color: #f9f9f9; }
                .average { font-weight: bold; }
                .rank { font-weight: bold; color: #C62828; }
                @media print {
                    body { margin: 0; font-size: 8px; }
                    .no-print { display: none; }
                    @page { size: landscape; }
                }
            </style>
        </head>
        <body>
            ${printContent}
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()">Print PVR</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    switchTab('pvr-summary');
}

// Statistics Functions
async function loadStatistics() {
    const className = document.getElementById('statsClass').value;
    const term = document.getElementById('statsTerm').value;
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/statistics`, {
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        
        renderStatistics(stats);
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        hideLoading();
        showToast('Failed to load statistics', 'error');
    }
}

function renderStatistics(stats) {
    // Update gender chart
    createGenderChart(stats.enrollment?.totalMale || 0, stats.enrollment?.totalFemale || 0);
    
    // Update performance chart
    createPerformanceChart(stats.enrollment?.byClass || {});
    
    // Update success rate
    updateSuccessRate(stats);
    
    // Update top students
    updateTopStudents();
    
    // Update detailed statistics table
    updateDetailedStats(stats);
}

function createGenderChart(maleCount, femaleCount) {
    const ctx = document.getElementById('genderChart');
    if (!ctx) return;
    
    if (AppState.charts.gender) {
        AppState.charts.gender.destroy();
    }
    
    AppState.charts.gender = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [maleCount, femaleCount],
                backgroundColor: ['#1565C0', '#C2185B'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createPerformanceChart(classStats) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    if (AppState.charts.performance) {
        AppState.charts.performance.destroy();
    }
    
    const classes = Object.keys(classStats).sort();
    const maleData = classes.map(className => classStats[className]?.male || 0);
    const femaleData = classes.map(className => classStats[className]?.female || 0);
    
    AppState.charts.performance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: classes,
            datasets: [
                {
                    label: 'Male',
                    data: maleData,
                    backgroundColor: '#1565C0',
                    borderColor: '#0D47A1',
                    borderWidth: 1
                },
                {
                    label: 'Female',
                    data: femaleData,
                    backgroundColor: '#C2185B',
                    borderColor: '#880E4F',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function updateSuccessRate(stats) {
    // Sample success rate - in real app, this would be calculated from actual grades
    const successRate = 75; // 75% success rate for demo
    const totalStudents = stats.enrollment?.totalStudents || 0;
    const passCount = Math.round((successRate / 100) * totalStudents);
    const failCount = totalStudents - passCount;
    
    const successRateCircle = document.getElementById('successRateCircle');
    if (successRateCircle) {
        successRateCircle.style.background = 
            `conic-gradient(#2E7D32 ${successRate * 3.6}deg, #eee ${successRate * 3.6}deg)`;
        
        const span = successRateCircle.querySelector('span');
        if (span) {
            span.textContent = `${successRate}%`;
        }
    }
    
    const passCountEl = document.getElementById('passCount');
    const failCountEl = document.getElementById('failCount');
    const totalCountEl = document.getElementById('totalCount');
    
    if (passCountEl) passCountEl.textContent = passCount;
    if (failCountEl) failCountEl.textContent = failCount;
    if (totalCountEl) totalCountEl.textContent = totalStudents;
}

function updateTopStudents() {
    const container = document.getElementById('topStudentsList');
    if (!container) return;
    
    // Sample top students - in real app, this would come from actual data
    const topStudents = [
        { name: 'DUPONT John', class: 'FORM 5 SCE', average: 18.5 },
        { name: 'MARTIN Sophie', class: 'FORM 5 ART', average: 17.8 },
        { name: 'DURAND Pierre', class: 'U6 SC', average: 17.2 },
        { name: 'PETIT Marie', class: 'FORM 4 SCE', average: 16.9 },
        { name: 'LEROY Thomas', class: 'L6 ART', average: 16.5 }
    ];
    
    let html = '';
    topStudents.forEach((student, index) => {
        html += `
            <div class="top-student-item">
                <div class="student-rank">${index + 1}</div>
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-class">${student.class}</div>
                </div>
                <div class="student-average">${student.average.toFixed(2)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateDetailedStats(stats) {
    const tbody = document.getElementById('detailedStatsBody');
    if (!tbody) return;
    
    let html = '';
    
    Object.keys(stats.enrollment?.byClass || {}).sort().forEach(className => {
        const classStat = stats.enrollment.byClass[className];
        const total = classStat.total;
        
        // Sample data - in real app, this would come from actual grades
        const averageGrade = (12 + Math.random() * 6).toFixed(2);
        const highestGrade = (16 + Math.random() * 4).toFixed(2);
        const lowestGrade = (6 + Math.random() * 4).toFixed(2);
        const passRate = (60 + Math.random() * 30).toFixed(1);
        
        html += `
            <tr>
                <td>${className}</td>
                <td>${total}</td>
                <td>${averageGrade}</td>
                <td>${highestGrade}</td>
                <td>${lowestGrade}</td>
                <td>${passRate}%</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function refreshStatistics() {
    loadStatistics();
    showToast('Statistics refreshed', 'success');
}

// Student Management Functions
async function loadStudentList() {
    const className = document.getElementById('studentClassFilter').value;
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    
    const tbody = document.getElementById('studentListBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let allStudents = [];
    
    if (className === 'all') {
        Object.keys(AppState.students).forEach(cls => {
            AppState.students[cls].forEach(student => {
                allStudents.push({ ...student, className: cls });
            });
        });
    } else {
        const students = AppState.students[className] || [];
        allStudents = students.map(student => ({ ...student, className }));
    }
    
    // Apply search filter
    if (searchTerm) {
        allStudents = allStudents.filter(student => 
            student.name.toLowerCase().includes(searchTerm) ||
            student.matricule.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort by name
    allStudents.sort((a, b) => a.name.localeCompare(b.name));
    
    // Render students
    allStudents.forEach((student, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.matricule}</td>
            <td>${student.name}</td>
            <td>${student.className}</td>
            <td>${student.sexe === 'M' ? 'Male' : 'Female'}</td>
            <td>${formatDate(student.birthDate)}</td>
            <td>
                <button class="btn-small btn-edit" onclick="editStudent('${student.matricule}', '${student.className}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-danger" onclick="deleteStudentConfirm('${student.matricule}', '${student.className}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function clearStudentForm() {
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.reset();
    }
    
    const studentMatricule = document.getElementById('studentMatricule');
    const studentName = document.getElementById('studentName');
    const studentBirthDate = document.getElementById('studentBirthDate');
    const studentBirthPlace = document.getElementById('studentBirthPlace');
    const studentParent = document.getElementById('studentParent');
    const studentPhone = document.getElementById('studentPhone');
    
    if (studentMatricule) studentMatricule.value = '';
    if (studentName) studentName.value = '';
    if (studentBirthDate) studentBirthDate.valueAsDate = new Date();
    if (studentBirthPlace) studentBirthPlace.value = '';
    if (studentParent) studentParent.value = '';
    if (studentPhone) studentPhone.value = '';
}

function generateMatricule() {
    const className = document.getElementById('studentClass').value;
    if (!className) return;
    
    // Generate a simple matricule based on class and timestamp
    const timestamp = Date.now().toString().slice(-4);
    const classCode = className.replace(/[^A-Z]/g, '').slice(0, 3);
    const matricule = `${classCode}${timestamp}`;
    
    const studentMatricule = document.getElementById('studentMatricule');
    if (studentMatricule) {
        studentMatricule.value = matricule;
    }
}

async function saveStudent(e) {
    e.preventDefault();
    
    const studentMatricule = document.getElementById('studentMatricule');
    const studentName = document.getElementById('studentName');
    const studentGender = document.getElementById('studentGender');
    const studentBirthDate = document.getElementById('studentBirthDate');
    const studentBirthPlace = document.getElementById('studentBirthPlace');
    const studentParent = document.getElementById('studentParent');
    const studentPhone = document.getElementById('studentPhone');
    const studentClass = document.getElementById('studentClass');
    
    if (!studentMatricule || !studentName || !studentGender || !studentBirthDate || !studentClass) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    
    const student = {
        matricule: studentMatricule.value,
        name: studentName.value,
        sexe: studentGender.value,
        birthDate: studentBirthDate.value,
        birthPlace: studentBirthPlace ? studentBirthPlace.value : '',
        parent: studentParent ? studentParent.value : '',
        phone: studentPhone ? studentPhone.value : ''
    };
    
    const className = studentClass.value;
    
    if (!student.matricule || !student.name || !student.sexe || !student.birthDate || !className) {
        showToast('Please fill all required fields', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student, className }),
            timeout: 10000
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            showToast('Student saved successfully', 'success');
            clearStudentForm();
            // Reload students
            await loadStudents();
            loadStudentList();
        } else {
            showToast(result.message || 'Failed to save student', 'error');
        }
        
    } catch (error) {
        console.error('Error saving student:', error);
        hideLoading();
        showToast('Failed to save student. Please check your connection.', 'error');
    }
}

function editStudent(matricule, className) {
    const students = AppState.students[className] || [];
    const student = students.find(s => s.matricule === matricule);
    
    if (!student) {
        showToast('Student not found', 'error');
        return;
    }
    
    const studentMatricule = document.getElementById('studentMatricule');
    const studentName = document.getElementById('studentName');
    const studentClass = document.getElementById('studentClass');
    const studentGender = document.getElementById('studentGender');
    const studentBirthDate = document.getElementById('studentBirthDate');
    const studentBirthPlace = document.getElementById('studentBirthPlace');
    const studentParent = document.getElementById('studentParent');
    const studentPhone = document.getElementById('studentPhone');
    
    if (studentMatricule) studentMatricule.value = student.matricule;
    if (studentName) studentName.value = student.name;
    if (studentClass) studentClass.value = className;
    if (studentGender) studentGender.value = student.sexe;
    if (studentBirthDate) studentBirthDate.value = student.birthDate;
    if (studentBirthPlace) studentBirthPlace.value = student.birthPlace || '';
    if (studentParent) studentParent.value = student.parent || '';
    if (studentPhone) studentPhone.value = student.phone || '';
    
    // Scroll to form
    const studentFormSection = document.querySelector('.student-form-section');
    if (studentFormSection) {
        studentFormSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteStudentConfirm(matricule, className) {
    showConfirmationModal(
        'Delete Student',
        `Are you sure you want to delete student ${matricule}? This action cannot be undone.`,
        () => deleteStudent(matricule, className)
    );
}

async function deleteStudent(matricule, className) {
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/students/${className}/${matricule}`, {
            method: 'DELETE',
            timeout: 10000
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            showToast('Student deleted successfully', 'success');
            // Reload students
            await loadStudents();
            loadStudentList();
        } else {
            showToast(result.message || 'Failed to delete student', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting student:', error);
        hideLoading();
        showToast('Failed to delete student', 'error');
    }
}

// Settings Functions
function updateSubjectList() {
    const container = document.getElementById('subjectList');
    if (!container) return;
    
    container.innerHTML = '';
    
    AppState.subjects.forEach(subject => {
        const li = document.createElement('li');
        li.textContent = `${subject.code} - ${subject.name}`;
        li.dataset.code = subject.code;
        container.appendChild(li);
    });
}

function handleSubjectSelection(e) {
    if (e.target.tagName === 'LI') {
        // Remove previous selection
        document.querySelectorAll('#subjectList li').forEach(li => {
            li.classList.remove('selected');
        });
        
        // Select clicked item
        e.target.classList.add('selected');
        
        // Load subject data
        const subjectCode = e.target.dataset.code;
        const subject = AppState.subjects.find(s => s.code === subjectCode);
        
        if (subject) {
            const subjectCodeInput = document.getElementById('subjectCode');
            const subjectNameInput = document.getElementById('subjectName');
            const subjectGroupInput = document.getElementById('subjectGroup');
            const subjectCoefficientInput = document.getElementById('subjectCoefficient');
            
            if (subjectCodeInput) subjectCodeInput.value = subject.code;
            if (subjectNameInput) subjectNameInput.value = subject.name;
            if (subjectGroupInput) subjectGroupInput.value = subject.group;
            if (subjectCoefficientInput) subjectCoefficientInput.value = subject.coefficient;
        }
    }
}

function addSubject() {
    clearSubjectForm();
}

function clearSubjectForm() {
    const subjectCode = document.getElementById('subjectCode');
    const subjectName = document.getElementById('subjectName');
    const subjectGroup = document.getElementById('subjectGroup');
    const subjectCoefficient = document.getElementById('subjectCoefficient');
    
    if (subjectCode) subjectCode.value = '';
    if (subjectName) subjectName.value = '';
    if (subjectGroup) subjectGroup.value = '1';
    if (subjectCoefficient) subjectCoefficient.value = '1';
    
    // Clear selection
    document.querySelectorAll('#subjectList li').forEach(li => {
        li.classList.remove('selected');
    });
}

async function saveSubject() {
    const subjectCode = document.getElementById('subjectCode');
    const subjectName = document.getElementById('subjectName');
    const subjectGroup = document.getElementById('subjectGroup');
    const subjectCoefficient = document.getElementById('subjectCoefficient');
    
    if (!subjectCode || !subjectName || !subjectGroup || !subjectCoefficient) {
        showToast('Form elements not found', 'error');
        return;
    }
    
    const subject = {
        code: subjectCode.value.toUpperCase(),
        name: subjectName.value,
        group: parseInt(subjectGroup.value),
        coefficient: parseInt(subjectCoefficient.value)
    };
    
    if (!subject.code || !subject.name) {
        showToast('Please fill subject code and name', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject }),
            timeout: 10000
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            showToast('Subject saved successfully', 'success');
            // Reload subjects
            await loadSubjects();
            clearSubjectForm();
        } else {
            showToast(result.message || 'Failed to save subject', 'error');
        }
        
    } catch (error) {
        console.error('Error saving subject:', error);
        hideLoading();
        showToast('Failed to save subject', 'error');
    }
}

async function deleteSubject() {
    const subjectCode = document.getElementById('subjectCode');
    if (!subjectCode) return;
    
    const code = subjectCode.value;
    
    if (!code) {
        showToast('Please select a subject to delete', 'warning');
        return;
    }
    
    showConfirmationModal(
        'Delete Subject',
        `Are you sure you want to delete subject ${code}?`,
        async () => {
            showLoading();
            
            try {
                const response = await fetchWithTimeout(`${API_BASE}/subjects/${code}`, {
                    method: 'DELETE',
                    timeout: 10000
                });
                
                const result = await response.json();
                
                hideLoading();
                
                if (result.success) {
                    showToast('Subject deleted successfully', 'success');
                    // Reload subjects
                    await loadSubjects();
                    clearSubjectForm();
                } else {
                    showToast(result.message || 'Failed to delete subject', 'error');
                }
                
            } catch (error) {
                console.error('Error deleting subject:', error);
                hideLoading();
                showToast('Failed to delete subject', 'error');
            }
        }
    );
}

async function saveSettings() {
    const schoolName = document.getElementById('schoolName');
    const schoolAddress = document.getElementById('schoolAddress');
    const schoolPhone = document.getElementById('schoolPhone');
    const academicYear = document.getElementById('academicYear');
    const autoPrint = document.getElementById('autoPrint');
    const showRank = document.getElementById('showRank');
    const showStatistics = document.getElementById('showStatistics');
    
    if (!schoolName || !schoolAddress || !schoolPhone || !academicYear || !autoPrint || !showRank || !showStatistics) {
        showToast('Settings form elements not found', 'error');
        return;
    }
    
    const settings = {
        school: {
            name: schoolName.value,
            address: schoolAddress.value,
            phone: schoolPhone.value,
            academicYear: academicYear.value
        },
        printing: {
            autoPrint: autoPrint.checked,
            showRank: showRank.checked,
            showStatistics: showStatistics.checked
        }
    };
    
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
            timeout: 10000
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            showToast('Settings saved successfully', 'success');
            AppState.settings = settings;
            const currentYear = document.getElementById('currentYear');
            if (currentYear) {
                currentYear.textContent = settings.school.academicYear;
            }
        } else {
            showToast(result.message || 'Failed to save settings', 'error');
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        hideLoading();
        showToast('Failed to save settings', 'error');
    }
}

async function exportData() {
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/export`, {
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        
        const data = await response.blob();
        
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grade_system_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('Data exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        hideLoading();
        showToast('Failed to export data', 'error');
    }
}

function showImportModal() {
    if (DOM.importModal) {
        DOM.importModal.classList.add('active');
    }
}

function closeImportModal() {
    if (DOM.importModal) {
        DOM.importModal.classList.remove('active');
    }
    if (DOM.importFile) {
        DOM.importFile.value = '';
    }
}

async function importData() {
    if (!DOM.importFile) return;
    
    const file = DOM.importFile.files[0];
    
    if (!file) {
        showToast('Please select a file to import', 'warning');
        return;
    }
    
    if (file.type !== 'application/json') {
        showToast('Please select a JSON file', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const response = await fetchWithTimeout(`${API_BASE}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            timeout: 20000
        });
        
        const result = await response.json();
        
        hideLoading();
        closeImportModal();
        
        if (result.success) {
            showToast('Data imported successfully', 'success');
            // Reload all data
            await initApplication();
        } else {
            showToast(result.message || 'Failed to import data', 'error');
        }
        
    } catch (error) {
        console.error('Error importing data:', error);
        hideLoading();
        closeImportModal();
        showToast('Failed to import data. Invalid file format or server error.', 'error');
    }
}

async function backupData() {
    showLoading();
    
    try {
        const response = await fetchWithTimeout(`${API_BASE}/backup`, {
            timeout: 15000
        });
        
        const result = await response.json();
        
        hideLoading();
        
        if (result.success) {
            showToast('Backup created successfully', 'success');
            const lastBackup = document.getElementById('lastBackup');
            if (lastBackup) {
                lastBackup.textContent = formatDate(result.timestamp);
            }
        } else {
            showToast(result.message || 'Failed to create backup', 'error');
        }
        
    } catch (error) {
        console.error('Error creating backup:', error);
        hideLoading();
        showToast('Failed to create backup', 'error');
    }
}

async function resetData() {
    showConfirmationModal(
        'Reset All Data',
        'WARNING: This will delete ALL data including students, subjects, and grades. This action cannot be undone. Type "YES_RESET_ALL_DATA" to confirm.',
        async () => {
            const confirmText = prompt('Type "YES_RESET_ALL_DATA" to confirm:');
            
            if (confirmText !== 'YES_RESET_ALL_DATA') {
                showToast('Reset cancelled', 'warning');
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetchWithTimeout(`${API_BASE}/reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirm: confirmText }),
                    timeout: 15000
                });
                
                const result = await response.json();
                
                hideLoading();
                
                if (result.success) {
                    showToast('Data reset successfully. Backup has been created.', 'success');
                    // Reload application
                    await initApplication();
                } else {
                    showToast(result.message || 'Failed to reset data', 'error');
                }
                
            } catch (error) {
                console.error('Error resetting data:', error);
                hideLoading();
                showToast('Failed to reset data', 'error');
            }
        }
    );
}

// Modal Functions
let pendingAction = null;

function showConfirmationModal(title, message, confirmAction) {
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    
    pendingAction = confirmAction;
    
    if (DOM.confirmationModal) {
        DOM.confirmationModal.classList.add('active');
    }
}

function confirmModalAction() {
    if (pendingAction) {
        pendingAction();
    }
    closeModal();
}

function closeModal() {
    if (DOM.confirmationModal) {
        DOM.confirmationModal.classList.remove('active');
    }
    pendingAction = null;
}

// Utility Functions
function showLoading() {
    if (DOM.loadingOverlay) {
        DOM.loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    if (DOM.loadingOverlay) {
        DOM.loadingOverlay.classList.remove('active');
    }
}

function showToast(message, type = 'info') {
    if (!DOM.toast) return;
    
    DOM.toast.textContent = message;
    DOM.toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Try parsing as DD/MM/YYYY
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parts[0];
                const month = parts[1];
                const year = parts[2];
                return `${day}/${month}/${year}`;
            }
            return dateString;
        }
        return date.toLocaleDateString('en-GB');
    } catch (error) {
        return dateString;
    }
}

// Make functions available globally for inline event handlers
window.clearStudentGrade = clearStudentGrade;
window.editStudent = editStudent;
window.deleteStudentConfirm = deleteStudentConfirm;
window.calculateStudentGrade = calculateStudentGrade;
window.printAllReportCards = printAllReportCards;
window.exportAllReportCards = exportAllReportCards;
window.exportReportCard = exportReportCard;