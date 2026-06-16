// Global State
let employees = [];
let activeTab = 'dashboard';
let currentEditingId = null;

// DOM Elements
const menuItems = document.querySelectorAll('.menu-item');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const liveTimeSpan = document.getElementById('live-time');

// KPI Stats Elements
const statTotalEmployees = document.getElementById('stat-total-employees');
const statTotalPayroll = document.getElementById('stat-total-payroll');
const statAvgSalary = document.getElementById('stat-avg-salary');
const statPendingPayments = document.getElementById('stat-pending-payments');

// Modals
const employeeModal = document.getElementById('employee-modal');
const payslipModal = document.getElementById('payslip-modal');
const btnAddEmployeeTrigger = document.getElementById('btn-add-employee-trigger');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const employeeForm = document.getElementById('employee-form');
const formModeInput = document.getElementById('form-mode');
const modalTitle = document.getElementById('modal-title');

// Form Fields
const fieldId = document.getElementById('emp-id');
const fieldName = document.getElementById('emp-name');
const fieldEmail = document.getElementById('emp-email');
const fieldDept = document.getElementById('emp-department');
const fieldDesig = document.getElementById('emp-designation');
const fieldDate = document.getElementById('emp-date');
const fieldBase = document.getElementById('emp-base');
const fieldAllowances = document.getElementById('emp-allowances');
const fieldDeductions = document.getElementById('emp-deductions');
const fieldStatus = document.getElementById('emp-status');
const liveNetSalary = document.getElementById('live-net-salary');

// Table and Filters
const searchInput = document.getElementById('employee-search');
const filterDept = document.getElementById('filter-department');
const filterStatus = document.getElementById('filter-status');
const tableBody = document.getElementById('employees-table-body');

// Reports
const reportTableBody = document.getElementById('report-table-body');
const reportDateSpan = document.getElementById('report-date');
const reportHeadcount = document.getElementById('report-total-headcount');
const reportBase = document.getElementById('report-total-base');
const reportAllowances = document.getElementById('report-total-allowances');
const reportDeductions = document.getElementById('report-total-deductions');
const reportNet = document.getElementById('report-total-net');

// Toast Notification
const toastContainer = document.getElementById('toast-container');

// Theme Colors for Departments Chart
const DEPT_COLORS = {
    'Engineering': '#6366f1', // Indigo
    'Sales': '#14b8a6',       // Teal
    'Human Resources': '#a855f7', // Purple
    'Marketing': '#f59e0b',   // Amber
    'Finance': '#10b981',     // Green
    'Other': '#64748b'        // Slate
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    updateLiveTime();
    setInterval(updateLiveTime, 1000);
    
    fetchEmployees();
    setupNavigation();
    setupFormCalculations();
    setupModalListeners();
    setupFilters();
    setupThemeSwitcher();
    setupLoginListeners();
});

// Theme Switcher Controller
function setupThemeSwitcher() {
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');
    if (!lightBtn || !darkBtn) return;

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    lightBtn.addEventListener('click', () => setTheme('light'));
    darkBtn.addEventListener('click', () => setTheme('dark'));
}

function setTheme(theme) {
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');
    if (!lightBtn || !darkBtn) return;

    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkBtn.classList.add('active');
        lightBtn.classList.remove('active');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        lightBtn.classList.add('active');
        darkBtn.classList.remove('active');
        localStorage.setItem('theme', 'light');
    }
}

// Live Datetime display
function updateLiveTime() {
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateStr = now.toLocaleDateString('en-US', options);
    if (liveTimeSpan) liveTimeSpan.textContent = dateStr;
    if (reportDateSpan) reportDateSpan.textContent = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Navigation & Tab Switching
function setupNavigation() {
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    activeTab = tab;
    
    // Update menu UI
    menuItems.forEach(item => {
        if (item.getAttribute('data-tab') === tab) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update Content Views
    tabContents.forEach(content => {
        if (content.id === `tab-${tab}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Page titles update
    if (tab === 'dashboard') {
        pageTitle.textContent = 'Dashboard';
        pageSubtitle.textContent = 'Overview of payroll and employees';
    } else if (tab === 'employees') {
        pageTitle.textContent = 'Employee Directory';
        pageSubtitle.textContent = 'Manage employee details and pay status';
    } else if (tab === 'reports') {
        pageTitle.textContent = 'Financial Reports';
        pageSubtitle.textContent = 'Payroll summaries and statement outputs';
    }
}

// REST API Service Calls
async function fetchEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Failed to fetch employee list');
        employees = await response.json();
        
        // Render Views
        updateDashboardStats();
        renderEmployeeTable();
        renderDepartmentChart();
        renderReports();
        
        // Dynamic login verification based on fetched database
        checkLoginState();
    } catch (err) {
        console.error(err);
        showToast('Error fetching database records', 'error');
    }
}

// Update Dashboard Numbers
function updateDashboardStats() {
    const totalCount = employees.length;
    const totalPayrollVal = employees.reduce((acc, curr) => acc + curr.netSalary, 0);
    const avgSalaryVal = totalCount > 0 ? (totalPayrollVal / totalCount) : 0;
    const pendingCount = employees.filter(emp => emp.status === 'Pending').length;

    statTotalEmployees.textContent = totalCount;
    statTotalPayroll.textContent = formatCurrency(totalPayrollVal);
    statAvgSalary.textContent = formatCurrency(avgSalaryVal);
    statPendingPayments.textContent = pendingCount;
}

// Dynamic SVG Donut Chart
function renderDepartmentChart() {
    const wrapper = document.getElementById('department-chart-wrapper');
    const legend = document.getElementById('chart-legend');
    if (!wrapper || !legend) return;

    // Count employees per department
    const deptCounts = {};
    employees.forEach(emp => {
        const dept = emp.department || 'Other';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const total = employees.length;
    legend.innerHTML = '';

    if (total === 0) {
        wrapper.innerHTML = `
            <svg class="donut-chart" viewBox="0 0 36 36">
                <circle class="donut-hole" cx="18" cy="18" r="15.915" fill="var(--bg-card)"></circle>
                <circle class="donut-ring" cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--border-color)" stroke-width="2.5"></circle>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.75rem; color: var(--text-muted);">No Data</div>
        `;
        return;
    }

    // Draw SVG segments
    // A circle radius of 15.91549430918954 means the circumference is exactly 100
    let currentOffset = 0;
    let svgContent = `<svg class="donut-chart" viewBox="0 0 36 36">
        <circle class="donut-hole" cx="18" cy="18" r="15.915" fill="none"></circle>
        <circle class="donut-ring" cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" stroke-width="2.5"></circle>
    `;

    const sortedDepts = Object.entries(deptCounts).sort((a,b) => b[1] - a[1]);

    sortedDepts.forEach(([dept, count]) => {
        const percentage = (count / total) * 100;
        const color = DEPT_COLORS[dept] || DEPT_COLORS['Other'];
        
        svgContent += `
            <circle class="donut-segment" cx="18" cy="18" r="15.915" 
                    fill="transparent" 
                    stroke="${color}" 
                    stroke-width="2.8" 
                    stroke-dasharray="${percentage} ${100 - percentage}" 
                    stroke-dashoffset="${100 - currentOffset}"
                    style="transition: stroke-dashoffset 0.5s ease;">
            </circle>
        `;

        currentOffset += percentage;

        // Render legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${color};"></span>
            <span class="legend-text" style="color: var(--text-secondary); font-weight: 500;">${dept}</span>
            <span class="legend-percentage" style="color: var(--text-muted); font-size: 0.75rem;">(${count})</span>
        `;
        legend.appendChild(legendItem);
    });

    svgContent += `
        <g class="chart-center-text">
            <text x="50%" y="47%" dominant-baseline="middle" text-anchor="middle" fill="var(--text-primary)" font-weight="700" font-size="6" font-family="var(--font-heading)">${total}</text>
            <text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="var(--text-muted)" font-weight="500" font-size="2.5" font-family="var(--font-body)">STAFF</text>
        </g>
    </svg>`;
    
    wrapper.innerHTML = svgContent;

    // Render Department Financial Payroll Breakdown
    const breakdownList = document.getElementById('dept-payroll-breakdown');
    if (breakdownList) {
        breakdownList.innerHTML = '';
        
        const deptPayroll = {};
        let maxPayroll = 0;
        employees.forEach(emp => {
            const dept = emp.department || 'Other';
            deptPayroll[dept] = (deptPayroll[dept] || 0) + emp.netSalary;
            if (deptPayroll[dept] > maxPayroll) maxPayroll = deptPayroll[dept];
        });

        const sortedPayroll = Object.entries(deptPayroll).sort((a,b) => b[1] - a[1]);

        if (sortedPayroll.length === 0) {
            breakdownList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">No active payroll records.</div>`;
        }

        sortedPayroll.forEach(([dept, totalPay]) => {
            const percentage = maxPayroll > 0 ? (totalPay / maxPayroll) * 100 : 0;
            const color = DEPT_COLORS[dept] || DEPT_COLORS['Other'];
            
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `
                <div class="breakdown-info">
                    <span class="breakdown-name">${dept}</span>
                    <span class="breakdown-val">${formatCurrency(totalPay)}</span>
                </div>
                <div class="breakdown-progress-bar">
                    <div class="breakdown-progress-fill" style="background-color: ${color}; width: ${percentage}%;"></div>
                </div>
            `;
            breakdownList.appendChild(item);
        });
    }
}

// Render Employee Table & Filter
function renderEmployeeTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const searchQuery = searchInput.value.toLowerCase().trim();
    const deptFilter = filterDept.value;
    const statusFilter = filterStatus.value;

    const filtered = employees.filter(emp => {
        const matchesSearch = 
            emp.id.toLowerCase().includes(searchQuery) ||
            emp.name.toLowerCase().includes(searchQuery) ||
            emp.email.toLowerCase().includes(searchQuery) ||
            emp.designation.toLowerCase().includes(searchQuery);
        
        const matchesDept = deptFilter === '' || emp.department === deptFilter;
        const matchesStatus = statusFilter === '' || emp.status === statusFilter;

        return matchesSearch && matchesDept && matchesStatus;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem 0;">
                    No employees found matching the current filters.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(emp => {
        const row = document.createElement('tr');
        
        const badgeClass = emp.status === 'Paid' ? 'badge-paid' : 'badge-pending';
        
        row.innerHTML = `
            <td class="employee-cell-bold">${emp.id}</td>
            <td>
                <div class="employee-cell-bold">${emp.name}</div>
                <div class="employee-cell-meta">${emp.email}</div>
            </td>
            <td>
                <div class="employee-cell-bold">${emp.department}</div>
                <div class="employee-cell-meta">${emp.designation}</div>
            </td>
            <td>${formatCurrency(emp.baseSalary)}</td>
            <td>${formatCurrency(emp.allowances)}</td>
            <td class="text-secondary">${formatCurrency(emp.deductions)}</td>
            <td class="employee-cell-bold text-primary">${formatCurrency(emp.netSalary)}</td>
            <td>
                <span class="badge ${badgeClass}">${emp.status}</span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="action-btn action-btn-payslip" title="View Payslip" onclick="showPayslip('${emp.id}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                    <button class="action-btn action-btn-edit" title="Edit Employee" onclick="editEmployee('${emp.id}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn action-btn-delete" title="Delete Employee" onclick="deleteEmployee('${emp.id}')">
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Setup Filters
function setupFilters() {
    searchInput.addEventListener('input', renderEmployeeTable);
    filterDept.addEventListener('change', renderEmployeeTable);
    filterStatus.addEventListener('change', renderEmployeeTable);
}

// Salary Calculator - Live Calculation
function setupFormCalculations() {
    const calculateLiveNet = () => {
        const base = parseFloat(fieldBase.value) || 0;
        const allowances = parseFloat(fieldAllowances.value) || 0;
        const deductions = parseFloat(fieldDeductions.value) || 0;
        const net = base + allowances - deductions;
        
        liveNetSalary.textContent = formatCurrency(net);
    };

    fieldBase.addEventListener('input', calculateLiveNet);
    fieldAllowances.addEventListener('input', calculateLiveNet);
    fieldDeductions.addEventListener('input', calculateLiveNet);
}

// Setup Modal event handlers
function setupModalListeners() {
    btnAddEmployeeTrigger.addEventListener('click', () => {
        openEmployeeModal('add');
    });

    btnCloseModal.addEventListener('click', closeEmployeeModal);
    btnCancelModal.addEventListener('click', closeEmployeeModal);
    
    // Form Submit (Add or Edit)
    employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = formModeInput.value;
        const employeeData = {
            id: fieldId.value.trim(),
            name: fieldName.value.trim(),
            email: fieldEmail.value.trim(),
            department: fieldDept.value,
            designation: fieldDesig.value.trim(),
            joiningDate: fieldDate.value,
            baseSalary: parseFloat(fieldBase.value) || 0,
            allowances: parseFloat(fieldAllowances.value) || 0,
            deductions: parseFloat(fieldDeductions.value) || 0,
            status: fieldStatus.value
        };

        try {
            let response;
            if (mode === 'add') {
                response = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                });
            } else {
                response = await fetch('/api/employees', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                });
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Operation failed');
            }

            showToast(
                mode === 'add' ? 'Employee profile created!' : 'Employee profile updated!',
                'success'
            );
            
            closeEmployeeModal();
            fetchEmployees();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Close Payslip modal
    document.getElementById('btn-close-payslip').addEventListener('click', closePayslipModal);
    document.getElementById('btn-close-payslip-footer').addEventListener('click', closePayslipModal);
}

// Open Form Modal (Add / Edit)
function openEmployeeModal(mode, empId = '') {
    formModeInput.value = mode;
    employeeForm.reset();
    liveNetSalary.textContent = '₹0.00';
    
    if (mode === 'add') {
        modalTitle.textContent = 'Add New Employee';
        fieldId.disabled = false;
        
        // Default values
        fieldAllowances.value = '0.00';
        fieldDeductions.value = '0.00';
        fieldStatus.value = 'Pending';
        
        // Auto set current date
        const today = new Date().toISOString().split('T')[0];
        fieldDate.value = today;
    } else {
        modalTitle.textContent = 'Edit Employee Profile';
        fieldId.disabled = true;
        
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            fieldId.value = emp.id;
            fieldName.value = emp.name;
            fieldEmail.value = emp.email;
            fieldDept.value = emp.department;
            fieldDesig.value = emp.designation;
            fieldDate.value = emp.joiningDate;
            fieldBase.value = emp.baseSalary;
            fieldAllowances.value = emp.allowances;
            fieldDeductions.value = emp.deductions;
            fieldStatus.value = emp.status;
            
            const net = emp.baseSalary + emp.allowances - emp.deductions;
            liveNetSalary.textContent = formatCurrency(net);
        }
    }
    
    employeeModal.classList.add('active');
}

function closeEmployeeModal() {
    employeeModal.classList.remove('active');
}

// Trigger Edit action
window.editEmployee = function(empId) {
    openEmployeeModal('edit', empId);
};

// Trigger Delete action
window.deleteEmployee = async function(empId) {
    if (!confirm(`Are you sure you want to delete employee ${empId}?`)) return;
    
    try {
        const response = await fetch(`/api/employees?id=${empId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to delete record');
        
        showToast('Employee deleted successfully', 'success');
        fetchEmployees();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Open Payslip rendering
window.showPayslip = function(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const container = document.getElementById('payslip-content');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const slipNumber = 'PAY-' + empId + '-' + new Date().getFullYear() + (new Date().getMonth() + 1);

    container.innerHTML = `
        <div class="payslip-header">
            <div class="payslip-title">
                <h2>VTR Group Management</h2>
                <p>Corporate Payroll Services Division</p>
            </div>
            <div class="payslip-meta-block">
                <h3>PAY SLIP</h3>
                <p><strong>Slip No:</strong> ${slipNumber}</p>
                <p><strong>Print Date:</strong> ${today}</p>
            </div>
        </div>

        <div class="payslip-details-grid">
            <div class="payslip-detail-group">
                <h4>Employee Information</h4>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Employee ID</span>
                    <span class="payslip-detail-val">${emp.id}</span>
                </div>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Full Name</span>
                    <span class="payslip-detail-val">${emp.name}</span>
                </div>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Email Address</span>
                    <span class="payslip-detail-val">${emp.email}</span>
                </div>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Joining Date</span>
                    <span class="payslip-detail-val">${emp.joiningDate}</span>
                </div>
            </div>
            
            <div class="payslip-detail-group">
                <h4>Employment Structure</h4>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Department</span>
                    <span class="payslip-detail-val">${emp.department}</span>
                </div>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Designation</span>
                    <span class="payslip-detail-val">${emp.designation}</span>
                </div>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Payment Mode</span>
                    <span class="payslip-detail-val">Direct Deposit</span>
                </div>
                <div class="payslip-detail-row">
                    <span class="payslip-detail-label">Status</span>
                    <span class="payslip-detail-val" style="color: ${emp.status === 'Paid' ? '#10b981' : '#f59e0b'}; font-weight: 700;">${emp.status.toUpperCase()}</span>
                </div>
            </div>
        </div>

        <div class="payslip-finance-grid">
            <div>
                <table class="payslip-table">
                    <thead>
                        <tr>
                            <th>Earnings Component</th>
                            <th class="amount">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Basic / Base Salary</td>
                            <td class="amount">${formatRawNumber(emp.baseSalary)}</td>
                        </tr>
                        <tr>
                            <td>House Rent / Allowances</td>
                            <td class="amount">${formatRawNumber(emp.allowances)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #94a3b8; font-weight: 700;">
                            <td>Gross Earnings</td>
                            <td class="amount">${formatRawNumber(emp.baseSalary + emp.allowances)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div>
                <table class="payslip-table">
                    <thead>
                        <tr>
                            <th>Deductions Component</th>
                            <th class="amount">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Income Tax / PF Deductions</td>
                            <td class="amount">${formatRawNumber(emp.deductions)}</td>
                        </tr>
                        <tr>
                            <td>Loss of Pay (LOP)</td>
                            <td class="amount">0.00</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #94a3b8; font-weight: 700;">
                            <td>Total Deductions</td>
                            <td class="amount">${formatRawNumber(emp.deductions)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="payslip-total-row">
            <span>NET SALARY PAYOUT</span>
            <strong>${formatCurrency(emp.netSalary)}</strong>
        </div>
        
        <div style="margin-top: 2rem; font-size: 0.75rem; text-align: center; color: #64748b; font-style: italic; border-top: 1px solid #cbd5e1; padding-top: 1rem;">
            This is a computer-generated document and does not require a signature.
        </div>
    `;

    payslipModal.classList.add('active');
};

function closePayslipModal() {
    payslipModal.classList.remove('active');
}

// Generate Department Financial Reports
function renderReports() {
    if (!reportTableBody) return;
    reportTableBody.innerHTML = '';

    // Calculate aggregated stats by department
    const deptStats = {};
    let totalHeadcount = 0;
    let totalBase = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    employees.forEach(emp => {
        const dept = emp.department || 'Other';
        if (!deptStats[dept]) {
            deptStats[dept] = { headcount: 0, base: 0, allowances: 0, deductions: 0, net: 0 };
        }
        deptStats[dept].headcount += 1;
        deptStats[dept].base += emp.baseSalary;
        deptStats[dept].allowances += emp.allowances;
        deptStats[dept].deductions += emp.deductions;
        deptStats[dept].net += emp.netSalary;

        totalHeadcount += 1;
        totalBase += emp.baseSalary;
        totalAllowances += emp.allowances;
        totalDeductions += emp.deductions;
        totalNet += emp.netSalary;
    });

    const entries = Object.entries(deptStats).sort((a,b) => b[1].net - a[1].net);

    if (entries.length === 0) {
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem 0;">No payroll reports available.</td>
            </tr>
        `;
        return;
    }

    entries.forEach(([dept, stats]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="employee-cell-bold">${dept}</td>
            <td style="text-align: right;">${stats.headcount}</td>
            <td style="text-align: right;">${formatCurrency(stats.base)}</td>
            <td style="text-align: right;">${formatCurrency(stats.allowances)}</td>
            <td style="text-align: right;">${formatCurrency(stats.deductions)}</td>
            <td style="text-align: right;" class="employee-cell-bold text-primary">${formatCurrency(stats.net)}</td>
        `;
        reportTableBody.appendChild(row);
    });

    // Populate Report Footer Totals
    reportHeadcount.textContent = totalHeadcount;
    reportBase.textContent = formatCurrency(totalBase);
    reportAllowances.textContent = formatCurrency(totalAllowances);
    reportDeductions.textContent = formatCurrency(totalDeductions);
    reportNet.textContent = formatCurrency(totalNet);
}

// UI Formatting Utilities
function formatCurrency(value) {
    return '₹' + parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRawNumber(value) {
    return parseFloat(value).toFixed(2);
}

// Toast Notifications popup
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
        ? `<svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--teal)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--red)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    toastContainer.appendChild(toast);
    
    // Slide out and remove
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.35s ease reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 350);
    }, 4000);
}

// ==========================================
//          LOGIN & SESSION CONTROL
// ==========================================

// Check current login session state
function checkLoginState() {
    const loginContainer = document.getElementById('login-container');
    const adminPortal = document.getElementById('admin-portal');
    const employeePortal = document.getElementById('employee-portal');
    
    const sessionRole = sessionStorage.getItem('isLoggedIn');
    const sessionEmpId = sessionStorage.getItem('employeeId');

    if (sessionRole === 'admin') {
        loginContainer.style.display = 'none';
        adminPortal.style.display = 'flex';
        employeePortal.style.display = 'none';
    } 
    else if (sessionRole === 'employee' && sessionEmpId) {
        const emp = employees.find(e => e.id === sessionEmpId);
        if (emp) {
            loginContainer.style.display = 'none';
            adminPortal.style.display = 'none';
            employeePortal.style.display = 'block';
            loadEmployeePortal(emp);
        } else {
            // Employee deleted from DB, clear session
            logoutUser();
        }
    } 
    else {
        // Show login page
        loginContainer.style.display = 'flex';
        adminPortal.style.display = 'none';
        employeePortal.style.display = 'none';
    }
}

// Setup Event Listeners for Login Page
function setupLoginListeners() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    
    const btnLogout = document.getElementById('btn-logout');
    const btnPortalLogout = document.getElementById('btn-portal-logout');
    const btnPortalViewSlip = document.getElementById('btn-portal-view-slip');

    // State Elements
    const stateLogin = document.getElementById('login-state-login');
    const stateRegister = document.getElementById('login-state-register');
    const stateForgot = document.getElementById('login-state-forgot');

    // Link Listeners
    document.getElementById('link-show-register').onclick = (e) => {
        e.preventDefault();
        stateLogin.style.display = 'none';
        stateRegister.style.display = 'block';
        stateForgot.style.display = 'none';
        document.getElementById('register-error').style.display = 'none';
        registerForm.reset();
        
        // Auto set current date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reg-date').value = today;
    };

    document.getElementById('link-show-login').onclick = (e) => {
        e.preventDefault();
        stateLogin.style.display = 'block';
        stateRegister.style.display = 'none';
        stateForgot.style.display = 'none';
    };

    document.getElementById('link-forgot-password').onclick = (e) => {
        e.preventDefault();
        stateLogin.style.display = 'none';
        stateRegister.style.display = 'none';
        stateForgot.style.display = 'block';
        document.getElementById('forgot-info').style.display = 'none';
        forgotForm.reset();
    };

    document.getElementById('link-back-login').onclick = (e) => {
        e.preventDefault();
        stateLogin.style.display = 'block';
        stateRegister.style.display = 'none';
        stateForgot.style.display = 'none';
    };

    // Handle Login Submit
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username').value.trim();
            const passwordInput = document.getElementById('login-password').value.trim();
            const errorMsg = document.getElementById('login-error');

            errorMsg.style.display = 'none';

            // Admin Role check
            if (usernameInput.toLowerCase() === 'admin' && passwordInput === 'admin123') {
                sessionStorage.setItem('isLoggedIn', 'admin');
                checkLoginState();
                showToast('Welcome, Administrator!', 'success');
                return;
            }

            // Employee Role check
            const emp = employees.find(e => e.id.toLowerCase() === usernameInput.toLowerCase());
            if (emp) {
                // Default password is their email address (case-insensitive)
                if (emp.email.toLowerCase() === passwordInput.toLowerCase()) {
                    sessionStorage.setItem('isLoggedIn', 'employee');
                    sessionStorage.setItem('employeeId', emp.id);
                    checkLoginState();
                    showToast(`Welcome back, ${emp.name}!`, 'success');
                    return;
                }
            }

            // Show Error
            errorMsg.textContent = 'Invalid credentials. Please try again.';
            errorMsg.style.display = 'block';
            showToast('Login failed', 'error');
        };
    }

    // Handle Register Submit
    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const regError = document.getElementById('register-error');
            regError.style.display = 'none';

            const newEmp = {
                id: document.getElementById('reg-id').value.trim(),
                name: document.getElementById('reg-name').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                department: document.getElementById('reg-dept').value,
                designation: document.getElementById('reg-desig').value.trim(),
                joiningDate: document.getElementById('reg-date').value,
                baseSalary: parseFloat(document.getElementById('reg-base').value) || 0,
                allowances: 0.0,
                deductions: 0.0,
                status: 'Pending'
            };

            try {
                const response = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEmp)
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed.');
                }

                showToast('Registration successful! Please login.', 'success');
                
                // Pre-fill username on login form
                document.getElementById('login-username').value = newEmp.id;
                
                // Switch back to login
                stateLogin.style.display = 'block';
                stateRegister.style.display = 'none';

                // Fetch new employee records
                fetchEmployees();
            } catch (err) {
                regError.textContent = err.message;
                regError.style.display = 'block';
                showToast(err.message, 'error');
            }
        };
    }

    // Handle Forgot Password Submit
    if (forgotForm) {
        forgotForm.onsubmit = (e) => {
            e.preventDefault();
            const forgotUsername = document.getElementById('forgot-username').value.trim();
            const forgotInfo = document.getElementById('forgot-info');
            forgotInfo.style.display = 'none';

            const emp = employees.find(e => e.id.toLowerCase() === forgotUsername.toLowerCase());
            if (emp) {
                forgotInfo.style.backgroundColor = 'rgba(20, 184, 166, 0.08)';
                forgotInfo.style.borderColor = 'rgba(20, 184, 166, 0.15)';
                forgotInfo.style.color = 'var(--teal)';
                forgotInfo.textContent = `Password found! Your password (email) is: ${emp.email}`;
                forgotInfo.style.display = 'block';
                showToast('Password retrieved successfully!', 'success');
            } else {
                forgotInfo.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                forgotInfo.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                forgotInfo.style.color = 'var(--red)';
                forgotInfo.textContent = 'Employee ID not found. Contact administrator.';
                forgotInfo.style.display = 'block';
                showToast('Employee ID not found', 'error');
            }
        };
    }

    // Admin Logout button
    if (btnLogout) {
        btnLogout.onclick = (e) => {
            e.preventDefault();
            logoutUser();
        };
    }

    // Employee Logout button
    if (btnPortalLogout) {
        btnPortalLogout.onclick = () => {
            logoutUser();
        };
    }

    // Employee Portal View Slip button
    if (btnPortalViewSlip) {
        btnPortalViewSlip.onclick = () => {
            const empId = sessionStorage.getItem('employeeId');
            if (empId) {
                showPayslip(empId);
            }
        };
    }
}

// Handle Logout
function logoutUser() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('employeeId');
    checkLoginState();
    showToast('You have logged out', 'success');
}

// Populates employee portal with personal metrics
function loadEmployeePortal(emp) {
    document.getElementById('portal-welcome-name').textContent = `Hello, ${emp.name}!`;
    document.getElementById('portal-user-welcome').textContent = `${emp.name} (${emp.designation})`;
    
    // Profile
    document.getElementById('p-id').textContent = emp.id;
    document.getElementById('p-email').textContent = emp.email;
    document.getElementById('p-dept').textContent = emp.department;
    document.getElementById('p-desig').textContent = emp.designation;
    document.getElementById('p-date').textContent = emp.joiningDate;

    // Financials
    document.getElementById('p-base').textContent = formatCurrency(emp.baseSalary);
    document.getElementById('p-allow').textContent = formatCurrency(emp.allowances);
    document.getElementById('p-deduct').textContent = formatCurrency(emp.deductions);
    document.getElementById('p-net').textContent = formatCurrency(emp.netSalary);

    // Live Date widget in portal
    const updatePortalTime = () => {
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        document.getElementById('portal-live-time').textContent = now.toLocaleDateString('en-IN', options);
    };
    updatePortalTime();
}
