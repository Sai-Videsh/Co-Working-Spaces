// transactions.js – Transaction history & payment records

let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
});

function loadTransactions() {
    allTransactions = getTransactions().reverse(); // newest first
    renderStats(allTransactions);
    displayTransactions(allTransactions);
}

function renderStats(txns) {
    const successful = txns.filter(t => t.status === 'success');
    document.getElementById('total-transactions').textContent    = txns.length;
    document.getElementById('successful-transactions').textContent = successful.length;
    document.getElementById('total-spent').textContent           =
        formatCurrency(successful.reduce((s, t) => s + Number(t.amount), 0));
}

function displayTransactions(txns) {
    const container = document.getElementById('transactions-list');
    if (!txns.length) {
        container.innerHTML = noDataHTML('fa-receipt', 'No transactions yet', 'Your payment history will appear here.');
        return;
    }

    container.innerHTML = txns.map(t => `
        <div class="transaction-card">
            <div class="transaction-header">
                <div>
                    <div class="transaction-id">${t.id}</div>
                    <p style="color:var(--text-light);font-size:.875rem;margin-top:.2rem;">${t.workspace_name}</p>
                </div>
                <span class="transaction-status ${t.status}">
                    ${t.status === 'success' ? 'Success' : 'Failed'}
                </span>
            </div>
            <div class="transaction-info">
                <div class="detail-item"><i class="fas fa-user"></i><span>${t.user_name}</span></div>
                <div class="detail-item"><i class="fas fa-calendar"></i><span>${formatDateTime(t.date)}</span></div>
                <div class="detail-item"><i class="fas fa-credit-card"></i><span>${formatPaymentMethod(t.method)}</span></div>
                <div class="transaction-amount">${formatCurrency(t.amount)}</div>
            </div>
        </div>
    `).join('');
}

function filterTransactions() {
    const search = document.getElementById('search-transactions').value.toLowerCase();
    const filtered = allTransactions.filter(t =>
        t.id.toLowerCase().includes(search) ||
        t.workspace_name.toLowerCase().includes(search) ||
        t.user_name.toLowerCase().includes(search)
    );
    displayTransactions(filtered);
}
