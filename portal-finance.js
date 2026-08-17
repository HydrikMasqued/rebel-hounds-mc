/* ===== Rebel Hounds MC — Finance Dashboard ===== */

// ============================================================
// STATE MANAGEMENT
// ============================================================
let financeData = {
  categories: [],
  transactions: [],
  budgets: [],
  summary: {}
};

// Chart instances
let incomeExpenseChart = null;
let categoryChart = null;

// Storage keys
const STORAGE_KEY_CATEGORIES = 'rh_finance_categories';
const STORAGE_KEY_TRANSACTIONS = 'rh_finance_transactions';
const STORAGE_KEY_BUDGETS = 'rh_finance_budgets';

// Default categories
const DEFAULT_CATEGORIES = ['Dues & Fees', 'Events & Activities', 'Equipment & Gear', 'Maintenance', 'Other'];

// ============================================================
// INITIALIZATION
// ============================================================

window.addEventListener('patchAuthChange', (e) => {
  if (e.detail.authed) initFinanceDashboard();
  else cleanupFinanceDashboard();
});

if (sessionStorage.getItem('rh_patch_auth') === '1') {
  setTimeout(() => { if (sessionStorage.getItem('rh_patch_auth') === '1') initFinanceDashboard(); }, 100);
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
  financeData = { categories: [], transactions: [], budgets: [], summary: {} };
  const dashboard = document.getElementById('finDashboard');
  if (dashboard) dashboard.classList.add('hidden');
}

// ============================================================
// DATA PERSISTENCE (localStorage)
// ============================================================

function loadData() {
  try {
    const storedCategories = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    const storedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const storedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
    
    financeData.categories = storedCategories ? JSON.parse(storedCategories) : [...DEFAULT_CATEGORIES];
    financeData.transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    financeData.budgets = storedBudgets ? JSON.parse(storedBudgets) : [];
    financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
    
    updateAllCategoryDropdowns();
    renderDashboard();
    showLoading(false);
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
    financeData.categories = [...DEFAULT_CATEGORIES];
    financeData.transactions = [];
    financeData.budgets = [];
    financeData.summary = calculateSummary([], []);
    renderDashboard();
    showLoading(false);
  }
}

function saveCategories() {
  try { localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(financeData.categories)); } catch (e) {}
}

function saveTransactions() {
  try { localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(financeData.transactions)); } catch (e) {}
}

function saveBudgets() {
  try { localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(financeData.budgets)); } catch (e) {}
}

function resetAllData() {
  if (!confirm('Are you sure you want to clear ALL data? This cannot be undone.')) return;
  
  localStorage.removeItem(STORAGE_KEY_CATEGORIES);
  localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEY_BUDGETS);
  
  financeData.categories = [...DEFAULT_CATEGORIES];
  financeData.transactions = [];
  financeData.budgets = [];
  financeData.summary = calculateSummary([], []);
  
  updateAllCategoryDropdowns();
  renderDashboard();
  alert('All data has been cleared.');
}

// ============================================================
// CATEGORY MANAGEMENT
// ============================================================

function updateAllCategoryDropdowns() {
  const dropdownIds = ['finCategory', 'finFilterCategory', 'editTransCategory'];
  
  dropdownIds.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    
    const currentValue = select.value;
    const firstOption = select.querySelector('option:first-child');
    
    select.innerHTML = '';
    if (firstOption) select.appendChild(firstOption);
    
    financeData.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
    
    if (currentValue && financeData.categories.includes(currentValue)) {
      select.value = currentValue;
    }
  });
  
  renderCategoryManager();
}

function renderCategoryManager() {
  const container = document.getElementById('finCategoryList');
  if (!container) return;
  
  if (financeData.categories.length === 0) {
    container.innerHTML = '<p class="fin-no-data">No categories. Add one below.</p>';
    return;
  }
  
  container.innerHTML = financeData.categories.map((cat, index) => `
    <div class="fin-category-item">
      <span class="fin-category-name">${escapeHtml(cat)}</span>
      <div class="fin-category-actions">
        <button class="fin-action-btn fin-edit-btn" onclick="renameCategory(${index})" title="Rename">✏️</button>
        <button class="fin-action-btn fin-delete-btn" onclick="deleteCategory(${index})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function addCategory() {
  const input = document.getElementById('finNewCategory');
  const name = input.value.trim();
  
  if (!name) {
    alert('Please enter a category name.');
    return;
  }
  
  if (financeData.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
    alert('This category already exists.');
    return;
  }
  
  financeData.categories.push(name);
  saveCategories();
  updateAllCategoryDropdowns();
  input.value = '';
}

function renameCategory(index) {
  const oldName = financeData.categories[index];
  const newName = prompt('Rename category:', oldName);
  
  if (!newName || newName.trim() === '' || newName === oldName) return;
  
  if (financeData.categories.some((c, i) => i !== index && c.toLowerCase() === newName.toLowerCase())) {
    alert('A category with this name already exists.');
    return;
  }
  
  financeData.categories[index] = newName.trim();
  
  // Update transactions
  financeData.transactions.forEach(t => {
    if (t.category === oldName) t.category = newName.trim();
  });
  
  // Update budgets
  financeData.budgets.forEach(b => {
    if (b.category === oldName) b.category = newName.trim();
  });
  
  saveCategories();
  saveTransactions();
  saveBudgets();
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateAllCategoryDropdowns();
  renderDashboard();
}

function deleteCategory(index) {
  const name = financeData.categories[index];
  
  const transactionsUsing = financeData.transactions.filter(t => t.category === name).length;
  const budgetsUsing = financeData.budgets.filter(b => b.category === name).length;
  
  let message = `Delete category "${name}"?`;
  if (transactionsUsing > 0) message += `\n\n${transactionsUsing} transaction(s) use this category and will be set to "Other".`;
  if (budgetsUsing > 0) message += `\n${budgetsUsing} budget(s) use this category and will be deleted.`;
  
  if (!confirm(message)) return;
  
  financeData.categories.splice(index, 1);
  
  // Move transactions to "Other" if it exists, otherwise first category
  const fallbackCategory = financeData.categories.includes('Other') ? 'Other' : financeData.categories[0] || '';
  financeData.transactions.forEach(t => {
    if (t.category === name) t.category = fallbackCategory;
  });
  
  // Remove budgets for this category
  financeData.budgets = financeData.budgets.filter(b => b.category !== name);
  
  saveCategories();
  saveTransactions();
  saveBudgets();
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateAllCategoryDropdowns();
  renderDashboard();
}

// ============================================================
// CALCULATIONS
// ============================================================

function calculateSummary(transactions, budgets) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let balance = 0, monthlyIncome = 0, monthlyExpenses = 0;
  
  transactions.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const date = new Date(t.date);
    
    if (t.type === 'Income') {
      balance += amount;
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) monthlyIncome += amount;
    } else if (t.type === 'Expense') {
      balance -= amount;
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) monthlyExpenses += amount;
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
  const labels = [], income = [], expenses = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
    
    let monthIncome = 0, monthExpenses = 0;
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
  financeData.transactions.filter(t => t.type === 'Expense').forEach(t => {
    const category = t.category || 'Other';
    breakdown[category] = (breakdown[category] || 0) + (parseFloat(t.amount) || 0);
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
  renderCategoryManager();
  const dashboard = document.getElementById('finDashboard');
  if (dashboard) dashboard.classList.remove('hidden');
}

function renderOverviewCards() {
  const s = financeData.summary;
  updateElement('finBalance', formatCurrency(s.balance));
  updateElement('finMonthlyIncome', formatCurrency(s.monthlyIncome));
  updateElement('finMonthlyExpenses', formatCurrency(s.monthlyExpenses));
  updateElement('finBudgetRemaining', formatCurrency(s.budgetRemaining));
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
        { label: 'Income', data: monthlyData.income, backgroundColor: 'rgba(39, 174, 96, 0.7)', borderColor: 'rgba(39, 174, 96, 1)', borderWidth: 1, borderRadius: 4 },
        { label: 'Expenses', data: monthlyData.expenses, backgroundColor: 'rgba(192, 57, 43, 0.7)', borderColor: 'rgba(192, 57, 43, 1)', borderWidth: 1, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#e8e8e8' } }, tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.parsed.y.toLocaleString() } } },
      scales: { x: { ticks: { color: '#9a9a9a' }, grid: { color: 'rgba(51,51,51,0.3)' } }, y: { ticks: { color: '#9a9a9a', callback: v => '$' + v.toLocaleString() }, grid: { color: 'rgba(51,51,51,0.3)' } } }
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
    data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderColor: 'rgba(20,20,20,1)', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { position: 'right', labels: { color: '#e8e8e8', padding: 15, usePointStyle: true } }, tooltip: { callbacks: { label: c => { const total = c.dataset.data.reduce((a,b)=>a+b,0); return c.label + ': $' + c.parsed.toLocaleString() + ' (' + ((c.parsed/total)*100).toFixed(1) + '%)'; } } } },
      cutout: '60%'
    }
  });
}

function renderBudgetProgress() {
  const container = document.getElementById('finBudgetGrid');
  if (!container) return;
  
  if (financeData.budgets.length === 0) {
    container.innerHTML = '<p class="fin-no-data">No budgets set. Add one below.</p>';
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
        <div class="fin-budget-bar"><div class="fin-budget-fill ${statusClass}" style="width: ${percentage}%"></div></div>
        <div class="fin-budget-footer">
          <span>${percentage.toFixed(1)}% used</span>
          <span>$${remaining.toLocaleString()} remaining</span>
        </div>
        <div class="fin-budget-actions">
          <button class="btn btn-outline btn-sm" onclick="editBudget('${budget.id}')">Edit</button>
          <button class="btn btn-outline btn-sm fin-delete-btn" onclick="deleteBudget('${budget.id}')">Delete</button>
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
    tbody.innerHTML = '<tr><td colspan="7" class="fin-no-data">No transactions found</td></tr>';
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
        <td class="fin-actions">
          <button class="fin-action-btn fin-edit-btn" onclick="editTransaction('${t.id}')" title="Edit">✏️</button>
          <button class="fin-action-btn fin-delete-btn" onclick="deleteTransaction('${t.id}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
  
  if (countEl) {
    const total = filtered.length;
    countEl.textContent = total > 50 ? `Showing 50 of ${total} transactions` : `Showing ${total} transaction${total !== 1 ? 's' : ''}`;
  }
}

// ============================================================
// TRANSACTION CRUD
// ============================================================

function addTransaction(data) {
  financeData.transactions.unshift({ id: Date.now().toString(), ...data });
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateBudgetSpent();
  saveTransactions();
  saveBudgets();
  renderDashboard();
}

function editTransaction(id) {
  const t = financeData.transactions.find(x => x.id === id);
  if (!t) return;
  
  document.getElementById('editTransId').value = t.id;
  document.getElementById('editTransDate').value = t.date;
  document.getElementById('editTransType').value = t.type;
  document.getElementById('editTransCategory').value = t.category;
  document.getElementById('editTransAmount').value = t.amount;
  document.getElementById('editTransDescription').value = t.description;
  document.getElementById('editTransMember').value = t.member;
  
  document.getElementById('editTransactionModal').classList.add('active');
}

function saveEditedTransaction() {
  const id = document.getElementById('editTransId').value;
  const t = financeData.transactions.find(x => x.id === id);
  if (!t) return;
  
  t.date = document.getElementById('editTransDate').value;
  t.type = document.getElementById('editTransType').value;
  t.category = document.getElementById('editTransCategory').value;
  t.amount = parseFloat(document.getElementById('editTransAmount').value);
  t.description = document.getElementById('editTransDescription').value;
  t.member = document.getElementById('editTransMember').value;
  
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  updateBudgetSpent();
  saveTransactions();
  saveBudgets();
  renderDashboard();
  document.getElementById('editTransactionModal').classList.remove('active');
}

function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
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

function addBudget() {
  const category = document.getElementById('finBudgetCategory').value;
  const monthly = parseFloat(document.getElementById('finBudgetMonthly').value) || 0;
  const annual = parseFloat(document.getElementById('finBudgetAnnual').value) || 0;
  
  if (!category) { alert('Please select a category.'); return; }
  if (financeData.budgets.some(b => b.category === category)) { alert('A budget for this category already exists.'); return; }
  if (monthly === 0 && annual === 0) { alert('Please enter at least one budget limit.'); return; }
  
  financeData.budgets.push({
    id: Date.now().toString(),
    category,
    monthlyLimit: monthly,
    annualLimit: annual,
    spent: 0
  });
  
  updateBudgetSpent();
  saveBudgets();
  renderDashboard();
  
  document.getElementById('finBudgetCategory').value = '';
  document.getElementById('finBudgetMonthly').value = '';
  document.getElementById('finBudgetAnnual').value = '';
}

function editBudget(id) {
  const b = financeData.budgets.find(x => x.id === id);
  if (!b) return;
  
  document.getElementById('editBudgetId').value = b.id;
  document.getElementById('editBudgetCategory').value = b.category;
  document.getElementById('editBudgetMonthly').value = b.monthlyLimit || '';
  document.getElementById('editBudgetAnnual').value = b.annualLimit || '';
  
  document.getElementById('editBudgetModal').classList.add('active');
}

function saveEditedBudget() {
  const id = document.getElementById('editBudgetId').value;
  const b = financeData.budgets.find(x => x.id === id);
  if (!b) return;
  
  b.monthlyLimit = parseFloat(document.getElementById('editBudgetMonthly').value) || 0;
  b.annualLimit = parseFloat(document.getElementById('editBudgetAnnual').value) || 0;
  
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  saveBudgets();
  renderDashboard();
  document.getElementById('editBudgetModal').classList.remove('active');
}

function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  financeData.budgets = financeData.budgets.filter(b => b.id !== id);
  financeData.summary = calculateSummary(financeData.transactions, financeData.budgets);
  saveBudgets();
  renderDashboard();
}

function updateBudgetSpent() {
  financeData.budgets.forEach(budget => {
    budget.spent = financeData.transactions
      .filter(t => t.type === 'Expense' && t.category === budget.category)
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  });
}

// ============================================================
// EVENT HANDLERS
// ============================================================

function setupEventListeners() {
  document.getElementById('finFilterCategory')?.addEventListener('change', applyFilters);
  document.getElementById('finFilterType')?.addEventListener('change', applyFilters);
  document.getElementById('finTransactionForm')?.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('finResetBtn')?.addEventListener('click', resetAllData);
  document.getElementById('finAddCategory')?.addEventListener('click', addCategory);
  document.getElementById('finAddBudget')?.addEventListener('click', addBudget);
  
  // Enter key for new category
  document.getElementById('finNewCategory')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
  });
  
  // Modal close buttons
  document.querySelectorAll('.fin-modal-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.fin-modal').classList.remove('active'));
  });
  
  // Modal save buttons
  document.getElementById('saveEditTransaction')?.addEventListener('click', saveEditedTransaction);
  document.getElementById('saveEditBudget')?.addEventListener('click', saveEditedBudget);
  
  // Close modals on backdrop click
  document.querySelectorAll('.fin-modal').forEach(modal => {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
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
  
  addTransaction({
    date: document.getElementById('finDate').value,
    type: document.getElementById('finType').value,
    category: document.getElementById('finCategory').value,
    amount: parseFloat(document.getElementById('finAmount').value),
    description: document.getElementById('finDescription').value,
    member: document.getElementById('finMember').value,
    status: 'Approved',
    addedBy: 'Officer'
  });
  
  form.reset();
  setDefaultDate();
  submitBtn.disabled = false;
  submitBtn.textContent = 'Add Transaction';
  alert('Transaction added!');
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
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

function formatCurrency(amount) {
  return '$' + (parseFloat(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return dateStr; }
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
