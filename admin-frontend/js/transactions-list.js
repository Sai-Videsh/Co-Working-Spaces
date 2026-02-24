/* admin-frontend/js/transactions-list.js */
let allTransactions = [];

document.addEventListener('DOMContentLoaded', loadTransactions);

async function loadTransactions() {
    // Transactions come from localStorage (saved by user-frontend payment flow)
    allTransactions = getTransactions();
    renderStats(allTransactions);
    renderTransactions(allTransactions);
}

function renderStats(txns) {
    const totalEl   = document.getElementById('total-count');
    const successEl = document.getElementById('success-count');
    const failedEl  = document.getElementById('failed-count');
    const revenueEl = document.getElementById('total-revenue');

    if (totalEl)   totalEl.textContent   = txns.length;
    if (successEl) successEl.textContent = txns.filter(t => t.status === 'success').length;
    if (failedEl)  failedEl.textContent  = txns.filter(t => t.status === 'failed').length;
    if (revenueEl) revenueEl.textContent = formatCurrency(
        txns.filter(t => t.status === 'success').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
    );
}

function filterTransactions() {
    const q      = (document.getElementById('search')?.value      || '').toLowerCase();
    const status = document.getElementById('filter-status')?.value || '';
    const method = document.getElementById('filter-method')?.value || '';
    const filtered = allTransactions.filter(t => {
        const matchQ      = !q      || String(t.id || '').toLowerCase().includes(q) || String(t.booking_id || '').includes(q) || (t.guest_name || '').toLowerCase().includes(q);
        const matchStatus = !status || t.status === status;
        const matchMethod = !method || t.payment_method === method;
        return matchQ && matchStatus && matchMethod;
    });
    renderTransactions(filtered);
}

function renderTransactions(txns) {
    const tbody = document.getElementById('transactions-table');
    if (!txns.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No transactions found.</td></tr>';
        return;
    }
    tbody.innerHTML = txns.map(t => `
        <tr>
            <td>${t.id || '—'}</td>
            <td>${t.booking_id ? '#' + t.booking_id : '—'}</td>
            <td>${t.guest_name || '—'}</td>
            <td>${formatCurrency(t.amount || 0)}</td>
            <td>${formatPaymentMethod(t.payment_method)}</td>
            <td><span class="badge ${statusBadge(t.status)}">${t.status || '—'}</span></td>
            <td>${formatDateTime(t.created_at || t.date)}</td>
        </tr>
    `).join('');
}

function statusBadge(s) {
    return s === 'success' ? 'badge-success' : s === 'failed' ? 'badge-danger' : 'badge-warning';
}
