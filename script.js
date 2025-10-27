// =========================
// PootExpenseTracker JS File - FIXED VERSION
// =========================

// Data Storage
let expenses = [];
let savingsCategories = {
    gcash: [],
    seabank: [],
    cash: []
};
let totalMoneyAdded = 0; // ✅ NEW: Track lifetime total (only increases, never decreases)

// Initialize with default categories
function initializeDefaultCategories() {
    const saved = localStorage.getItem('savingsCategories');
    if (!saved) {
        savingsCategories = {
            gcash: [{ name: 'GCash', balance: 0 }],
            seabank: [{ name: 'SeaBank', balance: 0 }],
            cash: [{ name: 'Cash', balance: 0 }]
        };
        saveData();
    }
}

// Load data from localStorage
function loadData() {
    const savedExpenses = localStorage.getItem('expenses');
    const savedCategories = localStorage.getItem('savingsCategories');
    const savedTotalAdded = localStorage.getItem('totalMoneyAdded'); // ✅ NEW

    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
    }

    if (savedCategories) {
        savingsCategories = JSON.parse(savedCategories);
    } else {
        initializeDefaultCategories();
    }
    
    if (savedTotalAdded) {
        totalMoneyAdded = parseFloat(savedTotalAdded) || 0; // ✅ NEW
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('savingsCategories', JSON.stringify(savingsCategories));
    localStorage.setItem('totalMoneyAdded', totalMoneyAdded.toString()); // ✅ NEW
}

// Show success message
function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    if (!successEl) return;
    successEl.textContent = message;
    successEl.classList.add('show');
    setTimeout(() => {
        successEl.classList.remove('show');
    }, 3000);
}

// Tab Navigation
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.dataset.tab;

        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(tabName + '-tab').classList.add('active');

        if (tabName === 'savings') {
            displayAllSavingsCategories();
        } else if (tabName === 'accounts') {
            displayAccountsOverview();
        } else if (tabName === 'statistics') {
            displayStatistics();
        }
    });
});

// Set today's date as default
const dateInput = document.getElementById('expense-date');
if (dateInput) {
    dateInput.valueAsDate = new Date();
}

// ===================
// EXPENSES TAB
// ===================
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('expense-name').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const paidFrom = document.getElementById('paid-from').value;
        const date = document.getElementById('expense-date').value;

        if (!name || isNaN(amount) || !category || !paidFrom || !date) {
            alert('Please complete all fields');
            return;
        }

        const [accountType, ...categoryNameParts] = paidFrom.split(' - ');
        const accountKey = accountType.toLowerCase();
        const categoryIndex = savingsCategories[accountKey]?.findIndex(
            cat => cat.name === paidFrom
        );

        if (categoryIndex === -1 || categoryIndex === undefined) {
            alert('Please select a valid account');
            return;
        }

        if (savingsCategories[accountKey][categoryIndex].balance < amount) {
            alert('Not enough balance in this category');
            return;
        }

        // Deduct amount
        savingsCategories[accountKey][categoryIndex].balance -= amount;

        // Create expense
        const expense = {
            id: Date.now(),
            name,
            amount,
            category,
            paidFrom,
            date
        };

        expenses.push(expense);
        saveData();
        displayExpenses();
        updateTotals();
        updatePaidFromDropdown();

        // Reset form
        this.reset();
        dateInput.valueAsDate = new Date();
        document.getElementById('expense-name').focus();

        showSuccess('Expense added successfully!');
    });
}

// Display expenses
function displayExpenses() {
    const expenseList = document.getElementById('expense-list');
    const emptyMessage = document.getElementById('empty-expense-message');
    const filterCategory = document.getElementById('filter-category').value;

    let filteredExpenses = expenses;
    if (filterCategory !== 'All') {
        filteredExpenses = expenses.filter(exp => exp.category === filterCategory);
    }

    expenseList.innerHTML = '';

    if (filteredExpenses.length === 0) {
        emptyMessage.classList.add('show');
        return;
    }

    emptyMessage.classList.remove('show');

    filteredExpenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${expense.date}</td>
            <td>${expense.name}</td>
            <td>${expense.category}</td>
            <td>${expense.paidFrom}</td>
            <td>₱${expense.amount.toFixed(2)}</td>
            <td><button class="btn-delete btn-small" onclick="deleteExpense(${expense.id})">Delete</button></td>
        `;
        expenseList.appendChild(row);
    });
}

// Delete expense
function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        const expense = expenses.find(exp => exp.id === id);

        if (!expense) return;

        const [accountType] = expense.paidFrom.split(' - ');
        const accountKey = accountType.toLowerCase();
        const categoryIndex = savingsCategories[accountKey]?.findIndex(
            cat => cat.name === expense.paidFrom
        );

        if (categoryIndex !== -1 && categoryIndex !== undefined) {
            savingsCategories[accountKey][categoryIndex].balance += expense.amount;
        }

        expenses = expenses.filter(exp => exp.id !== id);
        saveData();
        displayExpenses();
        updateTotals();
        displayAllSavingsCategories();
    }
}

// Filter expenses
const filterSelect = document.getElementById('filter-category');
if (filterSelect) {
    filterSelect.addEventListener('change', displayExpenses);
}

// Update totals
function updateTotals() {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    document.getElementById('total-spent').textContent = totalSpent.toFixed(2);
    document.getElementById('remaining-balance').textContent = (totalMoneyAdded - totalSpent).toFixed(2);
}

// ===================
// SAVINGS TAB
// ===================
function displayAllSavingsCategories() {
    displaySavingsCategories('gcash');
    displaySavingsCategories('seabank');
    displaySavingsCategories('cash');
    updatePaidFromDropdown();
}

function displaySavingsCategories(accountType) {
    const container = document.getElementById(accountType + '-categories');
    if (!container) return;
    container.innerHTML = '';

    const categories = savingsCategories[accountType];

    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No categories yet. Click + to add one.</p>';
        return;
    }

    categories.forEach((category, index) => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category-item';
        categoryEl.innerHTML = `
            <div class="category-row">
                <span class="category-name">${category.name}</span>
                <span class="category-balance">₱${category.balance.toFixed(2)}</span>
            </div>
            <div class="category-actions">
                <button class="btn-secondary btn-small" onclick="addMoney('${accountType}', ${index})">Add Money</button>
                <button class="btn-danger btn-small" onclick="removeMoney('${accountType}', ${index})">Remove Money</button>
                <button class="btn-delete btn-small" onclick="deleteCategory('${accountType}', ${index})">Delete</button>
            </div>
        `;
        container.appendChild(categoryEl);
    });
}

// Add Category
document.querySelectorAll('.btn-add-category').forEach(button => {
    button.addEventListener('click', function() {
        const accountType = this.dataset.account;
        showAddCategoryForm(accountType);
    });
});

function showAddCategoryForm(accountType) {
    const container = document.getElementById(accountType + '-categories');
    const existingForm = container.querySelector('.add-category-form');
    if (existingForm) {
        existingForm.remove();
        return;
    }

    const form = document.createElement('div');
    form.className = 'add-category-form';
    form.innerHTML = `
        <div class="form-group">
            <label>Category Name</label>
            <input type="text" id="new-category-name-${accountType}" placeholder="${accountType.toUpperCase()} - ">
        </div>
        <div class="form-buttons">
            <button class="btn-secondary" onclick="saveNewCategory('${accountType}')">Save</button>
            <button class="btn-danger" onclick="cancelAddCategory('${accountType}')">Cancel</button>
        </div>
    `;

    container.insertBefore(form, container.firstChild);
    document.getElementById('new-category-name-' + accountType).focus();
}

function saveNewCategory(accountType) {
    const input = document.getElementById('new-category-name-' + accountType);
    const categoryName = input.value.trim();
    if (!categoryName) {
        alert('Please enter a category name');
        return;
    }

    const newCategory = { name: categoryName, balance: 0 };
    savingsCategories[accountType].push(newCategory);
    saveData();
    displaySavingsCategories(accountType);
    updatePaidFromDropdown();
    showSuccess('Category added successfully!');
}

function cancelAddCategory(accountType) {
    const container = document.getElementById(accountType + '-categories');
    const form = container.querySelector('.add-category-form');
    if (form) form.remove();
}

// ✅ FIXED: Add Money - Only this function should increase totalMoneyAdded
function addMoney(accountType, index) {
    const amount = parseFloat(prompt('How much money do you want to add?'));
    if (isNaN(amount) || amount <= 0) {
        alert('Invalid amount');
        return;
    }
    savingsCategories[accountType][index].balance += amount;
    totalMoneyAdded += amount; // ✅ CRITICAL: Increment lifetime total
    saveData();
    displayAllSavingsCategories();
    displayAccountsOverview();
    showSuccess('Money added successfully!');
}

// ✅ FIXED: Remove Money - Does NOT touch totalMoneyAdded
function removeMoney(accountType, index) {
    const amount = parseFloat(prompt('How much money do you want to remove?'));
    if (isNaN(amount) || amount <= 0) {
        alert('Invalid amount');
        return;
    }
    if (savingsCategories[accountType][index].balance < amount) {
        alert('Not enough money');
        return;
    }
    savingsCategories[accountType][index].balance -= amount;
    // ✅ CRITICAL: Do NOT touch totalMoneyAdded here!
    saveData();
    displayAllSavingsCategories();
    displayAccountsOverview();
    showSuccess('Money removed successfully!');
}

function deleteCategory(accountType, index) {
    const category = savingsCategories[accountType][index];
    if (category.balance > 0) {
        alert('Cannot delete a category with remaining balance');
        return;
    }
    if (confirm('Are you sure you want to delete this category?')) {
        savingsCategories[accountType].splice(index, 1);
        saveData();
        displayAllSavingsCategories();
        updatePaidFromDropdown();
        showSuccess('Category deleted successfully!');
    }
}

// Update Paid From dropdown
function updatePaidFromDropdown() {
    const select = document.getElementById('paid-from');
    if (!select) return;
    select.innerHTML = '<option value="">Select account</option>';
    ['gcash', 'seabank', 'cash'].forEach(accountType => {
        savingsCategories[accountType].forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = `${category.name} (₱${category.balance.toFixed(2)})`;
            select.appendChild(option);
        });
    });
}

// ===================
// ACCOUNTS & STATS
// ===================
// ✅ FIXED: Use totalMoneyAdded for Total Savings (static, never decreases)
function displayAccountsOverview() {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // ✅ CRITICAL: Total Savings = lifetime total added (static)
    document.getElementById('total-savings').textContent = totalMoneyAdded.toFixed(2);
    document.getElementById('total-spent').textContent = totalSpent.toFixed(2);
    // ✅ CRITICAL: Remaining = lifetime total - spent
    document.getElementById('remaining-balance').textContent = (totalMoneyAdded - totalSpent).toFixed(2);
}

// ===================
// INIT
// ===================
loadData();
displayExpenses();
updateTotals();
displayAllSavingsCategories();
displayAccountsOverview();
