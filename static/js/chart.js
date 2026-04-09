// ===== Chart.js Integration =====

let sgpaChart = null;

function initChart() {
    const ctx = document.getElementById('sgpaChart');
    if (!ctx) return;

    // Destroy existing chart if any
    if (sgpaChart) {
        sgpaChart.destroy();
    }

    const sgpaData = APP_STATE.semesters.map((semester, index) => ({
        semester: index + 1,
        sgpa: calculateSGPA(semester.subjects)
    }));

    // Calculate overall CGPA
    let totalPoints = 0;
    let totalCredits = 0;
    APP_STATE.semesters.forEach(semester => {
        const sgpa = calculateSGPA(semester.subjects);
        const credits = calculateTotalCredits(semester.subjects);
        totalPoints += sgpa * credits;
        totalCredits += credits;
    });
    const overallCGPA = totalCredits === 0 ? 0 : totalPoints / totalCredits;

    sgpaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sgpaData.map(d => `Sem ${d.semester}`),
            datasets: [{
                label: 'SGPA',
                data: sgpaData.map(d => d.sgpa),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8,
            }, {
                label: 'Overall CGPA',
                data: Array(sgpaData.length).fill(overallCGPA),
                borderColor: '#f59e0b',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 12, weight: '600' },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        usePointStyle: true,
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        font: { size: 11 },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary'),
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                    }
                },
                x: {
                    ticks: {
                        font: { size: 11 },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary'),
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateCGPAChart() {
    const canvas = document.getElementById('sgpaChart');
    if (!canvas) return;

    const container = canvas.parentElement;
    
    if (APP_STATE.semesters.length === 0) {
        // Show empty state but keep canvas for future rendering
        if (sgpaChart) {
            sgpaChart.destroy();
            sgpaChart = null;
        }
        canvas.style.display = 'none';
        let emptyMsg = container.querySelector('.chart-empty-state');
        if (!emptyMsg) {
            emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-state chart-empty-state';
            emptyMsg.textContent = 'Add subjects to see the SGPA trend chart';
            container.appendChild(emptyMsg);
        } else {
            emptyMsg.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state and show chart
    const emptyMsg = container.querySelector('.chart-empty-state');
    if (emptyMsg) {
        emptyMsg.style.display = 'none';
    }
    canvas.style.display = 'block';
    
    initChart();
}

// Initialize chart when analysis tab is viewed
document.addEventListener('DOMContentLoaded', () => {
    // Listen for tab changes
    const analysisTabs = document.querySelectorAll('[data-tab="analysis"]');
    if (analysisTabs.length > 0) {
        // Chart will be initialized when tab is switched
    }
});
