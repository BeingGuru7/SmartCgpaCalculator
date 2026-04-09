// ===== Global State =====
const APP_STATE = {
    semesters: [],
    gradingSystem: {},
    currentEditingSubject: null,
    currentEditingSemester: null,
};

// Parse grading system from HTML
// Default grading system
const DEFAULT_GRADING = {
    "O": 10,
    "A+": 9,
    "A": 8,
    "B+": 7,
    "B": 6,
    "C": 5,
    "D": 4,
    "F": 0
};

document.addEventListener('DOMContentLoaded', () => {
    // Get grading system from page
    const gradingSystemStr = document.querySelector('meta[name="grading-system"]')?.content || 
                            (window.GRADING_SYSTEM_JSON || '{}');
    try {
        const parsed = typeof gradingSystemStr === 'string' ? 
            JSON.parse(gradingSystemStr) : gradingSystemStr;
        APP_STATE.gradingSystem = (parsed && Object.keys(parsed).length > 0) ? parsed : DEFAULT_GRADING;
    } catch (e) {
        APP_STATE.gradingSystem = DEFAULT_GRADING;
    }

    // Initialize app
    initializeApp();
});

function initializeApp() {
    // Load data from localStorage
    loadDataFromStorage();
    
    // Ensure grading system has values
    if (!APP_STATE.gradingSystem || Object.keys(APP_STATE.gradingSystem).length === 0) {
        APP_STATE.gradingSystem = DEFAULT_GRADING;
    }
    
    console.log('Grading System:', APP_STATE.gradingSystem);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI
    populateGradeDropdowns();
    renderSemesters();
    
    // Calculate initial CGPA
    calculateCGPA();
    
    // Check for dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon();
    }
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Add semester button
    document.getElementById('addSemesterBtn').addEventListener('click', addNewSemester);

    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Menu dropdown
    document.getElementById('menuBtn').addEventListener('click', toggleDropdownMenu);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelector('.dropdown-menu').classList.remove('show');
        }
    });

    // Menu actions
    document.getElementById('exportJsonBtn').addEventListener('click', exportToJSON);
    document.getElementById('importJsonBtn').addEventListener('click', openImportModal);
    document.getElementById('customGradeBtn').addEventListener('click', openGradingModal);
    document.getElementById('resetBtn').addEventListener('click', resetAllData);

    // Target CGPA calculation
    document.getElementById('calculateTargetBtn').addEventListener('click', calculateTargetCgpa);
    document.getElementById('targetCgpaInput').addEventListener('change', (e) => {
        document.getElementById('targetCgpaRange').value = e.target.value;
    });
    document.getElementById('targetCgpaRange').addEventListener('input', (e) => {
        document.getElementById('targetCgpaInput').value = e.target.value;
    });

    // Upload file handling
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }

    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Import extracted data button - ONLY attach listener ONCE
    const importBtn = document.getElementById('importExtractedBtn');
    if (importBtn) {
        // Clone and replace to remove all old listeners
        const newImportBtn = importBtn.cloneNode(true);
        importBtn.parentNode.replaceChild(newImportBtn, importBtn);
        
        // Attach fresh listener
        newImportBtn.addEventListener('click', importExtractedData);
    }

    // Reset upload button - ONLY attach listener ONCE
    const resetBtn = document.getElementById('resetUploadBtn');
    if (resetBtn) {
        // Clone and replace to remove all old listeners
        const newResetBtn = resetBtn.cloneNode(true);
        resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
        
        // Attach fresh listener
        newResetBtn.addEventListener('click', resetUpload);
    }

    // Import/Export
    document.getElementById('hiddenImportInput').addEventListener('change', handleFileImport);
}

// ===== Tab Switching =====
function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // trigger chart update if analysis tab
    if (tabName === 'analysis') {
        setTimeout(() => updateCGPAChart(), 100);
    }
}

// ===== Semester Management =====
function addNewSemester() {
    const semester = {
        id: Date.now(),
        subjects: []
    };
    APP_STATE.semesters.push(semester);
    saveDataToStorage();
    renderSemesters();
    calculateCGPA();
}

function deleteSemester(semesterId) {
    if (confirm('Are you sure you want to delete this semester? This action cannot be undone.')) {
        APP_STATE.semesters = APP_STATE.semesters.filter(s => s.id !== semesterId);
        saveDataToStorage();
        renderSemesters();
        calculateCGPA();
        showToast('Semester deleted successfully', 'success');
    }
}

function editSemester(semesterId) {
    APP_STATE.currentEditingSemester = semesterId;
    // Could open modal for editing semester name, etc.
}

// ===== Subject Management =====
function openAddSubjectModal(semesterId) {
    APP_STATE.currentEditingSubject = { semesterId, subjectIndex: null };
    document.getElementById('subjectModalTitle').textContent = 'Add Subject';
    document.getElementById('subjectForm').reset();
    
    // Populate grades in the select before opening modal
    const gradeSelect = document.getElementById('subjectGrade');
    if (gradeSelect) {
        gradeSelect.innerHTML = '<option value="">Select Grade</option>';
        const grades = Object.keys(APP_STATE.gradingSystem).sort();
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
    }
    
    document.getElementById('subjectModal').classList.add('show');
    document.getElementById('subjectModal').style.display = 'flex';
}

function openEditSubjectModal(semesterId, subjectIndex) {
    const subject = APP_STATE.semesters.find(s => s.id === semesterId)?.subjects[subjectIndex];
    if (!subject) return;

    APP_STATE.currentEditingSubject = { semesterId, subjectIndex };
    document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
    
    document.getElementById('subjectName').value = subject.name;
    document.getElementById('subjectCredits').value = subject.credits;
    
    // Populate grades in the select before opening modal
    const gradeSelect = document.getElementById('subjectGrade');
    if (gradeSelect) {
        gradeSelect.innerHTML = '<option value="">Select Grade</option>';
        const grades = Object.keys(APP_STATE.gradingSystem).sort();
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
        gradeSelect.value = subject.grade;
    }
    
    document.getElementById('subjectModal').classList.add('show');
    document.getElementById('subjectModal').style.display = 'flex';
}

function closeSubjectModal() {
    document.getElementById('subjectModal').style.display = 'none';
    document.getElementById('subjectModal').classList.remove('show');
    APP_STATE.currentEditingSubject = null;
}

function saveSubject(event) {
    event.preventDefault();

    const name = document.getElementById('subjectName').value.trim();
    const credits = parseFloat(document.getElementById('subjectCredits').value);
    const grade = document.getElementById('subjectGrade').value;

    if (!name || !grade || credits <= 0) {
        showToast('Please fill in all fields correctly', 'error');
        return;
    }

    const { semesterId, subjectIndex } = APP_STATE.currentEditingSubject;
    const semester = APP_STATE.semesters.find(s => s.id === semesterId);

    if (!semester) return;

    const subject = { name, credits, grade };

    if (subjectIndex === null) {
        // Add new subject
        semester.subjects.push(subject);
        showToast('Subject added successfully', 'success');
    } else {
        // Edit existing subject
        semester.subjects[subjectIndex] = subject;
        showToast('Subject updated successfully', 'success');
    }

    saveDataToStorage();
    renderSemesters();
    calculateCGPA();
    closeSubjectModal();
}

function deleteSubject(semesterId, subjectIndex) {
    if (confirm('Delete this subject?')) {
        const semester = APP_STATE.semesters.find(s => s.id === semesterId);
        if (semester) {
            semester.subjects.splice(subjectIndex, 1);
            saveDataToStorage();
            renderSemesters();
            calculateCGPA();
            showToast('Subject deleted', 'success');
        }
    }
}

// ===== Rendering =====
function renderSemesters() {
    const container = document.getElementById('semestersContainer');
    container.innerHTML = '';

    if (APP_STATE.semesters.length === 0) {
        container.innerHTML = '<p class="empty-state">No semesters yet. Add one to get started!</p>';
        return;
    }

    APP_STATE.semesters.forEach((semester, index) => {
        const card = createSemesterCard(semester, index);
        container.appendChild(card);
    });
}

function createSemesterCard(semester, index) {
    const card = document.createElement('div');
    card.className = 'semester-card';
    
    // Calculate SGPA for this semester
    const sgpa = calculateSGPA(semester.subjects);
    const credits = calculateTotalCredits(semester.subjects);

    card.innerHTML = `
        <div class="semester-header">
            <div>
                <h3 class="semester-title">
                    <i class="fas fa-book"></i> Semester ${index + 1}
                </h3>
            </div>
            <div class="semester-stats">
                <div class="semester-stat">
                    <span class="semester-stat-label">SGPA</span>
                    <span class="semester-stat-value">${sgpa.toFixed(2)}</span>
                </div>
                <div class="semester-stat">
                    <span class="semester-stat-label">Credits</span>
                    <span class="semester-stat-value">${credits.toFixed(1)}</span>
                </div>
                <div class="semester-stat">
                    <span class="semester-stat-label">Subjects</span>
                    <span class="semester-stat-value">${semester.subjects.length}</span>
                </div>
            </div>
            <div class="semester-actions">
                <button class="btn-icon" onclick="openAddSubjectModal(${semester.id})" title="Add subject">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteSemester(${semester.id})" title="Delete semester">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>

        <div class="subjects-list">
            ${semester.subjects.length === 0 
                ? '<p class="empty-state">No subjects added. Click + to add one.</p>'
                : semester.subjects.map((subject, subIdx) => createSubjectItem(semester.id, subject, subIdx)).join('')
            }
        </div>
    `;

    return card;
}

function createSubjectItem(semesterId, subject, index) {
    const gradePoints = APP_STATE.gradingSystem[subject.grade] || 0;
    
    return `
        <div class="subject-item">
            <div class="subject-info">
                <div class="subject-name">${subject.name}</div>
                <div class="subject-details">
                    <div class="subject-detail">
                        <i class="fas fa-credit-card"></i>
                        <span>
                            ${subject.credits} 
                            <small>credits</small>
                        </span>
                    </div>
                    <div class="subject-detail">
                        <span class="subject-detail-badge">${subject.grade}</span>
                    </div>
                    <div class="subject-detail">
                        <i class="fas fa-star"></i>
                        <span>${gradePoints} pts</span>
                    </div>
                </div>
            </div>
            <div class="subject-actions">
                <button class="btn btn-secondary btn-small" onclick="openEditSubjectModal(${semesterId}, ${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary btn-small danger" onclick="deleteSubject(${semesterId}, ${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// ===== CGPA Calculations =====
function calculateSGPA(subjects) {
    if (subjects.length === 0) return 0;

    let totalPoints = 0;
    let totalCredits = 0;

    subjects.forEach(subject => {
        const gradePoints = APP_STATE.gradingSystem[subject.grade] || 0;
        const credits = parseFloat(subject.credits) || 0;
        
        totalPoints += gradePoints * credits;
        totalCredits += credits;
    });

    return totalCredits === 0 ? 0 : totalPoints / totalCredits;
}

function calculateTotalCredits(subjects) {
    return subjects.reduce((sum, subject) => sum + (parseFloat(subject.credits) || 0), 0);
}

function calculateCGPA() {
    if (APP_STATE.semesters.length === 0) {
        document.getElementById('overallCgpa').textContent = '0.00';
        document.getElementById('totalCredits').textContent = '0';
        updateCGPAChart();
        return;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    APP_STATE.semesters.forEach(semester => {
        const sgpa = calculateSGPA(semester.subjects);
        const credits = calculateTotalCredits(semester.subjects);
        
        totalPoints += sgpa * credits;
        totalCredits += credits;
    });

    const cgpa = totalCredits === 0 ? 0 : totalPoints / totalCredits;
    
    document.getElementById('overallCgpa').textContent = cgpa.toFixed(2);
    document.getElementById('totalCredits').textContent = totalCredits.toFixed(1);

    // Update analysis tab and chart
    updateAnalysisTab();
    updateCGPAChart();
}

// ===== Analysis Tab =====
function updateAnalysisTab() {
    // Update breakdown
    updateBreakdownDetails();
    
    // Update low performers
    updateLowPerformersDisplay();
}

function updateBreakdownDetails() {
    const container = document.getElementById('breakdownDetails');
    
    if (APP_STATE.semesters.length === 0) {
        container.innerHTML = '<p class="empty-state">Add subjects to see breakdown</p>';
        return;
    }

    let html = '';
    
    APP_STATE.semesters.forEach((semester, semIdx) => {
        if (semester.subjects.length === 0) return;

        const sgpa = calculateSGPA(semester.subjects);
        const credits = calculateTotalCredits(semester.subjects);
        
        let formula = '';
        semester.subjects.forEach(subject => {
            const points = APP_STATE.gradingSystem[subject.grade] || 0;
            formula += `(${points} × ${subject.credits}) + `;
        });
        formula = formula.slice(0, -3);
        
        html += `
            <div class="breakdown-item">
                <div class="breakdown-semester">Semester ${semIdx + 1} - SGPA: ${sgpa.toFixed(2)}</div>
                <div class="breakdown-formula">(${formula}) / ${credits}</div>
            </div>
        `;
    });

    container.innerHTML = html || '<p class="empty-state">No data to display</p>';
}

function updateLowPerformersDisplay() {
    const container = document.getElementById('lowPerformers');
    
    // Identify low performers (grade C or below)
    const lowPerformers = [];
    const thresholdPoints = APP_STATE.gradingSystem['C'] || 5;
    
    APP_STATE.semesters.forEach((semester, semIdx) => {
        semester.subjects.forEach(subject => {
            const gradePoints = APP_STATE.gradingSystem[subject.grade] || 0;
            if (gradePoints <= thresholdPoints) {
                lowPerformers.push({
                    semester: semIdx + 1,
                    subject: subject.name,
                    grade: subject.grade,
                    points: gradePoints,
                    credits: subject.credits
                });
            }
        });
    });

    if (lowPerformers.length === 0) {
        container.innerHTML = '<p class="empty-state">No low-performing subjects found. Great job!</p>';
        return;
    }

    let html = '';
    lowPerformers.forEach(item => {
        html += `
            <div class="low-performer-item">
                <div class="low-performer-name">${item.subject}</div>
                <div class="low-performer-details">
                    <span>Semester ${item.semester}</span>
                    <span>Grade: ${item.grade}</span>
                    <span>${item.credits} credits</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== Target CGPA Logic =====
async function calculateTargetCgpa() {
    const targetCgpa = parseFloat(document.getElementById('targetCgpaInput').value);
    const futureCourses = parseInt(document.getElementById('futureCourses').value);
    const creditsPerCourse = parseFloat(document.getElementById('creditsPerCourse').value);

    if (isNaN(targetCgpa) || !Number.isFinite(targetCgpa) || targetCgpa < 0 || targetCgpa > 10) {
        showToast('Please enter a valid target CGPA (0-10)', 'error');
        return;
    }

    try {
        // Prepare semester data
        const semestersData = APP_STATE.semesters.map(sem => ({
            subjects: sem.subjects.map(subj => ({
                name: subj.name,
                credits: subj.credits,
                grade: subj.grade
            }))
        }));

        const response = await fetch('/api/target-cgpa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                semesters: semestersData,
                target_cgpa: targetCgpa,
                future_courses: futureCourses,
                credits_per_course: creditsPerCourse
            })
        });

        const result = await response.json();
        displayTargetResults(result.analysis);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error calculating target CGPA', 'error');
    }
}

function displayTargetResults(analysis) {
    const resultsDiv = document.getElementById('targetResults');
    
    document.getElementById('resultCurrentCgpa').textContent = analysis.current_cgpa.toFixed(2);
    document.getElementById('resultTargetCgpa').textContent = analysis.target_cgpa.toFixed(2);
    document.getElementById('resultRequiredGrade').textContent = analysis.equivalent_grade;
    document.getElementById('resultGradePoints').textContent = analysis.avg_grade_points_needed.toFixed(2);
    document.getElementById('resultPointsNeeded').textContent = analysis.points_needed.toFixed(2);
    document.getElementById('resultCurrentCredits').textContent = analysis.current_credits.toFixed(1);
    document.getElementById('resultFutureCredits').textContent = analysis.future_credits.toFixed(1);

    const messageDiv = document.getElementById('achievabilityMessage');
    if (analysis.achievable) {
        messageDiv.className = 'result-message success';
        messageDiv.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            You can achieve this! You need an average of <strong>${analysis.equivalent_grade}</strong> (${analysis.avg_grade_points_needed.toFixed(2)} points) in future courses.
        `;
    } else {
        messageDiv.className = 'result-message warning';
        messageDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> 
            This target CGPA might be difficult to achieve. Maximum possible is 10.0 points.
        `;
    }

    resultsDiv.style.display = 'block';
}

// ===== Grading System =====
function populateGradeDropdowns() {
    const selects = document.querySelectorAll('#subjectGrade');
    
    if (!APP_STATE.gradingSystem || Object.keys(APP_STATE.gradingSystem).length === 0) {
        console.warn('Grade system empty, using defaults');
        APP_STATE.gradingSystem = DEFAULT_GRADING;
    }
    
    const grades = Object.keys(APP_STATE.gradingSystem).sort();

    selects.forEach(select => {
        select.innerHTML = '<option value="">Select Grade</option>';
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            select.appendChild(option);
        });
    });
}

function openGradingModal() {
    const editor = document.getElementById('gradingSystemEditor');
    editor.innerHTML = '';

    const grades = Object.entries(APP_STATE.gradingSystem);
    grades.forEach(([grade, points]) => {
        const row = document.createElement('div');
        row.className = 'grade-editor-row';
        row.innerHTML = `
            <input type="text" value="${grade}" placeholder="Grade" readonly>
            <input type="number" value="${points}" min="0" max="10" step="0.5" data-grade="${grade}">
            <button type="button" class="btn btn-secondary btn-small danger" onclick="deleteGrade('${grade}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        editor.appendChild(row);
    });

    // Add new grade row
    const newRow = document.createElement('div');
    newRow.className = 'grade-editor-row';
    newRow.innerHTML = `
        <input type="text" id="newGradeName" placeholder="New Grade (e.g., A++)">
        <input type="number" id="newGradePoints" min="0" max="10" step="0.5" placeholder="Points">
        <button type="button" class="btn btn-primary" onclick="addNewGrade()">
            <i class="fas fa-plus"></i>
        </button>
    `;
    editor.appendChild(newRow);

    document.getElementById('gradingModal').classList.add('show');
    document.getElementById('gradingModal').style.display = 'flex';
}

function closeGradingModal() {
    document.getElementById('gradingModal').style.display = 'none';
    document.getElementById('gradingModal').classList.remove('show');
}

function addNewGrade() {
    const name = document.getElementById('newGradeName').value.trim();
    const points = document.getElementById('newGradePoints').value;

    if (!name || points === '') {
        showToast('Please enter grade name and points', 'error');
        return;
    }

    APP_STATE.gradingSystem[name] = parseFloat(points);
    openGradingModal(); // Refresh modal
}

function deleteGrade(grade) {
    delete APP_STATE.gradingSystem[grade];
    openGradingModal(); // Refresh modal
}

function saveGradingSystem() {
    // Get updated values from inputs
    const inputs = document.querySelectorAll('.grade-editor-row input[data-grade]');
    inputs.forEach(input => {
        const grade = input.dataset.grade;
        APP_STATE.gradingSystem[grade] = parseFloat(input.value);
    });

    saveDataToStorage();
    populateGradeDropdowns();
    closeGradingModal();
    showToast('Grading system updated', 'success');
}

// ===== Dark Mode =====
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const icon = document.querySelector('#darkModeToggle i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// ===== Menu Dropdown =====
function toggleDropdownMenu() {
    document.querySelector('.dropdown-menu').classList.toggle('show');
}

// ===== Import/Export =====
function exportToJSON() {
    const data = {
        exported_at: new Date().toISOString(),
        semesters: APP_STATE.semesters,
        grading_system: APP_STATE.gradingSystem
    };

    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cgpa_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Data exported successfully', 'success');
    document.querySelector('.dropdown-menu').classList.remove('show');
}

function openImportModal() {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('importModal').style.display = 'flex';
    document.querySelector('.dropdown-menu').classList.remove('show');
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
    document.getElementById('importModal').classList.remove('show');
}

function importData(event) {
    event.preventDefault();
    const file = document.getElementById('importFile').files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!data.semesters || !Array.isArray(data.semesters)) {
                throw new Error('Invalid data format');
            }

            // Warn about overwrite
            if (confirm('Import will overwrite your current data. Continue?')) {
                APP_STATE.semesters = data.semesters;
                APP_STATE.gradingSystem = data.grading_system || APP_STATE.gradingSystem;
                
                saveDataToStorage();
                populateGradeDropdowns();
                renderSemesters();
                calculateCGPA();
                
                closeImportModal();
                showToast('Data imported successfully', 'success');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('Error importing data. Invalid file format.', 'error');
        }
    };

    reader.readAsText(file);
}

function resetAllData() {
    if (confirm('Are you absolutely sure? All data will be permanently deleted.')) {
        if (confirm('This action cannot be undone. Are you really sure?')) {
            APP_STATE.semesters = [];
            APP_STATE.gradingSystem = {
                "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0
            };
            
            saveDataToStorage();
            populateGradeDropdowns();
            renderSemesters();
            calculateCGPA();
            
            document.querySelector('.dropdown-menu').classList.remove('show');
            showToast('All data has been reset', 'success');
        }
    }
}
// ===== File Upload & OCR =====

let extractedSubjects = [];

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

function uploadFile(file) {
    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showToast('File is too large. Maximum size: 10MB', 'error');
        return;
    }
    
    // Validate file type - IMAGES ONLY
    const allowedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];
    if (!allowedTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'bmp', 'tiff'].some(ext => file.name.toLowerCase().endsWith(ext))) {
        showToast('Please upload an image file (JPG, PNG, BMP, or TIFF)', 'error');
        return;
    }
    
    // Process image using browser OCR
    processImageFile(file);
}

function processImageFile(file) {
    // Show loading state
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadLoading').style.display = 'block';
    
    // Wait for Tesseract to be ready
    if (typeof Tesseract === 'undefined') {
        showToast('OCR library is loading. Please wait a moment and try again.', 'error');
        document.getElementById('uploadLoading').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imageData = event.target.result;
            
            console.log('Starting Tesseract.js OCR...');
            
            // Use Tesseract.recognize with proper worker setup
            const result = await Tesseract.recognize(imageData, 'eng', {
                logger: m => {
                    console.log('Tesseract progress:', m.progress);
                    // Update progress if needed
                    if (m.progress === 1) {
                        document.getElementById('uploadStatus').textContent = 'Processing...';
                    }
                }
            });
            
            const text = result.data.text;
            
            console.log('Extracted text length:', text.length);
            console.log('First 200 chars:', text.substring(0, 200));
            
            if (!text || text.trim() === '') {
                showToast('No text could be extracted from the image. Try a clearer image.', 'error');
                document.getElementById('uploadLoading').style.display = 'none';
                document.getElementById('uploadArea').style.display = 'block';
                return;
            }
            
            // Parse the extracted text
            const parsedData = parseMarksheetText(text);
            
            console.log('Parsed subjects:', parsedData.subjects.length);
            
            if (parsedData.subjects.length === 0) {
                showToast('Could not find subjects in the extracted text. The image quality may be poor.', 'warning');
            }
            
            // Display results
            document.getElementById('uploadLoading').style.display = 'none';
            displayExtractedData({
                subjects: parsedData.subjects,
                low_confidence: parsedData.low_confidence,
                errors: parsedData.errors,
                has_raw_text: true,
                raw_text: text
            });
            
        } catch (error) {
            console.error('OCR error:', error);
            document.getElementById('uploadLoading').style.display = 'none';
            showToast('Error processing image: ' + error.message, 'error');
            document.getElementById('uploadArea').style.display = 'block';
        }
    };
    
    reader.onerror = (error) => {
        console.error('File read error:', error);
        showToast('Error reading file', 'error');
        document.getElementById('uploadLoading').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
    };
    
    reader.readAsDataURL(file);
}

// Parse marksheet text and extract subjects
function parseMarksheetText(text) {
    const gradePatterns = {
        'O': [/\bO\b/gi, 10],
        'A+': [/\bA\+/gi, 9],
        'A': [/\bA\b(?!\+)/gi, 8],
        'B+': [/\bB\+/gi, 7],
        'B': [/\bB\b(?!\+)/gi, 6],
        'C': [/\bC\b/gi, 5],
        'D': [/\bD\b/gi, 4],
        'F': [/\bF\b/gi, 0]
    };
    
    const subjects = [];
    const errors = [];
    let lowConfidence = 0;
    
    // Split text into lines
    const lines = text.split('\n');
    
    // Process each line
    lines.forEach((line, idx) => {
        line = line.trim();
        
        // Skip empty lines and headers
        if (!line || line.length < 3) {
            return;
        }
        
        // Skip header-like lines
        if (/^(subject|course|code|grade|mark|credit|sno|sl|total|cgpa|semester|result|course code)/i.test(line)) {
            return;
        }
        
        // Try to extract subject, credits, and grade from line
        const subjectName = extractSubjectName(line);
        const credits = extractCredits(line);
        const grade = extractGrade(line, gradePatterns);
        
        // Accept if we have at least subject and grade
        // Credits can be derived or defaulted
        if (subjectName && grade) {
            subjects.push({
                name: subjectName,
                credits: credits || 3,  // Default to 3 if not found
                grade: grade,
                confidence: credits ? 0.9 : 0.75  // Lower confidence if credits weren't found
            });
        }
    });
    
    console.log(`Parsed ${subjects.length} subjects:`, subjects);
    
    return {
        subjects: subjects,
        low_confidence: lowConfidence,
        errors: errors
    };
}

// Extract subject name from text
function extractSubjectName(line) {
    // Remove grades and credits from line to isolate subject name
    let name = line.replace(/\b(O|A\+|A|B\+|B|C|D|F)\b/g, '');
    name = name.replace(/credits?|cr\b/gi, '');
    name = name.replace(/\b\d+\.?\d*\b/g, ' ');  // Remove numbers but keep spaces
    name = name.replace(/\s+/g, ' ');  // Normalize spaces
    name = name.trim();
    
    // Remove trailing punctuation
    name = name.replace(/[,;:.()[\]{}]+\s*$/g, '').trim();
    name = name.replace(/^[,;:.()[\]{}]+\s*/g, '').trim();
    
    // Clean up any remaining special chars but keep spaces
    name = name.replace(/[^a-zA-Z0-9\s&\-]/g, '');
    name = name.trim();
    
    // Only return if reasonable length
    // At least 3 chars for subject names, but not too long
    if (name && name.length >= 3 && name.length < 100) {
        return name;
    }
    return null;
}

// Extract credits from text
function extractCredits(line) {
    // Look for credit patterns like "3", "4", "3.5", "4.0"
    const patterns = [
        /credits?[\s:=]*(\d+\.?\d*)/i,
        /cr[\s:=]*(\d+\.?\d*)/i,
        /\b(\d+\.?\d*)\s*(?:credits?|cr)\b/i,
        /^.*?\s+(\d+\.?\d*)\s+[A-F]/  // Number followed by grade
    ];
    
    for (let pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            const credits = parseFloat(match[1]);
            if (credits > 0 && credits <= 10) {
                return credits;
            }
        }
    }
    
    // Try to find a standalone number that looks like credits (1-4 range)
    const numberMatches = line.match(/\b([1-4])\b/g);
    if (numberMatches && numberMatches.length > 0) {
        // Return the last number that looks reasonable
        const lastNum = parseFloat(numberMatches[numberMatches.length - 1]);
        if (lastNum > 0 && lastNum <= 4) {
            return lastNum;
        }
    }
    
    return null;
}

// Extract grade from text
function extractGrade(line, gradePatterns) {
    for (const [grade, [pattern, points]] of Object.entries(gradePatterns)) {
        if (pattern.test(line)) {
            return grade;
        }
    }
    return null;
}

function displayExtractedData(data) {
    console.log('=== DISPLAY EXTRACTED DATA ===');
    console.log('Subjects received:', data.subjects.length);
    console.log('Source:', data.has_raw_text ? 'Browser OCR' : 'Server');
    
    const preview = document.getElementById('uploadPreview');
    const tableBody = document.getElementById('previewTableBody');
    const statusDiv = document.getElementById('previewStatus');
    
    // Clear previous data
    tableBody.innerHTML = '';
    
    // Show preview
    preview.style.display = 'block';
    
    // Display status message
    if (data.low_confidence > 0) {
        statusDiv.className = 'preview-status warning show';
        statusDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${data.low_confidence} subject(s) have low confidence. Please review and correct them.
        `;
    } else if (data.errors && data.errors.length > 0) {
        statusDiv.className = 'preview-status info show';
        statusDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${data.errors.join('; ')}
        `;
    } else {
        statusDiv.className = 'preview-status show';
        statusDiv.style.display = 'none';
    }
    
    // Display extracted subjects
    if (data.subjects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No subjects could be extracted</td></tr>';
        return;
    }
    
    data.subjects.forEach((subject, idx) => {
        const row = document.createElement('tr');
        const confidenceClass = subject.confidence < 0.7 ? 'confidence-low' : '';
        const confidencePercent = Math.round(subject.confidence * 100);
        
        row.innerHTML = `
            <td>
                <input type="text" value="${subject.name}" data-idx="${idx}" data-field="name" class="subject-edit">
            </td>
            <td>
                <input type="number" value="${subject.credits}" min="0.5" step="0.5" data-idx="${idx}" data-field="credits" class="subject-edit">
            </td>
            <td>
                <select data-idx="${idx}" data-field="grade" class="subject-edit">
                    <option value="">Select Grade</option>
                    ${Object.keys(APP_STATE.gradingSystem).map(g => 
                        `<option value="${g}" ${g === subject.grade ? 'selected' : ''}>${g}</option>`
                    ).join('')}
                </select>
            </td>
            <td class="${confidenceClass}">
                ${confidencePercent}%
            </td>
            <td>
                <button class="btn btn-secondary btn-small" onclick="removeExtractedRow(${idx})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Show raw text if available
    if (data.has_raw_text && data.raw_text) {
        const rawTextElement = document.getElementById('rawText');
        if (rawTextElement) {
            rawTextElement.textContent = data.raw_text;
        }
    }
    
    console.log('Display complete. Ready to import.');
}

function removeExtractedRow(idx) {
    extractedSubjects.splice(idx, 1);
    // Refresh table
    displayExtractedData({
        subjects: extractedSubjects,
        low_confidence: extractedSubjects.filter(s => s.confidence < 0.7).length,
        errors: [],
        has_raw_text: true
    });
}

function resetUpload() {
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('uploadLoading').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'none';
    extractedSubjects = [];
}

function importExtractedData() {
    console.log('=== IMPORT EXTRACTED DATA ===');
    
    // Check if import button exists and is already disabled (prevent double-click)
    const importBtn = document.getElementById('importExtractedBtn');
    if (importBtn && importBtn.disabled) {
        console.warn('⚠️ Import already in progress - ignoring duplicate click');
        return;
    }
    
    // Disable button to prevent double submissions
    if (importBtn) {
        importBtn.disabled = true;
        console.log('Button disabled to prevent double-click');
    }
    
    try {
        // Get edited values from table
        const table = document.getElementById('previewTable');
        const rows = table.querySelectorAll('tbody tr');
        
        console.log('Reading', rows.length, 'rows from preview table');
        
        const subjects = [];
        const errors = [];
        
        rows.forEach((row, idx) => {
            const nameInput = row.querySelector('input[data-field="name"]');
            const creditsInput = row.querySelector('input[data-field="credits"]');
            const gradeSelect = row.querySelector('select[data-field="grade"]');
            
            if (nameInput && creditsInput && gradeSelect) {
                const name = nameInput.value.trim();
                const credits = parseFloat(creditsInput.value);
                const grade = gradeSelect.value;
                
                // Validate
                if (!name || name.length === 0) {
                    errors.push(`Row ${idx + 1}: Subject name is required`);
                }
                if (isNaN(credits) || credits <= 0 || credits > 10) {
                    errors.push(`Row ${idx + 1}: Invalid credits (must be 0-10)`);
                }
                if (!grade || !APP_STATE.gradingSystem.hasOwnProperty(grade)) {
                    errors.push(`Row ${idx + 1}: Invalid grade`);
                }
                
                // Add if valid
                if (name && !isNaN(credits) && credits > 0 && grade) {
                    subjects.push({
                        name: name,
                        credits: credits,
                        grade: grade
                    });
                }
            }
        });
        
        console.log('Validation complete:', subjects.length, 'valid subjects,', errors.length, 'errors');
        
        if (subjects.length === 0) {
            showToast('No valid subjects to import', 'error');
            if (errors.length > 0) {
                console.warn('Validation errors:', errors);
            }
            return;
        }
        
        // Add as new semester
        const newSemester = {
            id: Date.now(),
            subjects: subjects
        };
        console.log('Creating new semester with ID:', newSemester.id, 'and', subjects.length, 'subjects');
        
        APP_STATE.semesters.push(newSemester);
        console.log('Total semesters now:', APP_STATE.semesters.length);
        
        saveDataToStorage();
        renderSemesters();
        calculateCGPA();
        
        showToast(`✅ Successfully imported ${subjects.length} subject(s) to a new semester`, 'success');
        resetUpload();
        switchTab('semesters');
        
        console.log('=== IMPORT COMPLETE ===');
    } catch (error) {
        console.error('❌ Error during import:', error);
        showToast('Error importing data: ' + error.message, 'error');
    } finally {
        // Re-enable button
        if (importBtn) {
            importBtn.disabled = false;
            console.log('Button re-enabled');
        }
    }
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
