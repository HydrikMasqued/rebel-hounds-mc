/* ===== Rebel Hounds MC — Finance Dashboard ===== */

// ============================================================
// STATE MANAGEMENT
// ============================================================
let financeData = {
  transactions: [],
  budgets: [],
  summary: {},
  lastFetch: 0
};

// Chart instances
let incomeExpenseChart = null;
let categoryChart = null;

// Firebase references
let db = null;
let unsubscribeTransactions = null;
let unsubscribeBudgets = null;

// ============================================================
// DEMO DATA - Used when DEMO_MODE is true
// ============================================================
const DEMO_TRANSACTIONS = [
  { id: '1', date: '2026-08-15', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'John Smith', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-15') },
  { id: '2', date: '2026-08-14', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'Mike Johnson', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-14') },
  { id: '3', date: '2026-08-13', type: 'Expense', category: 'Events & Activities', amount: 275.50, description: 'Ride supplies and refreshments', member: 'Event Committee', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-13') },
  { id: '4', date: '2026-08-12', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'Sarah Williams', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-12') },
  { id: '5', date: '2026-08-10', type: 'Expense', category: 'Equipment & Gear', amount: 89.99, description: 'New safety vests (x4)', member: 'Gear Master', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-10') },
  { id: '6', date: '2026-08-08', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - August', member: 'Tom Brown', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-08') },
  { id: '7', date: '2026-08-05', type: 'Expense', category: 'Maintenance', amount: 125, description: 'Club storage unit rent', member: 'Facilities', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-05') },
  { id: '8', date: '2026-08-03', type: 'Income', category: 'Events & Activities', amount: 200, description: 'Charity ride registration fees', member: 'Event Committee', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-03') },
  { id: '9', date: '2026-08-01', type: 'Expense', category: 'Other', amount: 45, description: 'Office supplies', member: 'Admin', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-08-01') },
  { id: '10', date: '2026-07-28', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - July', member: 'John Smith', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-07-28') },
  { id: '11', date: '2026-07-25', type: 'Expense', category: 'Events & Activities', amount: 320, description: 'Summer gathering venue rental', member: 'Event Committee', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-07-25') },
  { id: '12', date: '2026-07-20', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - July', member: 'Mike Johnson', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-07-20') },
  { id: '13', date: '2026-07-15', type: 'Expense', category: 'Equipment & Gear', amount: 175, description: 'First aid kit restocking', member: 'Gear Master', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-07-15') },
  { id: '14', date: '2026-07-10', type: 'Income', category: 'Dues & Fees', amount: 150, description: 'Monthly dues - July', member: 'Sarah Williams', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-07-10') },
  { id: '15', date: '2026-07-05', type: 'Expense', category: 'Maintenance', amount: 85, description: 'Storage unit maintenance', member: 'Facilities', status: 'Approved', addedBy: 'Treasurer', createdAt: new Date('2026-07-05') }
];

const DEMO_BUDGETS = [
  { id: '1', category: 'Dues & Fees', monthlyLimit: 600, annualLimit: 7200, spent: 450 },
  { id: '2', category: 'Events & Activities', monthlyLimit: 500, annualLimit: 6000, spent: 595.50 },
  { id: '3', category: 'Equipment & Gear', monthlyLimit: 200, annualLimit: 2400, spent: 264.99 },
  { id: '4', category: 'Maintenance', monthlyLimit: 150, annualLimit: 1800, spent: 210 },
  { id: '5', category: 'Other', monthlyLimit: 100, annualLimit: 1200, spent: 45 }
];

// ============================================================
// INITIALIZATION
// ============================================================

// Listen for auth changes from portal.js
window.addEventListener('patchAuthChange', (e) => {
  if (e.detail.authed) {
    initFinanceDashboard();
  } else {
    cleanupFinanceDashboard();
  }
});

// Check on page load
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
  showError(false);
  setDefaultDate();
  setupEventListeners();
  
  if (DEMO_MODE) {
    loadDemoData();
  } else {
    initFirebase();
  }
}

function cleanupFinanceDashboard() {
  // Unsubscribe from Firestore listeners
  if (unsubscribeTransactions) unsubscribeTransactions();
  if (unsubscribeBudgets) unsubscribeBudgets();
  
  // Destroy charts
  if (incomeExpenseChart) {
    incomeExpenseChart.destroy();
    incomeExpenseChart = null;
  }
  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }
  
  financeData = { transactions: [], budgets: [], summary: {}, lastFetch: 0 };
  
  const dashboard = document.getElementById('finDashboard');
  if (dashboard) dashboard.classList.add('hidden');
}

// ============================================================
// DEMO MODE
// ============================================================

function loadDemoData() {
  console.log('Loading demo data...');
  
  setTimeout(() => {
    financeData = {
      transactions: DEMO_TRANSACTIONS,
      budgets: DEMO_BUDGETS,
      summary: calculateSummary(DEMO_TRANSACTIONS, DEMO_BUDGETS),
      lastFetch: Date.now()
    };
    
    renderDashboard();
    showLoading(false);
    showError(false);
    
    console.log('Demo data loaded successfully');
  }, 500);
}

// ============================================================
// FIREBASE FIRESTORE
// ============================================================

function initFirebase() {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    showError(true);
    showLoading(false);
    return;
  }
  
  // Initialize Firebase
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  
  console.log('Firebase initialized');
  
  // Subscribe to real-time updates
  subscribeToTransactions();
  subscribeToBudgets();
}

function subscribeToTransactions() {
  unsubscribeTransactions = db.collection('transactions')
    .orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      financeData.transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
      financeData.lastFetch = Date.now();
      
      renderDashboard();
      showLoading(false);
      showError(false);
      
      console.log('Transactions updated:', financeData.transactions.length);
    }, error => {
      console.error('Error fetching transactions:', error);
      showLoading(false);
      if (financeData.transactions.length === 0) {
        showError(true);
      }
    });
}

function subscribeToBudgets() {
  unsubscribeBudgets = db.collection('budgets')
    .onSnapshot(snapshot => {
      financeData.budgets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
      
      renderBudgetProgress();
      renderOverviewCards();
      
      console.log('Budgets updated:', financeData.budgets.length);
    }, error => {
      console.error('Error fetching budgets:', error);
    });
}

async function addTransactionToFirestore(data) {
  if (DEMO_MODE) {
    // Demo mode - add to local array
    const newTransaction = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date()
    };
    DEMO_TRANSACTIONS.unshift(newTransaction);
    financeData.transactions = [...DEMO_TRANSACTIONS];
    financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
    renderDashboard();
    return Promise.resolve();
  }
  
  return db.collection('transactions').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
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
  let yearToDateIncome = 0;
  let yearToDateExpenses = 0;
  
  transactions.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const date = new Date(t.date);
    const transactionMonth = date.getMonth();
    const transactionYear = date.getFullYear();
    
    if (t.type === 'Income') {
      balance += amount;
      yearToDateIncome += amount;
      if (transactionMonth === currentMonth && transactionYear === currentYear) {
        monthlyIncome += amount;
      }
    } else if (t.type === 'Expense') {
      balance -= amount;
      yearToDateExpenses += amount;
      if (transactionMonth === currentMonth && transactionYear === currentYear) {
        monthlyExpenses += amount;
      }
    }
  });
  
  const budgetRemaining = calculateBudgetRemaining(budgets);
  
  return { balance, monthlyIncome, monthlyExpenses, yearToDateIncome, yearToDateExpenses, budgetRemaining };
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
    
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    labels.push(monthName);
    
    let monthIncome = 0;
    let monthExpenses = 0;
    
    financeData.transactions.forEach(t => {
      const tDate = new Date(t.date);
      const amount = parseFloat(t.amount) || 0;
      
      if (tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear()) {
        if (t.type === 'Income') {
          monthIncome += amount;
        } else if (t.type === 'Expense') {
          monthExpenses += amount;
        }
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
  
  if (filters.category) {
    filtered = filtered.filter(t => t.category === filters.category);
  }
  if (filters.type) {
    filtered = filtered.filter(t => t.type === filters.type);
  }
  
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
  
  if (incomeExpenseChart) {
    incomeExpenseChart.destroy();
  }
  
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
        legend: {
          labels: {
            color: '#e8e8e8',
            font: { family: "'Rajdhani', sans-serif", size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9a9a9a', font: { family: "'Rajdhani', sans-serif" } },
          grid: { color: 'rgba(51, 51, 51, 0.3)' }
        },
        y: {
          ticks: { 
            color: '#9a9a9a',
            callback: value => '$' + value.toLocaleString(),
            font: { family: "'Rajdhani', sans-serif" }
          },
          grid: { color: 'rgba(51, 51, 51, 0.3)' }
        }
      }
    }
  });
}

function renderCategoryChart() {
  const canvas = document.getElementById('finCategoryChart');
  if (!canvas) return;
  
  if (categoryChart) {
    categoryChart.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const categoryData = getCategoryBreakdown();
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  
  if (labels.length === 0) {
    labels.push('No Data');
    data.push(1);
  }
  
  const colors = ['#c0392b', '#d4a017', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#1abc9c'];
  
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: 'rgba(20, 20, 20, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#e8e8e8',
            font: { family: "'Rajdhani', sans-serif", size: 12 },
            padding: 15,
            usePointStyle: true,
            pointStyleWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return context.label + ': $' + context.parsed.toLocaleString() + ' (' + percentage + '%)';
            }
          }
        }
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
      <div class="fin-budget-item">
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
    tbody.innerHTML = '<tr><td colspan="6" class="fin-no-data">No transactions found</td></tr>';
    if (countEl) countEl.textContent = 'No transactions';
    return;
  }
  
  tbody.innerHTML = display.map(t => {
    const typeClass = t.type === 'Income' ? 'fin-type-income' : 'fin-type-expense';
    return `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td><span class="fin-type-badge ${typeClass}">${escapeHtml(t.type)}</span></td>
        <td>${escapeHtml(t.category)}</td>
        <td class="${typeClass}">${formatCurrency(t.amount)}</td>
        <td>${escapeHtml(t.description)}</td>
        <td>${escapeHtml(t.member)}</td>
      </tr>
    `;
  }).join('');
  
  if (countEl) {
    const total = filtered.length;
    const showing = display.length;
    countEl.textContent = total > showing 
      ? `Showing ${showing} of ${total} transactions`
      : `Showing ${total} transaction${total !== 1 ? 's' : ''}`;
  }
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
  
  const retryBtn = document.getElementById('finRetry');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      financeData.lastFetch = 0;
      if (DEMO_MODE) {
        loadDemoData();
      } else {
        initFirebase();
      }
    });
  }
}

function applyFilters() {
  const category = document.getElementById('finFilterCategory')?.value || '';
  const type = document.getElementById('finFilterType')?.value || '';
  renderTransactions({ category, type });
}

async function handleTransactionSubmit(e) {
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
  
  try {
    await addTransactionToFirestore(formData);
    showFormMessage('Transaction added successfully!', 'success');
    form.reset();
    setDefaultDate();
  } catch (error) {
    console.error('Error adding transaction:', error);
    showFormMessage('Failed to add transaction. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Transaction';
  }
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

function showError(show) {
  const error = document.getElementById('finError');
  const dashboard = document.getElementById('finDashboard');
  
  if (error) error.classList.toggle('hidden', !show);
  if (dashboard && show) dashboard.classList.add('hidden');
}

function setDefaultDate() {
  const dateInput = document.getElementById('finDate');
  if (dateInput) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
