/* admin-frontend/js/admin-dashboard.js */
document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
    try {
        const [hubs, workspaces, bookings] = await Promise.all([
            fetch(`${API_URL}/hubs`).then(r => r.json()),
            fetch(`${API_URL}/workspaces`).then(r => r.json()),
            fetch(`${API_URL}/bookings`).then(r => r.json()),
        ]);

        const transactions = getTransactions();
        const revenue = transactions
            .filter(t => t.status === 'success')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        document.getElementById('stats-row').innerHTML = `
            <div class="stat-card">
                <i class="fas fa-building"></i>
                <div><div class="value">${Array.isArray(hubs) ? hubs.length : 0}</div><div class="label">Total Hubs</div></div>
            </div>
            <div class="stat-card green">
                <i class="fas fa-door-open"></i>
                <div><div class="value">${Array.isArray(workspaces) ? workspaces.length : 0}</div><div class="label">Workspaces</div></div>
            </div>
            <div class="stat-card yellow">
                <i class="fas fa-calendar-check"></i>
                <div><div class="value">${Array.isArray(bookings) ? bookings.length : 0}</div><div class="label">Bookings</div></div>
            </div>
            <div class="stat-card">
                <i class="fas fa-rupee-sign"></i>
                <div><div class="value">${formatCurrency(revenue)}</div><div class="label">Revenue</div></div>
            </div>
        `;

        document.getElementById('last-updated').textContent = 'Updated: ' + new Date().toLocaleTimeString();

        renderRecentBookings(Array.isArray(bookings) ? bookings.slice(0, 10) : []);
        renderHubOverview(Array.isArray(hubs) ? hubs : [], Array.isArray(workspaces) ? workspaces : []);
    } catch (err) {
        console.error('Dashboard load error', err);
    }
}

function renderRecentBookings(bookings) {
    const tbody = document.getElementById('recent-bookings');
    if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No bookings found</td></tr>';
        return;
    }
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>#${b.id}</td>
            <td>${b.guest_name || '—'}</td>
            <td>${b.workspace_name || b.workspace_id || '—'}</td>
            <td>${formatDateTime(b.start_time)}</td>
            <td>${formatCurrency(b.total_amount || b.amount || 0)}</td>
            <td><span class="badge ${statusBadge(b.status)}">${b.status}</span></td>
        </tr>
    `).join('');
}

function renderHubOverview(hubs, workspaces) {
    const el = document.getElementById('hub-overview');
    if (!hubs.length) { el.innerHTML = '<p>No hubs found.</p>'; return; }
    el.innerHTML = hubs.map(h => {
        const count = workspaces.filter(w => w.hub_id === h.id).length;
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;border-bottom:1px solid var(--border);">
                <div>
                    <strong>${h.name}</strong>
                    <div style="font-size:.82rem;color:var(--text-light);">${h.city || ''}, ${h.state || ''}</div>
                </div>
                <span class="badge badge-info">${count} workspace${count !== 1 ? 's' : ''}</span>
            </div>
        `;
    }).join('');
}

function statusBadge(status) {
    const map = { confirmed: 'badge-success', cancelled: 'badge-danger', pending: 'badge-warning', completed: 'badge-info' };
    return map[status] || 'badge-secondary';
}
