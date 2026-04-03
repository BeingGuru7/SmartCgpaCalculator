// ===== LocalStorage Management =====

const STORAGE_KEYS = {
    semesters: 'cgpa_semesters',
    grading: 'cgpa_grading_system'
};

function saveDataToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.semesters, JSON.stringify(APP_STATE.semesters));
        localStorage.setItem(STORAGE_KEYS.grading, JSON.stringify(APP_STATE.gradingSystem));
    } catch (error) {
        console.error('Error saving to storage:', error);
        showToast('Error saving data', 'error');
    }
}

function loadDataFromStorage() {
    try {
        const savedSemesters = localStorage.getItem(STORAGE_KEYS.semesters);
        const savedGrading = localStorage.getItem(STORAGE_KEYS.grading);

        if (savedSemesters) {
            APP_STATE.semesters = JSON.parse(savedSemesters);
        }

        if (savedGrading) {
            const parsed = JSON.parse(savedGrading);
            if (parsed && Object.keys(parsed).length > 0) {
                APP_STATE.gradingSystem = parsed;
            }
        }
        
        // Ensure grading system always has defaults if empty
        if (!APP_STATE.gradingSystem || Object.keys(APP_STATE.gradingSystem).length === 0) {
            APP_STATE.gradingSystem = {
                "O": 10,
                "A+": 9,
                "A": 8,
                "B+": 7,
                "B": 6,
                "C": 5,
                "D": 4,
                "F": 0
            };
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
        // Initialize with defaults if loading fails
        APP_STATE.semesters = [];
        APP_STATE.gradingSystem = {
            "O": 10,
            "A+": 9,
            "A": 8,
            "B+": 7,
            "B": 6,
            "C": 5,
            "D": 4,
            "F": 0
        };
    }
}

// Auto-save on any significant change
function autoSave() {
    saveDataToStorage();
}
