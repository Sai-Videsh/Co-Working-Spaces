/* admin-frontend/js/pricing-rules-list.js */
let allRules = [];
let allHubs = [];
let allWorkspaces = [];
let selectedHubIds = [];
let selectedWorkspaceIds = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    loadCoupons();
    loadHubsAndWorkspaces();
});

setInterval(() => { loadRules(); loadCoupons(); }, 15000);

window.addEventListener('pageshow', (event) => {
    if (event.persisted || performance.navigation.type === 2) {
        loadRules();
        loadCoupons();
    }
});

async function loadRules() {
    try {
        const res = await fetch(`${API_URL}/pricing`);
        const json = await res.json();
        allRules = json.data || json;
        renderRules(allRules);
        updateTimestamp();
    } catch {
        document.getElementById('rules-table').innerHTML =
            '<tr><td colspan="7" style="text-align:center;">Failed to load pricing rules.</td></tr>';
    }
}

function updateTimestamp() {
    const el = document.getElementById('last-updated');
    if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

function filterRules() {
    const q = (document.getElementById('search')?.value || '').toLowerCase();
    const type = document.getElementById('filter-type')?.value || '';
    const filtered = allRules.filter(r => {
        const workspaceName = r.workspaces?.name || '';
        const matchQ = !q || workspaceName.toLowerCase().includes(q) || (r.rule_type || '').toLowerCase().includes(q);
        const matchType = !type || r.rule_type === type;
        return matchQ && matchType;
    });
    renderRules(filtered);
}

function renderRules(rules) {
    const tbody = document.getElementById('rules-table');
    if (!rules.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No pricing rules found.</td></tr>';
        return;
    }
    tbody.innerHTML = rules.map(r => {
        const workspaceName = r.workspaces?.name || `Workspace #${r.workspace_id}`;
        const percentMod = r.percentage_modifier != null ? (r.percentage_modifier > 0 ? '+' : '') + r.percentage_modifier + '%' : '—';
        const flatMod = r.flat_modifier != null ? (r.flat_modifier > 0 ? '+' : '') + '₹' + parseFloat(r.flat_modifier).toFixed(2) : '—';
        const timeRange = r.start_time && r.end_time ? `${r.start_time} – ${r.end_time}` : '—';
        const days = r.days && r.days.length > 0 ? r.days.join(', ') : 'All';
        return `
        <tr>
            <td>${r.id}</td>
            <td><strong>${workspaceName}</strong></td>
            <td>${formatRuleType(r.rule_type)}</td>
            <td>${percentMod}</td>
            <td>${flatMod}</td>
            <td>${timeRange}</td>
            <td><span class="badge badge-secondary" style="font-size:0.75rem;">${days}</span></td>
            <td>
                <a href="pricing-rule-form.html?rule_id=${r.id}" class="btn btn-sm btn-outline" title="Edit"><i class="fas fa-edit"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteRule(${r.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function formatRuleType(type) {
    const map = {
        peak_hours: 'Peak Hours', off_peak: 'Off-Peak', weekend: 'Weekend',
        demand: 'High Demand', long_booking: 'Long Booking', last_minute: 'Last Minute',
        early_bird: 'Early Bird', time_based: 'Time Based', day_based: 'Day Based', custom: 'Custom'
    };
    return map[type] || type || '—';
}

async function deleteRule(id) {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
        const res = await fetch(`${API_URL}/pricing/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Rule deleted successfully', 'success');
        await loadRules();
    } catch {
        showToast('Failed to delete rule', 'error');
    }
}

// ── Hub & Workspace Loading ────────────────────────────────────────────────

async function loadHubsAndWorkspaces() {
    try {
        const [hubRes, wsRes] = await Promise.all([
            fetch(`${API_URL}/hubs`).then(r => r.json()),
            fetch(`${API_URL}/workspaces`).then(r => r.json())
        ]);
        allHubs = hubRes.data || [];
        allWorkspaces = wsRes.data || [];

        const hubSel = document.getElementById('hub-select');
        const wsSel = document.getElementById('workspace-select');
        if (hubSel) {
            hubSel.innerHTML = '<option value="">-- Select a hub to add --</option>' +
                allHubs.map(h => `<option value="${h.id}">${h.name} (${h.city})</option>`).join('');
        }
        if (wsSel) {
            wsSel.innerHTML = '<option value="">-- Select a workspace to add --</option>' +
                allWorkspaces.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }
    } catch { /* silently ignore */ }
}

// ── Tag Multi-Select ───────────────────────────────────────────────────────

function addHubTag(select) {
    const id = Number(select.value);
    if (!id || selectedHubIds.includes(id)) { select.value = ''; return; }
    selectedHubIds.push(id);
    const hub = allHubs.find(h => h.id === id);
    renderTags('hub-tags', selectedHubIds, allHubs, removeHubTag);
    select.value = '';
    document.getElementById('all-hubs-cb').checked = false;
}

function removeHubTag(id) {
    selectedHubIds = selectedHubIds.filter(i => i !== id);
    renderTags('hub-tags', selectedHubIds, allHubs, removeHubTag);
    if (selectedHubIds.length === 0) document.getElementById('all-hubs-cb').checked = false;
}

function toggleAllHubs(checked) {
    if (checked) {
        selectedHubIds = allHubs.map(h => h.id);
        document.getElementById('hub-select').disabled = true;
    } else {
        selectedHubIds = [];
        document.getElementById('hub-select').disabled = false;
    }
    renderTags('hub-tags', selectedHubIds, allHubs, removeHubTag);
}

function addWorkspaceTag(select) {
    const id = Number(select.value);
    if (!id || selectedWorkspaceIds.includes(id)) { select.value = ''; return; }
    selectedWorkspaceIds.push(id);
    renderTags('workspace-tags', selectedWorkspaceIds, allWorkspaces, removeWorkspaceTag);
    select.value = '';
    document.getElementById('all-workspaces-cb').checked = false;
}

function removeWorkspaceTag(id) {
    selectedWorkspaceIds = selectedWorkspaceIds.filter(i => i !== id);
    renderTags('workspace-tags', selectedWorkspaceIds, allWorkspaces, removeWorkspaceTag);
}

function toggleAllWorkspaces(checked) {
    if (checked) {
        selectedWorkspaceIds = allWorkspaces.map(w => w.id);
        document.getElementById('workspace-select').disabled = true;
    } else {
        selectedWorkspaceIds = [];
        document.getElementById('workspace-select').disabled = false;
    }
    renderTags('workspace-tags', selectedWorkspaceIds, allWorkspaces, removeWorkspaceTag);
}

function renderTags(containerId, ids, items, removeFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ids.map(id => {
        const item = items.find(i => i.id === id);
        const label = item ? (item.name + (item.city ? ` (${item.city})` : '')) : `#${id}`;
        return `<span style="display:inline-flex;align-items:center;gap:.3rem;background:var(--accent);color:white;padding:.2rem .6rem;border-radius:12px;font-size:.8rem;font-weight:600;">
            ${label}
            <span onclick="${removeFn.name}(${id})" style="cursor:pointer;opacity:.8;font-size:.85rem;">✕</span>
        </span>`;
    }).join('');
}

// ── Coupon Management ──────────────────────────────────────────────────────

async function loadCoupons() {
    try {
        const res = await fetch(`${API_URL}/pricing/coupons`);
        const json = await res.json();
        renderCoupons(json.data || []);
    } catch {
        document.getElementById('coupons-table').innerHTML =
            '<tr><td colspan="8" style="text-align:center;">Failed to load coupons.</td></tr>';
    }
}

function renderCoupons(coupons) {
    const tbody = document.getElementById('coupons-table');
    if (!coupons.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-light);">No coupons created yet.</td></tr>';
        return;
    }
    tbody.innerHTML = coupons.map(c => {
        const now = new Date();
        const from = c.valid_from ? new Date(c.valid_from) : null;
        const until = c.valid_until ? new Date(c.valid_until) : null;
        const expired = until && until < now;
        const notStarted = from && from > now;
        const statusLabel = !c.is_active ? 'Terminated' : expired ? 'Expired' : notStarted ? 'Scheduled' : 'Active';
        const statusClass = (!c.is_active || expired) ? 'coupon-inactive' : notStarted ? 'coupon-scheduled' : 'coupon-active';

        const fromStr = from ? from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
        const untilStr = until ? until.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
        const validPeriod = fromStr && untilStr ? `${fromStr} → ${untilStr}` : fromStr ? `From ${fromStr}` : untilStr ? `Until ${untilStr}` : 'Always';

        const wsCount = c.applicable_workspace_ids?.length || 0;
        const hubCount = c.applicable_hub_ids?.length || 0;
        const scope = wsCount === 0 && hubCount === 0 ? 'All' :
            [wsCount > 0 ? `${wsCount} workspace${wsCount > 1 ? 's' : ''}` : '',
             hubCount > 0 ? `${hubCount} hub${hubCount > 1 ? 's' : ''}` : '']
            .filter(Boolean).join(', ');

        const uses = c.max_uses ? `${c.usage_count}/${c.max_uses}` : c.usage_count;

        return `
        <tr>
            <td><strong style="letter-spacing:2px;font-family:monospace;font-size:.95rem;">${c.code}</strong></td>
            <td><strong style="color:var(--success);">${c.discount_percentage}% OFF</strong></td>
            <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.description || ''}">${c.description || '—'}</td>
            <td style="font-size:.8rem;">${validPeriod}</td>
            <td style="font-size:.8rem;">${scope}</td>
            <td>${uses}</td>
            <td><span class="coupon-badge ${statusClass}">${statusLabel}</span></td>
            <td style="display:flex;gap:.4rem;">
                ${c.is_active && !expired ? `<button class="btn btn-sm btn-danger" onclick="terminateCoupon(${c.id})" title="Terminate immediately" style="font-size:.7rem;padding:.25rem .5rem;"><i class="fas fa-stop-circle"></i> Terminate</button>` : ''}
                ${!c.is_active && !expired ? `<button class="btn btn-sm btn-outline" onclick="toggleCoupon(${c.id}, true)" title="Re-activate" style="font-size:.7rem;padding:.25rem .5rem;"><i class="fas fa-play"></i></button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteCoupon(${c.id})" title="Delete" style="font-size:.7rem;padding:.25rem .5rem;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function openCouponModal() {
    // Reset all fields
    ['coupon-code','coupon-discount','coupon-description','coupon-valid-from','coupon-valid-until','coupon-max-uses'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    selectedHubIds = [];
    selectedWorkspaceIds = [];
    document.getElementById('all-hubs-cb').checked = false;
    document.getElementById('all-workspaces-cb').checked = false;
    document.getElementById('hub-select').disabled = false;
    document.getElementById('workspace-select').disabled = false;
    renderTags('hub-tags', [], allHubs, removeHubTag);
    renderTags('workspace-tags', [], allWorkspaces, removeWorkspaceTag);
    document.getElementById('coupon-modal').classList.add('open');
}

function closeCouponModal() {
    document.getElementById('coupon-modal').classList.remove('open');
}

function generateCouponCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'WS-';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('coupon-code').value = code;
}

async function saveCoupon() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const discount = parseInt(document.getElementById('coupon-discount').value);
    const description = document.getElementById('coupon-description').value.trim();
    const validFrom = document.getElementById('coupon-valid-from').value;
    const validUntil = document.getElementById('coupon-valid-until').value;
    const maxUses = parseInt(document.getElementById('coupon-max-uses').value) || null;

    if (!code) { showToast('Please enter or generate a coupon code', 'error'); return; }
    if (!discount || discount < 1 || discount > 100) { showToast('Discount must be between 1% and 100%', 'error'); return; }
    if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
        showToast('Valid Until must be after Valid From', 'error'); return;
    }

    try {
        const res = await fetch(`${API_URL}/pricing/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                discount_percentage: discount,
                description: description || null,
                valid_from: validFrom || null,
                valid_until: validUntil || null,
                max_uses: maxUses,
                applicable_hub_ids: selectedHubIds,
                applicable_workspace_ids: selectedWorkspaceIds
            })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Coupon "${json.data.code}" created!`, 'success');
        closeCouponModal();
        loadCoupons();
    } catch (err) {
        showToast(err.message || 'Failed to create coupon', 'error');
    }
}

async function terminateCoupon(id) {
    if (!confirm('Terminate this coupon immediately? Users will no longer be able to use it.')) return;
    await toggleCoupon(id, false);
}

async function deleteCoupon(id) {
    if (!confirm('Delete this coupon permanently?')) return;
    try {
        const res = await fetch(`${API_URL}/pricing/coupons/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast('Coupon deleted', 'success');
        loadCoupons();
    } catch {
        showToast('Failed to delete coupon', 'error');
    }
}

async function toggleCoupon(id, is_active) {
    try {
        const res = await fetch(`${API_URL}/pricing/coupons/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Coupon ${is_active ? 'activated' : 'terminated'}`, is_active ? 'success' : 'warning');
        loadCoupons();
    } catch {
        showToast('Failed to update coupon', 'error');
    }
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('coupon-modal');
    if (e.target === modal) closeCouponModal();
});


document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    loadCoupons();
});

// Auto-refresh every 15 seconds
setInterval(() => { loadRules(); loadCoupons(); }, 15000);

// Auto-refresh when returning from edit page
window.addEventListener('pageshow', (event) => {
    if (event.persisted || performance.navigation.type === 2) {
        loadRules();
        loadCoupons();
    }
});

async function loadRules() {
    try {
        const res = await fetch(`${API_URL}/pricing`);
        const json = await res.json();
        allRules = json.data || json;
        renderRules(allRules);
        updateTimestamp();
    } catch {
        document.getElementById('rules-table').innerHTML =
            '<tr><td colspan="7" style="text-align:center;">Failed to load pricing rules.</td></tr>';
    }
}

function updateTimestamp() {
    const el = document.getElementById('last-updated');
    if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

function filterRules() {
    const q = (document.getElementById('search')?.value || '').toLowerCase();
    const type = document.getElementById('filter-type')?.value || '';
    const filtered = allRules.filter(r => {
        const workspaceName = r.workspaces?.name || '';
        const matchQ = !q || workspaceName.toLowerCase().includes(q) || (r.rule_type || '').toLowerCase().includes(q);
        const matchType = !type || r.rule_type === type;
        return matchQ && matchType;
    });
    renderRules(filtered);
}

function renderRules(rules) {
    const tbody = document.getElementById('rules-table');
    if (!rules.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No pricing rules found.</td></tr>';
        return;
    }
    tbody.innerHTML = rules.map(r => {
        const workspaceName = r.workspaces?.name || `Workspace #${r.workspace_id}`;
        const percentMod = r.percentage_modifier != null ? (r.percentage_modifier > 0 ? '+' : '') + r.percentage_modifier + '%' : '—';
        const flatMod = r.flat_modifier != null ? (r.flat_modifier > 0 ? '+' : '') + '₹' + parseFloat(r.flat_modifier).toFixed(2) : '—';
        const timeRange = r.start_time && r.end_time ? `${r.start_time} – ${r.end_time}` : '—';
        const days = r.days && r.days.length > 0 ? r.days.join(', ') : 'All';

        return `
        <tr>
            <td>${r.id}</td>
            <td><strong>${workspaceName}</strong></td>
            <td>${formatRuleType(r.rule_type)}</td>
            <td>${percentMod}</td>
            <td>${flatMod}</td>
            <td>${timeRange}</td>
            <td><span class="badge badge-secondary" style="font-size:0.75rem;">${days}</span></td>
            <td>
                <a href="pricing-rule-form.html?rule_id=${r.id}" class="btn btn-sm btn-outline" title="Edit"><i class="fas fa-edit"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteRule(${r.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
        `;
    }).join('');
}

function formatRuleType(type) {
    const map = {
        peak_hours: 'Peak Hours',
        off_peak: 'Off-Peak',
        weekend: 'Weekend',
        demand: 'High Demand',
        long_booking: 'Long Booking',
        last_minute: 'Last Minute',
        early_bird: 'Early Bird',
        time_based: 'Time Based',
        day_based: 'Day Based',
        custom: 'Custom'
    };
    return map[type] || type || '—';
}

async function deleteRule(id) {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
        const res = await fetch(`${API_URL}/pricing/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Rule deleted successfully', 'success');
        await loadRules();
    } catch {
        showToast('Failed to delete rule', 'error');
    }
}

// ── Coupon Management ──────────────────────────────────────────────────────

async function loadCoupons() {
    try {
        const res = await fetch(`${API_URL}/pricing/coupons`);
        const json = await res.json();
        renderCoupons(json.data || []);
    } catch {
        document.getElementById('coupons-table').innerHTML =
            '<tr><td colspan="7" style="text-align:center;">Failed to load coupons.</td></tr>';
    }
}

function renderCoupons(coupons) {
    const tbody = document.getElementById('coupons-table');
    if (!coupons.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-light);">No coupons created yet.</td></tr>';
        return;
    }
    tbody.innerHTML = coupons.map(c => {
        const expires = c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const expired = c.expires_at && new Date(c.expires_at) < new Date();
        const statusLabel = !c.is_active ? 'Inactive' : expired ? 'Expired' : 'Active';
        const statusClass = (!c.is_active || expired) ? 'coupon-inactive' : 'coupon-active';
        const uses = c.max_uses ? `${c.usage_count}/${c.max_uses}` : c.usage_count;
        return `
        <tr>
            <td><strong style="letter-spacing:2px;font-family:monospace;font-size:1rem;">${c.code}</strong></td>
            <td><strong style="color:var(--success);">${c.discount_percentage}% OFF</strong></td>
            <td>${c.description || '—'}</td>
            <td>${expires}</td>
            <td>${uses}</td>
            <td><span class="coupon-badge ${statusClass}">${statusLabel}</span></td>
            <td style="display:flex;gap:.4rem;">
                <button class="btn btn-sm btn-outline" onclick="toggleCoupon(${c.id}, ${!c.is_active})" title="${c.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="fas fa-${c.is_active ? 'pause' : 'play'}"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCoupon(${c.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function openCouponModal() {
    document.getElementById('coupon-code').value = '';
    document.getElementById('coupon-discount').value = '';
    document.getElementById('coupon-description').value = '';
    document.getElementById('coupon-expiry').value = '';
    document.getElementById('coupon-modal').classList.add('open');
}

function closeCouponModal() {
    document.getElementById('coupon-modal').classList.remove('open');
}

function generateCouponCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'WS-';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('coupon-code').value = code;
}

async function saveCoupon() {
    const code = document.getElementById('coupon-code').value.trim();
    const discount = parseInt(document.getElementById('coupon-discount').value);
    const description = document.getElementById('coupon-description').value.trim();
    const expiry = document.getElementById('coupon-expiry').value;

    if (!code) { showToast('Please enter or generate a coupon code', 'error'); return; }
    if (!discount || discount < 1 || discount > 100) { showToast('Discount must be between 1% and 100%', 'error'); return; }

    try {
        const res = await fetch(`${API_URL}/pricing/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                discount_percentage: discount,
                description: description || null,
                expires_at: expiry || null
            })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Coupon "${json.data.code}" created successfully!`, 'success');
        closeCouponModal();
        loadCoupons();
    } catch (err) {
        showToast(err.message || 'Failed to create coupon', 'error');
    }
}

async function deleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return;
    try {
        const res = await fetch(`${API_URL}/pricing/coupons/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast('Coupon deleted', 'success');
        loadCoupons();
    } catch {
        showToast('Failed to delete coupon', 'error');
    }
}

async function toggleCoupon(id, is_active) {
    try {
        const res = await fetch(`${API_URL}/pricing/coupons/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        showToast(`Coupon ${is_active ? 'activated' : 'deactivated'}`, 'success');
        loadCoupons();
    } catch {
        showToast('Failed to update coupon', 'error');
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('coupon-modal');
    if (e.target === modal) closeCouponModal();
});

