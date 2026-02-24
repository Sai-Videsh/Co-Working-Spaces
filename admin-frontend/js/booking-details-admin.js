/* admin-frontend/js/booking-details-admin.js */
const bookingId = getParam('booking_id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!bookingId) { showError('No booking ID provided.'); return; }
    await loadBooking();
});

async function loadBooking() {
    const container = document.getElementById('content');
    try {
        const [bResult, qrResult] = await Promise.allSettled([
            fetch(`${API_URL}/bookings/${bookingId}`).then(r => r.json()),
            fetch(`${API_URL}/qr/${bookingId}`).then(r => r.json()),
        ]);

        const b = bResult.value;
        if (!b || b.error) { showError('Booking not found.'); return; }

        document.querySelector('h1').innerHTML = `<i class="fas fa-file-alt"></i> Booking #${b.id}`;

        const qrUrl = qrResult.status === 'fulfilled' && qrResult.value?.qr_code_url
            ? qrResult.value.qr_code_url : null;

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <h2>Booking Info</h2>
                        <span id="booking-status" class="badge ${statusBadge(b.status)}">${b.status}</span>
                    </div>
                    <div class="card-body">
                        ${detailRow('Booking ID', '#' + b.id)}
                        ${detailRow('Guest Name', b.guest_name || '&mdash;')}
                        ${detailRow('Email', b.guest_email || '&mdash;')}
                        ${detailRow('Workspace', b.workspace_name || b.workspace_id || '&mdash;')}
                        ${detailRow('Type', formatType(b.booking_type))}
                        ${detailRow('Start', formatDateTime(b.start_time))}
                        ${detailRow('End', formatDateTime(b.end_time))}
                        ${detailRow('Amount', formatCurrency(b.total_amount || b.amount || 0))}
                        ${detailRow('Created', formatDateTime(b.created_at))}
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:1.5rem;">
                    <div class="card">
                        <div class="card-header"><h2>Actions</h2></div>
                        <div class="card-body">
                            <div id="action-buttons" style="display:flex;gap:.75rem;flex-wrap:wrap;"></div>
                        </div>
                    </div>
                    ${qrUrl ? `<div class="card"><div class="card-header"><h2>QR Code</h2></div><div class="card-body" style="text-align:center;"><img src="${qrUrl}" alt="QR" style="max-width:180px;border-radius:8px;"></div></div>` : ''}
                </div>
            </div>
        `;
        renderActions(b.status);
    } catch (err) {
        showError('Failed to load booking: ' + err.message);
    }
}

function detailRow(label, value) {
    return `<div style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-light);font-size:.9rem;">${label}</span><strong>${value}</strong></div>`;
}

function renderActions(status) {
    const el = document.getElementById('action-buttons');
    if (!el) return;
    const actions = [];
    if (status === 'pending')    actions.push(`<button class="btn btn-success" onclick="updateStatus('confirmed')"><i class="fas fa-check"></i> Confirm</button>`);
    if (status === 'confirmed')  actions.push(`<button class="btn" onclick="updateStatus('checked_in')"><i class="fas fa-sign-in-alt"></i> Check In</button>`);
    if (status === 'checked_in') actions.push(`<button class="btn btn-outline" onclick="updateStatus('completed')"><i class="fas fa-flag-checkered"></i> Complete</button>`);
    if (!['cancelled','completed'].includes(status))
        actions.push(`<button class="btn btn-danger" onclick="updateStatus('cancelled')"><i class="fas fa-times"></i> Cancel</button>`);
    el.innerHTML = actions.length ? actions.join('') : '<span style="color:var(--text-light);">No actions available.</span>';
}

async function updateStatus(status) {
    if (!confirm(`Change status to "${status}"?`)) return;
    try {
        const res = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error();
        showToast('Status updated', 'success');
        await loadBooking();
    } catch {
        showToast('Failed to update status', 'error');
    }
}

function statusBadge(s) {
    const map = { confirmed:'badge-success', cancelled:'badge-danger', pending:'badge-warning', completed:'badge-info', checked_in:'badge-info' };
    return map[s] || 'badge-secondary';
}

function showError(msg) {
    document.getElementById('content').innerHTML = `<div class="card"><div class="card-body" style="text-align:center;color:#e74c3c;">${msg}</div></div>`;
}
