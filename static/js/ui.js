// ===== UI Helper Functions =====

// Modal utilities
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    modal.classList.remove('show');
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        e.target.classList.remove('show');
    }
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }
});

// Format number with commas
function formatNumber(num) {
    return Number(num).toFixed(2);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Get grade color based on points
function getGradeColor(gradePoints) {
    if (gradePoints >= 9) return '#10b981';      // Green for A+/O
    if (gradePoints >= 7) return '#3b82f6';      // Blue for A/B+
    if (gradePoints >= 5) return '#f59e0b';      // Orange for B/C
    if (gradePoints >= 4) return '#ef4444';      // Red for D
    return '#6b7280';                             // Gray for F
}

// Animate number count up
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toFixed(2);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
