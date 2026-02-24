/* admin-frontend/js/financial-reports.js */
document.addEventListener('DOMContentLoaded', loadReport);

async function loadReport() {
    const days = parseInt(document.getElementById('period')?.value || '30');
    const cutoff = new Date(Date.now() - days * 86400000);

    try {
        const [bookings, hubs, workspaces] = await Promise.all([
            fetch(`${API_URL}/bookings`).then(r => r.json()),
            fetch(`${API_URL}/hubs`).then(r => r.json()),
            fetch(`${API_URL}/workspaces`).then(r => r.json()),
        ]);

        const transactions = getTransactions().filter(t => {
            const d = new Date(t.created_at || t.date);
            return d >= cutoff;
        });

        const periodBookings = Array.isArray(bookings) ? bookings.filter(b => new Date(b.created_at) >= cutoff) : [];

        computeKPIs(transactions, periodBookings, workspaces);
        renderRevenueByHub(transactions, periodBookings, hubs, workspaces);
        renderBookingsByStatus(periodBookings);
        renderRevenueByType(transactions, periodBookings, workspaces);
        renderTopWorkspaces(transactions, periodBookings, workspaces);
    } catch (err) {
        console.error('Financial reports error', err);
    }
}

function computeKPIs(transactions, bookings, workspaces) {
    const revenue = transactions.filter(t => t.status === 'success').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const confirmed = bookings.filter(b => ['confirmed', 'completed', 'checked_in'].includes(b.status)).length;
    const total = workspaces.length;
    const occupancy = total > 0 ? Math.round((confirmed / (total * 1)) * 100) : 0;

    setEl('total-revenue',  formatCurrency(revenue));
    setEl('total-bookings', bookings.length);
    setEl('occupancy-rate', occupancy + '%');

    // Average rating from localStorage ratings if available, else from API
    const ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
    const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : '—';
    setEl('avg-rating', avg + (avg !== '—' ? ' ★' : ''));
}

function renderRevenueByHub(transactions, bookings, hubs, workspaces) {
    const el = document.getElementById('revenue-by-hub');
    if (!hubs.length) { el.innerHTML = '<p>No data.</p>'; return; }

    const hubRevenue = hubs.map(h => {
        const wsIds = workspaces.filter(w => w.hub_id === h.id).map(w => w.id);
        const bkIds = bookings.filter(b => wsIds.includes(b.workspace_id)).map(b => b.id);
        const rev   = transactions.filter(t => bkIds.includes(t.booking_id) && t.status === 'success')
                                  .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        return { name: h.name, revenue: rev };
    }).sort((a, b) => b.revenue - a.revenue);

    const max = Math.max(...hubRevenue.map(h => h.revenue), 1);
    el.innerHTML = hubRevenue.map(h => `
        <div style="margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:.25rem;">
                <span style="font-size:.9rem;">${h.name}</span>
                <strong>${formatCurrency(h.revenue)}</strong>
            </div>
            <div style="background:var(--border);border-radius:4px;height:8px;">
                <div style="background:var(--primary);border-radius:4px;height:8px;width:${Math.round(h.revenue / max * 100)}%;transition:width .3s;"></div>
            </div>
        </div>
    `).join('');
}

function renderBookingsByStatus(bookings) {
    const el = document.getElementById('bookings-by-status');
    const statuses = ['confirmed', 'completed', 'pending', 'cancelled', 'checked_in'];
    const colors   = { confirmed: '#27ae60', completed: '#2980b9', pending: '#f39c12', cancelled: '#e74c3c', checked_in: '#8e44ad' };
    const total = bookings.length || 1;
    el.innerHTML = statuses.map(s => {
        const count = bookings.filter(b => b.status === s).length;
        if (!count) return '';
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">
                <span class="badge" style="background:${colors[s] || '#999'};color:#fff;">${s}</span>
                <div style="flex:1;margin:0 1rem;background:var(--border);border-radius:4px;height:8px;">
                    <div style="background:${colors[s] || '#999'};border-radius:4px;height:8px;width:${Math.round(count / total * 100)}%;"></div>
                </div>
                <strong style="min-width:2rem;text-align:right;">${count}</strong>
            </div>
        `;
    }).join('') || '<p>No bookings in period.</p>';
}

function renderRevenueByType(transactions, bookings, workspaces) {
    const el   = document.getElementById('revenue-by-type');
    const types = [...new Set(workspaces.map(w => w.type).filter(Boolean))];
    if (!types.length) { el.innerHTML = '<p>No data.</p>'; return; }

    const data = types.map(t => {
        const wsIds = workspaces.filter(w => w.type === t).map(w => w.id);
        const bkIds = bookings.filter(b => wsIds.includes(b.workspace_id)).map(b => b.id);
        const rev   = transactions.filter(tx => bkIds.includes(tx.booking_id) && tx.status === 'success')
                                  .reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
        return { type: formatType(t), revenue: rev };
    }).sort((a, b) => b.revenue - a.revenue);

    const max = Math.max(...data.map(d => d.revenue), 1);
    el.innerHTML = data.map(d => `
        <div style="margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:.25rem;">
                <span style="font-size:.9rem;">${d.type}</span>
                <strong>${formatCurrency(d.revenue)}</strong>
            </div>
            <div style="background:var(--border);border-radius:4px;height:8px;">
                <div style="background:#8e44ad;border-radius:4px;height:8px;width:${Math.round(d.revenue / max * 100)}%;"></div>
            </div>
        </div>
    `).join('');
}

function renderTopWorkspaces(transactions, bookings, workspaces) {
    const el = document.getElementById('top-workspaces');
    const data = workspaces.map(w => {
        const bkIds = bookings.filter(b => b.workspace_id === w.id).map(b => b.id);
        const rev   = transactions.filter(t => bkIds.includes(t.booking_id) && t.status === 'success')
                                  .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        return { name: w.name, bookings: bkIds.length, revenue: rev };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    if (!data.length) { el.innerHTML = '<p>No data.</p>'; return; }
    el.innerHTML = `
        <table style="width:100%;font-size:.9rem;">
            <thead><tr style="text-align:left;">
                <th style="padding:.5rem 0;">Workspace</th>
                <th style="padding:.5rem;">Bookings</th>
                <th style="padding:.5rem 0;text-align:right;">Revenue</th>
            </tr></thead>
            <tbody>
                ${data.map(d => `
                    <tr style="border-top:1px solid var(--border);">
                        <td style="padding:.5rem 0;">${d.name}</td>
                        <td style="padding:.5rem;text-align:center;">${d.bookings}</td>
                        <td style="padding:.5rem 0;text-align:right;">${formatCurrency(d.revenue)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
