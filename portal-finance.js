/* ===== Rebel Hounds MC — Finance Dashboard ===== */

// ============================================================
// STATE MANAGEMENT
// ============================================================
let financeData = {
  transactions: [],
  budgets: [],
  summary: {}
};

// Chart instances
let incomeExpenseChart = null;
let categoryChart = null;

// Storage keys
const STORAGE_KEY_TRANSACTIONS = 'rh_finance_transactions';
const STORAGE_KEY_BUDGETS = 'rh_finance_budgets';

// ============================================================
// DEFAULT DATA - Used for reset and initial load
// ============================================================
const DEFAULT_TRANSACTIONS = [
  { id: '1', date: '2026-08-15', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'John Smith', status: 'Approved', addedBy: 'Treasurer' },
  { id: '2', date: '2026-08-14', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'Mike Johnson', status: 'Approved', addedBy: 'Treasurer' },
  { id: '3', date: '2026-08-13', type: 'Expense', category: 'Events & Activities', amount: 275.50, description: 'Ride supplies and refreshments', member: 'Event Committee', status: 'Approved', addedBy: 'Treasurer' },
  { id: '4', date: '2026-08-12', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'Sarah Williams', status: 'Approved', addedBy: 'Treasurer' },
  { id: '5', date: '2026-08-10', type: 'Expense', category: 'Equipment & Gear', amount: 89.99, description: 'New safety vests (x4)', member: 'Gear Master', status: 'Approved', addedBy: 'Treasurer' },
  { id: '6', date: '2026-08-08', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'Tom Brown', status: 'Approved', addedBy: 'Treasurer' },
  { id: '7', date: '2026-08-05', type: 'Expense', category: 'Maintenance', amount: 125, description: 'Club storage unit rent', member: 'Facilities', status: 'Approved', addedBy: 'Treasurer' },
  { id: '8', date: '2026-08-03', type: 'Income', category: 'Events & Activities', amount: 200, description: 'Charity ride registration fees', member: 'Event Committee', status: 'Approved', addedBy: 'Treasurer' },
  { id: '9', date: '2026-08-01', type: 'Expense', category: 'Other', amount: 45, description: 'Office supplies', member: 'Admin', status: 'Approved', addedBy: 'Treasurer' },
  { id: '10', date: '2026-07-28', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - July', member: 'John Smith', status: 'Approved', addedBy: 'Treasurer' },
  { id: '11', date: '2026-07-25', type: 'Expense', category: 'Events & Activities', amount: 320, description: 'Summer gathering venue rental', member: 'Event Committee', status: 'Approved', addedBy: 'Treasurer' },
  { id: '12', date: '2026-07-20', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - July', member: 'Mike Johnson', status: 'Approved', addedBy: 'Treasurer' },
  { id: '13', date: '2026-07-15', type: 'Expense', category: 'Equipment & Gear', amount: 175, description: 'First aid kit restocking', member: 'Gear Master', status: 'Approved', addedBy: 'Treasurer' },
  { id: '14', date: '2026-07-10', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - July', member: 'Sarah Williams', status: 'Approved', addedBy: 'Treasurer' },
  { id: '15', date: '2026-07-05', type: 'Expense', category: 'Maintenance', amount: 85, description: 'Storage unit maintenance', member: 'Facilities', status: 'Approved', addedBy: 'Treasurer' }
];

const DEFAULT_BUDGETS = [
  { id: '1', category: 'Dues & Fees', monthlyLimit: 600, annualLimit: 7200, spent: 450 },
  { id: '2', category: 'Events & Activities', monthlyLimit: 500, annualLimit: 6000, spent: 595.50 },
  { id: '3', category: 'Equipment & Gear', monthlyLimit: 200, annualLimit: 2400, spent: 264.99 },
  { id: '4', category: 'Maintenance', monthlyLimit: 150, annualLimit: 1800, spent: 210 },
  { id: '5', category: 'Other', monthlyLimit: 100, annualLimit: 1200, spent: 45 }
];

// ============================================================
// INITIALIZATION
// ============================================================

window.addEventListener('patchAuthChange', (e) => {
  if (e.detail.authed) {
    initFinanceDashboard();
  } else {
    cleanupFinanceDashboard();
  }
});

if (sessionStorage.getItem('rh_patch_auth') === '1') {
  setTimeout(() => {
    if (sessionStorage.getItem('rh_patch_auth') === '1') {
      initFinanceDashboard();
    }
  }, 100);
}

function initFinanceDashboard() {
  console.log('Finance dashboard initializing...');
  showLoading(true);
  setDefaultDate();
  setupEventListeners();
  loadData();
}

function cleanupFinanceDashboard() {
  if (incomeExpenseChart) { incomeExpenseChart.destroy(); incomeExpenseChart = null; }
  if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
  financeData = { transactions: [], budgets: [], summary: {} };
  const dashboard = document.getElementById('finDashboard');
  if (dashboard) dashboard.classList.add('hidden');
}

// ============================================================
// DATA PERSISTENCE (localStorage)
// ============================================================

function loadData() {
  try {
    const storedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const storedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
    
    financeData.transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    financeData.budgets = storedBudgets ? JSON.parse(storedBudgets) : [];
    financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
    
    renderDashboard();
    showLoading(false);
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
    financeData.transactions = [];
    financeData.budgets = [];
    financeData.summary = calculateSummary([], []);
    renderDashboard();
    showLoading(false);
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(financeData.transactions));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

function saveBudgets() {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(financeData.budgets));
  } catch (e) {
    console.error('Error saving budgets:', e);
  }
}

function resetAllData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
    return;
  }
  
  localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEY_BUDGETS);
  
  financeData.transactions = [];
  financeData.budgets = [];
  financeData.summary = calculateSummary([], []);
  
  renderDashboard();
  alert('All data has been cleared.');
}

// ============================================================
// CALCULATIONS
// ============================================================

function calculateSummary(transactions, budgets) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let balance = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  
  transactions.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const date = new Date(t.date);
    
    if (t.type === 'Income') {
      balance += amount;
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        monthlyIncome += amount;
      }
    } else if (t.type === 'Expense') {
      balance -= amount;
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        monthlyExpenses += amount;
      }
    }
  });
  
  const budgetRemaining = calculateBudgetRemaining(budgets);
  
  return { balance, monthlyIncome, monthlyExpenses, budgetRemaining };
}

function calculateBudgetRemaining(budgets) {
  return budgets.reduce((total, b) => {
    const limit = parseFloat(b.annualLimit) || parseFloat(b.monthlyLimit) || 0;
    const spent = parseFloat(b.spent) || 0;
    return total + (limit - spent);
  }, 0);
}

function getMonthlyData(months) {
  const labels = [];
  const income = [];
  const expenses = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
    
    let monthIncome = 0;
    let monthExpenses = 0;
    
    financeData.transactions.forEach(t => {
      const tDate = new Date(t.date);
      const amount = parseFloat(t.amount) || 0;
      
      if (tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear()) {
        if (t.type === 'Income') monthIncome += amount;
        else if (t.type === 'Expense') monthExpenses += amount;
      }
    });
    
    income.push(monthIncome);
    expenses.push(monthExpenses);
  }
  
  return { labels, income, expenses };
}

function getCategoryBreakdown() {
  const breakdown = {};
  
  financeData.transactions
    .filter(t => t.type === 'Expense')
    .forEach(t => {
      const category = t.category || 'Other';
      const amount = parseFloat(t.amount) || 0;
      breakdown[category] = (breakdown[category] || 0) + amount;
    });
  
  return breakdown;
}

function getFilteredTransactions(filters = {}) {
  let filtered = [...financeData.transactions];
  
  if (filters.category) filtered = filtered.filter(t => t.category === filters.category);
  if (filters.type) filtered = filtered.filter(t => t.type === filters.type);
  
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  return filtered;
}

// ============================================================
// RENDERING
// ============================================================

function renderDashboard() {
  renderOverviewCards();
  renderCharts();
  renderBudgetProgress();
  renderTransactions();
  
  const dashboard = document.getElementById('finDashboard');
  if (dashboard) dashboard.classList.remove('hidden');
}

function renderOverviewCards() {
  const summary = financeData.summary;
  updateElement('finBalance', formatCurrency(summary.balance));
  updateElement('finMonthlyIncome', formatCurrency(summary.monthlyIncome));
  updateElement('finMonthlyExpenses', formatCurrency(summary.monthlyExpenses));
  updateElement('finBudgetRemaining', formatCurrency(summary.budgetRemaining));
}

function renderCharts() {
  renderIncomeExpenseChart();
  renderCategoryChart();
}

function renderIncomeExpenseChart() {
  const canvas = document.getElementById('finIncomeExpenseChart');
  if (!canvas) return;
  
  if (incomeExpenseChart) incomeExpenseChart.destroy();
  
  const ctx = canvas.getContext('2d');
  const monthlyData = getMonthlyData(6);
  
  incomeExpenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'Income',
          data: monthlyData.income,
          backgroundColor: 'rgba(39, 174, 96, 0.7)',
          borderColor: 'rgba(39, 174, 96, 1)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Expenses',
          data: monthlyData.expenses,
          backgroundColor: 'rgba(192, 57, 43, 0.7)',
          borderColor: 'rgba(192, 57, 43, 1)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#e8e8e8', font: { family: "'Rajdhani', sans-serif", size: 12 } } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString() } }
      },
      scales: {
        x: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(51, 51, 51, 0.3)' } },
        y: { ticks: { color: '#9a9a9a', callback: v => '$' + v.toLocaleString() }, grid: { color: 'rgba(51, 51, 51, 0.3)' } }
      }
    }
  });
}

function renderCategoryChart() {
  const canvas = document.getElementById('finCategoryChart');
  if (!canvas) return;
  
  if (categoryChart) categoryChart.destroy();
  
  const ctx = canvas.getContext('2d');
  const categoryData = getCategoryBreakdown();
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  if (labels.length === 0) { labels.push('No Data'); data.push(1); }
  
  const colors = ['#c0392b', '#d4a017', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c'];
  
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length), borderColor: 'rgba(20, 20, 20, 1)', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#e8e8e8', font: { family: "'Rajdhani', sans-serif", size: 12 }, padding: 15, usePointStyle: true } },
        tooltip: { callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a, b) => a + b, 0); return ctx.label + ': $' + ctx.parsed.toLocaleString() + ' (' + ((ctx.parsed / total) * 100).toFixed(1) + '%)'; } } }
      },
      cutout: '60%'
    }
  });
}

function renderBudgetProgress() {
  const container = document.getElementById('finBudgetGrid');
  if (!container) return;
  
  if (financeData.budgets.length === 0) {
    container.innerHTML = '<p class="fin-no-data">No budget data available.</p>';
    return;
  }
  
  container.innerHTML = financeData.budgets.map(budget => {
    const category = budget.category || 'Unknown';
    const monthlyLimit = parseFloat(budget.monthlyLimit) || 0;
    const annualLimit = parseFloat(budget.annualLimit) || 0;
    const spent = parseFloat(budget.spent) || 0;
    const limit = annualLimit > 0 ? annualLimit : monthlyLimit;
    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const remaining = limit - spent;
    
    let statusClass = 'fin-budget-ok';
    if (percentage >= 90) statusClass = 'fin-budget-danger';
    else if (percentage >= 75) statusClass = 'fin-budget-warning';
    
    return `
      <div class="fin-budget-item" data-id="${budget.id}">
        <div class="fin-budget-header">
          <span class="fin-budget-category">${escapeHtml(category)}</span>
          <span class="fin-budget-amounts">$${spent.toLocaleString()} / $${limit.toLocaleString()}</span>
        </div>
        <div class="fin-budget-bar">
          <div class="fin-budget-fill ${statusClass}" style="width: ${percentage}%"></div>
        </div>
        <div class="fin-budget-footer">
          <span>${percentage.toFixed(1)}% used</span>
          <span>$${remaining.toLocaleString()} remaining</span>
        </div>
        <button class="fin-edit-budget-btn btn btn-outline btn-sm" onclick="editBudget('${budget.id}')">Edit</button>
      </div>
    `;
  }).join('');
}

function renderTransactions(filters = {}) {
  const tbody = document.getElementById('finTransactionsBody');
  const countEl = document.getElementById('finTransactionsCount');
  if (!tbody) return;
  
  const filtered = getFilteredTransactions(filters);
  const display = filtered.slice(0, 50);
  
  if (display.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="fin-no-data">No transactions found</td></tr>';
    if (countEl) countEl.textContent = 'No transactions';
    return;
  }
  
  tbody.innerHTML = display.map(t => {
    const typeClass = t.type === 'Income' ? 'fin-type-income' : 'fin-type-expense';
    return `
      <tr data-id="${t.id}">
        <td>${formatDate(t.date)}</td>
        <td><span class="fin-type-badge ${typeClass}">${escapeHtml(t.type)}</span></td>
        <td>${escapeHtml(t.category)}</td>
        <td class="${typeClass}">${formatCurrency(t.amount)}</td>
        <td>${escapeHtml(t.description)}</td>
        <td>${escapeHtml(t.member)}</td>
        <td class="fin-actions">
          <button class="fin-action-btn fin-edit-btn" onclick="editTransaction('${t.id}')" title="Edit">✏️</button>
          <button class="fin-action-btn fin-delete-btn" onclick="deleteTransaction('${t.id}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
  
  if (countEl) {
    const total = filtered.length;
    const showing = display.length;
    countEl.textContent = total > showing ? `Showing ${showing} of ${total} transactions` : `Showing ${total} transaction${total !== 1 ? 's' : ''}`;
  }
}

// ============================================================
// TRANSACTION CRUD
// ============================================================

function addTransaction(data) {
  const newTransaction = {
    id: Date.now().toString(),
    ...data
  };
  
  financeData.transactions.unshift(newTransaction);
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateBudgetSpent();
  saveTransactions();
  saveBudgets();
  renderDashboard();
}

function editTransaction(id) {
  const transaction = financeData.transactions.find(t => t.id === id);
  if (!transaction) return;
  
  document.getElementById('editTransId').value = transaction.id;
  document.getElementById('editTransDate').value = transaction.date;
  document.getElementById('editTransType').value = transaction.type;
  document.getElementById('editTransCategory').value = transaction.category;
  document.getElementById('editTransAmount').value = transaction.amount;
  document.getElementById('editTransDescription').value = transaction.description;
  document.getElementById('editTransMember').value = transaction.member;
  
  document.getElementById('editTransactionModal').classList.add('active');
}

function saveEditedTransaction() {
  const id = document.getElementById('editTransId').value;
  const transaction = financeData.transactions.find(t => t.id === id);
  if (!transaction) return;
  
  transaction.date = document.getElementById('editTransDate').value;
  transaction.type = document.getElementById('editTransType').value;
  transaction.category = document.getElementById('editTransCategory').value;
  transaction.amount = parseFloat(document.getElementById('editTransAmount').value);
  transaction.description = document.getElementById('editTransDescription').value;
  transaction.member = document.getElementById('editTransMember').value;
  
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateBudgetSpent();
  saveTransactions();
  saveBudgets();
  renderDashboard();
  
  document.getElementById('editTransactionModal').classList.remove('active');
}

function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;
  
  financeData.transactions = financeData.transactions.filter(t => t.id !== id);
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateBudgetSpent();
  saveTransactions();
  saveBudgets();
  renderDashboard();
}

// ============================================================
// BUDGET CRUD
// ============================================================

function editBudget(id) {
  const budget = financeData.budgets.find(b => b.id === id);
  if (!budget) return;
  
  document.getElementById('editBudgetId').value = budget.id;
  document.getElementById('editBudgetCategory').value = budget.category;
  document.getElementById('editBudgetMonthly').value = budget.monthlyLimit;
  document.getElementById('editBudgetAnnual').value = budget.annualLimit;
  
  document.getElementById('editBudgetModal').classList.add('active');
}

function saveEditedBudget() {
  const id = document.getElementById('editBudgetId').value;
  const budget = financeData.budgets.find(b => b.id === id);
  if (!budget) return;
  
  budget.monthlyLimit = parseFloat(document.getElementById('editBudgetMonthly').value) || 0;
  budget.annualLimit = parseFloat(document.getElementById('editBudgetAnnual').value) || 0;
  
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  saveBudgets();
  renderDashboard();
  
  document.getElementById('editBudgetModal').classList.remove('active');
}

function updateBudgetSpent() {
  financeData.budgets.forEach(budget => {
    const category = budget.category;
    budget.spent = financeData.transactions
      .filter(t => t.type === 'Expense' && t.category === category)
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  });
}

// ============================================================
// EVENT HANDLERS
// ============================================================

function setupEventListeners() {
  const filterCategory = document.getElementById('finFilterCategory');
  const filterType = document.getElementById('finFilterType');
  
  if (filterCategory) filterCategory.addEventListener('change', applyFilters);
  if (filterType) filterType.addEventListener('change', applyFilters);
  
  const form = document.getElementById('finTransactionForm');
  if (form) form.addEventListener('submit', handleTransactionSubmit);
  
  // Reset button
  const resetBtn = document.getElementById('finResetBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetAllData);
  
  // Modal close buttons
  document.querySelectorAll('.fin-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.fin-modal').classList.remove('active');
    });
  });
  
  // Modal save buttons
  document.getElementById('saveEditTransaction')?.addEventListener('click', saveEditedTransaction);
  document.getElementById('saveEditBudget')?.addEventListener('click', saveEditedBudget);
  
  // Close modals on backdrop click
  document.querySelectorAll('.fin-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
}

function applyFilters() {
  const category = document.getElementById('finFilterCategory')?.value || '';
  const type = document.getElementById('finFilterType')?.value || '';
  renderTransactions({ category, type });
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';
  showFormMessage('', '');
  
  const formData = {
    date: document.getElementById('finDate').value,
    type: document.getElementById('finType').value,
    category: document.getElementById('finCategory').value,
    amount: parseFloat(document.getElementById('finAmount').value),
    description: document.getElementById('finDescription').value,
    member: document.getElementById('finMember').value,
    status: 'Approved',
    addedBy: 'Officer'
  };
  
  addTransaction(formData);
  showFormMessage('Transaction added successfully!', 'success');
  form.reset();
  setDefaultDate();
  
  submitBtn.disabled = false;
  submitBtn.textContent = 'Add Transaction';
}

// ============================================================
// UI HELPERS
// ============================================================

function showLoading(show) {
  const loading = document.getElementById('finLoading');
  const dashboard = document.getElementById('finDashboard');
  if (loading) loading.classList.toggle('hidden', !show);
  if (dashboard && show) dashboard.classList.add('hidden');
}

function setDefaultDate() {
  const dateInput = document.getElementById('finDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

function showFormMessage(msg, type) {
  const el = document.getElementById('finFormMsg');
  if (el) {
    el.textContent = msg;
    el.className = 'form-msg';
    if (type === 'error') el.classList.add('error');
    else if (type === 'success') el.classList.add('success');
  }
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
