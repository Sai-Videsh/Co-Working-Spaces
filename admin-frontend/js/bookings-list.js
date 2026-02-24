/* admin-frontend/js/bookings-list.js */
let allBookings = [];

document.addEventListener('DOMContentLoaded', loadBookings);

async function loadBookings() {
    try {
        allBookings = await fetch(`${API_URL}/bookings`).then(r => r.json());
        renderBookings(allBookings);
    } catch {
        document.getElementById('bookings-table').innerHTML =
            '<tr><td colspan="8" style="text-align:center;">Failed to load bookings.</td></tr>';
    }
}

function filterBookings() {
    const q      = (document.getElementById('search')?.value || '').toLowerCase();
    const status = document.getElementById('filter-status')?.value || '';
    const filtered = allBookings.filter(b => {
        const matchQ      = !q      || (b.guest_name || '').toLowerCase().includes(q) || String(b.id).includes(q) || (b.workspace_name || '').toLowerCase().includes(q);
        const matchStatus = !status || b.status === status;
        return matchQ && matchStatus;
    });
    renderBookings(filtered);
}

function statusBadge(s) {
    const map = { confirmed: 'badge-success', cancelled: 'badge-danger', pending: 'badge-warning', completed: 'badge-info', checked_in: 'badge-info' };
    return map[s] || 'badge-secondary';
}

function renderBookings(bookings) {
    const tbody = document.getElementById('bookings-table');
    if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No bookings found.</td></tr>';
        return;
    }
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>#${b.id}</td>
            <td>${b.guest_name || '—'}</td>
            <td>${b.guest_email || '—'}</td>
            <td>${b.workspace_name || b.workspace_id || '—'}</td>
            <td>${formatDateTime(b.start_time)}</td>
            <td>${formatDateTime(b.end_time)}</td>
            <td><span class="badge ${statusBadge(b.status)}">${b.status}</span></td>
            <td>
                <a href="booking-details-admin.html?booking_id=${b.id}" class="btn btn-sm btn-outline">
                    <i class="fas fa-eye"></i> View
                </a>
            </td>
        </tr>
    `).join('');
}
